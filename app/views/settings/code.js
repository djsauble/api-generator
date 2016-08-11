var _ = require('underscore');
var Backbone = require('backbone');

var View = Backbone.View.extend({

  events: {
    'click .get_passcode': 'getPasscode'
  },
  initialize: function() {
    this.passcode = undefined;
    this.expires = undefined;

    // Start listening for messages
    this.listenTo(Forrest.bus, 'socket:message', this.processMessage);
  },
  getPasscode: function() {
    Forrest.bus.trigger('socket:send', 'passcode:get', {
      user: USER_ID,
      token: USER_TOKEN
    });
  },
  processMessage: function(socket, message) {
    var me = this;

    // Filter out messages we can't handle
    if (message.error) {
      return;
    }

    if (message.type === 'passcode:current') {
      // Set passcode data
      this.passcode = message.data.passcode;
      this.expires = new Date(message.data.expires);
      this.render();
    }
    else if (message.type === 'passcode:used') {
      // Clear passcode
      this.passcode = undefined;
      this.expires = undefined;
      this.render();

      // Navigate to the dashboard
      window.location.href = '#';
    }
  },

  template: _.template(
    "<h2>Connect</h2>" +
    "<% if (passcode) { %>" +
    "<h1><code class='security_code'><%= passcode %></code></h1>" +
    "<% } else { %>" +
    "<button class='get_passcode'>Get passcode</button>" +
    "</h2>" +
    "<% } %>"
  ),

  render: function() {

    this.$el.html(this.template({
      passcode: this.passcode
    }));

    return this;
  },

  remove: function() {
    this.undelegateEvents();
  }
});

module.exports = View;
