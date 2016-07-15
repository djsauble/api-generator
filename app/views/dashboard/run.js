var Backbone = require('backbone');
var Helpers = require('../../helpers');

var View = Backbone.View.extend({
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
        startOfToday = Helpers.getMidnight(now),
        startOfYesterday = new Date(startOfToday - Helpers.DAY_IN_MS),
        startOfThisWeek = new Date(startOfToday - (Helpers.DAY_IN_MS * startOfToday.getDay())),
        dayOfWeek = ts.getDay(),
        dayOfMonth = ts.getDate(),
        month = ts.getMonth(),
        year = ts.getYear() + 1900,
        thisYear = now.getYear() + 1900,
        todayString = "Today",
        yesterdayString = "Yesterday",
        shortString = Helpers.getDayName(dayOfWeek),
        longerString = Helpers.getMonthName(month) + " " + dayOfMonth,
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

module.exports = View;
