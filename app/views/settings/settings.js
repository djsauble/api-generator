var Backbone = require('backbone');
var SecurityCode = require('./code');
var Goal = require('./goal');

var View = Backbone.View.extend({
  el: '.main',

  initialize: function() {
    this.securityCode = new SecurityCode();
    this.goal = new Goal();
  },

  render: function() {

    this.$el.html(
      "<a href='#'><i class='fa fa-arrow-left'></i> Go back to the dashboard</a>" +
      "<div class='sections row center'>" +
      "<div class='download'>" +
      "<h2>Download</h2>" +
      "<p>Get the app</p>" +
      "<img src='images/Download_on_the_App_Store_Badge_US-UK_135x40.svg' alt='Download on the App Store'/>" +
      "</div>" +
      "<div class='code'></div>" +
      "<div class='goal'></div>" +
      "</div>"
    );

    this.securityCode.setElement(this.$('.code'));
    this.securityCode.render();

    this.goal.setElement(this.$('.goal'));
    this.goal.render();

    return this;
  },

  remove: function() {
    this.undelegateEvents();
    if (this.securityCode) {
      this.securityCode.remove();
    }
    if (this.goal) {
      this.goal.remove();
    }
    this.$el.html('');
  }
});

module.exports = View;
