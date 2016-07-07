$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $(".hero"),

        initialize: function() {
          /* Constants */
          this.DAY_IN_MS = 1000 * 60 * 60 * 24;
          this.WEEK_IN_MS = this.DAY_IN_MS * 7;

          /* DOM hooks */
          this.miles_this_week = this.$(".miles");
          this.goal_this_week = this.$(".goal");
          this.trend_this_week = this.$(".trend");
          this.trend_description = this.$(".trend_desc");
          this.goal_amount = this.$(".goal_amount");
          this.goal_date = this.$(".goal_date");
          this.chart = this.$(".graph");

          /**
           * Helper methods
           */

          // Get a date representing midnight today
          this.midnightToday = function() {
            var startOfToday = new Date();

            startOfToday.setHours(0);
            startOfToday.setMinutes(0);
            startOfToday.setSeconds(0);
            startOfToday.setMilliseconds(0);

            return startOfToday;
          };

          // Get the distance run in the given interval (to present, if only one argument given)
          this.getDistance = function(start, end) {
            var distance = 0,
                run, t;

            for (var i = Forrest.runs.length - 1; i >= 0; --i) {
              run = Forrest.runs.at(i);
              t = run.get('timestamp');

              // Interval check
              if (end) {
                if (t >= start && t < end) {
                  distance += run.getMileage();
                }
              }
              else {
                if (t >= start) {
                  distance += run.getMileage();
                }
              }

              // Break early if possible
              if (t < start) {
                break;
              }
            }

            return Math.round(distance * 10) / 10;
          };

          // Compile run data for a previous number of weeks
          this.compileWeeklyRuns = function(startOfThisWeek, numberOfWeeks) {
            var weekIterator = new Date(startOfThisWeek.getTime() - this.WEEK_IN_MS),
                runsByWeek = [],
                obj = {
                  weekOf: weekIterator,
                  distance: 0
                },
                run,
                t;

            for (var i = Forrest.runs.length - 1; i >= 0; --i) {
              run = Forrest.runs.at(i);
              t = run.get('timestamp');

              // Skip runs from this week
              if (t >= startOfThisWeek) {
                continue;
              }

              // Skip runs older than the cutoff
              if (t < startOfThisWeek - (this.WEEK_IN_MS * numberOfWeeks)) {
                break;
              }

              // Account for weeks with no runs at all
              while (t < weekIterator) {
                weekIterator = new Date(weekIterator.getTime() - this.WEEK_IN_MS);
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

            return runsByWeek;
          };

          // Display the last day of the given week
          this.renderGoalDate = function(goalAmount, runsByWeek, startOfThisWeek) {
            var actualTrend,
                rateOfChange,
                weeksUntilGoal,
                distance,
                weekIterator,
                monthNames = [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
                ],
                i;

            // Calculate a linear regression of the last several weeks
            i = 0;
            actualTrend = regression('linear', runsByWeek.map(function(w) {
              return [i++, w.distance];
            })).equation;
            rateOfChange = ((actualTrend[0] + actualTrend[1]) / actualTrend[1]);
            console.log("Rate of change: " + ((rateOfChange - 1) * 100) + "%");

            // If rate of change is negative, we'll never achieve our goal
            if (rateOfChange < 0) {
              return "&mdash;";
            }
            else {
              // Extrapolate (no more than a year) into the future to determine
              // when we will achieve our goal
              weeksUntilGoal = 0;
              distance = (actualTrend[0] * runsByWeek.length) + actualTrend[1];
              for (var i = runsByWeek.length; i < 52 + runsByWeek.length; ++i) {
                var distance = distance * rateOfChange;
                if (distance >= goalAmount) {
                  break;
                }
                ++weeksUntilGoal;
              }

              // Display the last day of the given week
              weekIterator = new Date(startOfThisWeek + (this.DAY_IN_MS * 6));
              for (var i = 0; i < weeksUntilGoal; ++i) {
                weekIterator = new Date(weekIterator.getTime() + this.WEEK_IN_MS);
              }
              return monthNames[weekIterator.getMonth()] + " " + weekIterator.getDate();
            }
          };

          // Display run data for the last eight weeks
          this.renderChart = function(runsByWeek, distanceThisWeek) {
            var chartHtml = "";

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

            return chartHtml;
          };

          /* Wait for data to load before rendering */
          this.listenToOnce(Forrest.runs, "processed", this.render);
        },

        render: function() {
          var startOfToday = this.midnightToday(),
              startOfThisWeek = new Date(startOfToday - (this.DAY_IN_MS * startOfToday.getDay())),
              startOfLastWeek = new Date(startOfThisWeek - this.WEEK_IN_MS), 
              runsByWeek = [],
              distanceThisWeek = this.getDistance(startOfThisWeek),
              distanceLastWeek = this.getDistance(startOfLastWeek, startOfThisWeek),
              percentChange = Math.round(((distanceThisWeek / distanceLastWeek) - 1) * 100),
              goalThisWeek = Math.round(10 * 1.1 * distanceLastWeek) / 10,
              goalAmount = 40,
              trendingWeeks = 7;

          // Display distance data
          this.miles_this_week.html(distanceThisWeek);

          // Display goal data for the week
          this.goal_this_week.html(goalThisWeek);

          // Display trending data
          if (percentChange >= 0) {
            this.trend_this_week.html(percentChange + "%");
            this.trend_description.html("more miles than last week.");
          }
          else if (percentChange < 0) {
            this.trend_this_week.html(Math.abs(percentChange) + "%");
            this.trend_description.html("fewer miles than last week.");
          }

          // Compile run data for the last eight weeks
          runsByWeek = this.compileWeeklyRuns(startOfThisWeek, trendingWeeks);

          // Display the last day of the given week
          this.goal_date.html(this.renderGoalDate(goalAmount, runsByWeek, startOfThisWeek));

          // Display the goal
          this.goal_amount.html(goalAmount);

          // Add the goal for this week
          runsByWeek.push({
            weekOf: startOfThisWeek,
            distance: runsByWeek[runsByWeek.length - 1].distance * 1.1
          });

          // Display run data for the last eight weeks
          this.chart.html(this.renderChart(runsByWeek, distanceThisWeek));
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    heroView: new View
  });

}(typeof exports === 'undefined' ? window : exports));
