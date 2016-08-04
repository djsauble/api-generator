var $ = require('jquery');
var Backbone = require('backbone');
var Helpers = require('../../helpers');
var Distance = require('compute-distance');

var View = Backbone.View.extend({
  className: "map",

  initialize: function() {

    /**
     * Instance data
     */

    this.overlays = [];
    this.timers = [];
    this.bounds = null;
    this.route = null;

    /**
     * Events
     */

    // When a new run is selected, display it
    this.listenTo(Forrest.bus, 'runs:selected', this.fetchRun);
    this.listenTo(Forrest.bus, 'socket:message', this.displayRun);

    // Resize the map whenever the window resizes
    $(window).bind("resize", this.fitMap);

    var me = this;
    this.fitMap = function() {
      google.maps.event.trigger(me.mapReference, "resize");
      me.mapReference.fitBounds(me.bounds);
    };
  },

  render: function() {
    var me = this;

    // Show the map
    if (!this.mapReference) {
      this.mapReference = new google.maps.Map(this.el, {
        disableDefaultUI: true,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true
      });
    }

    if (this.route) {

      // Stop any existing routes from being drawn
      this.stopAnimations();

      // Draw the route
      var filtered = Distance.filter(this.route);
      var coords = filtered.map(function(f) {
        return new google.maps.LatLng({
          lat: parseFloat(f.latitude),
          lng: parseFloat(f.longitude)
        });
      });

      // Set the map boundaries
      this.bounds = this.getBoundaries(coords);
      this.fitMap();

      // Animate the route
      var draw = [];
      var timer = this.startAnimation(function() {
        if (coords.length === 0) {
          me.stopAnimation(timer);
          return;
        }

        // Add a point to the draw array
        draw.push(coords.shift());

        // Clear any existing overlays
        me.removeAllOverlays();

        // Construct the path
        var path = new google.maps.Polyline({
          path: draw,
          geodesic: true,
          strokeColor: "#ff0000",
          strokeOpacity: 0.6,
          strokeWeight: 2
        });

        // Draw the route thus far
        me.addOverlay(path);
      }, 5);
    }

    return this;
  },

  // Request the route from the server
  fetchRun: function(model) {
    Forrest.bus.trigger('socket:send', 'run:get', {
      user: USER_ID,
      token: USER_TOKEN,
      database: DATABASE,
      run: model.get('_id')
    });
  },

  displayRun: function(socket, message) {
    // Filter out messages we can't handle
    if (message.type !== 'run:get' || message.error) {
      return;
    }

    // Set the route
    this.route = message.data;
    this.render();
  },

  remove: function() {
    this.undelegateEvents();
    $(window).unbind("resize", this.fitMap);
    this.mapReference = null;
  },

  // Add an overlay to the map
  addOverlay: function(overlay) {
    overlay.setMap(this.mapReference);
    this.overlays.push(overlay);
  },

  // Remove all overlays from the map
  removeAllOverlays: function() {
    for (var i in this.overlays) {
      this.overlays[i].setMap(null);
    }
    this.overlays = [];
  },

  // Get an array of coordinates
  getCoordinates: function(data) {
    var coords = [];

    for (var i in data) {
      coords.push(new google.maps.LatLng({
        lat: parseFloat(data[i].latitude),
        lng: parseFloat(data[i].longitude)
      }));
    }

    return coords;
  },

  // Get the boundaries of the map
  getBoundaries: function(coords) {
    var bounds = new google.maps.LatLngBounds();

    for (var i in coords) {
      bounds.extend(coords[i]);
    }

    return bounds;
  },

  // Animate a function
  startAnimation: function(expression, interval) {
    var timerId = setInterval(expression, interval);
    this.timers.push(timerId);
    return timerId;
  },

  // Stop a specific animation
  stopAnimation: function(id) {
    var index = this.timers.indexOf(id);
    if (index >= 0) {
      clearInterval(this.timers[index]);
    }
    this.timers.splice(index, 1);
  },

  // Stop animations
  stopAnimations: function() {
    for (var i in this.timers) {
      clearInterval(this.timers[i]);
    }
    this.timers = [];
  }
});

module.exports = View;
