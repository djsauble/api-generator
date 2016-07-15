var Backbone = require('backbone');
var RunView = require('./run');

var View = Backbone.View.extend({
  tagName: "ul",
  className: "list",

  initialize: function(options) {
    // Instance variables
    this.options = options;

    // Children
    this.runs = [];
  },

  render: function() {
    // Tabulate the list of runs
    for (var i = this.options.data.length - 1; i >= 0; --i) {
      var run = this.options.data.at(i),
          view = new RunView({
            model: run,
            attributes: {
              parent: this.attributes.parent
            }
          });

      this.$el.append(view.render().el);
      this.runs.push(view);
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
