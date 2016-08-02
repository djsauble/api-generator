var Backbone = require('backbone');
var RunView = require('./run');

var View = Backbone.View.extend({
  tagName: "ul",
  className: "list",

  initialize: function() {
    // Backing data
    this.models = [];
    this.selected = undefined;

    // Children
    this.runs = [];

    // Data changed
    this.listenTo(Forrest.bus, 'runs:sync', function(runs) {
      this.models = runs;

      // Select the first model in the set, if none selected
      if (!this.selected && runs.length > 0) {
        Forrest.bus.trigger('runs:selected', runs.at(runs.length - 1));

        // NOTE: We postpone render until the selection event has fired
      }
      else {
        this.render();
      }
    });

    // Toggle selected style if a run is selected
    this.listenTo(Forrest.bus, 'runs:selected', function(model) {
      this.selected = model;
      this.render();
    });
  },

  render: function() {
    var me = this;

    // Remove any existing runs
    for (var i = 0; i < this.runs.length; ++i) {
      this.runs[i].remove();
      this.runs[i] = undefined;
    }

    // Create new views
    this.runs = this.models.map(function (r) {
      return new RunView({
        model: r,
        attributes: {
          id: r.id
        }
      });
    }).reverse();

    // Add the views to the DOM
    this.runs.forEach(function(r) {
      me.$el.append(r.render().el);
    });

    // If no run is selected, select the first one in the new list
    console.log("RENDER");
    if (this.selected) {
      this.$('#' + this.selected.id).addClass('selected');
    }

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    this.runs.forEach(function(r) {
      r.remove();
    });
  }
});

module.exports = View;
