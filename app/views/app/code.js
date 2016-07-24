var _ = require('underscore');
var Backbone = require('backbone');

var View = Backbone.View.extend({

  initialize: function() {
    var me = this;
    this.token = 'please wait...';
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
      var message = JSON.parse(data.data);
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

  template: _.template(`
    <% if (token) { %>
      <h1><code class='security_code'><%= token %></code></h1>
      <p>(expires <%= expires %>)</p>
    <% } else { %>
      <p>All set. Go for a run!</p>
    <% } %>
  `),

  render: function() {

    this.$el.html(this.template({
      token: this.token,
      expires: this.expires
    }));

    return this;
  }
});

module.exports = View;
