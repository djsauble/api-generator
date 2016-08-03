var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var Runs = require('./models/runs');
var User = require('./models/user');
var Router = require('./router');
var Socket = require('./socket');

$(function() {

  // Global namespace
  Forrest = {};

  // Initialize the event bus
  //
  // NOTE: This is an event aggregator which allows for lose coupling of the
  // different components in the app. Avoid referencing any other globals.
  //
  Forrest.bus = _.extend({}, Backbone.Events);

  // Initialize the database
  Forrest.runs = new Runs();

  // Initialize the user model
  Forrest.user = new User();

  // Initialize the router
  Forrest.router = new Router();
  Backbone.history.start();

  // Log events
  Forrest.bus.once({
    "runs:sync": function(collection) {
      console.log("App is loaded with " + collection.length + " records");
    }
  });

  // Initialize a persistent session for real-time communication
  Forrest.socket = new Socket();
});
