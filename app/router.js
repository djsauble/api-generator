var $ = require('jquery');
var Backbone = require('backbone');
var DashboardView = require('./views/dashboard/dashboard');
var AppView = require('./views/app/app');
var GoalView = require('./views/goal/goal');

var Router = Backbone.Router.extend({
  initialize: function(options) {
    // Instance variables
    this.currentView = null;
    this.loadingData = true;
    this.options = options;

    // Container for the app
    this.el = $(".main");

    this.listenToOnce(options.data, "processed", function() {
      // Let the app know that data is available for display
      this.loadingData = false;

      // Remove the loading indicator
      $(".loading").remove();

      if (options.data.length === 0) {
        // Prompt people to install the app, if they haven't already
        this.navigate("app");
        this.switchView(AppView);
      }
      else if (this.currentView) {
        // Render the current view, if one has been set
        this.el.html(this.currentView.render().el);
      }
    });
  },

  routes: {
    "": "dashboard", // '/'
    "app": "app",    // '/app'
    "goal": "goal"   // '/goal'
  },

  switchView: function(view) {
    if (this.currentView) {
      this.currentView.remove();
      this.currentView.unbind();
      this.currentView = null;
    }
    this.currentView = new view(this.options);
    if (!this.loadingData) {
      this.el.html(this.currentView.render().el);
    }
  },

  dashboard: function() {
    this.switchView(DashboardView);
  },

  app: function() {
    this.switchView(AppView);
  },

  goal: function() {
    this.switchView(GoalView);
  }
});

module.exports = Router;
