$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "screen column",

        initialize: function() {
        },

        render: function() {
          this.$el.append("<div class='loading'><span>Get the app!</span></div>");
          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    AppView: View
  });
}(typeof exports === 'undefined' ? window : exports));
