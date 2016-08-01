var _ = require('underscore');
var Backbone = require('backbone');
var HeroView = require('./hero');
var ViewerView = require('./viewer');

var View = Backbone.View.extend({
  className: "screen column",

  initialize: function(options) {
    // Child components
    this.options = options;
    this.hero = new HeroView(options);
    this.viewer = new ViewerView(options);
  },

  render: function() {
    if (this.options.data.length === 0) {
      // Empty state
      this.$el.html(
        "<div class='modal'>" +
        "<span><img class='spinner' src='images/loader.gif'/> Waiting for your first run&hellip;</span>" +
        "</div>"
      );
    }
    else {
      // Show the hero component
      this.$el.append(this.hero.render().el);

      // Show the viewer component
      this.$el.append(this.viewer.render().el);
    }

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    if (this.hero) {
      this.hero.remove();
    }
    if (this.viewer) {
      this.viewer.remove();
    }
  }
});

module.exports = View;
