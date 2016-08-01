var $ = require('jquery');
var Backbone = require('backbone');
var DashboardView = require('./views/dashboard/dashboard');
var SettingsView = require('./views/settings/settings');

var Router = Backbone.Router.extend({
  initialize: function(options) {
    // Instance variables
    this.currentView = null;
    this.loadingData = true;
    this.options = options;

    // Container for the app
    this.el = $(".main");

    this.listenToOnce(options.data, "sync", function() {
      // Let the app know that data is available for display
      this.loadingData = false;

      // Remove the loading indicator
      $(".loading").remove();

      if (options.data.length === 0) {
        // Prompt people to install the app, if they haven't already
        this.navigate("settings");
        this.switchView(SettingsView);
      }
      else if (this.currentView) {
        // Render the current view, if one has been set
        this.el.html(this.currentView.render().el);
      }
    });
  },

  routes: {
    "": "dashboard",       // '/'
    "settings": "settings" // '/app'
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

  settings: function() {
    this.switchView(SettingsView);
  },

  goal: function() {
    this.switchView(GoalView);
  }
});

module.exports = Router;
