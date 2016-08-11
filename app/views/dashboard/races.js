var _ = require('underscore');
var Backbone = require('backbone');
var Helpers = require('../../helpers');

var View = Backbone.View.extend({
  className: "races dark row",

  initialize: function() {
    // Events
    this.listenTo(Forrest.bus, 'user:change:distanceByWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:paceByWeek', this.setModel);
  },

  template: _.template(
    "<h1>Race estimates</h1>" +
    "<% data.forEach(function(e) { %>" +
    "<p><big><%= e.name %></big> <%= e.duration %></p>" +
    "<% }); %>"
  ),

  render: function() {
    var distanceByWeek,
        paceByWeek,
        length,
        distance = 0,
        avgDistance,
        avgPace,
        pace = 0,
        mileage,
        raceName,
        raceDuration,
        count = 0,
        data = [],
        i;

    // Must have at least two week's worth of data to extrapolate race times
    if (!this.model || this.model.get('distanceByWeek').length < 2) {
      // Should render something, instead of just quitting
      return this;
    }

    // Set shorthand variables
    distanceByWeek = this.model.get('distanceByWeek');
    paceByWeek = this.model.get('paceByWeek');
    length = paceByWeek.length;

    // Calculate the average distance and pace over the last month
    while (count < 4 && count < length) {
      distance += distanceByWeek[length - count - 1].sum;
      pace += paceByWeek[length - count - 1].average;
      ++count;
    }
    avgDistance = distance / count;
    avgPace = pace / count;

    // Calculate race HTML
    for (i = 10; i < avgDistance && i <= 80; i += 10) {
      pace = this.getGoalPace(i, avgDistance, avgPace);
      mileage = this.getGoalMileage(i);
      raceName = Helpers.getGoalString(i);
      raceDuration = Helpers.durationFromMinutes(pace * mileage);
      data.push({
        name: raceName,
        duration: raceDuration
      });
    }

    // Render it
    this.$el.html(
      this.template({
        data: data
      })
    );

    return this;
  },

  // Set the model for this view if needed, and trigger a render
  setModel: function(model) {
    if (!this.model) {
      this.model = model;
    }
    this.render();
  },

  // Calculate the predicted race pace at current training volume and pace
  //
  // 1. Assume race pace is 5% faster than training pace.
  // 2. Assume race pace at each shorter race distance is 5% faster
  //    than the previous distance
  getGoalPace: function(goal, volume, pace) {
    var currentMiles = Math.round(volume / 10) * 10,
        currentPace = pace * 0.95,
        hours,
        minutes,
        seconds,
        str;

    // Goal must be less than current volume
    if (goal < currentMiles) {
      return null;
    }

    // Find the target pace
    while (currentMiles > goal) {
      currentPace = currentPace * 0.95;
      currentMiles -= 10;
    }

    return currentPace;
  },

  // Get the appropriate goal distance (in miles) for a given weekly mileage
  getGoalMileage: function(goal) {
         if (goal >= 80) { return 100;  }
    else if (goal >= 70) { return 62.1371192;  }
    else if (goal >= 60) { return 50;   }
    else if (goal >= 50) { return 31.0685596;   }
    else if (goal >= 40) { return 26.2; }
    else if (goal >= 30) { return 13.1; }
    else if (goal >= 20) { return 6.21371192;   }
    else if (goal >= 10) { return 3.10685596;    }
    else                 { return 1;    }
  }
});

module.exports = View;
