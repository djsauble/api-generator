var _ = require('underscore');
var express = require('express');
var StravaStrategy = require('passport-strava-oauth2').Strategy;
var passport = require('passport');
var uuid = require('uuid');
var Buffer = require('Buffer');
var nano = require('nano')(process.env.COUCHDB_DATABASE_URL);
var SocketServer = require('ws').Server;
var sum = require('timeseries-sum');
var DateRound = require('date-round');
var round = require('float').round;
var Distance = require('compute-distance');
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
    runs.multipart.insert(
      {
        created_by: user,
        timestamp: (new Date()).toString(),
        distance: getDistance(data)
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
    //else if (request.type == 'goal:get') {
    //  getGoal(ws, request.data);
    //}
    else if (request.type == 'goal:set') {
      setGoal(ws, request.data);
    }
    else if (request.type == 'weekly_goal:get') {
      getWeeklyGoal(ws, request.data);
    }
    //else if (request.type == 'weekly_goal:set') {
    //  setWeeklyGoal(ws, request.data);
    //}
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

        // Broadcast the new passcode to clients
        broadcast(user, {
          type: 'passcode:current',
          data: {
            passcode: passcode,
            expires: expires.toString()
          }
        });

        // Set timer for the next passcode generation
        timers[user] = setTimeout(
          function() {
            generatePasscode(user);
          },
          expires.getTime() - Date.now()
        );

        // Store the timer ID and current passcode in the user database
        user_body.passcode = passcode;
        users.insert(user_body, function() {
          // Handle errors
        });
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

// Set weekly goal information
function setGoal(ws, data) {
  var error = JSON.stringify({
        type: 'goal:set',
        error: 'Failed to update the weekly goal'
      }),
      users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token != data.token) {
      ws.send(error);
      return;
    }

    // Set goal information
    body.goal = data.miles;

    // Update the user document
    users.insert(body, function(err, body, header) {
      if (err) {
        ws.send(error);
        return;
      }
      ws.send(JSON.stringify({
        type: 'goal:set',
        success: 'Weekly goal set'
      }));
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
    getRuns(body.run_database, function(runs) {
      ws.send(JSON.stringify({
        type: 'weekly_goal:change',
        data: computeWeeklyGoal(runs)
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
    getRuns(body.run_database, function(runs) {
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
  users.get(data.user, function(err, body) {
    // Is this a valid request?
    if (body.user_token != data.token || body.run_database != data.database) {
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
  while (i < clients[user].length) {
    try {
      clients[user][i].send(JSON.stringify(obj));
    }
    catch (err) {
      // Disconnected: remove them from the list of registered clients
      clients[user].splice(i, 1);
      continue;
    }
    i += 1;
  }
}

// Get a list of runs from the given database
function getRuns(db, callback) {
  var runs = nano.db.use(db);
  runs.list({include_docs: true}, function(err, body) {
    if (err) {
      callback(null);
      return;
    }

    // Pass data to the callback
    callback(
      body.rows.map(function(r) {
        r.doc.timestamp = new Date(r.doc.timestamp);
        return r.doc;
      }).sort(function(a,b) {
        return a.timestamp.getTime() - b.timestamp.getTime();
      })
    );
  });
}

// Get weekly goal data from a list of runs
function computeWeeklyGoal(runs) {
  var rawData = runs.map(function(r) {
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
      goalThisWeek = 1.1 * distanceLastWeek;

  return {
    distanceThisWeek: round(distanceThisWeek / 1609.344, 1),
    goalThisWeek: round(goalThisWeek / 1609.344, 1)
  };
}

// Calculate distance for a run document
function getDistance(data) {
  var filtered = Distance.filter(data),
      points = Distance.map(filtered),
      distance = Distance.compute(points);

  return distance;
}

// Crunch the data for a specific user and broadcast any updates
function analyzeDataFor(user) {
  var users = nano.db.use('users');

  users.get(user, function(err, body) {
    if (err) {
      // User does not exist
      return;
    }

    getRuns(body.run_database, function(runs) {
      if (runs) {

        // Broadcast the list of runs
        broadcast(user, {
          type: 'run:list',
          data: runs
        });

        // Broadcast the weekly goal
        broadcast(user, {
          type: 'weekly_goal:change',
          data: computeWeeklyGoal(runs)
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
