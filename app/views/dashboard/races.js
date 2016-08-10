var _ = require('underscore');
var Backbone = require('backbone');

var View = Backbone.View.extend({
  className: "races dark row",

  template: _.template(
    "<h1>Race estimates</h1>" +
    "<p><big>5 km</big> 24:48</p>" +
    "<p><big>10 km</big> 52:42</p>" + 
    "<p><big>13.1 mi</big> 1:57:54</p>" +
    "<p><big>26.2 mi</big> 4:08:54</p>" +
    "<p><big>50 km</big> 5:10:00</p>" +
    "</p>"
  ),

  render: function() {
    this.$el.html(
      this.template({
      })
    );

    return this;
  }
});

module.exports = View;
