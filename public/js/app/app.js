$(function() {
  // Events
  Forrest.runs.once({
    "sync": function(collection) {
      console.log("App is loaded with " + collection.length + " records");
    },
    "processed": function(collection, count) {
      if (count > 0) {
        console.log(count + " missing attributes calculated");
      }
    }
  });

  // Kick the app
  Forrest.init({
    host: 'http://127.0.0.1:5984',
    db: 'be7b25ca3682ef8a15682f791c6110648152d7e4'
  });
});
