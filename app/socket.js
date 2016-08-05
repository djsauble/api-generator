var _ = require('underscore');
var Backbone = require('backbone');

var Socket = Backbone.Model.extend({

  initialize: function() {
    var ws = null,
        minRetryWait = 1,
        maxRetryWait = 32,
        currentRetryWait = minRetryWait,
        keepAlive = null,
        onopen = function() {
            // Register the client for server push notifications
            Forrest.bus.trigger('socket:send', 'client:register', {
              user: USER_ID,
              token: USER_TOKEN
            });

            // Reset the retry wait duration
            currentRetryWait = minRetryWait;

            // Set up a ping every 30 seconds to keep the server alive (needed for Heroku)
            keepAlive = setInterval(function() {
              Forrest.bus.trigger('socket:send', 'client:ping', {});
            }, 30000);

            // Let the rest of the application know that the connection is ready for business
            Forrest.bus.trigger('socket:open', ws);
          },
        onmessage = function(data, flags) {
            var message = JSON.parse(data.data);
            Forrest.bus.trigger('socket:message', ws, message);
          },
        onclose = function() {
            console.log("Closing the socket");
            Forrest.bus.trigger('socket:close', ws, currentRetryWait);

            // Kill the ping
            clearInterval(keepAlive);

            // Schedule the next connection attempt
            setTimeout(function() {
              console.log("Retrying...");
              ws = initSocket();
            }, currentRetryWait * 1000);

            // Increase the retry wait time exponentially
            if (currentRetryWait * 2 <= maxRetryWait) {
              currentRetryWait = currentRetryWait * 2;
            }
          },
        onerror = function(error, more) {
            Forrest.bus.trigger('socket:error', ws, error);
          },
        assignHandlers = function(ws) {
            ws.onopen = onopen;
            ws.onmessage = onmessage;
            ws.onclose = onclose;
            ws.onerror = onerror;
          },
        initSocket = function() {
          Forrest.bus.trigger('socket:connecting', ws);

          // Attempt to open a connection
          var ws = null;
          try {
            ws = new WebSocket(WEBSOCKET_URL);
          }
          catch (err) {
            console.log(err);
            return null;
          }

          // Assign event handlers
          assignHandlers(ws);

          return ws;
        };

    // Tie websocket events to the event bus
    ws = initSocket();

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
