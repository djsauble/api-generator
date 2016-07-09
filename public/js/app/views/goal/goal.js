$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "screen column",

        initialize: function() {
        },

        render: function() {
          var htmlString = "<div class='modal'>" +
                           "<form>" +
                           "<div class='field row'>" +
                           "<label for='miles_per_week'>Miles per week</label>" +
                           "<input id='miles_per_week' name='miles_per_mile' type='number'/>" +
                           "</div>" +
                           "<div class='field row'>" +
                           "<label for='minutes_per_mile'>Minutes per mile</label>" +
                           "<input id='minutes_per_mile' name='minutes_per_mile' type='number'/>" +
                           "</div>" +
                           "<buttons>" +
                           "<button class='set_goal'>Set goal</button> " +
                           "<a href='#'>Nevermind, go back</a>" +
                           "</buttons>" +
                           "</form>" +
                           "</div>";

          this.$el.append(htmlString);

          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    GoalView: View
  });
}(typeof exports === 'undefined' ? window : exports));
