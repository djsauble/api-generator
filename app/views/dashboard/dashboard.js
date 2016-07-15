var Backbone = require('backbone');
var HeroView = require('./hero');
var ViewerView = require('./viewer');
var FooterView = require('./footer');

var View = Backbone.View.extend({
  className: "screen column",

  initialize: function(options) {
    // Child components
    this.hero = new HeroView(options);
    this.viewer = new ViewerView(options);
    this.footer = new FooterView(options);
  },

  render: function() {
    // Show the hero component
    this.$el.append(this.hero.render().el);

    // Show the viewer component
    this.$el.append(this.viewer.render().el);

    // Show the footer component
    this.$el.append(this.footer.render().el);

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
    if (this.footer) {
      this.footer.remove();
    }
  }
});

module.exports = View;
