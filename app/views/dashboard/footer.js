var Backbone = require('backbone');

var View = Backbone.View.extend({
  className: "footer dark",

  render: function() {
    this.$el.html(
      "<span> PUT your data to <a href='" +
      APPLICATION_DATA_URL +
      "'>" +
      APPLICATION_DATA_URL.replace(/&/g, "&amp;") +
      "</a></span>"
    );

    return this;
  }
});

module.exports = View;
