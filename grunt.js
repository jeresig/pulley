/*global module:false */
module.exports = function( grunt ) {
	'use strict';

	grunt.initConfig({
		lint: {
			files: ['grunt.js', 'pulley.js']
		},
		watch: {
			files: '<config:lint.files>',
			tasks: 'lint'
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

	grunt.registerTask('default', 'lint');

};