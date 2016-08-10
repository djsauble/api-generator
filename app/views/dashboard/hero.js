var _ = require('underscore');
var Backbone = require('backbone');
var DateNames = require('date-names');
var DateRound = require('date-round');
var round = require('float').round;

var View = Backbone.View.extend({
  className: "hero dark row",

  initialize: function() {
    // Data changed
    this.listenTo(Forrest.bus, 'user:change:distanceThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goalThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:runsByWeek', this.setModel);
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
        runsByWeek = null,
        trendPercentString = null,
        trendDescriptionString = null;

    // Calculate trending information if we have the data
    if (this.model && this.model.get('runsByWeek').length > 0 && this.model.get('goalThisWeek')) {

      distanceThisWeek = this.model.get('distanceThisWeek');
      goalThisWeek = this.model.get('goalThisWeek');
      runsByWeek = this.model.get('runsByWeek');

      distanceLastWeek = _.last(runsByWeek).sum;
      percentChange = Math.round(((distanceThisWeek / distanceLastWeek) - 1) * 100);
      remainingThisWeek = round(goalThisWeek - distanceThisWeek, 1);

      // WoW change
      if (percentChange < 10) {
        trendPercentString = remainingThisWeek;
        trendDescriptionString = "miles to go this week";
      }
      else {
        trendPercentString = percentChange + "%";
        trendDescriptionString = "more miles than last week.";
      }
    }

    // Render stuff (including trending data, if we have it)
    this.$el.html(
      this.template({
        daysLeftThisWeek: daysLeftThisWeek,
        trendPercentString: trendPercentString,
        trendDescriptionString: trendDescriptionString
      })
    );
    
    return this;
  },

  template: _.template(
    "<p><big><%= daysLeftThisWeek %></big> days left this week</p>" +
    "<p><big><%= trendPercentString %></big> <%= trendDescriptionString%></p>"+
    "<p>" +
    "5k <small>24:48</small> &middot; " +
    "10k <small>52:42</small> &middot; " + 
    "13.1mi <small>1:57:54</small> &middot; " +
    "26.2mi <small>4:08:54</small> &middot; " +
    "50k <small>5:10:00</small>" +
    "</p>"
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
