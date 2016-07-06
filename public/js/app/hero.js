$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $(".hero"),

        initialize: function() {
          this.miles_this_week = this.$(".miles");
          this.goal_this_week = this.$(".goal");
          this.trend_this_week = this.$(".trend");
          this.trend_description = this.$(".trend_desc");
          this.chart = this.$(".graph");

          this.listenToOnce(Forrest.runs, "processed", this.render);
        },

        render: function() {
          var dayInMs = 1000 * 60 * 60 * 24,
              weekInMs = dayInMs * 7,
              now = new Date(),
              weekIterator,
              startOfToday,
              startOfThisWeek,
              startOfLastWeek, 
              runsByWeek = [],
              maxDistance = 0,
              chartHtml = "",
              distanceThisWeek = 0,
              distanceLastWeek = 0,
              percentChange = 0,
              remainingGoalThisWeek = 0,
              actualTrend,
              maxTrend;

          // Start of today (normalized to midnight)
          startOfToday = new Date(now);
          startOfToday.setHours(0);
          startOfToday.setMinutes(0);
          startOfToday.setSeconds(0);
          startOfToday.setMilliseconds(0);

          // Start of this week (normalized to midnight)
          startOfThisWeek = new Date(startOfToday - (dayInMs * startOfToday.getDay()));

          // Start of last week
          startOfLastWeek = new Date(startOfThisWeek - weekInMs);

          // Compile data for different time ranges
          Forrest.runs.each(function(e) {
            var t = e.get('timestamp');

            // This week
            if (t >= startOfThisWeek) {
              distanceThisWeek += e.getMileage();
            }

            // Last week
            if (t >= startOfLastWeek && t < startOfThisWeek) {
              distanceLastWeek += e.getMileage();
            }
          });

          // Normalize distances to single decimal precision
          distanceThisWeek = Math.round(distanceThisWeek * 10) / 10;
          distanceLastWeek = Math.round(distanceLastWeek * 10) / 10;

          // Calculate trending data
          percentChange = Math.round(
            ((distanceThisWeek / distanceLastWeek) - 1) * 100
          );

          // Calculate goals
          remainingGoalThisWeek = Math.round(10 * ((1.1 * distanceLastWeek) - distanceThisWeek)) / 10;

          // Display distance data
          this.miles_this_week.html(distanceThisWeek);

          // Display trending data
          if (percentChange >= 0) {
            this.trend_this_week.html(percentChange + "%");
            this.trend_description.html("more miles than last week.");
          }
          else if (percentChange < 0) {
            this.trend_this_week.html(Math.abs(percentChange) + "%");
            this.trend_description.html("fewer miles than last week.");
          }

          // Display goal data for the week
          if (remainingGoalThisWeek > 0) {
            this.goal_this_week.html(remainingGoalThisWeek);
          }
          else {
            this.goal_this_week.html("0");
          }

          // Compile run data for the last five weeks
          weekIterator = new Date(startOfLastWeek);
          var obj = {
            weekOf: weekIterator,
            distance: 0
          };
          for (var i = Forrest.runs.length - 1; i >= 0; --i) {
            var run = Forrest.runs.at(i),
                t = run.get('timestamp');

            // Skip runs from this week
            if (t >= startOfThisWeek) {
              continue;
            }

            // Skip runs older than four weeks ago
            if (t < startOfLastWeek - (weekInMs * 3)) {
              break;
            }

            // Account for weeks with no runs at all
            while (t < weekIterator) {
              weekIterator = new Date(weekIterator.getTime() - weekInMs);
              runsByWeek.unshift(obj);
              obj = {
                weekOf: weekIterator,
                distance: 0
              };
            }

            // Add distance to the week object
            obj.distance += run.getMileage();
          }
          runsByWeek.unshift(obj);
          runsByWeek.push({
            weekOf: startOfThisWeek,
            distance: runsByWeek[runsByWeek.length - 1].distance * 1.1
          });

          // Display run data for the last five weeks
          maxDistance = _.max(
            runsByWeek.map(function(w) {
              return w.distance;
            })
          );
          for (var i = 0; i < runsByWeek.length; ++i) {
            chartHtml += "<div class='bar' style='height: " + (runsByWeek[i].distance / maxDistance * 100) + "%;'>"
            if (i == runsByWeek.length - 1) {
              chartHtml += "<div class='bar progress' style='height: " + (distanceThisWeek / runsByWeek[i].distance * 100) + "%;'></div>";
            }
            chartHtml += "</div>";
          }
          this.chart.html(chartHtml);

          // Calculate trend lines
          var i = 0;
          actualTrend = regression('linear', runsByWeek.map(function(w) {
            return [i++, w.distance];
          })).equation;
          maxTrend = [0.1, actualTrend[1]];
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    heroView: new View
  });

}(typeof exports === 'undefined' ? window : exports));
