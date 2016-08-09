module.exports = function(grunt) {
  'use strict';
  grunt.initConfig({

    // Read package.json into an object for later
    // reference (for example, in meta, below).
    pkg: grunt.file.readJSON('package.json'),

    meta: {

      // A template to add to the top of the bundled output
      banner: '\n/*! <%= pkg.title || pkg.name %> ' +
        '- v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n ' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\n' +
        ' *\n " : "" %>' +
        '* Copyright (c) ' +
        '<%= grunt.template.today("yyyy") %> ' +
        '<%= pkg.author.name %>;\n' +
        ' * Licensed under the <%= ' +
        '_.pluck(pkg.licenses, "type").join(", ") %>' +
        ' license */'
    },

    // JSHint configuration options.
    jshint: {
      all: ['Gruntfile.js', 'Jakefile.js', 'app.js', 'app/**/*.js', 'website/**/*.js', 'test/**/*.js']
    },

    // Specify test locations for QUnit
    qunit: {
      browser: ['test/index.html']
    },

    // Configuration for browserify
    browserify: {
      app: {
        src: 'app/app.js',
        dest: 'public/js/bundle.js'
      },
      login: {
        src: 'website/app.js',
        dest: 'public/js/bundle2.js'
      }
    }
  });

  // Load browserify tasks. Needed for bundling
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');

  // Setup command line argument tasks. For e.g.:
  // $ grunt #executes lint, browserify, qunit
  // $ grunt test # runs qunit task, only.
  grunt.registerTask('default', ['jshint', 'browserify', 'qunit']);
  grunt.registerTask('install', 'browserify');
  grunt.registerTask('test', 'qunit');
};
