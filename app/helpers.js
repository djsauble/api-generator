var Helpers = {
  // Get the run data from the given document (convert from base-64 to JSON)
  getRun: function (doc) {
    return JSON.parse(
       atob(
         doc._attachments["data.json"].data
       )
     ).map(function (p) {
       p.latitude = parseFloat(p.latitude);
       p.longitude = parseFloat(p.longitude);
       return p;
     });
  },

  /**
   * Date functions
   */

  // Constants
  DAY_IN_MS: 1000 * 60 * 60 * 24,
  WEEK_IN_MS: 1000 * 60 * 60 * 24 * 7
};

module.exports = Helpers;
