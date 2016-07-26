var _ = require('underscore');
var Backbone = require('backbone');

var View = Backbone.View.extend({

  initialize: function() {
    var me = this;
    this.token = undefined;
    this.expires = new Date();
    this.nextRefresh = undefined;

    this.ws = new WebSocket(WEBSOCKET_URL);

    this.ws.onopen = function() {
      me.ws.send(JSON.stringify({
        type: 'get_token',
        user: USER_ID,
        token: USER_TOKEN
      }));
    };
    this.ws.onmessage = function(data, flags) {
      // Make sure this is something we know how to parse
      var message;
      try {
        message = JSON.parse(data.data);
      } catch(err) {
        // Do nothing
        return;
      }

      // Take appropriate action
      if (message.error) {
        me.token = message.error;
      }
      else {
        me.token = message.token;
        me.expires = new Date(message.expires);

        // Schedule the next token refresh
        me.nextRefresh = setTimeout(
          function() {
            me.ws.send(JSON.stringify({
              type: 'refresh_token',
              user: USER_ID,
              user_token: USER_TOKEN,
              old_token: me.token
            }));
          },
          me.expires.getTime() - Date.now()
        );
      }
      me.render();
    };
    this.ws.onclose = function() {
      me.token = undefined;
      me.expires = undefined;
      if (me.nextRefresh) {
        clearTimeout(me.nextRefresh);
        me.nextRefresh = undefined;
      }
      me.render();
    };
    this.ws.onerror = function(error, more) {
      console.log(error);
    };
  },

  template: _.template(
    "<% if (token) { %>" +
    "<h1><code class='security_code'><%= token %></code></h1>" +
    "<% } else { %>" +
    "<h2 class='success'>" +
    "<i class='fa fa-check-circle'></i> Connected to device." +
    "</h2>" +
    "<% } %>" +
    "<a href='#'>Go to the dashboard</a>"
  ),

  render: function() {

    this.$el.html(this.template({
      token: this.token
    }));

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    if (this.token) {
      this.ws.send(JSON.stringify({
        type: 'use_token',
        token: this.token
      }));
    }
  }
});

module.exports = View;
