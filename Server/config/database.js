var devUrl = 'mongodb://localhost/tmb-dev';
var testUrl = 'mongodb://localhost/tmb-test';
var prodUrl = 'mongodb://localhost/tmb';

var url;

switch(process.env.NODE_ENV){
	case 'development':
		console.log('Using dev db');
		url = devUrl;
		break;
	case 'test':
		console.log('Using test db');
		url = testUrl;
		break;
	case 'production':
		console.log('Using production db');
		url = prodUrl;
		break;
	default:
		url = devUrl;
}

module.exports = url;