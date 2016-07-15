var _ = require('underscore');
var Backbone = require('backbone');
var ListView = require('./list');
var MapView = require('./map');

var View = Backbone.View.extend({
  className: "viewer row expand",

  initialize: function(options) {
    // Child components
    this.map = new MapView(_.extend(_.clone(options), {
      attributes: {
        parent: this
      }
    }));
    this.list = new ListView(_.extend(_.clone(options), {
      attributes: {
        parent: this
      }
    }));

    // Helper methods
    this.displayRun = function(view) {
      // Set the selected class
      this.$(".selected").removeClass("selected");
      view.$el.addClass("selected");

      // Display the run
      this.map.model = view.model;
      this.map.render();
    };
  },

  render: function() {
    // Show the list of runs
    this.$el.append(this.list.render().el);

    // Show the map
    this.$el.append(this.map.render().el);

    if (this.list.runs.length > 0) {
      this.displayRun(this.list.runs[0]);
    }

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
