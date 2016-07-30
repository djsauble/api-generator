var $ = require('jquery');
var Backbone = require('backbone');
var Helpers = require('../../helpers');
var Distance = require('compute-distance');

var View = Backbone.View.extend({
  className: "map",

  initialize: function(options) {

    /**
     * Instance data
     */

    this.options = options;
    this.overlays = [];
    this.timers = [];
    this.bounds = null;

    /**
     * Events
     */

    // Resize the map whenever the window resizes
    $(window).bind("resize", this.fitMap);

    var me = this;
    this.fitMap = function() {
      google.maps.event.trigger(me.mapReference, "resize");
      me.mapReference.fitBounds(me.bounds);
    };
  },

  render: function() {
    // Show the map
    if (!this.mapReference) {
      this.mapReference = new google.maps.Map(this.el, {
        disableDefaultUI: true,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true
      });
    }

    if (this.model) {
      this.displayRun();
    }

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    $(window).unbind("resize", this.fitMap);
    this.mapReference = null;
  },

  displayRun: function() {
    var me = this,
        ws = new WebSocket(WEBSOCKET_URL);

    // Animate the latest route
    this.stopAnimations();
    ws.onopen = function() {
      ws.send(JSON.stringify({
        type: 'get_data',
        user: USER_ID,
        token: USER_TOKEN,
        database: DATABASE,
        run: me.model.get('_id')
      }));
    };
    ws.onmessage = function(data, flags) {
      // Make sure this is something we know how to parse
      var message;
      try {
        message = JSON.parse(data.data);
      } catch(err) {
        // Do nothing
        ws.close();
        return;
      }

      // Take appropriate action
      if (!message.error) {
        var filtered = Distance.filter(message);
        var coords = filtered.map(function(f) {
          return new google.maps.LatLng({
            lat: parseFloat(f.latitude),
            lng: parseFloat(f.longitude)
          });
        });

        // Set the map boundaries
        me.bounds = me.getBoundaries(coords);
        me.fitMap();

        // Animate the route
        var draw = [];
        var timer = me.startAnimation(function() {
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
      ws.close();
    };
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
