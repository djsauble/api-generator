var Backbone = require("backbone");
var $ = require("jquery");
var Runs = require("./models/runs");
var Router = require("./router");

$(function() {
  // Initialize the app
  var runs = new Runs({
    host: HOST,
    database: DATABASE,
    user: USER_ID,
    token: USER_TOKEN
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
    }
  });
});
