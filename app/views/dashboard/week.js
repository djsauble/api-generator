var _ = require('underscore');
var Backbone = require('backbone');
var DateRound = require('date-round');
var round = require('float').round;

var View = Backbone.View.extend({
  className: "hero dark row expand",

  initialize: function() {
    // Data changed
    this.listenTo(Forrest.bus, 'user:change:distanceThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goalThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:distanceByWeek', function(model, value) {
      this.checkState(value);
      this.setModel(model);
    });
  },

  render: function() {
    var startOfToday = DateRound.floor(new Date()),
        startOfNextWeek = DateRound.ceil(startOfToday, 'week'),
        daysLeftThisWeek = Math.floor((startOfNextWeek.getTime() - startOfToday.getTime()) / DateRound.DAY_IN_MS),
        daysLeftInLearningPeriod = null,
        distanceThisWeek = 0,
        distanceLastWeek = 0,
        goalThisWeek = null,
        percentChange = 0,
        remainingThisWeek = 0,
        distanceByWeek = [],
        trendPercentString = null,
        trendDescriptionString = null,
        milesPerDay = null;

    // Calculate trending information if we have the data
    if (this.model && this.model.get('distanceByWeek').length > 0 && this.model.get('goalThisWeek')) {

      distanceThisWeek = this.model.get('distanceThisWeek');
      goalThisWeek = this.model.get('goalThisWeek');
      distanceByWeek = this.model.get('distanceByWeek');

      distanceLastWeek = _.last(distanceByWeek).sum;
      percentChange = Math.round(((distanceThisWeek / distanceLastWeek) - 1) * 100);
      remainingThisWeek = round(goalThisWeek - distanceThisWeek, 1);

      // WoW change
      if (percentChange < 10) {
        trendPercentString = remainingThisWeek;
        milesPerDay = round(remainingThisWeek / daysLeftThisWeek, 1);
        trendDescriptionString = "miles to go this week";
      }
      else {
        trendPercentString = percentChange + "%";
        trendDescriptionString = "more miles than last week";
      }
    }
    else if (this.model) {
      distanceByWeek = this.model.get('distanceByWeek');
      daysLeftInLearningPeriod = 14 - startOfToday.getDay() - (distanceByWeek.length * 7);
    }

    // Render stuff (including trending data, if we have it)
    this.$el.html(
      this.template({
        noData: distanceByWeek.length === 0,
        enoughData: distanceByWeek.length > 1,

        // Show these when there isn't enough data
        daysLeftInLearningPeriod: daysLeftInLearningPeriod,
        distanceThisWeek: distanceThisWeek,

        // Show these when we have at least two weeks of data
        trendPercentString: trendPercentString,
        trendDescriptionString: trendDescriptionString,
        milesPerDay: milesPerDay,

        // Show these in both cases
        daysLeftThisWeek: daysLeftThisWeek
      })
    );
    
    return this;
  },

  template: _.template(
    "<% if (noData) { %>" +
      "<h1>Waiting for your first run...</h1>" +
    "<% } else if (enoughData) { %>" +
      "<h1>Weekly goal</h1>" +
      "<p><big><%= daysLeftThisWeek %></big> days left this week</p>" +
      "<p><big><%= trendPercentString %></big> <%= trendDescriptionString%></p>" +
      "<% if (milesPerDay) { %>" +
      "<p><big><%= milesPerDay %></big> miles per day</p>" +
      "<% } %>" +
    "<% } else { %>" +
      "<h1>Learning habits</h1>" +
      "<p><big><%= daysLeftInLearningPeriod %></big> days left in the learning period</p>" +
      "<p><big><%= daysLeftThisWeek %></big> days left this week</p>" +
      "<p><big><%= distanceThisWeek %></big> miles this week</p>" +
    "<% } %>"
  ),

  // Set the model for this view if needed, and trigger a render
  setModel: function(model) {
    if (!this.model) {
      this.model = model;
    }
    this.render();
  },

  // Expand this view if there are no runs
  checkState: function(value) {
    console.log(value.length === 0);
    this.$el.toggleClass('expand', value.length === 0);
  }
});

module.exports = View;
