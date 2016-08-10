var Backbone = require('backbone');

var Run = Backbone.Model.extend({
  idAttribute: '_id',
  defaults: function() {
    return {
      _id: null,
      _rev: null,
      timestamp: null,
      created_by: null,
      distance: null,
      duration: null,
      pace: null
    };
  },
  getMileage: function() {
    return Math.round(this.get('distance') / 1609.3 * 10) / 10;
  },
  getDuration: function() {
    return this.durationFromMinutes(this.get('duration'));
  },
  getPace: function() {
    return this.durationFromMinutes(this.get('pace')) + ' min/mi';
  },
  durationFromMinutes: function(value) {
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
  }
});

module.exports = Run;
