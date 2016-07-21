var Backbone = require('backbone');
var SecurityCode = require('./code');

var View = Backbone.View.extend({
  className: "screen column",

  initialize: function() {
    this.securityCode = new SecurityCode;
  },

  render: function() {

    this.$el.html(
      "<div class='modal'>" +
      "<div>" +
      "<h1>1. Get the app</h1>" +
      "<img src='images/Download_on_the_App_Store_Badge_US-UK_135x40.svg' alt='Download on the App Store'/>" +
      "<h1>2. Enter a security code</h1>" +
      "<div class='code'>" +
      "</div>" +
      "</div>" +
      "</div>"
    );

    this.securityCode.setElement(this.$('.code'));
    this.securityCode.render();

    return this;
  }
});

module.exports = View;
