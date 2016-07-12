$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "hero dark row",

        initialize: function() {

          /**
           * Helper methods
           */

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
            var weekIterator = new Date(startOfThisWeek.getTime() - WEEK_IN_MS),
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
              if (t < startOfThisWeek - (WEEK_IN_MS * numberOfWeeks)) {
                break;
              }

              // Account for weeks with no runs at all
              while (t < weekIterator) {
                weekIterator = new Date(weekIterator.getTime() - WEEK_IN_MS);
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
                i;

            /*********************************************************
             * DEBUG SECTION: Test veracity of polynomial regression *
             *********************************************************/

            // Calculate the trend over the last eight weeks
            i = 0;
            actualTrend = regression('polynomial', runsByWeek.map(function(w) {
              return [i++, w.distance];
            }), 2).equation;

            // Extrapolate (no more than a year) into the future to determine 
            // when we will achieve our goal
            weeksUntilGoal = 0;
            for (var i = 8; i < 60; ++i) {
              if (actualTrend[0] + actualTrend[1] * i + actualTrend[2] * Math.pow(i, 2) >= goalAmount) {
                break;
              }
              ++weeksUntilGoal;
            }

            // Display the last day of the given week
            weekIterator = new Date(startOfThisWeek.getTime() + (DAY_IN_MS * 6));
            for (var i = 0; i < weeksUntilGoal; ++i) {
              weekIterator = new Date(weekIterator.getTime() + WEEK_IN_MS);
            }
            if (weeksUntilGoal >= 52) {
              console.log("Polynomial regression prediction: n/a");
            }
            else {
              console.log("Polynomial regression prediction: " + getMonthName(weekIterator.getMonth()) + " " + weekIterator.getDate());
            }

            /*********************
             * END DEBUG SECTION *
             *********************/

            // Calculate a linear regression of the last several weeks
            i = 0;
            actualTrend = regression('linear', runsByWeek.map(function(w) {
              return [i++, w.distance];
            })).equation;
            rateOfChange = ((actualTrend[0] + actualTrend[1]) / actualTrend[1]);

            // If rate of change is negative, we'll never achieve our goal
            if (rateOfChange < 0) {
              return "&mdash;";
            }
            else {
              // Extrapolate (no more than a year) into the future to determine
              // when we will achieve our goal
              weeksUntilGoal = 0;
              distance = runsByWeek[runsByWeek.length - 1].distance;
              for (var i = runsByWeek.length; i < 52 + runsByWeek.length; ++i) {
                var distance = distance * rateOfChange;
                if (distance >= goalAmount) {
                  break;
                }
                ++weeksUntilGoal;
              }

              // Display the last day of the given week
              weekIterator = new Date(startOfThisWeek.getTime() + (DAY_IN_MS * 6));
              for (var i = 0; i < weeksUntilGoal; ++i) {
                weekIterator = new Date(weekIterator.getTime() + WEEK_IN_MS);
              }
              return getMonthName(weekIterator.getMonth()) + " " + weekIterator.getDate();
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
          var startOfToday = getMidnight(new Date()),
              startOfThisWeek = new Date(startOfToday.getTime() - (DAY_IN_MS * startOfToday.getDay())),
              startOfLastWeek = new Date(startOfThisWeek.getTime() - WEEK_IN_MS), 
              runsByWeek = [],
              distanceThisWeek = this.getDistance(startOfThisWeek),
              distanceLastWeek = this.getDistance(startOfLastWeek, startOfThisWeek),
              percentChange = Math.round(((distanceThisWeek / distanceLastWeek) - 1) * 100),
              goalThisWeek = Math.round(10 * 1.1 * distanceLastWeek) / 10,
              remainingThisWeek = Math.round(10 * (goalThisWeek - distanceThisWeek)) / 10,
              goalAmount = 40,
              trendingWeeks = 7,
              trendPercentString,
              trendDescriptionString,
              goalDateString,
              chartHtml;

          // Display trending data
          if (percentChange < 10) {
            trendPercentString = remainingThisWeek;
            trendDescriptionString = "miles to go this week.";
          }
          else {
            trendPercentString = "10%";
            trendDescriptionString = "more miles than last week.";
          }

          // Compile run data for the last eight weeks
          runsByWeek = this.compileWeeklyRuns(startOfThisWeek, trendingWeeks);

          // Display the last day of the given week
          goalDateString = this.renderGoalDate(goalAmount, runsByWeek, startOfThisWeek);

          // Add the goal for this week
          runsByWeek.push({
            weekOf: startOfThisWeek,
            distance: runsByWeek[runsByWeek.length - 1].distance * 1.1
          });

          // Display run data for the last eight weeks
          chartHtml = this.renderChart(runsByWeek, distanceThisWeek);

          // Render stuff
          this.$el.html(
            "<p><big>" +
            distanceThisWeek +
            "</big> of " +
            goalThisWeek +
            " miles this week.</p><p><big>" +
            trendPercentString +
            "</big> " +
            trendDescriptionString +
            "</p><p class='expand'><big>" +
            goalAmount +
            "</big> miles per week by " +
            goalDateString +
            "</p><div class='graph row'>" +
            chartHtml +
            "</div>"
          );
          
          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    HeroView: View
  });

}(typeof exports === 'undefined' ? window : exports));
