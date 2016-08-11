var Backbone = require('backbone');
var Helpers = require('../helpers');

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
    return Helpers.durationFromMinutes(this.get('duration'));
  },
  getPace: function() {
    return Helpers.durationFromMinutes(this.get('pace')) + ' min/mi';
  },
});

module.exports = Run;
