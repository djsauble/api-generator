= Build

    $ cd $APP_ROOT/app
    $ npm install
    $ watchify app.js -o ../public/js/bundle.js

= Run

    $ cd $APP_ROOT
    $ ruby app.rb
    $ open localhost:4567
