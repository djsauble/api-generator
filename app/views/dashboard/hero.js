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
    this.runsByWeek = [];

    // Data changed
    this.listenTo(Forrest.bus, 'user:sync', function(data, attributes) {
      this.distanceThisWeek = attributes.distanceThisWeek;
      this.goalThisWeek = attributes.goalThisWeek;
      this.runsByWeek = attributes.runsByWeek;
      this.render();
    });
  },

  render: function() {
    var startOfToday = DateRound.floor(new Date()),
        startOfThisWeek = DateRound.floor(startOfToday, 'week'),
        startOfLastWeek = DateRound.floor(startOfThisWeek.getTime() - 1, 'week'),
        goalAmount = (typeof GOAL === 'undefined' ? null : GOAL),
        distanceLastWeek = 0,
        percentChange = 0,
        remainingThisWeek = 0,
        runArray,
        trendPercentString = null,
        trendDescriptionString = null,
        goalDateString = null,
        chartHtml = null;

    // Calculate trending information if we have the data
    if (this.runsByWeek && this.runsByWeek.length > 0) {
      distanceLastWeek = _.last(this.runsByWeek).sum;
      percentChange = Math.round(((this.distanceThisWeek / distanceLastWeek) - 1) * 100);
      remainingThisWeek = round(this.goalThisWeek - this.distanceThisWeek, 1);

      // WoW change
      if (percentChange < 10) {
        trendPercentString = remainingThisWeek;
        trendDescriptionString = "miles to go this week.";
      }
      else {
        trendPercentString = percentChange + "%";
        trendDescriptionString = "more miles than last week.";
      }

      // Display the last day of the given week
      if (goalAmount) {
        goalDateString = this.getGoalDate(goalAmount, this.runsByWeek, startOfThisWeek);
      }

      // Display run data for the last eight weeks, including this week's goal
      runArray = _.clone(this.runsByWeek);
      runArray.push({
        period: startOfThisWeek,
        sum: this.goalThisWeek
      });
      chartHtml = this.getChartHtml(runArray, this.distanceThisWeek);
    }

    // Render stuff (including trending data, if we have it)
    this.$el.html(
      this.template({
        distanceThisWeek: this.distanceThisWeek,
        goalThisWeek: this.goalThisWeek,
        trendPercentString: trendPercentString,
        trendDescriptionString: trendDescriptionString,
        goalAmount: goalAmount,
        goalDateString: goalDateString,
        chartHtml: chartHtml
      })
    );
    
    return this;
  },

  template: _.template(
    "<p><big><%= distanceThisWeek %></big> of <%= goalThisWeek %> miles this week.</p>" +
    "<% if (trendPercentString) { %>" +
      "<p <%= goalAmount ? \"\" : \"class=\\\'expand\\\'\" %>><big><%= trendPercentString %></big> <%= trendDescriptionString %></p>" +
    "<% } %>" +
    "<% if (goalAmount) { %>" +
      "<p class='expand'><big><%= goalAmount %></big> miles per week by <%= goalDateString %></p>" +
    "<% } %>" +
    "<% if (chartHtml) { %>" +
      "<div class='graph row'><%= chartHtml %></div>" +
    "<% } %>"
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
