var _ = require('underscore');
var Backbone = require('backbone');
var DateNames = require('date-names');
var DateRound = require('date-round');
var Cookie = require('tiny-cookie');
var predict = require('date-prediction');
var Helpers = require('../../helpers');
var BarView = require('./bar');

var View = Backbone.View.extend({
  className: "trend dark row",

  initialize: function() {
    // Backing data
    this.mode = 'view';
    this.selected = null;

    // Children
    this.bars = [];

    // Events
    this.listenTo(Forrest.bus, 'user:change:distanceThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goalThisWeek', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:goal', this.setModel);
    this.listenTo(Forrest.bus, 'user:change:distanceByWeek', this.setModel);
    this.listenTo(Forrest.bus, 'runs:filter', this.selectBar);
  },

  events: {
    'click .change_goal': 'onChange',
    'click .save_goal': 'onSave',
    'click .cancel_change': 'onCancel'
  },

  render: function() {
    var me = this,
        startOfToday = DateRound.floor(new Date()),
        startOfThisWeek = DateRound.floor(startOfToday, 'week'),
        runArray,
        goal = 0,
        distanceByWeek = [],
        goalThisWeek,
        distanceThisWeek,
        goalString,
        goalDateString = '&mdash;';

    // Remove any existing bars
    this.bars.forEach(function(b) {
      b.remove();
    });
    this.bars = [];

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
        goalString = Helpers.getGoalString(goal);
        goalDateString = this.getGoalDate(
          goal,
          distanceByWeek,
          startOfThisWeek
        );
      }

      // Get the chart HTML
      this.bars = this.getBars(runArray, distanceThisWeek);
    }

    // Render the template
    this.$el.html(
      this.template({
        enoughData: distanceByWeek.length > 2,

        // Show these when we have at least three weeks of data
        selectHtml: this.getSelectHtml(),
        goalString: goalString,
        goalDateString: goalDateString,
        mode: this.mode
      })
    );

    // Add the bars to the DOM
    if (distanceByWeek.length > 2) {
      this.bars.forEach(function(r) {
        me.$('.graph').append(r.render().el);
      });
    }

    // Highlight the selected bar, if any
    if (this.selected) {
      this.$('#' + this.selected).addClass('selected');
    }

    return this;
  },

  template: _.template(
    "<% if (enoughData) { %>" +
      "<h1>Trending data</h1>" +
      "<div class='graph row'></div>" +
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
      "<% } %>" +
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
  getBars: function(distanceByWeek, distanceThisWeek) {
    var bars = [],
        start,
        end,
        actual,
        height,
        maxDistance;

    maxDistance = _.max(
      distanceByWeek.map(function(w) {
        return w.sum;
      })
    );
    for (var i = 0; i < distanceByWeek.length; ++i) {
      actual = undefined;
      start = (new Date(distanceByWeek[i].period)).getTime();
      end = start + DateRound.WEEK_IN_MS;
      height = distanceByWeek[i].sum / maxDistance * 100;
      if (i == distanceByWeek.length - 1) {
        actual = distanceThisWeek / distanceByWeek[i].sum * 100;
      }
      bars.push(new BarView({
        model: new Backbone.Model({
          actual: actual,
          startTime: start,
          endTime: end
        }),
        attributes: {
          'id': start,
          'style': 'height: ' + height + '%'
        }
      }));
    }

    return bars;
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
              Helpers.getGoalString(i) + (estimate ? ' by ' + estimate : '') +
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
  selectBar: function(id) {
    this.selected = id;
    this.render();
  }
});

module.exports = View;
