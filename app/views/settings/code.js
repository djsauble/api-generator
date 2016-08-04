var _ = require('underscore');
var Backbone = require('backbone');

var View = Backbone.View.extend({

  initialize: function() {
    this.passcode = undefined;
    this.expires = undefined;

    // Start listening for messages
    this.listenTo(Forrest.bus, 'socket:message', this.processMessage);
  },
  processMessage: function(socket, message) {
    var me = this;

    // Filter out messages we can't handle
    if (message.type !== 'passcodes:current' || message.error) {
      return;
    }

    // Set passcode data
    this.passcode = message.data.passcode;
    this.expires = new Date(message.data.expires);

    // Render the current passcode
    this.render();
  },

  template: _.template(
    "<h2>Connect</h2>" +
    "<p>Provide the passcode below</p>" +
    "<% if (passcode) { %>" +
    "<h1><code class='security_code'><%= passcode %></code></h1>" +
    "<% } else { %>" +
    "<h2 class='success'>" +
    "<i class='fa fa-check-circle'></i> Connected to device." +
    "</h2>" +
    "<% } %>"
  ),

  render: function() {

    this.$el.html(this.template({
      passcode: this.passcode
    }));

    // If no passcode exists, request one
    if (!this.passcode) {
      Forrest.bus.trigger('socket:send', 'passcodes:enable', {
        user: USER_ID,
        token: USER_TOKEN
      });
    }

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    if (this.passcode) {
      Forrest.bus.trigger('socket:send', 'passcodes:disable', {
        user: USER_ID,
        token: USER_TOKEN
      });
      this.passcode = undefined;
    }
  }
});

module.exports = View;
