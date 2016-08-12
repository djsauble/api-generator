var _ = require('underscore');
var Backbone = require('backbone');
var WeekView = require('./week');
var TrendView = require('./trend');
var RacesView = require('./races');
var ViewerView = require('./viewer');

var View = Backbone.View.extend({
  el: '.main',

  initialize: function() {
    // Child components
    this.week = new WeekView();
    this.trend = new TrendView();
    this.races = new RacesView();
    this.viewer = new ViewerView();
  },

  render: function() {
    // Show the week component
    this.$el.append(this.week.render().el);

    // Show the trend component
    this.$el.append(this.trend.render().el);

    // Show the races component
    this.$el.append(this.races.render().el);

    // Show the viewer component
    this.$el.append(this.viewer.render().el);

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    if (this.week) {
      this.week.remove();
    }
    if (this.trend) {
      this.trend.remove();
    }
    if (this.races) {
      this.races.remove();
    }
    if (this.viewer) {
      this.viewer.remove();
    }
  }
});

module.exports = View;
