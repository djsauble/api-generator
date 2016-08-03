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
        if (!err) {
          console.log("Run uploaded");
        }
      }
    );
  });
  res.status(200).end();
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

app.ws('/api', function(ws, req) {
  console.log('Client connected');
  ws.on('message', function(data, flags) {
    var request = JSON.parse(data);
    if (request.type == 'get_token') {
      getToken(ws, request.data);
    }
    else if (request.type == 'refresh_token') {
      refreshToken(ws, request.data);
    }
    else if (request.type == 'use_token') {
      useToken(ws, request.data);
    }
    else if (request.type == 'get_weekly_goal') {
      getWeeklyGoal(ws, request.data);
    }
    else if (request.type == 'set_goal') {
      setGoal(ws, request.data);
    }
    else if (request.type == 'get_docs') {
      getDocs(ws, request.data);
    }
    else if (request.type == 'get_data') {
      getData(ws, request.data);
    }
    else {
      console.log("Unknown websockets request");
    }
  });
  ws.on('close', function() {
    console.log('Client disconnected');
  });
});

app.listen(app.get('port'), function() {
  console.log("Listening on port " + app.get('port'));
});

// Request an auth token (for connecting a mobile device)
function getToken(ws, data) {
  var error = JSON.stringify({
        type: 'token',
        error: 'Could not get a token'
      }),
      users = nano.db.use('users');

  // Is this a valid request?
  users.get(data.user, function(err, body) {
    if (body.user_token != data.token) {
      ws.send(error);
      return;
    }

    // Generate a unique identifier for the app token
    var appToken = uuid.v4().substr(0, 4);

    // Generate an expiry time 15 minutes from now
    var expires = (new Date(Date.now() + (1000 * 60 * 15))).toString();

    // Insert the token
    var tokens = nano.db.use('tokens');
    tokens.insert({
        _id: appToken,
        user: data.user,
        expires: expires
      }, function(err, body) {
      if (err) {
        ws.send(error);
        return;
      }
      console.log("App token set (expires " + expires);
      ws.send(JSON.stringify({
        type: 'token',
        data: {
          token: appToken,
          expires: expires
        }
      }));
    });
  });
}

// Refresh an outstanding token (one that is about to expire, for example)
function refreshToken(ws, data) {
  var error = JSON.stringify({
        type: 'error',
        error: 'Could not refresh the token'
      }),
      users = nano.db.use('users');

  console.log(data);
  users.get(data.user, function(err, body) {
    // Is this a valid request?
    if (body.user_token != data.user_token) {
      ws.send(error);
      return;
    }

    // Delete the existing token
    var tokens = nano.db.use('tokens');
    tokens.get(data.old_token, function(err, tokenDoc) {
      if (err) {
        ws.send(error);
        return;
      }

      tokens.destroy(data.old_token, tokenDoc._rev, function() {
        console.log('Old authentication token has been deleted');

        // Create a new token
        getToken(ws, data.user, data.user_token);
      });
    });
  });
}

// Consume an auth token
function useToken(ws, data) {
  var error = JSON.stringify({
        type: 'error',
        error: 'Could not authenticate with the given token'
      }),
      tokens = nano.db.use('tokens');
  tokens.get(data.token, function(err, tokenDoc) {
    // Is this a valid request?
    if (err || (new Date(tokenDoc.expires)).getTime() < Date.now()) {
      ws.send(error);
      return;
    }

    // Fetch the associated user URL
    var users = nano.db.use('users');
    users.get(tokenDoc.user, function(err, body) {
      if (err) {
        ws.send(error);
        return;
      }

      // Return the API endpoint
      ws.send(JSON.stringify({
        type: 'api',
        data: process.env.CALLBACK_URL + "/api/runs?user=" + body._id + "&token=" + body.user_token
      }));

      // Delete the token doc
      tokens.destroy(data.token, tokenDoc._rev, function() {
        if (!err) {
          console.log('Temporary auth token has been deleted');
        }
      });
    });
  });
}

// Set weekly goal information
function setGoal(ws, data) {
  var error = JSON.stringify({
        type: 'error',
        error: 'Failed to update the weekly goal'
      }),
      users = nano.db.use('users');
  users.get(data.user, function(err, body) {
    // Is this a valid request?
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

      ws.send('{"message": "success"}');
    });
  });
}

// Retrieve weekly goal information
function getWeeklyGoal(ws, data) {
  var error = JSON.stringify({
        type: 'error',
        error: 'Could not retrieve weekly goal information'
      }),
      users = nano.db.use('users');
  users.get(data.user, function(err, body) {
    // Is this a valid request?
    if (body.user_token != data.token) {
      ws.send(error);
      return;
    }

    // Fetch goal information
    var runs = nano.db.use(body.run_database);
    runs.list({include_docs: true}, function(err, body) {
      if (err) {
        ws.send(error);
        return;
      }

      var startOfToday = DateRound.floor(new Date()),
          startOfThisWeek = DateRound.floor(startOfToday, 'week'),
          startOfLastWeek = DateRound.floor(startOfThisWeek.getTime() - 1, 'week'),
          rawData = body.rows.map(function(r) {
            return {
              timestamp: new Date(r.doc.timestamp),
              value: r.doc.distance / 1609.344
            };
          }).sort(function(a,b) {
            return a.timestamp.getTime() - b.timestamp.getTime();
          }),
          distanceThisWeek = round(sum(startOfThisWeek, undefined, rawData), 1),
          distanceLastWeek = round(sum(startOfLastWeek, startOfThisWeek, rawData), 1),
          goalThisWeek = round(1.1 * distanceLastWeek, 1);

      ws.send(JSON.stringify({
        distanceThisWeek: distanceThisWeek,
        goalThisWeek: goalThisWeek
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
function getDocs(ws, data) {
  var error = JSON.stringify({
        type: 'runs',
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
    var runs = nano.db.use(body.run_database);
    runs.list({include_docs: true}, function(err, body) {
      if (err) {
        ws.send(error);
        return;
      }

      // Send the list back to the client
      ws.send(JSON.stringify({
        type: 'runs',
        data: body.rows.map(function(r) {
          r.doc.timestamp = new Date(r.doc.timestamp);
          return r.doc;
        }).sort(function(a,b) {
          return a.timestamp.getTime() - b.timestamp.getTime();
        })
      }));
    });
  });
}

// Fetch the data associated with a particular run
function getData(ws, data) {
  var error = JSON.stringify({
        type: 'error',
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

      ws.send('{"type": "route", "data": ' + body.toString() + '}');
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

// Calculate distance for a run document
function getDistance(data) {
  var filtered = Distance.filter(data),
      points = Distance.map(filtered),
      distance = Distance.compute(points);

  return distance;
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
