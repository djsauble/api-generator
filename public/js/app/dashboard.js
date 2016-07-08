$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        className: "screen column",

        initialize: function() {
          // Child components
          this.hero = null;
          this.viewer = null;
          this.footer = null;
        },

        render: function() {
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
        },

        remove: function() {
          this.undelegateEvents();
          this.hero.remove();
          this.viewer.remove();
          this.footer.remove();
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    DashboardView: View
  });
}(typeof exports === 'undefined' ? window : exports));
