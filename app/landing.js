var $ = require('jquery');
var Cookie = require('tiny-cookie');
var Training = require('base-building');

$(function() {
  // Configure events
  $('#today').on('input', updateToday);
  $('#goal').on('input', updateGoal);

  // Load data from previous sessions
  loadFromCookies();

  // Update estimate if applicable
  updateEstimate();
});

// Load persisted data from cookies, if available
function loadFromCookies() {
  var todayMilesPerWeek = Cookie.get('todayMilesPerWeek');
  if (todayMilesPerWeek) {
    document.querySelector('#today').value = todayMilesPerWeek;
    updateToday();
  }
  var goalMilesPerWeek = Cookie.get('goalMilesPerWeek');
  if (goalMilesPerWeek) {
    document.querySelector('#goal').value = goalMilesPerWeek;
    updateGoal();
  }
}

// Update today's mileage
function updateToday() {
  var milesPerWeek = document.querySelector('#today').value;
  document.querySelector('#todayOutput').value = milesPerWeek;
  updateEstimate();
  Cookie.set('todayMilesPerWeek', milesPerWeek);
}

// Update the goal mileage
function updateGoal() {
  var milesPerWeek = document.querySelector('#goal').value;
  document.querySelector('#goalOutput').value = milesPerWeek;
  updateEstimate();
  Cookie.set('goalMilesPerWeek', milesPerWeek);
}

// Update the time estimate
function updateEstimate() {
  document.querySelector('#estimate').value = Training.makeWeeksHuman(
    Training.weeksToGoal(
      parseFloat(document.querySelector('#todayOutput').value),
      parseFloat(document.querySelector('#goalOutput').value)
    )
  );
}
