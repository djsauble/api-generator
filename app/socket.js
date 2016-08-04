var _ = require('underscore');
var Backbone = require('backbone');

var Socket = Backbone.Model.extend({

  initialize: function() {
    var ws = new WebSocket(WEBSOCKET_URL),
        keepAlive;

    // Tie websocket events to the event bus
    ws.onopen = function() {

      // Register the client for server push notifications
      Forrest.bus.trigger('socket:send', 'client:register', {
        user: USER_ID,
        token: USER_TOKEN
      });

      // Set up a ping every 30 seconds to keep the server alive (needed for Heroku)
      keepAlive = setInterval(function() {
        Forrest.bus.trigger('socket:send', 'client:ping', {});
      }, 30000);

      // Let the rest of the application know that the connection is ready for business
      Forrest.bus.trigger('socket:open', ws);
    };
    ws.onmessage = function(data, flags) {
      var message = JSON.parse(data.data);
      Forrest.bus.trigger('socket:message', ws, message);
    };
    ws.onclose = function() {
      Forrest.bus.trigger('socket:close', ws);

      // Kill the ping
      clearInterval(keepAlive);
    };
    ws.onerror = function(error, more) {
      Forrest.bus.trigger('socket:error', ws, error);
    };

    // Listen for events
    this.listenTo(Forrest.bus, 'socket:send', function(type, data) {
      ws.send(JSON.stringify({
        type: type,
        data: data
      }));
    });
  }
});

module.exports = Socket;
