module.exports = function(grunt){
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-notify');
	
	// Project configuration.
	grunt.initConfig({
		mochaTest: { //Mocha config
			test: {
				options: {
					reporter: 'spec',
					clearRequireCache: true, //Required for watch spawn:false
					globals: 'request,app,server' //Global variables used by the tests
				},
				src: ['test/**/*.js'] //Matches all .js files in test directory and any subdirectory
			}
		},
		
		jshint:{ //Runs jshint on these files
			all: {
				src: ['Gruntfile.js', 'config/**/*.js', 'models/**/*.js', 'services/**/*.js', 'routes/**/*.js', 'test/**/*.js', 'app.js']
			}
		},
		
		watch: {
			js: {
				options: {
					spawn: false //This is so that we can run the tests always in same context
				},
				files: ['**/*.js', '!**/node_modules/**', '!.svn/**'], //all .js files everywhere except node_modules and .svn folder
				tasks: ['default'] //run default task when files change
			}
		}
	});
	
	/* spawn: false is required for this
	 * This is made so that jshint is run only on the file that changed, checking all files again is waste of time
	 * Mocha is ran on all files, unless the changed file was a test file, then we run only that test
	 * NOTE: I had some problems sometimes, this stopped working after I changed this file.
	 * To fix that, just restart grunt watch
	 */
	var defaultTestSrc = grunt.config('mochaTest.test.src'); //Grab the setting from above
	grunt.event.on('watch', function(action, filepath) { //Event listener for changes
		grunt.config('jshint.all.src', filepath); //Set jshint to run on this file
		grunt.config('mochaTest.test.src', defaultTestSrc); //Set Mocha to run on all files
		if (filepath.match('test.js')) { //If filepath = **test.js then
			var globalSettingsSrc = 'test/global-settings.js'; //Global settings file, needed by all tests so must always be there
			grunt.config('mochaTest.test.src', [globalSettingsSrc, filepath]); //Set Mocha files to global settings + changed test file
		}
	});

	//Run jshint and mocha by default, i.e. when you type "grunt" in command line
	grunt.registerTask('default', ['jshint','mochaTest']);
	
};