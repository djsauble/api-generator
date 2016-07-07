$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        tagName: "li",

        events: {
          "click": "clicked"
        },

        clicked: function() {
          this.attributes.parent.displayRun(this);
        },

        render: function() {
          var ts = this.model.get('timestamp'),
              date = (ts.getMonth() + 1) + "/" + ts.getDate() + "/" + (ts.getYear() + 1900),
              mileage = this.model.getMileage();

          this.$el.html("<a href='#'>" + date + "</a><small>" + mileage + " mi</small>");

          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    RunView: View
  });
}(typeof exports === 'undefined' ? window : exports));
