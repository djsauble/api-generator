var _ = require("underscore");
var Backbone = require("backbone");
var $ = require("jquery");
var Runs = require("./models/runs");
var Router = require("./router");

$(function() {

  // Global namespace
  Forrest = {};

  // Initialize the database
  Forrest.runs = new Runs();

  // Initialize the event bus
  Forrest.bus = _.extend({}, Backbone.Events);

  // Initialize the router
  Forrest.router = new Router();
  Backbone.history.start();

  // Log events
  Forrest.bus.once({
    "runs:sync": function(collection) {
      console.log("App is loaded with " + collection.length + " records");
    }
  });
});
