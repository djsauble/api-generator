var _ = require('underscore');
var Backbone = require('backbone');
var Run = require('./run');
var Helpers = require('../helpers');

var Runs = Backbone.Collection.extend({
  model: Run,
  initialize: function(options) {
    this.url = options.host + '/api/' + options.database +
               '?user=' + options.user +
               '&token=' + options.token;

    // Pass events to the event bus
    this.on('sync', function() {
      Forrest.bus.trigger('runs:sync', this);
    });

    this.fetch();
  },
  fetch: function() {
    var me = this,
        ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = function() {
      ws.send(JSON.stringify({
        type: 'get_docs',
        user: USER_ID,
        token: USER_TOKEN,
        database: DATABASE
      }));
    };
    ws.onmessage = function(data, flags) {
      // Make sure this is something we know how to parse
      var message;
      try {
        message = JSON.parse(data.data);
      } catch(err) {
        // Do nothing
        ws.close();
        return;
      }

      // Take appropriate action
      if (!message.error) {
        var models = me.parse(message);
        me.set(models);
        me.trigger('sync', me, models);
      }
      ws.close();
    };
  },
  parse: function(result) {
    return result.map(function(d) {
      d.timestamp = new Date(d.timestamp);
      return d;
    });
  }
});

module.exports = Runs;
