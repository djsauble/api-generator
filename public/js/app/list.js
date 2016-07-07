$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        tagName: "ul",
        className: "list",

        initialize: function() {
          // Instance variables
          this.runs = [];
        },

        render: function() {
          // Tabulate the list of runs
          for (var i = Forrest.runs.length - 1; i >= 0; --i) {
            var run = Forrest.runs.at(i),
                view = new Forrest.RunView({
                  model: run,
                  attributes: {
                    parent: this.attributes.parent
                  }
                });

            this.$el.append(view.render().el);
            this.runs.push(view);
          }

          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    ListView: View
  });

}(typeof exports === 'undefined' ? window : exports));