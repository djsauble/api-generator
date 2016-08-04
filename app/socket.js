var _ = require('underscore');
var Backbone = require('backbone');

var Socket = Backbone.Model.extend({

  initialize: function() {
    var ws = new WebSocket(WEBSOCKET_URL);

    // Tie websocket events to the event bus
    ws.onopen = function() {
      Forrest.bus.trigger('socket:send', 'client:register', {
        user: USER_ID,
        token: USER_TOKEN
      });
      Forrest.bus.trigger('socket:open', ws);
    };
    ws.onmessage = function(data, flags) {
      var message = JSON.parse(data.data);
      Forrest.bus.trigger('socket:message', ws, message);
    };
    ws.onclose = function() {
      Forrest.bus.trigger('socket:close', ws);
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
