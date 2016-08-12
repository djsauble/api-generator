var _ = require('underscore');
var express = require('express');
var StravaStrategy = require('passport-strava-oauth2').Strategy;
var passport = require('passport');
var uuid = require('uuid');
var Buffer = require('Buffer');
var nano = require('nano')(process.env.COUCHDB_DATABASE_URL);
var SocketServer = require('ws').Server;
var sum = require('timeseries-sum');
var Aggregate = require('timeseries-aggregate');
var DateRound = require('date-round');
var round = require('float').round;
var Distance = require('compute-distance');
var Training = require('base-building');
var Helpers = require('./app/helpers');

// Create a server instance
var app = express();
var expressWs = require('express-ws')(app);

// Configure the server
app.set('port', process.env.PORT || 3000);
app.set('hostname', process.env.CALLBACK_URL);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(require('serve-static')(__dirname + '/public'));
app.use(require('cookie-parser')());
app.use(require('body-parser').json({limit: '25mb'}));
app.use(require('express-session')({
  secret: process.env.CACHE_SECRET,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', ensureAuthenticated, function(req, res) {
  res.render('index', {
    host: process.env.CALLBACK_URL,
    user: req.user,
    wsUrl: process.env.WEBSOCKET_URL,
    google_maps_api_key: process.env.GOOGLE_MAPS_API_KEY
  });
});

// Login to the application
app.get('/login', function(req, res) {
  res.render('login', { user: req.user });
});

// GET /auth/strava
//   Use passport.authenticate() as rout middleware to authenticate the
//   request. The first step in Strava authentication will involve
//   redirecting the user to strava.com. After authorization, Strava
//   will redirect the user back to this application at /auth/strava/callback
app.get('/auth/strava',
  passport.authenticate('strava', { scope: ['public'] }),
  function(req, res) {
    // The request will be redirected to Strava for authentication, so this
    // function will not be called.
  }
);

// GET /auth/strava/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function will be called, which,
//   in this example, will redirect the user to the home page.
app.get('/auth/strava/callback',
  passport.authenticate('strava', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home
    res.redirect('/');
  }
);

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.listen(app.get('port'), function() {
  console.log("Listening on port " + app.get('port'));
});

/************
 * REST API *
 ************/

// Create a new record (extension point)
app.put('/api/runs', function(req, res) {
  var user = req.query.user;
  var token = req.query.token;
  var data = req.body;

  // Is this a valid request?
  var users = nano.db.use('users');
  users.get(user, function(err, body) {
    if (body.user_token != token) {
      return;
    }

    // Generate a unique identifier for the run
    var runId = uuid.v4();

    // Create the run document
    var runs = nano.db.use(body.run_database);
    var timestamp = new Date(data[0].timestamp);
    var distance = Helpers.getDistance(data);
    var pace = Helpers.getPace(data);
    var duration = Helpers.getDuration(data);
    runs.multipart.insert(
      {
        created_by: user,
        timestamp: timestamp,
        distance: distance,
        pace: pace,
        duration: duration
      },
      [
        {
          name: 'data.json',
          data: JSON.stringify(data, null, 2),
          content_type: 'text/json'
        }
      ],
      runId,
      function(err, body) {
        if (err) {
          // Error handling
          return;
        }

        console.log("Run uploaded");

        // Analyze the data and push changes to registered clients
        analyzeDataFor(user);
      }
    );
  });
  res.status(200).end();
});

/*****************
 * WebSocket API *
 *****************/

// List of clients that have registered for updates of a given user
var clients = {};

// List of timers that are sending passcode updates 
var timers = {};

app.ws('/api', function(ws, req) {
  console.log('Client connected');
  ws.on('message', function(data, flags) {
    var request = JSON.parse(data);
    if (request.type == 'client:register') {
      registerClient(ws, request.data);
    }
    else if (request.type == 'client:unregister') {
      unregisterClient(ws, request.data);
    }
    else if (request.type == 'client:ping') {
      // Do nothing
    }
    else if (request.type == 'passcode:get') {
      getPasscode(ws, request.data);
    }
    else if (request.type == 'passcode:use') {
      usePasscode(ws, request.data);
    }
    else if (request.type == 'run:list') {
      listRuns(ws, request.data);
    }
    else if (request.type == 'run:get') {
      getRun(ws, request.data);
    }
    else if (request.type == 'trend:get') {
      getTrend(ws, request.data);
    }
    else if (request.type == 'goal:get') {
      getGoal(ws, request.data);
    }
    else if (request.type == 'goal:set') {
      setGoal(ws, request.data);
    }
    else if (request.type == 'weekly_goal:get') {
      getWeeklyGoal(ws, request.data);
    }
    else {
      console.log('Unknown websockets request: ' + request.type);
    }
  });
  ws.on('close', function() {
    console.log('Client disconnected');
  });
});

// Register a client for unsolicited updates
//
// Idempotent
//
function registerClient(ws, data) {
  var users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token !== data.token) {
      ws.send(JSON.stringify({
        type: 'client:register',
        error: 'Could not register the client'
      }));
      return;
    }

    // Initialize the array for this client, if undefined
    if (!clients[data.user]) {
      clients[data.user] = [];
    }

    // Register the socket, if not already registered
    var i = clients[data.user].indexOf(ws);
    if (i === -1) {
      clients[data.user].push(ws);
    }

    // Let the client know that registration succeeded
    broadcast(data.user, {
      type: 'client:registered'
    });
  });
}

// Unregister a client from unsolicited updates
//
// Idempotent
//
function unregisterClient(ws, data) {
  var error = JSON.stringify({
        type: 'client:unregister',
        error: 'Could not unregister the client'
      }),
      users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token !== data.token) {
      ws.send(error);
      return;
    }

    // Unregister the socket, if not already unregistered
    if (clients[data.user]) {
      var i = clients[data.user].indexOf(ws);
      if (i !== -1) {
        clients[data.user].splice(i, 1);
      }
    }

    // Let the clients know that an unregistration succeeded
    broadcast(data.user, {
      type: 'client:unregistered'
    });
  });
}

// Request a one-time use passcode (for connecting a mobile device)
//
// Idempotent
//
function getPasscode(ws, data) {
  var error = JSON.stringify({
        type: 'passcode:get',
        error: 'Could not enable passcodes'
      }),
      users = nano.db.use('users'),
      passcodes = nano.db.use('passcodes');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token != data.token) {
      ws.send(error);
      return;
    }

    // Are passcodes currently being generated?
    if (!timers[data.user]) {
      generatePasscode(data.user);
      return;
    }

    // Does a valid passcode already exist?
    if (body.passcode) {
      passcodes.get(body.passcode, function(err, body) {

        // Has the passcode been deleted?
        if (err) {
          generatePasscode(data.user);
          return;
        }

        // Has the passcode expired?
        var date = new Date(body.expires);
        if (date.getTime() < Date.now()) {
          generatePasscode(data.user);
          return;
        }

        // Reply with the existing passcode
        ws.send(JSON.stringify({
          type: 'passcode:current',
          data: {
            passcode: body._id,
            expires: body.expires
          }
        }));
      });
    }
    else {
      generatePasscode(data.user);
      return;
    }
  });
}

// Generate a passcode (delete any existing passcodes that have expired)
function generatePasscode(user) {
  
  var error = JSON.stringify({
        type: 'passcode:current',
        error: 'Could not generate a passcode'
      }),
      passcode = uuid.v4().substr(0, 4),
      expires = new Date(Date.now() + (1000 * 60 * 5)),
      users = nano.db.use('users'),
      passcodes = nano.db.use('passcodes');

  users.get(user, function(err, user_body) {
    // Clear the old timer
    if (timers[user]) {
      clearTimeout(timers[user]);
      timers[user] = undefined;
    }

    // Delete the old passcode
    if (user_body.passcode) {
      passcodes.get(user_body.passcode, function(err, body) {
        if (err) {
          // Passcode has already been deleted
          return;
        }

        passcodes.destroy(body._id, body._rev, function(err, body) {
          // Handle errors
        });
      });
    }
    // Insert the new passcode
    passcodes.insert(
      {
        _id: passcode,
        user: user,
        expires: expires.toString()
      },
      function(err, body) {
        if (err) {
          ws.send(error);
          return;
        }
        console.log("Passcode set (expires " + expires + ")");

        // Store the timer ID and current passcode in the user database
        user_body.passcode = passcode;
        users.insert(user_body, function() {
          // Handle errors
        });

        // Broadcast the new passcode to clients
        var success = broadcast(user, {
          type: 'passcode:current',
          data: {
            passcode: passcode,
            expires: expires.toString()
          }
        });

        if (success) {
          // Set timer for the next passcode generation
          timers[user] = setTimeout(
            function() {
              generatePasscode(user);
            },
            expires.getTime() - Date.now()
          );
        }
      }
    );
  });
}

// Consume an auth token
function usePasscode(ws, data) {
  var error = JSON.stringify({
        type: 'passcode:use',
        error: 'Could not authenticate with the given passcode'
      }),
      users = nano.db.use('users'),
      passcodes = nano.db.use('passcodes');

  // Is this a valid request?
  passcodes.get(data.passcode, function(err, passcodeDoc) {
    if (err) {
      ws.send(error);
      return;
    }

    // Has the passcode expired?
    if ((new Date(passcodeDoc.expires)).getTime() < Date.now()) {
      ws.send(error);
      return;
    }

    // Fetch the associated user URL
    users.get(passcodeDoc.user, function(err, body) {
      if (err) {
        ws.send(error);
        return;
      }

      // Stop generating passcodes
      if (timers[body._id]) {
        clearTimeout(timers[body._id]);
        timers[body._id] = undefined;
      }

      // Delete the old passcode
      passcodes.destroy(passcodeDoc._id, passcodeDoc._rev, function(err, body) {
        // Handle errors
      });

      // Delete reference to the old passcode
      body.passcode = undefined;
      users.insert(body, function() {
        // Handle errors
      });

      // Return the user credentials
      ws.send(JSON.stringify({
        type: 'passcode:authenticated',
        data: {
          user: body._id,
          token: body.user_token
        }
      }));

      // Broadcast that a passcode was successfully used
      broadcast(body._id, {
        type: 'passcode:used',
        data: {
          passcode: data.passcode
        }
      });
    });
  });
}

// Get aspirational goal
function getGoal(ws, data) {
  var error = JSON.stringify({
        type: 'goal:get',
        error: 'Failed to update the weekly goal'
      }),
      users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token !== data.token) {
      ws.send(error);
      return;
    }

    // Send goal information
    ws.send(JSON.stringify({
      type: 'goal:get',
      data: {
        miles: body.goal ? body.goal : 0
      }
    }));
  });
}

// Set aspirational goal
function setGoal(ws, data) {
  var error = JSON.stringify({
        type: 'goal:set',
        error: 'Failed to update the weekly goal'
      }),
      users = nano.db.use('users'),
      changed = false;

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token !== data.token) {
      ws.send(error);
      return;
    }

    // Set goal information
    changed = (body.goal != data.miles);
    body.goal = data.miles;

    // Update the user document
    users.insert(body, function(err, body, header) {
      if (err) {
        ws.send(error);
        return;
      }

      // Let the client know that the update was successful
      ws.send(JSON.stringify({
        type: 'goal:set',
        success: 'Data successfully set'
      }));

      // Did a change occur? Broadcast it to all clients
      broadcast(data.user, {
        type: 'goal:change',
        data: {
          miles: data.miles
        }
      });
    });
  });
}

// Retrieve weekly goal information
function getWeeklyGoal(ws, data) {
  var error = JSON.stringify({
        type: 'weekly_goal:get',
        error: 'Could not retrieve weekly goal information'
      }),
      users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token != data.token) {
      ws.send(error);
      return;
    }

    // Fetch goal information
    Helpers.getRuns(nano.db.use(body.run_database), function(runs) {
      ws.send(JSON.stringify({
        type: 'weekly_goal:get',
        data: computeWeeklyGoal(runs, body)
      }));
    });
  });
}

// Fetch all existing records
//
// NOTE: Eventually, we may want to convert document ids to 
//       timestamps, to make it possible to fetch a contiguous
//       subset of all available documents without resorting
//       to secondary indices.
function listRuns(ws, data) {
  var error = JSON.stringify({
        type: 'run:list',
        error: 'Could not retrieve runs'
      }),
      users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token != data.token || body.run_database != data.database) {
      ws.send(error);
      return;
    }

    // Fetch the run documents
    Helpers.getRuns(nano.db.use(body.run_database), function(runs) {
      if (!runs) {
        ws.send(error);
        return;
      }

      // Send the list back to the client
      ws.send(JSON.stringify({
        type: 'run:list',
        data: runs
      }));
    });
  });
}

// Fetch the data associated with a particular run
function getRun(ws, data) {
  var error = JSON.stringify({
        type: 'run:get',
        error: 'Could not retrieve run data'
      }),
      users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token !== data.token || body.run_database !== data.database) {
      ws.send(error);
      return;
    }

    // Fetch the run data
    var runs = nano.db.use(body.run_database);
    runs.attachment.get(data.run, 'data.json', function(err, body) {
      if (err) {
        ws.send(error);
        return;
      }

      ws.send('{"type": "run:get", "data": ' + body.toString() + '}');
    });
  });
}

// Fetch trending data
function getTrend(ws, data) {
  var error = JSON.stringify({
        type: 'trend:get',
        error: 'Could not retrieve trending data'
      }),
      users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token !== data.token) {
      ws.send(error);
      return;
    }

    // Fetch the run documents
    Helpers.getRuns(nano.db.use(body.run_database), function(runs) {
      if (!runs) {
        ws.send(error);
        return;
      }

      // Send trending information
      var trend = computeTrendingData(runs, 52);
      ws.send(JSON.stringify({
        type: 'trend:get',
        data: trend
      }));
    });
  });
}

// Passport session setup
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session. Typically,
//   this will be as simple as storing the user ID when serializing, and 
//   finding the user by ID when deserializing. However, since this example 
//   does not have a database of user records, the complete Strava profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Configure the passport strategy
passport.use(new StravaStrategy({
    clientID: process.env.STRAVA_CLIENT,
    clientSecret: process.env.STRAVA_SECRET,
    callbackURL: app.get('hostname') + "/auth/strava/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Create the user (if it doesn't already exist)
    createUser(profile).then(function() {
      // Fetch the user and return it
      var users = nano.db.use('users');
      users.get(profile.emails[0].value, function(err, body) {
        if (!err) { // User exists, return it
          return done(null, body);
        }
        else { 
          // Could not fetch user (!)
          console.log("FATAL ERROR: Could not fetch user profile");
          return done(null, null);
        }
      });
    });
  }
));

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected. If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

// Broadcast a message to all registered clients for a user
function broadcast(user, obj) {
  if (!clients[user]) {
    // No clients registered
    return;
  }

  var i = 0;
  var sent = 0;
  while (i < clients[user].length) {
    try {
      clients[user][i].send(JSON.stringify(obj));
      ++sent;
    }
    catch (err) {
      // Disconnected: remove them from the list of registered clients
      clients[user].splice(i, 1);
      continue;
    }
    i += 1;
  }

  if (sent > 0) {
    return true;
  }
  else {
    return false;
  }
}

// Get weekly goal data from a list of runs
function computeWeeklyGoal(runs, user) {
  var users = nano.db.use('users'),
      rawData = runs.map(function(r) {
        return {
          timestamp: r.timestamp,
          value: r.distance
        };
      }),
      startOfToday = DateRound.floor(new Date()),
      startOfThisWeek = DateRound.floor(startOfToday, 'week'),
      startOfLastWeek = DateRound.floor(startOfThisWeek.getTime() - 1, 'week'),
      distanceThisWeek = sum(startOfThisWeek, undefined, rawData),
      distanceLastWeek = sum(startOfLastWeek, startOfThisWeek, rawData),
      goalThisWeek = 1.1 * distanceLastWeek,
      levelWeeks = 1,
      trend,
      plan,
      i;

  if (user.level)  {
    // Determine how many weeks have elapsed since we started this level
    i = new Date(startOfThisWeek);
    while (i.getTime() > (new Date(user.level_start)).getTime()) {
      i = new Date(i.getTime() - Aggregate.WEEK_IN_MS);
      levelWeeks += 1;
    }

    // TODO: If we've exceeded the number of weeks at this level, start the next level
    plan = Training.weeksAtMileage(user.level);
    if (levelWeeks > plan.weeksAtThisLevel) {
      user.level = plan.milesAtNextLevel;
      user.level_start = startOfThisWeek;
      levelWeeks = 1;

      users.insert(user, function(err, body) {
        if (err) {
          // Handle errors
          return;
        }
      });
    }

    return {
      distanceThisWeek: round(distanceThisWeek / 1609.344, 1),
      goalThisWeek: round(Training.mileageAtWeek(levelWeeks, user.level), 1)
    };
  }
  else if (rawData.length > 0 && rawData[0].timestamp.getTime() < startOfLastWeek) {
    // We have enough information to set the level
    trend = computeTrendingData(runs, 1);
    plan = Training.weeksAtMileage(trend.distanceByWeek[0].sum);
    user.level = plan.milesAtNextLevel;
    user.level_start = startOfThisWeek;

    // Set the level
    users.insert(user, function(err, body) {
      if (err) {
        // Handle errors
        return;
      }
    });

    return {
      distanceThisWeek: round(distanceThisWeek / 1609.344, 1),
      goalThisWeek: round(Training.mileageAtWeek(1, user.level), 1)
    };
  }

  // We don't have enough history to compute a weekly goal
  return {
    distanceThisWeek: round(distanceThisWeek / 1609.344, 1),
    goalThisWeek: null
  };
}

// Get trending data for the last number of weeks
function computeTrendingData(runs, weeks) {
  var rawDistanceData = runs.map(function(r) {
        return {
          timestamp: r.timestamp,
          value: r.distance
        };
      }),
      rawPaceData = runs.map(function(r) {
        return {
          timestamp: r.timestamp,
          value: r.pace
        };
      }),
      startOfToday = DateRound.floor(new Date()),
      startOfThisWeek = DateRound.floor(startOfToday, 'week'),
      distanceByWeek = Aggregate.sum(startOfThisWeek, weeks, Aggregate.WEEK_IN_MS, rawDistanceData);
      paceByWeek = Aggregate.average(startOfThisWeek, weeks, Aggregate.WEEK_IN_MS, rawPaceData);

  // Compile run data for the last few weeks
  return {
    distanceByWeek: distanceByWeek.map(function(w) {
      w.sum = round(w.sum / 1609.344, 1);
      return w;
    }),
    paceByWeek: paceByWeek
  };
}

// Crunch the data for a specific user and broadcast any updates
function analyzeDataFor(user) {
  var users = nano.db.use('users');

  users.get(user, function(err, body) {
    if (err) {
      // User does not exist
      return;
    }

    Helpers.getRuns(nano.db.use(body.run_database), function(runs) {
      if (runs) {

        // Broadcast the list of runs
        broadcast(user, {
          type: 'run:list',
          data: runs
        });

        // Broadcast the trending data
        broadcast(user, {
          type: 'trend:change',
          data: computeTrendingData(runs, 52)
        });

        // Broadcast the weekly goal
        broadcast(user, {
          type: 'weekly_goal:change',
          data: computeWeeklyGoal(runs, body)
        });
      }
    });
  });
}

// Create a user with their email as the primary identifier (idempotent)
function createUser(user) {

  var email = '';
  var givenName = '';
  var familyName = '';

  if (user.provider == 'strava') {
    email = user.emails[0].value;
    givenName = user.name.givenName;
    familyName = user.name.familyName;
  }

  // Get the document name
  var documentName = email;

  return new Promise(function(resolve) {
    // Does a user document already exist?
    var users = nano.db.use('users');
    users.get(documentName, function(err, body) {
      if (err) { // No, create it and return the new user

        // Calculate the run database name
        var databaseName = "z" + uuid.v4();

        // Calculate the user token
        var userToken = uuid.v4();

        // Create the user document
        users.insert(
          {
            "strava_id": user.id,
            "name": givenName,
            "familyName": familyName,
            "run_database": databaseName,
            "user_token": userToken
          },
          documentName,
          function(err, body, header) {
            // Create the run database
            if (!err) {
              console.log("User created");
            }
            var runs = nano.db.create(databaseName, function(err, body) {
              if (!err) {
                console.log("Run database created");

                // Done with this, resolve the promise
                resolve();
              }
            });
          }
        );
      }
      else { // Yes, resolve the promise
        console.log("User already exists");
        resolve();
      }
    });
  });
}
