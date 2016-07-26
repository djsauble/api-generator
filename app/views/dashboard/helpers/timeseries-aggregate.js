/**
 * Given an array of timeseries data ordered from oldest to
 * newest, aggregate the sum of X periods of Y milliseconds 
 * each, ending at the date given.
 *
 * Series data is expected to be an array of objects of the
 * following format:
 *
 * {
 *   timestamp: Date,
 *   value: Number
 * }
 *
 * The output is an array of objects of the following format:
 *
 * {
 *   period: Date, // The start of the period being sum
 *   sum: Number   // The sum of values in the period
 * }
 *
 * This algorithm is weighted toward sums that favor the end of
 * the series array (most recent values), as it iterates from 
 * end to start.
 */
var aggregate = function(endDate, numPeriods, periodDurationInMs, series) {
  var iterator = new Date(endDate.getTime() - periodDurationInMs),
      sumByPeriod = [],
      obj = {
        period: iterator,
        sum: 0
      },
      point,
      t;

  for (var i = series.length - 1; i >= 0; --i) {
    point = series[i];
    t = point.timestamp;

    // Skip runs that are after the ending date
    if (t >= endDate) {
      continue;
    }

    // Skip runs older than the cutoff
    if (t < endDate - (periodDurationInMs * numPeriods)) {
      break;
    }

    // Account for periods with no data at all
    while (t < iterator) {
      iterator = new Date(iterator.getTime() - periodDurationInMs);
      sumByPeriod.unshift(obj);
      obj = {
        period: iterator,
        sum: 0
      };
    }

    // Add value to the week object
    obj.sum += point.value;
  }
  sumByPeriod.unshift(obj);

  return sumByPeriod;
};

module.exports = aggregate;
