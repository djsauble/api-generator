var _ = require('underscore');
var Backbone = require('backbone');
var DateRound = require('date-round');
var round = require('float').round;

var View = Backbone.View.extend({
  className: "hero dark row",

  initialize: function() {
    // Data changed
    this.listenTo(Forrest.bus, 'user:change:distanceThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goalThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:distanceByWeek', this.setModel);
  },

  render: function() {
    var startOfToday = DateRound.floor(new Date()),
        startOfNextWeek = DateRound.ceil(startOfToday, 'week'),
        daysLeftThisWeek = Math.floor((startOfNextWeek.getTime() - startOfToday.getTime()) / DateRound.DAY_IN_MS),
        distanceThisWeek = null,
        distanceLastWeek = 0,
        goalThisWeek = null,
        percentChange = 0,
        remainingThisWeek = 0,
        distanceByWeek = null,
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

    // Render stuff (including trending data, if we have it)
    this.$el.html(
      this.template({
        daysLeftThisWeek: daysLeftThisWeek,
        trendPercentString: trendPercentString,
        trendDescriptionString: trendDescriptionString,
        milesPerDay: milesPerDay
      })
    );
    
    return this;
  },

  template: _.template(
    "<h1>Weekly goal</h1>" +
    "<p><big><%= daysLeftThisWeek %></big> days left this week</p>" +
    "<p><big><%= trendPercentString %></big> <%= trendDescriptionString%></p>" +
    "<% if (milesPerDay) { %>" +
    "<p><big><%= milesPerDay %></big> miles per day</p>" +
    "<% } %>"
  ),

  // Set the model for this view if needed, and trigger a render
  setModel: function(model) {
    if (!this.model) {
      this.model = model;
    }
    this.render();
  }

});

module.exports = View;
