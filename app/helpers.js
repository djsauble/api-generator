var Helpers = {
  // Get the run data from the given document (convert from base-64 to JSON)
  getRun: function (doc) {
    return JSON.parse(
       atob(
         doc._attachments["data.json"]["data"]
       )
     ).map(function (p) {
       p.latitude = parseFloat(p.latitude);
       p.longitude = parseFloat(p.longitude);
       return p;
     });
  },

  // Smooth the run (e.g. ignore bouncing GPS tracks)
  defaultFilter: function (data) {
    var accurate = [],
        filtered = [],
        maxDistance = 20; // Meters

    // Filter out inaccurate points
    data.forEach(function(e) {
      if (parseFloat(e.accuracy) < maxDistance) {
        accurate.push(e);
      }
    });

    // Filter out discontinuities (points that aren't adjacent to any other points)
    for (var i = 1; i < accurate.length - 1; ++i) {
      var pt1 = new google.maps.LatLng(
          {
            lat: parseFloat(accurate[i-1].latitude),
            lng: parseFloat(accurate[i-1].longitude)
          }
      );
      var pt2 = new google.maps.LatLng(
          {
            lat: parseFloat(accurate[i].latitude),
            lng: parseFloat(accurate[i].longitude)
          }
      );
      var pt3 = new google.maps.LatLng(
          {
            lat: parseFloat(accurate[i+1].latitude),
            lng: parseFloat(accurate[i+1].longitude)
          }
      );
      var d1 = google.maps.geometry.spherical.computeDistanceBetween(pt1, pt2);
      var d2 = google.maps.geometry.spherical.computeDistanceBetween(pt2, pt3);
      if (d1 <= maxDistance && d2 <= maxDistance) {
        filtered.push(accurate[i]);
      }
    }

    return filtered;
  },

  // Get an array of coordinates
  getCoordinates: function (data) {
    var coords = [];

    for (var i in data) {
      coords.push(new google.maps.LatLng({
        lat: data[i].latitude,
        lng: data[i].longitude
      }));
    }

    return coords;
  },

  // Get the distance represented by a set of coordinates (meters)
  computeDistance: function (coords) {
    var distance = 0;
    for (var i = 0; i < coords.length - 1; ++i) {
      distance += google.maps.geometry.spherical.computeDistanceBetween(coords[i], coords[i+1]);
    }
    return distance;
  },

  /**
   * Date functions
   */

  // Constants
  DAY_IN_MS: 1000 * 60 * 60 * 24,
  WEEK_IN_MS: 1000 * 60 * 60 * 24 * 7,

  // Get midnight of the given date
  getMidnight: function (date) {
    var startOfDay = new Date(date.getTime());

    startOfDay.setHours(0);
    startOfDay.setMinutes(0);
    startOfDay.setSeconds(0);
    startOfDay.setMilliseconds(0);

    return startOfDay;
  }
};

module.exports = Helpers;
