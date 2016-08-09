var nano = require('nano')(process.env.COUCHDB_DATABASE_URL);
var Distance = require('compute-distance');

// Get a list of runs from the given database
var getRuns = function (db, callback) {
  var runs = nano.db.use(db);
  runs.list({include_docs: true}, function(err, body) {
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

/**
 * Date functions
 */

// Constants
var DAY_IN_MS = 1000 * 60 * 60 * 24;
var WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

module.exports = {
  getRuns: getRuns,
  getDistance: getDistance,
  getPace: getPace,
  getDuration: getDuration,
  DAY_IN_MS: DAY_IN_MS,
  WEEK_IN_MS: WEEK_IN_MS
};
