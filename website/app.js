var $ = require('jquery');
var Goal = require('./models/goal');
var View = require('./views/main');

$(function() {

  // Global namespace
  Forrest = {};

  // Initialize smooth scrolling
  scrollToAnchors();

  // Initialize the goal model
  Forrest.model = new Goal();

  // Initialize the page
  Forrest.view = new View({
    model: Forrest.model
  });
});

// Scroll the page smoothly to anchors
function scrollToAnchors() {
  $('a[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: target.offset().top
        }, 400);
        return false;
      }
    }
  });
}
