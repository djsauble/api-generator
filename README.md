# Environment setup

Set the following environment variables

    CACHE_SECRET=something_super_secret        # Used by Express to ensure privace
    CALLBACK_URL=http://localhost:3000         # The base URL of the application
    COUCHDB_DATABASE_URL=http://localhost:5984 # The base URL of CouchDB, including any auth credentials

As noted above, you need a CouchDB instance for the application to talk to.
Create a database named `users`.

# Build

    $ npm install
    $ watchify ./app/app.js -o ./public/js/bundle.js

# Run

    $ node app.js
    $ open localhost:3000
