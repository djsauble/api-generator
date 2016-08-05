var _ = require('underscore');
var $ = require('jquery');
var Backbone = require('backbone');
var Cookie = require('tiny-cookie');
var Training = require('base-building');

var View = Backbone.View.extend({

  initialize: function() {
    this.currentMileage = 0;
    this.goalMileage = 0;

    // Listen for changes to weekly mileage
    this.listenTo(Forrest.bus, 'user:change:runsByWeek', function(model, value) {
      // Load last week's mileage
      if (value && value.length > 0) {
        this.currentMileage = Math.round(_.last(value).sum);

        // Update the cookie so the landing page shows
        // our current mileage, even when not logged in.
        Cookie.set('todayMilesPerWeek', this.currentMileage);
      }
      else {
        // Load from cookies if goal has not been set
        this.currentMileage = this.loadFromCookie('todayMilesPerWeek');
      }

      this.render();
    });

    // Listen for changes to the goal
    this.listenTo(Forrest.bus, 'user:change:goal', function(model, value) {
      if (value > 0) {
        this.goalMileage = value;
      }
      else {
        // Load from cookies if goal has not been set
        this.goalMileage = this.loadFromCookie('goalMilesPerWeek');
      }

      this.render();
    });
  },

  events: {
    'input #today': 'updateToday',
    'input #goal': 'updateGoal',
    'click .set_goal': 'setGoal'
  },

  template: _.template(
    "<h2>Goal</h2>" +
    "<p>Set a fitness goal</p>" +
    "<div class='field row'>" +
    "<label for='today'>I run</label>" +
    "<output for='today' id='todayOutput'><%= currentMileage %></output>" +
    "<small class='expand'>miles per week</small>" +
    "<input type='range' id='today' name='today' min='0' max='100' value='<%= currentMileage %>'/>" +
    "</div>" +
    "<div class='field row'>" +
    "<label for='goal'>My goal is</label>" +
    "<output for='goal' id='goalOutput''><%= goalMileage %></output>" +
    "<small class='expand'>miles per week</small>" +
    "<input type='range' id='goal' name='goal' min='0' max='100' value='<%= goalMileage %>'/>" +
    "</div>" +
    "<div class='field row'>" +
    "<label for='estimate'>I can meet my goal in</label>" +
    "<output class='expand' id='estimate' name='estimate'><%= estimate %></output>" +
    "</div>" +
    "<button class='set_goal'>Set goal</button> "
  ),

  render: function() {

    this.$el.html(this.template({
      currentMileage: this.currentMileage,
      goalMileage: this.goalMileage,
      estimate: this.getEstimate()
    }));

    return this;
  },

  updateToday: function() {
    this.currentMileage = parseInt(this.$('#today').val());
    this.$('#todayOutput').val(this.currentMileage);
    this.updateEstimate();
  },

  updateGoal: function() {
    this.goalMileage = parseInt(this.$('#goal').val());
    this.$('#goalOutput').val(this.goalMileage);
    this.updateEstimate();
  },

  setGoal: function() {
    // Update the backend
    Forrest.bus.trigger('socket:send', 'goal:set', {
      miles: this.goalMileage,
      user: USER_ID,
      token: USER_TOKEN
    });

    // Update cookies (so the landing page shows our current goals,
    // even when not logged in)
    Cookie.set('goalMilesPerWeek', this.goalMileage);
  },

  getEstimate: function() {
    return Training.makeWeeksHuman(
      Training.weeksToGoal(
        this.currentMileage,
        this.goalMileage
      )
    );
  },

  updateEstimate: function() {
    this.$('#estimate').val(this.getEstimate());
  },

  loadFromCookie: function(str) {
    var miles = Cookie.get(str);
    return miles ? parseFloat(miles) : 0;
  }
});

module.exports = View;
