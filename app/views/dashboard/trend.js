var _ = require('underscore');
var Backbone = require('backbone');
var DateNames = require('date-names');
var DateRound = require('date-round');
var Cookie = require('tiny-cookie');
var predict = require('date-prediction');

var View = Backbone.View.extend({
  className: "trend dark row",

  initialize: function() {
    // Mode
    this.mode = 'view';

    // Events
    this.listenTo(Forrest.bus, 'user:change:distanceThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goalThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goal', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:distanceByWeek', this.setModel);
  },

  events: {
    'click .change_goal': 'onChange',
    'click .save_goal': 'onSave',
    'click .cancel_change': 'onCancel'
  },

  render: function() {
    var startOfToday = DateRound.floor(new Date()),
        startOfThisWeek = DateRound.floor(startOfToday, 'week'),
        runArray,
        goal = 0,
        distanceByWeek,
        goalThisWeek,
        distanceThisWeek,
        goalString,
        goalDateString = '&mdash;',
        chartHtml = '';

    if (this.model && this.model.get('distanceByWeek').length > 0 && this.model.get('goalThisWeek')) {

      goal = this.model.get('goal');
      distanceByWeek = this.model.get('distanceByWeek');
      goalThisWeek = this.model.get('goalThisWeek');
      distanceThisWeek = this.model.get('distanceThisWeek');

      // Copy the weekly summary
      runArray = _.clone(distanceByWeek);

      // Include this week's goal, if available
      runArray.push({
        period: startOfThisWeek,
        sum: goalThisWeek
      });

      // If a goal has been set, display our prediction
      if (goal) {
        goalString = this.getGoalString(goal);
        goalDateString = this.getGoalDate(
          goal,
          distanceByWeek,
          startOfThisWeek
        );
      }

      // Get the chart HTML
      chartHtml = this.getChartHtml(runArray, distanceThisWeek);
    }

    this.$el.html(
      this.template({
        chartHtml: chartHtml,
        selectHtml: this.getSelectHtml(),
        goalString: goalString,
        goalDateString: goalDateString,
        mode: this.mode
      })
    );

    return this;
  },

  template: _.template(
    "<h1>Trending data</h1>" +
    "<div class='graph row'><%= chartHtml %></div>" +
    "<% if (mode === 'view') { %>" +
    "<p><big><%= goalString %></big>" +
    "<% if (goalDateString) { %>" +
    " by <%= goalDateString %>" +
    "<% } else { %>" +
    " goal" +
    "<% } %>" +
    "</p>" +
    "<a href='#' class='change_goal'>Change goal</a>" +
    "<% } else if (mode === 'change') { %>" +
    "<%= selectHtml %>" +
    "<a href='#' class='save_goal'>Save goal</a>" +
    "<a href='#' class='cancel_change'>Cancel</a>" +
    "<% } %>"
  ),

  // Set the model for this view if needed, and trigger a render
  setModel: function(model) {
    if (!this.model) {
      this.model = model;
    }
    this.render();
  },

  // Switch to change mode
  onChange: function() {
    this.mode = 'change';
    this.render();
  },

  // Save the new goal
  onSave: function(el) {
    var value = this.$('.goal').val();

    // Switch back to read-only mode
    this.mode = 'view';
    this.render();

    // Update the backend
    Forrest.bus.trigger('socket:send', 'goal:set', {
      miles: value,
      user: USER_ID,
      token: USER_TOKEN
    });

    // Update cookies
    // (so the landing page shows our current goals, even when not logged in)
    Cookie.set('goalMilesPerWeek', value);
  },

  // Cancel the change
  onCancel: function() {
    this.mode = 'view';
    this.render();
  },

  // Display run data for the last eight weeks
  getChartHtml: function(distanceByWeek, distanceThisWeek) {
    var chartHtml = "";

    maxDistance = _.max(
      distanceByWeek.map(function(w) {
        return w.sum;
      })
    );
    for (var i = 0; i < distanceByWeek.length; ++i) {
      chartHtml += "<div class='bar' style='height: " + (distanceByWeek[i].sum / maxDistance * 100) + "%;'>";
      if (i == distanceByWeek.length - 1) {
        chartHtml += "<div class='bar progress' style='height: " + (distanceThisWeek / distanceByWeek[i].sum * 100) + "%;'></div>";
      }
      chartHtml += "</div>";
    }

    return chartHtml;
  },

  // Get the select control for changing your goal
  getSelectHtml: function() {
    var startOfThisWeek = DateRound.floor(new Date(), 'week'),
        distanceByWeek = this.model ? this.model.get('distanceByWeek') : [],
        goal = this.model ? this.model.get('goal') : null,
        tag,
        estimate,
        html = "<select class='goal'>";

    for (var i = 10; i <= 80; i += 10) {

      // Select the current goal for starters
      if (i === parseInt(goal)) {
        tag = 'selected';
      }
      else {
        tag = '';
      }

      // Show predictions if available
      if (distanceByWeek.length > 0) {
        estimate = this.getGoalDate(i, distanceByWeek, startOfThisWeek);
      }
      else {
        estimate = '';
      }

      // Generate the HTML for each option
      html += "<option value='" + i + "' " + tag + ">" +
              this.getGoalString(i) + (estimate ? ' by ' + estimate : '') +
              "</option>";
    }

    html += "</select>";

    return html;
  },

  // Display the last day of the given week
  getGoalDate: function(goalAmount, distanceByWeek, startOfThisWeek) {
    var max, prediction, month, day;

    // Set the max horizon for the prediction (three years in the future)
    max = new Date();
    max.setYear(max.getYear() + 1900 + 3);
    
    // Get the prediction
    prediction = predict(goalAmount, distanceByWeek.map(function(r) {
      return {
        timestamp: r.period,
        value: r.sum
      };
    }));

    // Is the prediction after today?
    if (goalAmount <= _.last(distanceByWeek).sum) {
      return "today";
    }

    // Is the prediction less than three years in the future?
    if (prediction.getTime() > Date.now() && prediction.getTime() < max.getTime()) {
      year = prediction.getYear() + 1900;
      month = DateNames.months[prediction.getMonth()];
      day = prediction.getDate();

      if (year > (new Date()).getYear() + 1900) {
        return month + " " + day + ", " + year;
      }
      else {
        return month + " " + day;
      }
    }

    return null;
  },

  getGoalString: function(goal) {
         if (goal >= 80) { return '100 mi';  }
    else if (goal >= 70) { return '100 km';  }
    else if (goal >= 60) { return '50 mi';   }
    else if (goal >= 50) { return '50 km';   }
    else if (goal >= 40) { return '26.2 mi'; }
    else if (goal >= 30) { return '13.1 mi'; }
    else if (goal >= 20) { return '10 km';   }
    else                 { return '5 km';    }
  }
});

module.exports = View;
