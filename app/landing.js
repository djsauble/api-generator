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
  updateEstimate();
}

// Update today's mileage
function updateToday() {
  var milesPerWeek = document.querySelector('#today').value;
  if (parseInt(milesPerWeek) === 1) {
    document.querySelector('.plural').innerHTML = '';
  }
  else {
    document.querySelector('.plural').innerHTML = 's';
  }
  Cookie.set('todayMilesPerWeek', milesPerWeek);
  updateEstimate();
}

// Update the goal mileage
function updateGoal() {
  var milesPerWeek = document.querySelector('#goal').value;

  // Persist this data
  Cookie.set('goalMilesPerWeek', milesPerWeek);

  // Change the background image
  document.querySelector('body').className = getClass(milesPerWeek);

  // Update the target date
  updateEstimate();
}

// Update the time estimate
function updateEstimate() {
  document.querySelector('.estimate').innerHTML = Training.makeWeeksHuman(
    Training.weeksToGoal(
      parseFloat(document.querySelector('#today').value),
      parseFloat(document.querySelector('#goal').value)
    )
  );
}

// Get the class name corresponding to a goal level
function getClass(goal) {
  var map = {
    '10': 'five_k',
    '20': 'ten_k',
    '30': 'half_marathon',
    '40': 'marathon',
    '50': 'fifty_k',
    '60': 'fifty_mile',
    '70': 'hundred_k',
    '80': 'hundred_mile'
  };

  return map[goal];
}
