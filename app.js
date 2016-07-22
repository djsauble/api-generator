var _ = require('underscore');
var express = require('express');
var StravaStrategy = require('passport-strava-oauth2').Strategy;
var passport = require('passport');
var uuid = require('uuid');
var http = require('http');
var Buffer = require('Buffer');
var nano = require('nano')(process.env.COUCHDB_DATABASE_URL);
var SocketServer = require('ws').Server;

// Create a server instance
var app = express();

// Configure the server
app.set('port', process.env.PORT || 3000);
app.set('hostname', process.env.CALLBACK_URL);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(require('serve-static')(__dirname + '/public'));
app.use(require('cookie-parser')());
app.use(require('body-parser').json());
app.use(require('express-session')({
  secret: process.env.CACHE_SECRET,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', ensureAuthenticated, function(req, res) {
  res.render('index', {
    requestURL: process.env.CALLBACK_URL,
    host: process.env.COUCHDB_DATABASE_URL,
    user: req.user
  });
});

app.get('/account', ensureAuthenticated, function(req, res) {
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res) {
  res.render('login', { user: req.user });
});

// Request an auth token (for connecting a mobile device)
app.get('/app', function(req, res) {
  var user = req.query.user;
  var token = req.query.token;

  var users = nano.db.use('users');
  users.get(user, function(err, body) {
    // Is this a valid request?
    if (body.user_token != token) {
      return;
    }

    // Generate a unique identifier for the app
    var appToken = uuid.v4().substr(0, 4);

    // Generate an expiry time 15 minutes from now
    var expires = (new Date(Date.now() + (1000 * 60 * 15))).toString();

    // Insert the token
    var tokens = nano.db.use('tokens');
    tokens.insert({
        _id: appToken,
        user: body._id,
        expires: expires
      }, function(err, body) {
      if (!err) {
        console.log(`App token set (expires ${expires})`);
      }
    });
  });
  res.status(200).end();
});

// Consume an auth token
app.post('/app', function(req, res) {
  var token = req.query.token;
  var url = '';

  var tokens = nano.db.use('tokens');
  tokens.get(token, function(err, body) {
    // Is this a valid request?
    if (err || (new Date(body.expires)).getTime() < Date.now()) {
      reject();
      return;
    }

    // Fetch the associated user URL
    var users = nano.db.use('users');
    users.get(body.user, function(err, body) {
      if (err) {
        reject();
        return;
      }

      resolve();
    });
  });
});

// Create a new record (extension point)
app.put('/api/:database_id', function(req, res) {
  var database = req.params.database_id;
  var user = req.query.user;
  var token = req.query.token;
  var data = req.body;

  // Does the given user own the specified database and token key?
  var users = nano.db.use('users');
  users.get(user, function(err, body) {
    // Is this a valid request?
    if (body.user_token != token || body.run_database != database) {
      return;
    }

    // Generate a unique identifier for the run
    var runId = uuid.v4();

    // Create the run document
    var runs = nano.db.use(body.run_database);
    runs.insert(
      {
        created_by: user,
        timestamp: (new Date).toString()
      },
      runId,
      function(err, body, header) {

        // Insert an attachment
        runs.attachment.insert(
          runId,
          'data.json',
          JSON.stringify(data, null, 2),
          'text/json',
          {
            rev: body.rev
          },
          function(err, body) {
            if (!err) {
              console.log("Run uploaded");
            }
          }
        )
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

app.listen(app.get('port'), function() {
  console.log(`Listening on port ${app.get('port')}`);
});

// Create a WebSockets server instance
var wss = new SocketServer({server: app});

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

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
    callbackURL: `${app.get('hostname')}/auth/strava/callback`,
  },
  function(accessToken, refreshToken, profile, done) {
    // Create the user (if it doesn't already exist)
    createUser(profile).then(function() {
      // Fetch the user and return it
      var users = nano.db.use('users')
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
        var databaseName = `z${uuid.v4()}`;

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
