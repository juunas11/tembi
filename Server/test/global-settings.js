before(function(){
	require('blanket')({
		pattern: function(filename){
			return !/node_modules/.test(filename);
		}
	});

	//Set test environment
	process.env.NODE_ENV = 'test';
	var appModule = require('../app');
	app = appModule.app;
	server = appModule.server;
	request = require('supertest')(app);
});

after(function(){
	server.close();
});