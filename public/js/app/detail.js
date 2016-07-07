$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $(".detail"),

        initialize: function() {
          this.empty_state = this.$(".empty");
          this.map = this.$("#output");

          /**
           * Instance data
           */
          this.overlays = [];
          this.timers = [];
          this.bounds = null;

          /**
           * Helper methods
           */

          // Add an overlay to the map
          this.addOverlay = function(overlay) {
            overlay.setMap(this.mapReference);
            this.overlays.push(overlay);
          };

          // Remove all overlays from the map
          this.removeAllOverlays = function() {
            for (var i in this.overlays) {
              this.overlays[i].setMap(null);
            }
            this.overlays = [];
          };

          // Get an array of coordinates
          this.getCoordinates = function(data) {
            var coords = [];

            for (var i in data) {
              coords.push(new google.maps.LatLng({
                lat: parseFloat(data[i]["latitude"]),
                lng: parseFloat(data[i]["longitude"])
              }));
            }

            return coords;
          };

          // Get the boundaries of the map
          this.getBoundaries = function(coords) {
            var bounds = new google.maps.LatLngBounds();

            for (var i in coords) {
              bounds.extend(coords[i]);
            }

            return bounds;
          };

          // Animate a function
          this.startAnimation = function(expression, interval) {
            var timerId = setInterval(expression, interval);
            this.timers.push(timerId);
            return timerId;
          };

          // Stop a specific animation
          this.stopAnimation = function(id) {
            var index = this.timers.indexOf(id);
            if (index >= 0) {
              clearInterval(this.timers[index]);
            }
            this.timers.splice(index, 1);
          };

          // Stop animations
          this.stopAnimations = function() {
            for (var i in this.timers) {
              clearInterval(this.timers[i]);
            }
            this.timers = [];
          };

          /**
           * Events
           */

          // Wait for data to load before rendering
          this.listenToOnce(Forrest.runs, "processed", this.render);

          // Resize the map whenever the window resizes
          var me = this;
          $(window).bind("resize", function() {
            google.maps.event.trigger(me.mapReference, "resize");
            me.mapReference.fitBounds(me.bounds);
          });
        },

        render: function() {
          var me = this,
              listHtml = "";

          // Hide the empty state
          this.empty_state.hide();
          this.map.show();

          // Show the map
          this.mapReference = new google.maps.Map(document.getElementById("output"), {
            disableDefaultUI: true,
            draggable: false,
            scrollwheel: false
          });

          // Animate the latest route
          this.stopAnimations();
          Forrest.localDB.get(Forrest.runs.at(Forrest.runs.length - 1).get('_id'), {attachments: true}).then(function(doc) {
            var data = getRun(doc);
            var filtered = defaultFilter(data);
            var coords = getCoordinates(filtered);

            // Set the map boundaries
            me.bounds = me.getBoundaries(coords);
            me.mapReference.fitBounds(me.bounds);

            // Animate the route
            var draw = [];
            var timer = me.startAnimation(function() {
              if (coords.length == 0) {
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
          });
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    detailView: new View
  });

}(typeof exports === 'undefined' ? window : exports));
