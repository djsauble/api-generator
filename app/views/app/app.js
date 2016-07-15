var Backbone = require('backbone');

var View = Backbone.View.extend({
  className: "screen column",

  initialize: function() {
  },

  render: function() {
    var htmlString = "";

    this.$el.html("<div class='modal'><div><img src='images/Download_on_the_App_Store_Badge_US-UK_135x40.svg' alt='Download on the App Store'/><br/><a href='#'>Back to my dashboard</a></div></div>");

    return this;
  }
});

module.exports = View;
