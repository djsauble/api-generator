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
              now = new Date(),
              startOfToday = getMidnight(now),
              startOfYesterday = new Date(startOfToday - DAY_IN_MS),
              startOfThisWeek = new Date(startOfToday - (DAY_IN_MS * startOfToday.getDay())),
              dayOfWeek = ts.getDay(),
              dayOfMonth = ts.getDate(),
              month = ts.getMonth(),
              year = ts.getYear() + 1900,
              thisYear = now.getYear() + 1900,
              todayString = "Today",
              yesterdayString = "Yesterday",
              shortString = getDayName(dayOfWeek),
              longerString = getMonthName(month) + " " + dayOfMonth,
              longestString = longerString + ", " + year,
              mileage = this.model.getMileage(),
              date;

          // Pick the right date format
          if (ts.getTime() >= startOfToday.getTime()) {
            date = todayString;
          }
          else if (ts.getTime() >= startOfYesterday.getTime()) {
            date = yesterdayString;
          }
          else if (ts.getTime() >= startOfThisWeek.getTime()) {
            date = shortString;
          }
          else if (year == thisYear) {
            date = longerString;
          }
          else {
            date = longestString;
          }

          this.$el.html("<a href='#'>" + date + "</a><small>" + mileage + " mi</small>");

          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    RunView: View
  });
}(typeof exports === 'undefined' ? window : exports));
