var _ = require('underscore');
var Backbone = require('backbone');

var View = Backbone.View.extend({
  className: 'bar',
  events: {
    'click': 'onClick'
  },
  template: _.template(
    "<% if (actual) { %>" +
    "<div class='bar progress' style='height: <%= actual %>%;'></div>" +
    "<% } %>"
  ),
  render: function() {
    this.$el.html(this.template({
      actual: this.model.get('actual')
    }));

    return this;
  },
  onClick: function() {
    var start = this.model.get('startTime'),
        end = this.model.get('endTime');

    if (this.$el.hasClass('selected')) {
      // Reset the filter
      Forrest.bus.trigger('runs:filter');
    }
    else {
      // Set the filter
      Forrest.bus.trigger('runs:filter', start, end);
    }
  }
});

module.exports = View;
