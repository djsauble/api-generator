var Backbone = require("backbone");
var $ = require("jquery");
var Runs = require("./models/runs");
var Router = require("./router");

// Load modules
Geo = require("geolocation-distances");

$(function() {
  // Initialize the app
  var runs = new Runs({
    api: CLOUDANT_DATA_URL // Global variable defined on the page itself
  });

  // Initialize the router
  var router = new Router({
    data: runs
  });
  Backbone.history.start();

  // Log events
  runs.once({
    "sync": function(collection) {
      console.log("App is loaded with " + collection.length + " records");
    },
    "processed": function(collection, count) {
      if (count > 0) {
        console.log(count + " missing attributes calculated");
      }
    }
  });
});
