var _ = require('underscore');
var $ = require('jquery');
var Backbone = require('backbone');

var ConnectedView = Backbone.View.extend({
  el: '.footer',

  initialize: function() {
    var me = this;

    // State
    this.connection = 'connecting';
    this.retry = null;
    this.countdownTimer = null;

    // Initialize events
    this.listenTo(Forrest.bus, 'socket:open', function() {
      this.connection = 'connected';
      this.retry = null;
      this.render();
    });
    this.listenTo(Forrest.bus, 'socket:close', function(socket, retry) {
      this.connection = 'offline';
      this.retry = retry;
      this.render();

      // Start the countdown
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }
      this.countdownTimer = setInterval(function() {
        me.retry -= 1;
        me.render();

        // Stop the timer when we hit zero
        if (me.retry <= 0) {
          clearInterval(me.countdownTimer);
        }
      }, 1000);
    });
    this.listenTo(Forrest.bus, 'socket:connecting', function(socket) {
      this.connection = 'connecting';
      this.retry = null;
      this.render();
    });

    this.render();
  },

  template: _.template(
    '<% if (connection === "connecting") { %>' +
    '<span>Attempting to connect&hellip;</span>' +
    '<% } else if (connection === "connected") { %>' +
    '<span>Connected <i class="fa fa-check"></i></span>' +
    '<% } else { %>' +
    '<span>Offline, reconnecting in <%= retry %> second<%= retry == 1 ? "" : "s" %>&hellip;</span>' +
    '<% } %>'
  ),

  render: function() {
    this.$el.html(this.template({
      connection: this.connection,
      retry: this.retry
    }));
  }
});

module.exports = ConnectedView;
