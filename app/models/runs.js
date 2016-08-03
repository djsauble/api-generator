var _ = require('underscore');
var Backbone = require('backbone');
var Run = require('./run');
var Helpers = require('../helpers');

var Runs = Backbone.Collection.extend({
  model: Run,
  initialize: function() {
    // Pass events to the event bus
    this.on('sync', function() {
      Forrest.bus.trigger('runs:sync', this);
    });

    // Start listening for messages
    this.listenTo(Forrest.bus, 'socket:open', this.startListening);
    this.listenTo(Forrest.bus, 'socket:message', this.processMessage);
  },
  startListening: function(socket) {
    Forrest.bus.trigger('socket:send', 'get_docs', {
      user: USER_ID,
      token: USER_TOKEN,
      database: DATABASE
    });
  },
  processMessage: function(socket, message) {
    // Filter out messages we can't handle
    if (message.type !== 'runs' || message.error) {
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
