$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $(".main"),

        initialize: function() {
          // Child components
          this.hero = null;
          this.viewer = null;
          this.footer = null;

          // DOM elements
          this.loading = this.$(".loading");

          // Events
          this.listenToOnce(Forrest.runs, "processed", this.render);
        },

        render: function() {
          // Hide the loading indicator
          this.loading.hide();

          // Show the hero component
          this.hero = new Forrest.HeroView();
          this.$el.append(this.hero.render().el);

          // Show the viewer component
          this.viewer = new Forrest.ViewerView();
          this.$el.append(this.viewer.render().el);

          // Show the footer component
          this.footer = new Forrest.FooterView();
          this.$el.append(this.footer.render().el);

          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    view: new View
  });
}(typeof exports === 'undefined' ? window : exports));
