var _ = require('underscore');
var Backbone = require('backbone');
var ListView = require('./list');
var MapView = require('./map');

var View = Backbone.View.extend({
  className: "viewer row",

  initialize: function() {
    // Child components
    this.map = new MapView();
    this.list = new ListView();
  },

  render: function() {
    // Show the list of runs
    this.$el.append(this.list.render().el);

    // Show the map
    this.$el.append(this.map.render().el);

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    if (this.map) {
      this.map.remove();
    }
    if (this.list) {
      this.list.remove();
    }
  }
});

module.exports = View;
