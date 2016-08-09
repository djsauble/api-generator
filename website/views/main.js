var _ = require('underscore');
var Backbone = require('backbone');
var Training = require('base-building');

var View = Backbone.View.extend({
  el: 'body',
  events: {
    'input .today': 'onDistanceInput',
    'input .goal': 'onGoalInput'
  },
  initialize: function() {
    // DOM hooks
    this.goal = this.$('.goal');
    this.distance = this.$('.today');
    this.estimate = this.$('.learn .estimate');
    this.chart = this.$('.plan');
    this.weeks = this.$('.week_count');
    this.startingMileage = this.$('.today_mpw');
    this.endingMileage = this.$('.goal_mpw');

    // Improve screen hooks

    // Update the view when the model changes
    this.listenTo(this.model, 'change', this.render);

    this.render();
  },
  render: function() {
    var distance = this.model.get('distance'),
        goal = this.model.get('goal'),
        weeks = Training.weeksToGoal(distance, goal),
        estimate = Training.makeWeeksHuman(weeks);

    this.goal.val(goal);

    this.distance.val(distance);
    this.estimate.html(estimate);
    this.el.className = this.getClass(goal);
    this.chart.html(this.getChart(distance, goal));
    this.weeks.html(Math.floor(weeks));
    this.startingMileage.html(distance);
    this.endingMileage.html(goal);

    return this;
  },

  /***********************
   * Hero screen helpers *
   ***********************/

  // View -> Model update
  onDistanceInput: function(el) {
    this.model.setDistance(el.target.value);
  },
  onGoalInput: function(el) {
    this.model.setGoal(el.target.value);
  },

  // Get the background image to display
  getClass: function(goal) {
    if (goal >= 80) {
      return 'hundred_mile';
    }
    else if (goal >= 70) {
      return 'hundred_k';
    }
    else if (goal >= 60) {
      return 'fifty_mile';
    }
    else if (goal >= 50) {
      return 'fifty_k';
    }
    else if (goal >= 40) {
      return 'marathon';
    }
    else if (goal >= 30) {
      return 'half_marathon';
    }
    else if (goal >= 20) {
      return 'ten_k';
    }
    else {
      return 'five_k';
    }
  },

  /***********************
   * Plan screen helpers *
   ***********************/

  getChart: function(start, end) {
    var chart = document.querySelector('.plan'),
        plan = [],
        html = '',
        level,
        current,
        max,
        i;

    // Calculate the training plan
    current = start;
    while (current < end) {
      level = Training.weeksAtMileage(current);
      current = level.milesAtNextLevel;
      plan.push(level);
    }

    // Find the peak week
    max = current;

    // Display the training plan
    current = start;
    plan.forEach(function(l) {
      for (i = 0; i < l.weeksAtThisLevel; ++i) {
        html += '<div class="bar" style="height: ' +
                (Training.mileageAtWeek(i + 1, current) / max * 100) +
                '%;"></div>';
      }
      current = l.milesAtNextLevel;
    });

    return html;
  }
});

module.exports = View;
