var Backbone = require('backbone');
var Cookie = require('tiny-cookie');

var Goal = Backbone.Model.extend({
  defaults: function() {
    var distance = parseInt(Cookie.get('todayMilesPerWeek')),
        goal = parseInt(Cookie.get('goalMilesPerWeek'));

    // If cookie were not set, use intelligent defaults
    if (!distance) {
      distance = 0;
    }
    if (!goal) {
      goal = 10;
    }

    return {
      distance: distance,
      goal: goal
    };
  },
  setDistance: function(distance) {
    var parsed = parseInt(distance);
    if (parsed || parsed === 0) {
      Cookie.set('todayMilesPerWeek', parsed);
      this.set('distance', parsed);
    }
  },
  setGoal: function(goal) {
    var parsed = parseInt(goal);
    if (parsed || parsed === 0) {
      Cookie.set('goalMilesPerWeek', parsed);
      this.set('goal', parsed);
    }
  }
});

module.exports = Goal;
