var _ = require('underscore');
var express = require('express');
var StravaStrategy = require('passport-strava-oauth2').Strategy;
var passport = require('passport');
var uuid = require('uuid');
var http = require('http');
var Buffer = require('Buffer');

// What port to listen on?
var PORT = 3000;

// Get the URI components for database operations
var HTTP_OPTIONS = httpOptions();

// Construct a base path for the database, including auth credentials
var host = `${HTTP_OPTIONS.protocol}\/\/${HTTP_OPTIONS.auth ? HTTP_OPTIONS.auth + '@' : ''}${HTTP_OPTIONS.hostname}${HTTP_OPTIONS.port ? ':' + HTTP_OPTIONS.port : ''}`;

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
    clientID: '12528',
    clientSecret: '06b9e1c06bb52c17a3ce177293400e539accda7a',
    callbackURL: `http:\/\/127.0.0.1:${PORT}/auth/strava/callback`,
  },
  function(accessToken, refreshToken, profile, done) {
    // Create the user (if it doesn't already exist)
    createUser(profile).then(function() {
      // Fetch the user and return it
      var path = `/users/${profile.emails[0].value}`;
      http.get(`${host}${path}`, (res) => {
        if (res.statusCode === 200) { // User exists, return it
          res.on('data', function(chunk) {
            var parsed = JSON.parse(chunk);
            return done(null, parsed);
          });
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

// Create a server instance
var app = express();

// Configure the server
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(require('serve-static')(__dirname + '/public'));
app.use(require('cookie-parser')());
app.use(require('body-parser').json());
app.use(require('express-session')({
  secret: 'yea blurg matey',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', ensureAuthenticated, function(req, res) {
  var requestURL = `${req.protocol}:\/\/${req.hostname}:${PORT}`;
  res.render('index', {
    requestURL: requestURL,
    host: host,
    user: req.user
  });
});

app.get('/account', ensureAuthenticated, function(req, res) {
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res) {
  res.render('login', { user: req.user });
});

// Create a new record (extension point)
app.put('/api/:database_id', function(req, res) {

  var database = req.params.database_id;
  var user = req.query.user;
  var token = req.query.token;
  var data = req.body;

  // Does the given user own the specified database and token key?
  var path = `/users/${user}`;
  http.get(`${host}${path}`, (res) => {
    res.on('data', function(chunk) {
      var parsed = JSON.parse(chunk);

      // Is this a valid request?
      if (parsed.user_token != token || parsed.run_database != database) {
        return;
      }

      // Generate a unique identifier for the run
      var runId = uuid.v4();

      // Get the path to the new document
      var path = `/${parsed.run_database}/${runId}`;

      // Create the run document
      var req = http.request(
        _.extend(HTTP_OPTIONS, {
          path: path
        }),
        (res) => {
        res.on('data', function(chunk) {
          var parsed = JSON.parse(chunk);

          // Create the attachment
          var req = http.request(
            _.extend(HTTP_OPTIONS, {
              path: `${path}/data.json`,
              headers: {
                'Content-Type': 'text/json',
                'If-Match': parsed.rev
              }
            }),
            (res) => {
            if (res.statusCode === 201) {
              console.log("Run uploaded");
            }
          });

          // Write the document
          req.write(JSON.stringify(data, null, 2));

          // End the request
          req.end();
        });
      });

      // Write the document
      req.write(JSON.stringify({
        created_by: user,
        timestamp: (new Date).toString()
      }));

      // End the request
      req.end();

      // Upload the attachment
    });
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

app.listen(PORT, function() {
  console.log(`Listening on port ${PORT}`);
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected. If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
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

  // Construct the document URI
  var path = `/users/${documentName}`;

  return new Promise(function(resolve) {
    // Does a user document already exist?
    http.get(`${host}${path}`, (res) => {
      if (res.statusCode !== 200) { // No, create it and return the new user

        // Calculate the run database name
        var databaseName = `z${uuid.v4()}`;

        // Calculate the user token
        var userToken = uuid.v4();

        // Build the user data payload
        var data = JSON.stringify({
          "strava_id": user.id,
          "name": givenName,
          "familyName": familyName,
          "run_database": databaseName,
          "user_token": userToken
        });

        // Create the user document
        var req = http.request(
          _.extend(HTTP_OPTIONS, {
            path: path
          }),
          (res) => {
          if (res.statusCode === 201) {
            console.log("User document created");
          }
        });

        // Write the document
        req.write(data);

        // End the request
        req.end();

        // Create the run database
        var req = http.request(
          _.extend(HTTP_OPTIONS, {
            path: `/${databaseName}/`,
          }),
          (res) => {
          if (res.statusCode === 201) {
            console.log("Run database created");

            // Done with this, resolve the promise
            resolve();
          }
        });

        // End the request
        req.end();
      }
      else { // Yes, resolve the promise
        console.log("User already exists");
        resolve();
      }
    });
  });
}

// Return an options hash for HTTP requests
function httpOptions() {

  // Database username
  var username = process.env.COUCHDB_DATABASE_USERNAME;

  // Database password
  var password = process.env.COUCHDB_DATABASE_PASSWORD;

  // Auth string `username:password`
  var auth = undefined;
  if (!username) {
    username = '';
  }
  if (!password) {
    password = '';
  }
  if (!!username || !!password) {
    auth = `${username}:${password}`
  }

  // Database URL
  var api = process.env.COUCHDB_DATABASE_URL;
  var strings = api.split('://');
  strings[1] = strings[1].replace(/\/$/, '');
  var strings2 = strings[1].split(':');

  // HTTP or HTTPS?
  var protocol = strings[0];

  // Hostname
  var hostname = strings2[0];

  // Database port
  var port = strings2[1];
  if (!port) {
    port = '';
  }

  // Default options
  return {
    protocol: `${protocol}:`,
    hostname: hostname,
    port: port,
    auth: auth ? auth : undefined,
    method: 'PUT',
    headers: {
      'Content-Type': 'text/json'
    }
  };
}
