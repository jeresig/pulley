/*global module:false */
module.exports = function( grunt ) {
	'use strict';

	grunt.initConfig({
		lint: {
			files: ['Gruntfile.js', 'pulley.js']
		},
		watch: {
			files: '<%= config:lint.files %>',
			tasks: 'jshint'
		},
		jshint: {
			options: {
				es5: true,
				esnext: true,
				bitwise: true,
				curly: true,
				eqeqeq: true,
				newcap: true,
				noarg: true,
				noempty: true,
				undef: true,
				strict: true,
				trailing: true,
				smarttabs: true,
				node: true
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', 'jshint');

};