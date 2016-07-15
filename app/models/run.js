var Backbone = require('backbone');

var Run = Backbone.Model.extend({
  idAttribute: '_id',
  defaults: function() {
    return {
      _id: null,
      _rev: null,
      timestamp: null,
      created_by: null,
      distance: null
    }
  },
  getMileage: function() {
    return Math.round(this.get('distance') / 1609.3 * 10) / 10;
  }
});

module.exports = Run;
