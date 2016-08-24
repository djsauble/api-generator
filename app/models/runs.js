var Backbone = require('backbone');
var Run = require('./run');

var Runs = Backbone.Collection.extend({
  model: Run,
  initialize: function() {
    // Start listening for messages
    this.listenTo(Forrest.bus, 'socket:open', this.fetchRunList);
    this.listenTo(Forrest.bus, 'socket:message', this.processMessage);
  },
  fetchRunList: function(socket) {
    Forrest.bus.trigger('socket:send', 'run:list', {
      user: USER_ID,
      token: USER_TOKEN
    });
  },
  processMessage: function(socket, message) {
    // Filter out messages we can't handle
    if (message.type !== 'run:list' || message.error) {
      return;
    }

    // Set models
    this.set(this.parse(message.data));
    Forrest.bus.trigger('runs:sync', this, this.models);
  },
  parse: function(result) {
    return result.map(function(d) {
      d.timestamp = new Date(d.timestamp);
      return d;
    });
  }
});

module.exports = Runs;
