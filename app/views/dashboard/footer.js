var Backbone = require('backbone');

var View = Backbone.View.extend({
  className: "footer dark",

  render: function() {
    this.$el.html(
      "<span> PUT your data to ...</span>"
    );

    return this;
  }
});

module.exports = View;
