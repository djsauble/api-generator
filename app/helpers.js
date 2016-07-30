var Helpers = {
  // Get the run data from the given document (convert from base-64 to JSON)
  getRun: function (buffer) {
    console.log(buffer);
    return JSON.parse(
       atob(
         buffer.data
       )
     );
  },

  /**
   * Date functions
   */

  // Constants
  DAY_IN_MS: 1000 * 60 * 60 * 24,
  WEEK_IN_MS: 1000 * 60 * 60 * 24 * 7
};

module.exports = Helpers;
