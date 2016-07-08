$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "viewer row expand",

        initialize: function() {
          // Child components
          this.map = null;
          this.list = null;

          // Helper methods
          this.displayRun = function(view) {
            // Set the selected class
            this.$(".selected").removeClass("selected");
            view.$el.addClass("selected");

            // Display the run
            this.map.model = view.model;
            this.map.render();
          };
        },

        render: function() {
          // Show the list of runs
          this.list = new Forrest.ListView({
            attributes: {
              parent: this
            }
          });
          this.$el.append(this.list.render().el);

          // Show the map
          this.map = new Forrest.MapView({
            attributes: {
              parent: this
            }
          });
          this.$el.append(this.map.render().el);

          if (this.list.runs.length > 0) {
            this.displayRun(this.list.runs[0]);
          }

          return this;
        },

        remove: function() {
          this.undelegateEvents();
          if (this.map) {
            this.map.remove();
          }
          if (this.list) {
            this.list.remove();
          }
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    ViewerView: View
  });

}(typeof exports === 'undefined' ? window : exports));
