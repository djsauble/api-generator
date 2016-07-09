$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "screen column",

        initialize: function() {
        },

        render: function() {
          this.$el.append("<div class='modal'><div>Set a goal! <a href='#'>All done.</a></div></div>");
          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    GoalView: View
  });
}(typeof exports === 'undefined' ? window : exports));
