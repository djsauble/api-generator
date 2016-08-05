var Backbone = require('backbone');

var User = Backbone.Model.extend({
  defaults: function() {
    return {
      distanceThisWeek: 0,
      goalThisWeek: 0
    };
  },
  initialize: function() {
    // Start listening for messages
    this.listenTo(Forrest.bus, 'socket:open', this.fetchRunList);
    this.listenTo(Forrest.bus, 'socket:message', this.processMessage);
  },
  fetchRunList: function(socket) {
    Forrest.bus.trigger('socket:send', 'weekly_goal:get', {
      user: USER_ID,
      token: USER_TOKEN,
      database: DATABASE
    });
    Forrest.bus.trigger('socket:send', 'trend:get', {
      user: USER_ID,
      token: USER_TOKEN,
      weeks: 7
    });
  },
  processMessage: function(socket, message) {
    // Filter out messages we can't handle
    if (message.error) {
      return;
    }
    if (
        message.type !== 'weekly_goal:change' &&
        message.type !== 'weekly_goal:get' &&
        message.type !== 'trend:change' &&
        message.type !== 'trend:get'
       ) {
      return;
    }

    // Set models
    this.set(this.parse(message.data));
    Forrest.bus.trigger('user:sync', this, this.attributes);
  }
});

module.exports = User;
