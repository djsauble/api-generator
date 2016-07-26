var _ = require('underscore');
var Backbone = require('backbone');
var Helpers = require('../../helpers');
var regression = require('regression');
var DateNames = require('date-names');
var sum = require('./helpers/timeseries-sum');
var aggregate = require('./helpers/timeseries-aggregate');
var round = require('float').round;

var View = Backbone.View.extend({
  className: "hero dark row",

  initialize: function(options) {

    this.options = options;

    // Display the last day of the given week
    this.renderGoalDate = function(goalAmount, runsByWeek, startOfThisWeek) {
      var actualTrend,
          rateOfChange,
          weeksUntilGoal,
          distance,
          weekIterator,
          i;

      /*********************************************************
       * DEBUG SECTION: Test veracity of polynomial regression *
       *********************************************************/

      // Calculate the trend over the last eight weeks
      i = 0;
      actualTrend = regression('polynomial', runsByWeek.slice(0, 7).map(function(w) {
        return [i++, w.sum];
      }), 2).equation;

      // Extrapolate (no more than a year) into the future to determine 
      // when we will achieve our goal
      weeksUntilGoal = 0;
      for (i = 8; i < 60; ++i) {
        if (actualTrend[0] + actualTrend[1] * i + actualTrend[2] * Math.pow(i, 2) >= goalAmount) {
          break;
        }
        ++weeksUntilGoal;
      }

      // Display the last day of the given week
      weekIterator = new Date(startOfThisWeek.getTime() + (Helpers.DAY_IN_MS * 6));
      for (i = 0; i < weeksUntilGoal; ++i) {
        weekIterator = new Date(weekIterator.getTime() + Helpers.WEEK_IN_MS);
      }
      if (weeksUntilGoal >= 52) {
        console.log("Polynomial regression prediction: n/a");
      }
      else {
        console.log("Polynomial regression prediction: " + DateNames.months[weekIterator.getMonth()] + " " + weekIterator.getDate());
      }

      /*********************
       * END DEBUG SECTION *
       *********************/

      // Calculate a linear regression of the last several weeks
      i = 0;
      actualTrend = regression('linear', runsByWeek.map(function(w) {
        return [i++, w.sum];
      })).equation;
      rateOfChange = ((actualTrend[0] + actualTrend[1]) / actualTrend[1]);

      // If rate of change is negative, we'll never achieve our goal
      if (rateOfChange < 0) {
        return "&mdash;";
      }
      else {
        // Extrapolate (no more than a year) into the future to determine
        // when we will achieve our goal
        weeksUntilGoal = 0;
        distance = runsByWeek[runsByWeek.length - 1].sum;
        for (i = runsByWeek.length; i < 52 + runsByWeek.length; ++i) {
          distance = distance * rateOfChange;
          if (distance >= goalAmount) {
            break;
          }
          ++weeksUntilGoal;
        }

        // Display the last day of the given week
        weekIterator = new Date(startOfThisWeek.getTime() + (Helpers.DAY_IN_MS * 6));
        for (i = 0; i < weeksUntilGoal; ++i) {
          weekIterator = new Date(weekIterator.getTime() + Helpers.WEEK_IN_MS);
        }
        return DateNames.months[weekIterator.getMonth()] + " " + weekIterator.getDate();
      }
    };

    // Display run data for the last eight weeks
    this.renderChart = function(runsByWeek, distanceThisWeek) {
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
    };

    /* Render this again when any distances change */
    this.listenTo(options.data, "change:distance", this.render);
  },

  render: function() {
    var startOfToday = Helpers.getMidnight(new Date()),
        startOfThisWeek = new Date(startOfToday.getTime() - (Helpers.DAY_IN_MS * startOfToday.getDay())),
        startOfLastWeek = new Date(startOfThisWeek.getTime() - Helpers.WEEK_IN_MS), 
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
    runsByWeek = aggregate(startOfThisWeek, trendingWeeks, Helpers.WEEK_IN_MS, rawData);

    // Display the last day of the given week
    goalDateString = this.renderGoalDate(goalAmount, runsByWeek, startOfThisWeek);

    // Add the goal for this week
    runsByWeek.push({
      period: startOfThisWeek,
      sum: runsByWeek[runsByWeek.length - 1].sum * 1.1
    });

    // Display run data for the last eight weeks
    chartHtml = this.renderChart(runsByWeek, distanceThisWeek);

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
  }
});

module.exports = View;
