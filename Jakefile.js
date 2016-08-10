var Helpers = require('./app/helpers');
var nano = require('nano')(process.env.COUCHDB_DATABASE_URL);
var atob = require('atob');

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
