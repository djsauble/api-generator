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
    api: CLOUDANT_DATA_URL // Global variable defined on the page itself
  });
});
