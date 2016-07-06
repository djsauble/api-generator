$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $(".master"),

        initialize: function() {
          this.empty_state = this.$(".empty");
          this.list = this.$(".list");

          this.listenToOnce(Forrest.runs, "processed", this.render);
        },

        render: function() {
          var listHtml = "";

          // Hide the empty state
          this.empty_state.hide();
          this.list.show();

          // Tabulate the list of runs, with their distance and timestamp
          for (var i = Forrest.runs.length - 1; i >= 0; --i) {
            var run = Forrest.runs.at(i),
                ts = run.get('timestamp'),
                date = (ts.getMonth() + 1) + "/" + ts.getDate() + "/" + (ts.getYear() + 1900),
                mileage = run.getMileage();

            listHtml += "<li><a href='#'>" + date + "</a><small>" + mileage + " mi</small></li>";
          }

          // Display the list of runs
          this.list.html(listHtml);
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    masterView: new View
  });

}(typeof exports === 'undefined' ? window : exports));
