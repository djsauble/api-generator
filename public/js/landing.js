function updateToday(milesPerWeek) {
  document.querySelector('#todayOutput').value = milesPerWeek;
  document.querySelector('#estimate').value = makeWeeksHuman(
    weeksToGoal(
      parseFloat(milesPerWeek),
      parseFloat(document.querySelector('#goalOutput').value)
    )
  );
}

function updateGoal(milesPerWeek) {
  document.querySelector('#goalOutput').value = milesPerWeek;
  document.querySelector('#estimate').value = makeWeeksHuman(
    weeksToGoal(
      parseFloat(document.querySelector('#todayOutput').value),
      parseFloat(milesPerWeek)
    )
  );
}

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

function weeksToGoal(startMileage, goalMileage) {
  var currentMileage = startMileage;
  var weekCount = 0;

  while (currentMileage < goalMileage) {

    var func, state;

    // Find the right training level for the current mileage
    if (currentMileage < 3) { func = lessThan3; }
    else if (currentMileage < 6) { func = lessThan6; }
    else if (currentMileage < 20) { func = lessThan20; }
    else { func = moreThan20; }

    // Simulate the current training level
    state = func(currentMileage);
    weekCount += state.weeksAtThisLevel;
    currentMileage = state.milesPerWeek;
  }

  return weekCount;
}

function lessThan3(currentMileage) {
  return {
    milesPerWeek: 3,
    weeksAtThisLevel: 1
  }
}

function lessThan6(currentMileage) {
  return {
    milesPerWeek: currentMileage + 1,
    weeksAtThisLevel: 1
  }
}

function lessThan20(currentMileage) {
  return {
    milesPerWeek: currentMileage * 1.1,
    weeksAtThisLevel: 1
  }
}

function moreThan20(currentMileage) {
  return {
    milesPerWeek: currentMileage * 1.1,
    weeksAtThisLevel: 9.32002 * Math.log(0.0556632 * currentMileage)
  }
}
