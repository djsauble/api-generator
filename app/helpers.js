var Distance = require('compute-distance');

// Get a list of runs from the given database
var getRuns = function (db, callback) {
  db.list({include_docs: true}, function(err, body) {
    if (err) {
      callback(null);
      return;
    }

    // Pass data to the callback
    callback(
      body.rows.map(function(r) {
        r.doc.timestamp = new Date(r.doc.timestamp);
        return r.doc;
      }).sort(function(a,b) {
        return a.timestamp.getTime() - b.timestamp.getTime();
      })
    );
  });
};

// Calculate distance for a run document
var getDistance = function (data) {
  var filtered = Distance.filter(data),
      points = Distance.map(filtered),
      distance = Distance.compute(points);

  return distance;
};

// Get the appropriate goal for a given weekly mileage
var getGoalString = function(goal) {
       if (goal >= 80) { return '100 mi';  }
  else if (goal >= 70) { return '100 km';  }
  else if (goal >= 60) { return '50 mi';   }
  else if (goal >= 50) { return '50 km';   }
  else if (goal >= 40) { return '26.2 mi'; }
  else if (goal >= 30) { return '13.1 mi'; }
  else if (goal >= 20) { return '10 km';   }
  else if (goal >= 10) { return '5 km';    }
  else                 { return '1 mi';    }
};

/**
 * Date functions
 */

// Constants
var DAY_IN_MS = 1000 * 60 * 60 * 24;
var WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

// Calculate average pace represented by a run document
var getPace = function (data) {
  var distance = getDistance(data) / 1609.344,
      elapsed = getDuration(data);

  // Pace in minutes per mile
  return elapsed / distance;
};

// Calculate duration of the run
var getDuration = function (data) {
  var start = new Date(data[0].timestamp),
      end = new Date(data[data.length - 1].timestamp),
      elapsed = (end.getTime() - start.getTime()) / (1000 * 60);

  // Duration in minutes
  return elapsed;
};

// Format a duration string
var durationFromMinutes = function(value) {
  var seconds = parseInt((value % 1) * 60),
      minutes = parseInt(value % 60),
      hours = parseInt((value - minutes) / 60),
      str = '';

  // Hours
  if (hours > 0) {
    str += hours + ':';
  }

  // Minutes
  if (minutes < 10) {
    str += '0';
  }
  str += minutes + ':';

  // Seconds
  if (seconds < 10) {
    str += '0';
  }
  str += seconds;

  return str;
};

module.exports = {
  DAY_IN_MS: DAY_IN_MS,
  WEEK_IN_MS: WEEK_IN_MS,
  getRuns: getRuns,
  getDistance: getDistance,
  getPace: getPace,
  getDuration: getDuration,
  getGoalString: getGoalString,
  durationFromMinutes: durationFromMinutes,
};
