var Helpers = require('./app/helpers');
var nano = require('nano')(process.env.COUCHDB_DATABASE_URL);
var atob = require('atob');
var createGpx = require('gps-to-gpx').default;
var strava = require('strava-v3');

// Example usage: `jake metadata:generate[djsauble@gmail.com]`
namespace('metadata', function() {
  desc('Compute missing run metadata');
  task('generate', [], function(user) {
    var users = nano.db.use('users');

    users.get(user, function(err, body) {
      Helpers.getRuns(nano.db.use(body.run_database), function(runs) {
        var todo = {};

        console.log('Checking for gaps... ');
        runs.forEach(function(r) {
          var timestampNeeded = !r.timestamp;
          var distanceNeeded = !r.distance;
          var paceNeeded = !r.pace;
          var durationNeeded = !r.duration;
          if (timestampNeeded || distanceNeeded || paceNeeded || durationNeeded) {
            todo[r._id] = {
              timestampNeeded: timestampNeeded,
              distanceNeeded: distanceNeeded,
              paceNeeded: paceNeeded,
              durationNeeded: durationNeeded
            };
          }
        });
        console.log(Object.keys(todo).length + ' runs missing metadata');

        if (Object.keys(todo).length > 0) {
          console.log('Computing metadata...');
          var rundb = nano.db.use(body.run_database);
          rundb.fetch(
            {
              keys: Object.keys(todo)
            },
            {
              attachments: true,
              binary: true
            },
            function(err, body) {
              // Convert binary data to JSON
              var data = {};
              body.rows.forEach(function(r) {
                data[r.id] = JSON.parse(atob(r.doc._attachments['data.json'].data));
              });

              // Calculate the missing attributes
              runs = runs.map(function(r) {
                if (todo[r._id].timestampNeeded) {
                r.timestamp = new Date(data[r._id][0].timestamp);
                }
                if (todo[r._id].distanceNeeded) {
                  r.distance = Helpers.getDistance(data[r._id]);
                }
                if (todo[r._id].paceNeeded) {
                  r.pace = Helpers.getPace(data[r._id]);
                }
                if (todo[r._id].durationNeeded) {
                  r.duration = Helpers.getDuration(data[r._id]);
                }
                return r;
              });

              // Upload the repaired files
              console.log("Uploading repaired files...");
              rundb.bulk(
                {
                  docs: runs
                },
                function(err, body) {
                  if (!err) {
                    console.log("Done!");
                  }
                }
              );
            }
          );
        }
      });
    });
  });
});

// Example usage: `jake export:gpx[djsauble@gmail.com]`
namespace('export', function() {
  // To upload an exported GPX file to Strava
	//
	// 1. Request write permissions (in browser):
	// https://www.strava.com/oauth/authorize?client_id=12528&response_type=code&redirect_uri=https://api-generator2.herokuapp.com&scope=write
	//
	// 2. Get access token:
	// $ curl -X POST https://www.strava.com/oauth/token -F client_id=12528 -F client_secret=06b9e1c06bb52c17a3ce177293400e539accda7a -F code=ACCESS_CODE
	//
	// 3. Upload one route:
	// $ curl -X POST https://www.strava.com/api/v3/uploads -H "Authorization: Bearer ACCESS_TOKEN" -F activity_type=run -F file=@FILE.gpx -F data_type=gpx
	//
	// 4. Upload a bunch of routes:
	// $ pbpaste > /tmp/runs.txt
	// $ cat /tmp/runs.txt | xargs -I{} sh -c 'curl -X POST https://www.strava.com/api/v3/uploads -H "Authorization: Bearer ACCESS_TOKEN” -F activity_type=run -F file=@{}.gpx -F data_type=gpx'
	//
  desc('Export run data in GPX format');
  task('gpx', [], function(user, run) {
    var users = nano.db.use('users');

    users.get(user, function(err, body) {
      var rundb = nano.db.use(body.run_database);
      rundb.fetch(
        {
          keys: [run]
        },
        {
          attachments: true,
          binary: true
        },
        function(err, body) {
          // Convert binary data to JSON
          var data = [];
          body.rows.forEach(function(r) {
            data.push(JSON.parse(atob(r.doc._attachments['data.json'].data)).map(function(p) {
              // Extract date components
              var date = new Date(p.timestamp);
              var year = date.getUTCFullYear();
              var month = date.getUTCMonth() + 1;
              var day = date.getUTCDate();
              var hours = date.getUTCHours();
              var minutes = date.getUTCMinutes();
              var seconds = date.getUTCSeconds();

              // Format date components
              if (month < 10) {
                month = "0" + month;
              }
              if (day < 10) {
                day = "0" + day;
              }
              if (hours < 10) {
                hours = "0" + hours;
              }
              if (minutes < 10) {
                minutes = "0" + minutes;
              }
              if (seconds < 10) {
                seconds = "0" + seconds;
              }
              var str = year + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds + "Z";
              return {
                latitude: p.latitude,
                longitude: p.longitude,
                elevation: 0,
                time: str
              }
            }));
          });

          // Convert data to GPX format
          data.forEach(function(r) {
            console.log(createGpx(r, {
              activityName: 'Run',
              startTime: r[0].time
            }));
          });
        }
      );
    });
  });
});
