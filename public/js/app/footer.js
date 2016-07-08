$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "footer dark",

        render: function() {
          this.$el.html(
            "<span> PUT your data to <a href='" +
            APPLICATION_DATA_URL +
            "'>" +
            escape(APPLICATION_DATA_URL) +
            "</a></span>"
          );

          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    FooterView: View
  });
}(typeof exports === 'undefined' ? window : exports));
