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
    // Data changed
    this.listenTo(Forrest.bus, 'user:change:distanceThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goalThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:runsByWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goal', this.setModel);
  },

  render: function() {
    var startOfToday = DateRound.floor(new Date()),
        startOfThisWeek = DateRound.floor(startOfToday, 'week'),
        startOfLastWeek = DateRound.floor(startOfThisWeek.getTime() - 1, 'week'),
        distanceThisWeek = null,
        distanceLastWeek = 0,
        goalThisWeek = null,
        goal = null,
        percentChange = 0,
        remainingThisWeek = 0,
        runsByWeek = null,
        runArray,
        trendPercentString = null,
        trendDescriptionString = null,
        goalDateString = null,
        chartHtml = null;

    // Calculate trending information if we have the data
    if (this.model && this.model.get('runsByWeek').length > 0) {

      distanceThisWeek = this.model.get('distanceThisWeek');
      goalThisWeek = this.model.get('goalThisWeek');
      runsByWeek = this.model.get('runsByWeek');
      goal = this.model.get('goal');

      distanceLastWeek = _.last(runsByWeek).sum;
      percentChange = Math.round(((distanceThisWeek / distanceLastWeek) - 1) * 100);
      remainingThisWeek = round(goalThisWeek - distanceThisWeek, 1);

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
      if (goal) {
        goalDateString = this.getGoalDate(goal, runsByWeek, startOfThisWeek);
      }

      // Display run data for the last eight weeks, including this week's goal
      runArray = _.clone(runsByWeek);
      runArray.push({
        period: startOfThisWeek,
        sum: goalThisWeek
      });
      chartHtml = this.getChartHtml(runArray, distanceThisWeek);
    }

    // Render stuff (including trending data, if we have it)
    this.$el.html(
      this.template({
        distanceThisWeek: distanceThisWeek,
        goalThisWeek: goalThisWeek,
        trendPercentString: trendPercentString,
        trendDescriptionString: trendDescriptionString,
        goalAmount: goal,
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

  // Set the model for this view if needed, and trigger a render
  setModel: function(model) {
    if (!this.model) {
      this.model = model;
    }
    this.render();
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
