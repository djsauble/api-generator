var _ = require('underscore');
var Backbone = require('backbone');
var DateRound = require('date-round');
var predict = require('date-prediction');

var View = Backbone.View.extend({
  className: "trend dark row",

  initialize: function() {
    this.listenTo(Forrest.bus, 'user:change:distanceThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goalThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goal', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:runsByWeek', this.setModel);
  },

  render: function() {
    var startOfToday = DateRound.floor(new Date()),
        startOfThisWeek = DateRound.floor(startOfToday, 'week'),
        runArray,
        goal = 0,
        goalDateString = '&mdash;',
        chartHtml = '';

    if (this.model && this.model.get('runsByWeek').length > 0 && this.model.get('goalThisWeek')) {
      // Copy the weekly summary
      runArray = _.clone(this.model.get('runsByWeek'));

      // Include this week's goal, if available
      runArray.push({
        period: startOfThisWeek,
        sum: this.model.get('goalThisWeek')
      });

      // If a goal has been set, display our prediction
      if (this.model.get('goal')) {
        goalDateString = this.getGoalDate(
          this.model.get('goal'),
          this.model.get('runsByWeek'),
          startOfThisWeek
        );
      }

      // Get the chart HTML
      chartHtml = this.getChartHtml(runArray, this.model.get('distanceThisWeek'));
    }

    this.$el.html(
      this.template({
        chartHtml: chartHtml,
        goalDateString: goalDateString
      })
    );

    return this;
  },

  template: _.template(
    "<div class='graph row'><%= chartHtml %></div>" +
    "<p>On track to hit goal by <big><%= goalDateString %></p>"
  ),

  // Set the model for this view if needed, and trigger a render
  setModel: function(model) {
    if (!this.model) {
      this.model = model;
    }
    this.render();
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
    if (goalAmount <= _.last(runsByWeek).sum) {
      return "today";
    }

    // Is the prediction less than three years in the future?
    if (prediction.getTime() > Date.now() && prediction.getTime() < max.getTime()) {
      month = DateNames.months[prediction.getMonth()];
      day = prediction.getDate();
      return month + " " + day;
    }

    return "&mdash;";
  },
});

module.exports = View;
