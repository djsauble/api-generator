var _ = require('underscore');
var Backbone = require('backbone');
var HeroView = require('./hero');
var TrendView = require('./trend');
var RacesView = require('./races');
var ViewerView = require('./viewer');

var View = Backbone.View.extend({
  el: '.main',

  initialize: function() {
    // Child components
    this.hero = new HeroView();
    this.trend = new TrendView();
    this.races = new RacesView();
    this.viewer = new ViewerView();
  },

  render: function() {
    // Show the hero component
    this.$el.append(this.hero.render().el);

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
    if (this.hero) {
      this.hero.remove();
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
