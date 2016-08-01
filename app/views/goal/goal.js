var $ = require('jquery');
var Backbone = require('backbone');
var Cookie = require('tiny-cookie');
var Training = require('base-building');

var View = Backbone.View.extend({
  className: "screen column",

  init: function() {
  },

  events: {
    'input #today': 'updateToday',
    'input #goal': 'updateGoal',
    'click .set_goal': 'setGoal'
  },

  render: function() {

    this.$el.html(
      "<div class='modal'>" +
      "<div>" +
      "<div class='field row'>" +
      "<label for='today'>I run</label>" +
      "<output for='today' id='todayOutput'>10</output>" +
      "<small class='expand'>miles per week</small>" +
      "<input type='range' id='today' name='today' min='0' max='100' value='10'/>" +
      "</div>" +
      "<div class='field row'>" +
      "<label for='goal'>My goal is</label>" +
      "<output for='goal' id='goalOutput''>40</output>" +
      "<small class='expand'>miles per week</small>" +
      "<input type='range' id='goal' name='goal' min='0' max='100' value='40'/>" +
      "</div>" +
      "<div class='field row'>" +
      "<label for='estimate'>I can meet my goal in</label>" +
      "<output class='expand' id='estimate' name='estimate'>11 months</output>" +
      "</div>" +
      "<buttons>" +
      "<button class='set_goal'>Set goal</button> " +
      "<a href='#'>Nevermind, go back</a>" +
      "</buttons>" +
      "</div>" +
      "</div>"
    );

    this.loadFromCookies();
    this.updateEstimate();

    return this;
  },

  loadFromCookies: function() {
    var todayMilesPerWeek = Cookie.get('todayMilesPerWeek');
    if (todayMilesPerWeek) {
      this.$('#today').val(todayMilesPerWeek);
      this.updateToday();
    }

    var goalMilesPerWeek = Cookie.get('goalMilesPerWeek');
    if (goalMilesPerWeek) {
      this.$('#goal').val(goalMilesPerWeek);
      this.updateGoal();
    }
  },

  updateToday: function() {
    var milesPerWeek = this.$('#today').val();
    this.$('#todayOutput').val(milesPerWeek);
    this.updateEstimate();
    Cookie.set('todayMilesPerWeek', milesPerWeek);
  },

  updateGoal: function() {
    var milesPerWeek = this.$('#goal').val();
    this.$('#goalOutput').val(milesPerWeek);
    this.updateEstimate();
    Cookie.set('goalMilesPerWeek', milesPerWeek);
  },

  setGoal: function() {
    var me = this;

    this.ws = new WebSocket(WEBSOCKET_URL);

    this.ws.onopen = function() {
      me.ws.send(JSON.stringify({
        type: 'set_goal',
        miles: parseFloat(me.$('#goal').val()),
        user: USER_ID,
        token: USER_TOKEN
      }));
    };
    this.ws.onmessage = function(data, flags) {
      // Make sure this is something we know how to parse
      console.log(data);
      var message;
      try {
        message = JSON.parse(data.data);
      } catch(err) {
        // Do nothing
        console.log(err);
        return;
      }
      console.log("Was the operation successful?");

      // Take appropriate action
      if (message.status === 'success') {
        console.log('Goal set successfully');
      }
      me.ws.close();
    };
  },

  updateEstimate: function() {
    this.$('#estimate').val(
      Training.makeWeeksHuman(
        Training.weeksToGoal(
          parseFloat(this.$('#todayOutput').val()),
          parseFloat(this.$('#goalOutput').val())
        )
      )
    );
  }
});

module.exports = View;
