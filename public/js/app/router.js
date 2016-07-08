$(function(exports) {
  var ns = "Forrest",
      Router = Backbone.Router.extend({

        initialize: function() {
          // Instance variables
          this.currentView = null;
          this.loadingData = true;

          // Container for the app
          this.el = $(".main");

          this.listenToOnce(Forrest.runs, "processed", function() {
            // Let the app know that data is available for display
            this.loadingData = false;

            // Remove the loading indicator
            $(".loading").remove();

            if (Forrest.runs.length == 0) {
              // Prompt people to install the app, if they haven't already
              this.navigate("app");
              this.switchView(Forrest.AppView);
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
          this.currentView = new view;
          if (!this.loadingData) {
            this.el.html(this.currentView.render().el);
          }
        },

        dashboard: function() {
          this.switchView(Forrest.DashboardView);
        },

        app: function() {
          this.switchView(Forrest.AppView);
        },

        goal: function() {
          this.switchView(Forrest.GoalView);
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    router: new Router
  });
}(typeof exports === 'undefined' ? window : exports));
