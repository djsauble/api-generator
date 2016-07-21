function updateToday(milesPerWeek) {
  document.querySelector('#todayOutput').value = milesPerWeek;
  console.log(
    weeksToGoal(
      parseFloat(milesPerWeek),
      parseFloat(document.querySelector('#goalOutput').value)
    )
  );
}

function updateGoal(milesPerWeek) {
  document.querySelector('#goalOutput').value = milesPerWeek;
  console.log(
    weeksToGoal(
      parseFloat(document.querySelector('#todayOutput').value),
      parseFloat(milesPerWeek)
    )
  );
}

function weeksToGoal(startMileage, goalMileage) {
  var currentMileage = startMileage;
  var weekCount = 0;

  while (currentMileage < goalMileage) {

    // Initialize variables for the next training level
    var func,
        state = {
          milesPerWeek: currentMileage, // Current weekly mileage
          weeksAtThisLevel: 0, // Number of miles we've trained at this level
          levelComplete: false // Have we finished this level?
        };

    // Find the right training level for the current mileage
    if (currentMileage < 3) { func = lessThan3; }
    else if (currentMileage < 6) { func = lessThan6; }
    else if (currentMileage < 20) { func = lessThan20; }
    else if (currentMileage < 30) { func = lessThan30; }
    else if (currentMileage < 50) { func = lessThan50; }
    else if (currentMileage < 60) { func = lessThan60; }
    else if (currentMileage < 70) { func = lessThan70; }
    else if (currentMileage < 80) { func = lessThan80; }
    else if (currentMileage < 90) { func = lessThan90; }
    else { func = lessThan100; }

    // Simulate the current training level
    do {
      ++weekCount;
      func(state);
    }
    while (!state.levelComplete && state.milesPerWeek < goalMileage);

    // Get ready for the next training level
    currentMileage = state.milesPerWeek;
  }

  return weekCount;
}

function lessThan3(state) {
  state.milesPerWeek = 3;
  state.weeksAtThisLevel += 1;
  state.levelComplete = true;
}

function lessThan6(state) {
  state.milesPerWeek += 1;
  state.weeksAtThisLevel += 1;
  state.levelComplete = true;
}

function lessThan20(state) {
  state.milesPerWeek *= 1.1;
  state.weeksAtThisLevel += 1;
  state.levelComplete = true;
}

function lessThan30(state) {
  var mod = state.weeksAtThisLevel % 4;

  if (mod == 0 && state.weeksAtThisLevel == 0) {
    state.milesPerWeek *= 1.1;
  } else if (mod == 2) {
    state.milesPerWeek *= 0.8;
  } else if (mod == 3) {
    state.milesPerWeek *= 1.25;
  }

  if (state.weeksAtThisLevel >= 4) {
    state.levelComplete = true;
  }

  state.weeksAtThisLevel += 1;
}

function lessThan50(state) {
  var mod = state.weeksAtThisLevel % 4;

  if (mod == 0 && state.weeksAtThisLevel == 0) {
    state.milesPerWeek *= 1.1;
  } else if (mod == 2) {
    state.milesPerWeek *= 0.8;
  } else if (mod == 3) {
    state.milesPerWeek *= 1.25;
  }

  if (state.weeksAtThisLevel >= 8) {
    state.levelComplete = true;
  }

  state.weeksAtThisLevel += 1;
}

function lessThan60(state) {
  var mod = state.weeksAtThisLevel % 4;

  if (mod == 0 && state.weeksAtThisLevel == 0) {
    state.milesPerWeek *= 1.1;
  } else if (mod == 2) {
    state.milesPerWeek *= 0.8;
  } else if (mod == 3) {
    state.milesPerWeek *= 1.25;
  }

  if (state.weeksAtThisLevel >= 12) {
    state.levelComplete = true;
  }

  state.weeksAtThisLevel += 1;
}

function lessThan70(state) {
  var mod = state.weeksAtThisLevel % 4;

  if (mod == 0 && state.weeksAtThisLevel == 0) {
    state.milesPerWeek *= 1.1;
  } else if (mod == 2) {
    state.milesPerWeek *= 0.8;
  } else if (mod == 3) {
    state.milesPerWeek *= 1.25;
  }

  if (state.weeksAtThisLevel >= 16) {
    state.levelComplete = true;
  }

  state.weeksAtThisLevel += 1;
}

function lessThan80(state) {
  var mod = state.weeksAtThisLevel % 4;

  if (mod == 0 && state.weeksAtThisLevel == 0) {
    state.milesPerWeek *= 1.1;
  } else if (mod == 2) {
    state.milesPerWeek *= 0.8;
  } else if (mod == 3) {
    state.milesPerWeek *= 1.25;
  }

  if (state.weeksAtThisLevel >= 20) {
    state.levelComplete = true;
  }

  state.weeksAtThisLevel += 1;
}

function lessThan90(state) {
  var mod = state.weeksAtThisLevel % 4;

  if (mod == 0 && state.weeksAtThisLevel == 0) {
    state.milesPerWeek *= 1.1;
  } else if (mod == 2) {
    state.milesPerWeek *= 0.8;
  } else if (mod == 3) {
    state.milesPerWeek *= 1.25;
  }

  if (state.weeksAtThisLevel >= 24) {
    state.levelComplete = true;
  }

  state.weeksAtThisLevel += 1;
}

function lessThan100(state) {
  var mod = state.weeksAtThisLevel % 4;

  if (mod == 0 && state.weeksAtThisLevel == 0) {
    state.milesPerWeek *= 1.1;
  } else if (mod == 2) {
    state.milesPerWeek *= 0.8;
  } else if (mod == 3) {
    state.milesPerWeek *= 1.25;
  }

  if (state.weeksAtThisLevel >= 28) {
    state.levelComplete = true;
  }

  state.weeksAtThisLevel += 1;
}
