var _ = require('underscore');
var PouchDB = require('pouchdb');
var Backbone = require('backbone');
var BackbonePouch = require('backbone-pouch');
var Run = require('./run');
var Helpers = require('../helpers');

var Runs = Backbone.Collection.extend({
  model: Run,
  initialize: function(options) {
    var me = this;
    this.localDB = new PouchDB(options.api.split('/').pop(), {size: 50});
    this.remoteDB = new PouchDB(options.api, {size: 50});

    // Rework the default syncing behavior for compatibility with PouchDB 
    Backbone.sync = BackbonePouch.sync({
      db: this.localDB,
      fetch: 'query',
      options: {
        query: {
          include_docs: true
        }
      }
    });

    PouchDB.replicate(this.remoteDB, this.localDB).then(function() {
      // Fetch and parse data from PouchDB
      return me.fetch();
    }).then(function() {
      // Perform any necessary post-processing
      me.process();
    });
  },
  pouch: {
    options: {
      query: {
        include_docs: true,
        fun: {
          map: function(doc, emit) {
            emit(doc.timestamp, null);
          }
        }
      }
    }
  },
  parse: function(result) {
    return _.pluck(result.rows, 'doc').map(function(d) {
      d.timestamp = new Date(d.timestamp);
      return d;
    });
  },
  save: function(options) {
    return Backbone.sync('create', this, options);
  },
  process: function() {
    var me = this,
        missingDistance = [],
        done = new Promise(function(resolve) {
          me.each(function(r) {
            if (r.get('distance') === undefined) {
              missingDistance.push({
                id: r.get('_id'),
                rev: r.get('_rev')
              });
            }
          });

          if (missingDistance.length > 0) {
            me.localDB.bulkGet({docs: missingDistance, attachments: true}).then(function(results) {
              var docs = results.results.map(function(r) {
                return r.docs[0].ok;
              });
              docs.forEach(function(d) {
                var data = Helpers.getRun(d),
                    filtered = Helpers.defaultFilter(data),
                    coords = Helpers.getCoordinates(filtered),
                    model = me.get(d._id);

                model.save('distance', Helpers.computeDistance(coords));
              });
              me.localDB.replicate.to(me.remoteDB).on('complete', function() {
                resolve(missingDistance.length);
              });
            });
          }
          else {
            resolve(0);
          }
        });

    done.then(function(count) {
      me.trigger("processed", me, count);
    });
  }
});

module.exports = Runs;
