var $ = require('jquery');
var Backbone = require('backbone');
var DashboardView = require('./views/dashboard/dashboard');
var SettingsView = require('./views/settings/settings');
var ConnectedView = require('./views/connected');

var Router = Backbone.Router.extend({
  initialize: function() {
    // Child screens
    this.dashboardView = new DashboardView();
    this.settingsView = new SettingsView();

    // Global components (visible on all screens)
    this.connectedView = new ConnectedView();

    this.listenToOnce(Forrest.bus, "runs:sync", function(runs) {
      // Remove the loading indicator
      $(".loading").remove();
    });
  },

  routes: {
    "": "dashboard",       // '/'
    "settings": "settings" // '/app'
  },

  switchView: function(view) {
    if (this.currentView) {
      this.currentView.remove();
      this.currentView = null;
    }
    this.currentView = view;
    this.currentView.render();

    //
    // HACK: to make Google maps display correctly when you switch to the 
    //       settings view then back to the dashboard view
    //
    if (this.currentView === this.dashboardView) {
      var map = this.currentView.viewer.map;
      if (map.bounds) {
        map.fitMap(map);
      }
    }
  },

  dashboard: function() {
    this.switchView(this.dashboardView);
  },

  settings: function() {
    this.switchView(this.settingsView);
  }
});

module.exports = Router;
