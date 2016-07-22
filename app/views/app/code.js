var _ = require('underscore');
var Backbone = require('backbone');
var WebSocket = require('ws');

var View = Backbone.View.extend({

  initialize: function() {
    var me = this;
    this.token = 'please wait...';
    this.expires = new Date();

    this.ws = new WebSocket('wss://api-generator2.herokuapp.com/ws');
    this.ws.on('open', function() {
      ws.send(JSON.stringify({
        type: 'get_token'
      }));
    });
    this.ws.on('message', function(data, flags) {
      var message = JSON.parse(data);
      if (message.error) {
        me.token = message.error;
      }
      else {
        me.token = message.token;
        me.expires = new Date(message.expires);
      }
      me.render();
    });
    this.ws.on('error', function(error, more) {
      console.log(error);
    });
  },

  template: _.template(`
    <h1><code class='security_code'><%= token %></code></h1>
    <p>(expires <%= expires %>)</p>
  `),

  render: function() {

    this.$el.html(this.template({
      token: this.token,
      expires: this.expires
    }));

    return this;
  }
});

module.exports = View;
