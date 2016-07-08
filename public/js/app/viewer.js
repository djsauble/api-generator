$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "viewer row",

        initialize: function() {
          // Child components
          this.detail = null;
          this.master = null;

          // Helper methods
          this.displayRun = function(view) {
            // Set the selected class
            this.$(".selected").removeClass("selected");
            view.$el.addClass("selected");

            // Display the run
            this.detail.model = view.model;
            this.detail.render();
          };
        },

        render: function() {
          // Show the list of runs
          this.master = new Forrest.ListView({
            attributes: {
              parent: this
            }
          });
          this.$el.append(this.master.render().el);

          // Show the map
          this.detail = new Forrest.MapView({
            attributes: {
              parent: this
            }
          });
          this.$el.append(this.detail.render().el);

          this.displayRun(this.master.runs[0]);

          return this;
        },

        remove: function() {
          this.undelegateEvents();
          this.detail.remove();
          this.master.remove();
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    ViewerView: View
  });

}(typeof exports === 'undefined' ? window : exports));
