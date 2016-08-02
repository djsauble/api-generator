var Backbone = require('backbone');
var Helpers = require('../../helpers');
var DateNames = require('date-names');
var DateRound = require('date-round');

var View = Backbone.View.extend({
  tagName: "li",

  events: {
    "click": "clicked"
  },

  clicked: function() {
    Forrest.bus.trigger('runs:selected', this.model);
  },

  render: function() {
    var ts = this.model.get('timestamp'),
        now = new Date(),
        startOfToday = DateRound.floor(now),
        startOfYesterday = new Date(startOfToday - Helpers.DAY_IN_MS),
        startOfThisWeek = new Date(startOfToday - (Helpers.DAY_IN_MS * startOfToday.getDay())),
        dayOfWeek = ts.getDay(),
        dayOfMonth = ts.getDate(),
        month = ts.getMonth(),
        year = ts.getYear() + 1900,
        thisYear = now.getYear() + 1900,
        todayString = "Today",
        yesterdayString = "Yesterday",
        shortString = DateNames.days[dayOfWeek],
        longerString = DateNames.months[month] + " " + dayOfMonth,
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
