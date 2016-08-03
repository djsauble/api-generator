# Forrest Cruise

Running is a journey, not a destination. Forrest Cruise is an app which helps
you stay fit and focused over the years and decades of your running journey.

## Before you begin

### Dependencies

This application depends on a few services. Configure those first.

#### CouchDB *database*

1. Install [CouchDB](http://couchdb.apache.org) (or use a SAAS solution like
[Cloudant](https://cloudant.com))
2. Create the following empty databases
  1. users
  2. tokens

#### Strava *authentication*

The app uses the Strava OAuth2 API to authenticate users. In the future,
we may add support additional APIs, but for now:

1. Sign up for a [Strava](https://www.strava.com) account
2. Create a [new application](https://www.strava.com/settings/api)
3. For the **Authorization Callback Domain**, enter the domain where your app is
   hosted (`localhost` is whitelisted, so don't bother)
4. Take note of the **Client ID** and **Client Secret**, as you'll need them to
   set the environment variables

#### Google Maps *mapping*

Finally, the app uses the Google Maps API to show the map for each route. You'll
need your own API key to use Google Maps.

1. Go to the [Google Maps API](https://developers.google.com/maps/web/) docs
2. Click **Get a Key** and follow the directions
3. Take note of the key, as you'll need it to set the environment variables

### Environment variables

To keep sensitive information from leaking to the client, set the following
variables in each environment where the application will be run.

    # Security
    CACHE_SECRET=xxxxx                         # Used by Express to ensure privacy

    # Application
    CALLBACK_URL=http://url                    # The base URL of the application
    WEBSOCKET_URL=wss://url/api                # The base URL of the WebSocket API

    # Database
    COUCHDB_DATABASE_URL=https://user:pswd@url # The base URL of CouchDB

    # Mapping
    GOOGLE_MAPS_API_KEY=xxxxx                  # Your Google Maps API key

    # Authentication
    STRAVA_CLIENT=xxxxx                        # Your Strava application client ID
    STRAVA_SECRET=xxxxx                        # Your Strava application secret

### Install

    $ npm install

## Development workflow

Every time you make a change, run grunt to lint and compile the code.

    $ grunt

If you want to skip tests:

    $ grunt install

If you **only** want to run tests:

    $ grunt test

To run the server and view the UI in browser:

    $ node app.js
    $ open http://localhost:3000

*NOTE: The server only needs to be restarted when changing the server-side
code (the `app.rb` file in the root directory)*

## API Documentation

We use a REST API to submit new runs to the service, and WebSockets for
everything else.

The base URL for API calls is `protocol://your-domain/api`, where protocol is
http[s] for REST calls and ws[s] for WebSocket calls.

### REST API

#### Submit a run to the service

`PUT /api/runs?user=your-user-id&token=your-user-token`

A run is represented as an array of objects. Each object consists of a
timestamp, latitude, longitude, and other attributes for that point in time.

An example:

    {
      // The point in time
      "timestamp": "2016-07-13 17:47:43 +0000",

      // The point in space
      "latitude": "45.445935388524"
      "longitude": "-122.680137803176",

      // The 90% confidence interval of the measurement (in meters)
      "accuracy": "4.47749902932385",

      // The current speed (in meters per second)
      "speed": "2.38087475514676",
    }

PUT an array of these objects to the URL above. A few additional pieces of
information will be calculated automatically.

**Upload timestamp**
The date the run was uploaded

**Created by**
The ID of the user who uploaded the run

**Distance**
The distance represented by the timeseries data

**NOTE: See the *Passcodes* section below for information about how to retrieve
your user ID and user token programmatically.**

### WebSocket API

Most of the API is only available via the WebSocket API. This is for the sake of
performance and to enable the server to push updates to clients, rather than
depending on poll.

An initial connection is established by opening a WebSocket connection to
`wss://your-domain/api`. To authenticate as a client, send the following
request:

    {
      type: 'authenticate',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

At this point, the server will keep the connection open and you may send
requests and receive responses from the server.

In addition, the server may send you messages to indicate unsolicited messages
when things change on the server.  Be prepared to receive these messages the
same as any other response.

The only request which may be made unauthenticated is the **passcodes:use**
request, the usage of which is outlined in the following section.

#### Passcodes

To help bootstrap the process of getting the user token, users can create
one-time use passcodes which expire after a short period of time. They return
the full user token when used.

To keep the account secure, passcodes should only be enabled while connecting a
new device

##### Enable passcodes

Enable passcodes for the specified user ID:

    {
      type: 'passcodes:enable',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

A valid passcode will be returned as follows:

    {
      type: 'passcodes:current',
      data: {
        passcode: 'a0c1',
        expires: 'Wed Aug 03 2016 13:26:52 GMT-0700 (PDT)'
      }
    }

When the passcode expires, it will be invalidated and a new passcode sent. This
will repeat until passcodes are disabled for the user.

##### Use a passcode **unauthenticated**

To use a passcode, the client should send the following request:

    {
      type: 'passcodes:use',
      data: {
        passcode: 'a0c1'
      }
    }

If the passcode is valid, the associated user ID and token will be sent to the
client. The old passcode will then be invalidated and a new one generated.

    {
      type: 'passcodes:authenticated',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

In addition, a message will be sent to the original connection which enabled
passcodes, letting them know that a client successfully connected. 

    {
      type: 'passcodes:used',
      data: {
        passcode: 'a0c1'
      }
    }

For subsequent connection attempts, the client should use the user ID and token
to authenticate.

If the passcode is invalid, the following message will be sent to the client.

    {
      type: 'passcodes:invalid',
      data: {
        error: 'Invalid passcode'
      }
    }

In addition, a message will be sent to the original connection which enabled
passcodes, letting them know that a client failed to connect.

    {
      type: 'passcodes:attempt',
      data: {
        passcode: 'a0c2'
      }
    }

##### Disable passcodes

Disable passcodes for the specified user ID:

    {
      type: 'passcodes:disable',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

Any outstanding passcodes will be invalidated.

#### Data

There are multiple tiers of data that can be retrieved over the WebSocket API.

1. **Tier 1** is the raw data you submitted to the service (no analysis)
2. **Tier 2** is about your progress as a runner over time (historical analysis)
3. **Tier 3** is about how to get better as a runner (future analysis)

Unlike most running apps, which focus on tier 1 and tier 2 data, Forrest Cruise
is almost entirely about this valuable tier 3 data. The reason the first two
tiers exist is so that you have the ability to generate your own tier 3 data if
you so desire, but we don't expect clients to consume them heavily.

The other reason these tiers exist is that it reflects the flow of data within
the service itself. For example, uploading a new run causes the historical and
future analysis to be recalculated, but altering your future goals has no impact
on the raw data or historical analysis underlying them.

As a developer this can help you intuitively understand the performance impact
of making changes to a given tier. Tier 3 is the best place to stay, generally
speaking.

##### Tier 1 *Raw data*

###### List of runs

Get a list of runs, including metadata but excluding the raw route data.

    {
      type: 'raw:runs',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

The run data will be returned as follows:

    {
      type: 'raw:runs',
      data: [
        {
          _id: 'c7818cf0-8a2b-4ff8-8cd2-4098286128f9',
          created_by: 'djsauble@gmail.com',
          timestamp: 'Wed Aug 03 2016 13:26:52 GMT-0700 (PDT)',
          distance: '6084.1137'
        },
        ...
      ]
    }

###### Run details

To get the raw data for a specific run:

    {
      type: 'raw:run',
      data: {
        run: 'run-id',
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

The run data will be returned as follows:

{
  type: 'raw:run',
  data: [
    {
      "timestamp": "2016-07-13 17:47:43 +0000",
      "latitude": "45.445935388524"
      "longitude": "-122.680137803176",
      "accuracy": "4.47749902932385",
      "speed": "2.38087475514676",
    },
    ...
  ]
}

##### Tier 2 *Historical analysis*

###### Set start of training period

TBD

###### Get distance over time

TBD

###### Get trend over time

TBD

##### Tier 3 *Future analysis*

###### Set long-term goal

To set the number of miles per week the user would like to be able to run:

    {
      type: 'future:goal',
      data: {
        miles: 40.0,
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

When this value changes, the server will send the following to all clients:

    {
      type: 'future:goal',
      data: {
        miles: 40.0
      }
    }

###### Get weekly goal

To get the number of miles to run this week, along with related information:

    {
      type: 'future:week',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

The goal data will be returned (and whenever it changes), with:

    {
      type: 'future:week',
      data: {
        distanceThisWeek: 10.0,
        goalThisWeek: 20.0
      }
    }
