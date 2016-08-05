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
`wss://your-domain/api`. At this point, the server will keep the connection
open and you may send requests and receive responses from the server.

The server supports both unicast and broadcast communication. If you send a
request to the server, you will receive a response (or an error if the request
could not be fulfilled).

The server may also broadcast messages to all registered clients. This
is to keep all clients in sync when data changes on the backend. For example, if
you change goal information, all clients will be apprised of that change.

Every request to the server must include user credentials, along with any other
data required by the request. To make it easier to retrieve these credentials on
mobile clients, we provide a one-time use passcode API, outlined in the sections
below.

#### Registration

The server will only send you broadcast updates if you register for them.

##### Register

To register for broadcast updates, stringify the following JSON object and send
it over the WebSocket connection:

**Request**

    {
      type: 'client:register',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

**Response** (broadcast to all registered clients)

    {
      type: 'client:registered'
    }

##### Unregister

To unregister for broadcast updates, send the following JSON object:

**Request**

    {
      type: 'client:unregister',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

**Response** (broadcast to all registered clients)

    {
      type: 'client:unregistered'
    }

#### Passcodes

To help bootstrap the process of getting the user token, users can create
one-time use passcodes which expire after a five minutes. They return
the full user ID and token when used.

First, you must enable passcodes. They will automatically refresh on expiry,
and the new passcode will be broadcast to all clients. When a valid passcode is
successfully used, passcode generation is disabled.

##### Enable passcodes

To enable passcodes for the specified user ID:

**Request**

    {
      type: 'passcode:get',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

**Response** (broadcast immediately, and every five minutes therafter)

    {
      type: 'passcode:current',
      data: {
        passcode: 'a0c1',
        expires: 'Wed Aug 03 2016 13:26:52 GMT-0700 (PDT)'
      }
    }

##### Use a passcode

To use a valid passcode:

**Request**

    {
      type: 'passcode:use',
      data: {
        passcode: 'a0c1'
      }
    }

**Response**

    {
      type: 'passcode:authenticated',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

**Response** (broadcast to all clients)

    {
      type: 'passcode:used',
      data: {
        passcode: 'a0c1'
      }
    }

If an invalid passcode is used, the following message will be sent instead:

**Response**

    {
      type: 'passcode:use',
      error: 'Could not authenticate with the given passcode'
    }

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

**Request**

    {
      type: 'run:list',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

**Response**

    {
      type: 'run:list',
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

If the list of runs should change, a `run:list` message will be broadcast to all
registered clients.

###### Run details

Get the raw data for a specific run. This is an expensive request, and should only
be made at the point of need.

**Request**

    {
      type: 'run:get',
      data: {
        run: 'run-id',
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

**Response**

    {
      type: 'run:get',
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

Set the effective date when training started for your current goal.

**Request**

    {
      type: 'trend:set',
      data: {
        startDate: 'Wed Aug 03 2016 13:26:52 GMT-0700 (PDT)'
      }
    }

**Response**

    {
      type: 'trend:set'
      success: 'Data successfully set'
    }

**Response** (broadcast to all clients, whenever the value changes)

    {
      type: 'trend:change',
      data: {
        startDate: 'Wed Aug 03 2016 13:26:52 GMT-0700 (PDT)'
      }
    }

###### Get recent trending data

To get trending data for the last 10 weeks.

**Request**

    {
      type: 'trend:get',
      data: {
        weeks: 10
      }
    }

**Response**

    {
      type: 'trend:get',
      data: {
        [
          period: 'Wed Aug 01 2016 00:00:00 GMT-0700 (PDT)', // Week start
          sum: 8473.58374 // Distance in meters
        ],
        ...
      }
    }

If the trend changes at any time, it will be broadcast with type `trend:change`.

##### Tier 3 *Future analysis*

###### Set long-term goal

Set the number of miles per week the user would like to be able to run.

**Request**

    {
      type: 'goal:set',
      data: {
        miles: 40.0,
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

**Response**

    {
      type: 'goal:set',
      success: 'Data successfully set'
    }

**Response** (broadcast to all clients, whenever the value changes)

    {
      type: 'goal:change',
      data: {
        miles: 40.0
      }
    }

###### Get weekly goal

Get the number of miles to run this week, along with related information.

**Request**

    {
      type: 'weekly_goal:get',
      data: {
        user: 'your-user-id',
        token: 'your-user-token'
      }
    }

**Response**

    {
      type: 'weekly_goal:get',
      data: {
        distanceThisWeek: 10.0,
        goalThisWeek: 20.0
      }
    }

**Response** (broadcast to all cilents, whenever the value changes)

    {
      type: 'weekly_goal:change',
      data: {
        distanceThisWeek: 10.0,
        goalThisWeek: 20.0
      }
    }
