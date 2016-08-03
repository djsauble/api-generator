var _ = require('underscore');
var Backbone = require('backbone');

var View = Backbone.View.extend({

  initialize: function() {
    this.token = undefined;
    this.expires = new Date();
    this.nextRefresh = undefined;
    this.canRequestToken = false;

    // Start listening for messages
    this.listenTo(Forrest.bus, 'socket:open', this.startListening);
    this.listenTo(Forrest.bus, 'socket:close', this.stopListening);
    this.listenTo(Forrest.bus, 'socket:message', this.processMessage);
  },
  startListening: function(socket) {
    this.canRequestToken = true;
  },
  stopListening: function(socket) {
    this.canRequestToken = false;
  },
  processMessage: function(socket, message) {
    var me = this;

    // Filter out messages we can't handle
    if (message.type !== 'token' || message.error) {
      return;
    }

    // Set token data
    this.token = message.data.token;
    this.expires = new Date(message.data.expires);

    // Schedule the next token refresh
    this.nextRefresh = setTimeout(
      function() {
        me.refresh(me);
      },
      me.expires.getTime() - Date.now()
    );

    // Render the current token
    this.render();
  },

  events: {
    'click .refresh': 'clickRefresh'
  },

  template: _.template(
    "<h2>Connect</h2>" +
    "<p>Provide the token below</p>" +
    "<% if (token) { %>" +
    "<h1><code class='security_code'><%= token %></code></h1>" +
    "<button class='refresh'><i class='fa fa-refresh'></i> Refresh</button>" +
    "<% } else { %>" +
    "<h2 class='success'>" +
    "<i class='fa fa-check-circle'></i> Connected to device." +
    "</h2>" +
    "<% } %>"
  ),

  render: function() {

    this.$el.html(this.template({
      token: this.token
    }));

    // If no token exists, request one
    if (!this.token) {
      Forrest.bus.trigger('socket:send', 'get_token', {
        user: USER_ID,
        token: USER_TOKEN
      });
    }

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    if (this.token) {
      Forrest.bus.trigger('socket:send', 'use_token', {
        token: this.token
      });
      this.token = undefined;
    }
  },

  clickRefresh: function() {
    if (this.nextRefresh) {
      clearTimeout(this.nextRefresh);
      this.nextRefresh = undefined;
    }

    this.refresh(this);
  },

  refresh: function(me) {
    Forrest.bus.trigger('socket:send', 'refresh_token', {
      user: USER_ID,
      user_token: USER_TOKEN,
      old_token: me.token
    });
  }
});

module.exports = View;
