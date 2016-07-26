var _ = require('underscore');
var Backbone = require('backbone');
var regression = require('regression');
var DateNames = require('date-names');
var sum = require('./helpers/timeseries-sum');
var aggregate = require('./helpers/timeseries-aggregate');
var predict = require('./helpers/date-prediction');
var DateRound = require('./helpers/date-round');
var round = require('float').round;

var View = Backbone.View.extend({
  className: "hero dark row",

  initialize: function(options) {
    this.options = options;
  },

  render: function() {
    var startOfToday = DateRound.floor(new Date()),
        startOfThisWeek = DateRound.floor(startOfToday, 'week'),
        startOfLastWeek = DateRound.floor(startOfThisWeek.getTime() - 1, 'week'), 
        runsByWeek = [],
        rawData = this.options.data.map(function(r) {
          return {
            timestamp: r.get('timestamp'),
            value: r.getMileage()
          };
        }),
        distanceThisWeek = round(sum(startOfThisWeek, undefined, rawData), 1),
        distanceLastWeek = round(sum(startOfLastWeek, startOfThisWeek, rawData), 1),
        percentChange = Math.round(((distanceThisWeek / distanceLastWeek) - 1) * 100),
        goalThisWeek = Math.round(10 * 1.1 * distanceLastWeek) / 10,
        remainingThisWeek = Math.round(10 * (goalThisWeek - distanceThisWeek)) / 10,
        goalAmount = 40,
        trendingWeeks = 7,
        trendPercentString,
        trendDescriptionString,
        goalDateString,
        chartHtml;

    // Display trending data
    if (percentChange < 10) {
      trendPercentString = remainingThisWeek;
      trendDescriptionString = "miles to go this week.";
    }
    else {
      trendPercentString = percentChange + "%";
      trendDescriptionString = "more miles than last week.";
    }

    // Compile run data for the last seven weeks
    runsByWeek = aggregate(startOfThisWeek, trendingWeeks, DateRound.WEEK_IN_MS, rawData);

    // Display the last day of the given week
    goalDateString = this.getGoalDate(goalAmount, runsByWeek, startOfThisWeek);

    // Add the goal for this week
    runsByWeek.push({
      period: startOfThisWeek,
      sum: runsByWeek[runsByWeek.length - 1].sum * 1.1
    });

    // Display run data for the last eight weeks
    chartHtml = this.getChartHtml(runsByWeek, distanceThisWeek);

    // Render stuff
    this.$el.html(
      "<p><big>" +
      distanceThisWeek +
      "</big> of " +
      goalThisWeek +
      " miles this week.</p><p><big>" +
      trendPercentString +
      "</big> " +
      trendDescriptionString +
      "</p><p class='expand'><big>" +
      goalAmount +
      "</big> miles per week by " +
      goalDateString +
      "</p><div class='graph row'>" +
      chartHtml +
      "</div>"
    );
    
    return this;
  },

  // Display the last day of the given week
  getGoalDate: function(goalAmount, runsByWeek, startOfThisWeek) {
    var max, prediction, month, day;

    // Set the max horizon for the prediction (three years in the future)
    max = new Date();
    max.setYear(max.getYear() + 1900 + 3);
    
    // Get the prediction
    prediction = predict(goalAmount, runsByWeek.map(function(r) {
      return {
        timestamp: r.period,
        value: r.sum
      };
    }));

    // Is the prediction after today?
    if (prediction.getTime() < Date.now()) {
      return "today";
    }

    // Is the prediction less than three years in the future?
    if (prediction.getTime() < max.getTime()) {
      month = DateNames.months[prediction.getMonth()];
      day = prediction.getDate();
      return month + " " + day;
    }

    return "&mdash;";
  },

  // Display run data for the last eight weeks
  getChartHtml: function(runsByWeek, distanceThisWeek) {
    var chartHtml = "";

    maxDistance = _.max(
      runsByWeek.map(function(w) {
        return w.sum;
      })
    );
    for (var i = 0; i < runsByWeek.length; ++i) {
      chartHtml += "<div class='bar' style='height: " + (runsByWeek[i].sum / maxDistance * 100) + "%;'>";
      if (i == runsByWeek.length - 1) {
        chartHtml += "<div class='bar progress' style='height: " + (distanceThisWeek / runsByWeek[i].sum * 100) + "%;'></div>";
      }
      chartHtml += "</div>";
    }

    return chartHtml;
  }

});

module.exports = View;
