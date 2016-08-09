var $ = require('jquery');
var Goal = require('./models/goal');
var View = require('./views/main');

$(function() {

  // Global namespace
  Forrest = {};

  // Initialize the goal model
  Forrest.model = new Goal();

  // Initialize the page
  Forrest.view = new View({
    model: Forrest.model
  });
});
