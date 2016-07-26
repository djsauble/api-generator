var $ = require('jquery');
var Cookie = require('tiny-cookie');

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
  document.querySelector('#estimate').value = makeWeeksHuman(
    weeksToGoal(
      parseFloat(document.querySelector('#todayOutput').value),
      parseFloat(document.querySelector('#goalOutput').value)
    )
  );
}

// Convert weeks to a more appropriate timescale
function makeWeeksHuman(weeks) {
  if (weeks < 14) {
    return Math.round(weeks) + ' weeks';
  }
  else if (weeks < 52) {
    return Math.round(weeks / 4.345) + ' months';
  }
  else {
    return Math.round(10 * weeks / 52) / 10 + ' years';
  }
}

// Given a starting and ending mileage, calculate training time
function weeksToGoal(startMileage, goalMileage) {
  var currentMileage = startMileage;
  var weekCount = 0;

  while (currentMileage < goalMileage) {

    var func, state;

    // Find the right training level for the current mileage
    if (currentMileage < 3) { func = lessThan3; }
    else if (currentMileage < 10) { func = lessThan10; }
    else if (currentMileage < 20) { func = lessThan20; }
    else { func = moreThan20; }

    // Simulate the current training level
    state = func(currentMileage);
    weekCount += state.weeksAtThisLevel;
    currentMileage = state.milesPerWeek;
  }

  return weekCount;
}

// Never prescribe weekly mileage lower than 3
function lessThan3(currentMileage) {
  return {
    milesPerWeek: 3,
    weeksAtThisLevel: 1
  };
}

// Increase weekly mileage by 1 until hitting 10 mpw
function lessThan10(currentMileage) {
  return {
    milesPerWeek: currentMileage + 1,
    weeksAtThisLevel: 1
  };
}

// Increase weekly mileage by 10% per week until hitting 20 mpw
function lessThan20(currentMileage) {
  return {
    milesPerWeek: currentMileage * 1.1,
    weeksAtThisLevel: 1
  };
}

// Increase weekly mileage at increasingly slow intervals after 20 mpw
function moreThan20(currentMileage) {
  return {
    milesPerWeek: currentMileage * 1.1,
    weeksAtThisLevel: 9.32002 * Math.log(0.0556632 * currentMileage)
  };
}
