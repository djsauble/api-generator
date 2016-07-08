$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "screen column",

        initialize: function() {
        },

        render: function() {
          var htmlString = "";

          this.$el.html("<div class='modal'><img src='images/Download_on_the_App_Store_Badge_US-UK_135x40.svg' alt='Download on the App Store'/></div>");

          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    AppView: View
  });
}(typeof exports === 'undefined' ? window : exports));
