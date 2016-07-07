$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $(".master_detail"),

        initialize: function() {
          // Instance variables
          this.detailView = null;
          this.runs = [];

          // Helper methods
          this.displayRun = function(view) {
            // Set the selected class
            this.$(".selected").removeClass("selected");
            view.$el.addClass("selected");

            // Display the run
            this.detailView.model = view.model;
            this.detailView.render();
          };

          // DOM elements
          this.list = this.$(".list");
          this.detail = this.$(".detail");

          // Events
          this.listenToOnce(Forrest.runs, "processed", this.render);
        },

        render: function() {
          var listHtml = "";

          // Tabulate the list of runs, with their distance and timestamp
          for (var i = Forrest.runs.length - 1; i >= 0; --i) {
            var run = Forrest.runs.at(i),
                view = new Forrest.RunView({
                  model: run,
                  attributes: {
                    parent: this
                  }
                });

            this.list.append(view.render().el);
            this.runs.push(view);
          }

          // Show the map
          this.runs[0].$el.addClass("selected");
          this.detailView = new Forrest.DetailView({
            model: this.runs[0].model
          });
          this.detailView.render();

          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    masterView: new View
  });

}(typeof exports === 'undefined' ? window : exports));
