var _ = require('underscore');
var Backbone = require('backbone');

var User = Backbone.Model.extend({
  defaults: function() {
    return {
      distanceThisWeek: 0,
      goalThisWeek: 0,
      runsByWeek: [],
      goal: 0
    };
  },
  initialize: function() {
    // Pass change events to the application event bus
    this.listenTo(this, 'change:distanceThisWeek', function(model, value) {
      Forrest.bus.trigger('user:change:distanceThisWeek', model, value);
    });
    this.listenTo(this, 'change:goalThisWeek', function(model, value) {
      Forrest.bus.trigger('user:change:goalThisWeek', model, value);
    });
    this.listenTo(this, 'change:runsByWeek', function(model, value) {
      Forrest.bus.trigger('user:change:runsByWeek', model, value);
    });
    this.listenTo(this, 'change:goal', function(model, value) {
      Forrest.bus.trigger('user:change:goal', model, value);
    });

    // Start listening for messages
    this.listenTo(Forrest.bus, 'socket:open', this.fetchGoals);
    this.listenTo(Forrest.bus, 'socket:message', this.processMessage);
  },
  fetchGoals: function(socket) {
    Forrest.bus.trigger('socket:send', 'weekly_goal:get', {
      user: USER_ID,
      token: USER_TOKEN,
      database: DATABASE
    });
    Forrest.bus.trigger('socket:send', 'trend:get', {
      user: USER_ID,
      token: USER_TOKEN,
      weeks: 10
    });
    Forrest.bus.trigger('socket:send', 'goal:get', {
      user: USER_ID,
      token: USER_TOKEN
    });
  },
  processMessage: function(socket, message) {
    // Filter out messages we can't handle
    if (message.error) {
      return;
    }

    // Pass valid messages to the proper handler
    if (_.contains(['weekly_goal:change', 'weekly_goal:get'], message.type)) {
      this.set(message.data);
    }
    else if (_.contains(['trend:change', 'trend:get'], message.type)) {
      this.set(message.data);
    }
    else if (_.contains(['goal:change', 'goal:get'], message.type)) {
      this.set({
        goal: message.data.miles
      });
    }
    else {
      return;
    }
  }
});

module.exports = User;
