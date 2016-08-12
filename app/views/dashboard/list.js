var Backbone = require('backbone');
var RunView = require('./run');
var RacesView = require('./races');

var View = Backbone.View.extend({
  tagName: "ul",
  className: "list",

  initialize: function() {
    // Backing data
    this.models = [];
    this.selected = undefined;

    // Children
    this.runs = [];
    this.races = null;

    // Data changed
    this.listenTo(Forrest.bus, 'runs:sync', function(runs) {
      this.models = runs;
      this.render();
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

    // Show the races component
    if (!this.races) {
      this.races = new RacesView();
      this.$el.append(this.races.render().el);
    }

    // Add the views to the DOM
    this.runs.forEach(function(r) {
      me.$el.append(r.render().el);
    });

    // Select an item in the list
    if (this.selected) {
      this.$('#' + this.selected.id).addClass('selected');
    }
    // If no item has been selected, show the first by default
    else if (this.models.length > 0) {
      Forrest.bus.trigger('runs:selected', this.models.last());
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
