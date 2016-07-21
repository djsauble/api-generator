var Backbone = require('backbone');

var View = Backbone.View.extend({

  render: function() {

    this.$el.html(
      "<h1><code class='security_code'>X6Z5a0</code></h1>" +
      "<p>(expires in 5 minutes)</p>"
    );

    return this;
  }
});

module.exports = View;
