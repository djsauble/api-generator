/**
 * Given an array of timeseries data ordered from oldest to
 * newest, return the sum of the values between the start and
 * end dates (inclusive).
 *
 * If either startDate or endDate is undefined, the sum is
 * calculated to the start or end of the series, respectively.
 *
 * Series data is expected to be an array of objects of the
 * following format:
 *
 * {
 *   timestamp: Date,
 *   value: Number
 * }
 *
 * The algorithm is weighted toward sums that favor the end of
 * the series array (most recent values), as it iterates from 
 * end to start.
 */
var sum = function(startDate, endDate, series) {
  var sum = 0, point, i, t;

  for (i = series.length - 1; i >= 0; --i) {
    point = series[i];
    t = point.timestamp;

    // Interval check
    if (endDate) {
      if (t >= startDate && t < endDate) {
        sum += point.value;
      }
    }
    else {
      if (t >= startDate) {
        sum += point.value;
      }
    }

    // Break early if possible
    if (t < startDate) {
      break;
    }
  }

  return sum;
};

module.exports = sum;
