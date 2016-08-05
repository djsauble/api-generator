var _ = require('underscore');
var Backbone = require('backbone');
var DateNames = require('date-names');
var sum = require('timeseries-sum');
var DateAggregate = require('timeseries-aggregate');
var predict = require('date-prediction');
var DateRound = require('date-round');
var round = require('float').round;

var View = Backbone.View.extend({
  className: "hero dark row",

  initialize: function() {
    this.distanceThisWeek = 0;
    this.goalThisWeek = 0;

    //this.runs = [];

    // Data changed
    this.listenTo(Forrest.bus, 'user:sync', function(data, attributes) {
      console.log(data);
      console.log(attributes);
      this.distanceThisWeek = attributes.distanceThisWeek;
      this.goalThisWeek = attributes.goalThisWeek;
      /*this.runs = runs.map(function(r) {
        return {
          timestamp: r.get('timestamp'),
          value: r.getMileage()
        };
      });*/
      this.render();
    });
  },

  render: function() {
    /*
    var startOfToday = DateRound.floor(new Date()),
        startOfThisWeek = DateRound.floor(startOfToday, 'week'),
        startOfLastWeek = DateRound.floor(startOfThisWeek.getTime() - 1, 'week'), 
        runsByWeek = [],
        distanceThisWeek = round(sum(startOfThisWeek, undefined, this.runs), 1),
        distanceLastWeek = round(sum(startOfLastWeek, startOfThisWeek, this.runs), 1),
        percentChange = Math.round(((distanceThisWeek / distanceLastWeek) - 1) * 100),
        goalThisWeek = round(1.1 * distanceLastWeek, 1),
        remainingThisWeek = round(goalThisWeek - distanceThisWeek, 1),
        goalAmount = (typeof GOAL === 'undefined' ? undefined : GOAL),
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
    runsByWeek = DateAggregate.aggregate(startOfThisWeek, trendingWeeks, DateAggregate.WEEK_IN_MS, this.runs);

    // Display the last day of the given week
    if (goalAmount) {
      goalDateString = this.getGoalDate(goalAmount, runsByWeek, startOfThisWeek);
    }

    // Add the goal for this week
    runsByWeek.push({
      period: startOfThisWeek,
      sum: runsByWeek[runsByWeek.length - 1].sum * 1.1
    });

    // Display run data for the last eight weeks
    chartHtml = this.getChartHtml(runsByWeek, distanceThisWeek);
    */

    // Render stuff
    this.$el.html(this.template({
      distanceThisWeek: this.distanceThisWeek,
      goalThisWeek: this.goalThisWeek/*,
      trendPercentString: trendPercentString,
      trendDescriptionString: trendDescriptionString,
      goalAmount: goalAmount,
      goalDateString: goalDateString,
      chartHtml: chartHtml*/
    }));
    
    return this;
  },

  template: _.template(
    "<p><big><%= distanceThisWeek %></big> of <%= goalThisWeek %> miles this week.</p>"/* +
    "<p <%= goalAmount ? \"\" : \"class=\\\'expand\\\'\" %>><big><%= trendPercentString %></big> <%= trendDescriptionString %></p>" +
    "<% if (goalAmount) { %>" +
    "<p class='expand'><big><%= goalAmount %></big> miles per week by <%= goalDateString %></p>" +
    "<% } %>" +
    "<div class='graph row'><%= chartHtml %></div>"*/
  ),

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
