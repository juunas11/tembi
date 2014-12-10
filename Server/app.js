//Setup -------------------------------
var express = require('express');
var app = express();
var port;
var securePort = 8086;
if(process.env.NODE_ENV === 'test'){
	port = process.env.PORT || 8085;
}else if(process.env.NODE_ENV === 'production'){
	port = process.env.PORT || 8081;
}else if(process.env.NODE_ENV === 'development'){
	port = process.env.PORT || 8084;
}else{
	port = process.env.PORT || 8084;
}
var mongoose = require('mongoose');
var passport = require('passport');
var http = require('http');
var https = require('https');
var fs = require('fs');
var privKey = fs.readFileSync('ssl/ca.key', 'utf8');
var cert = fs.readFileSync('ssl/ca.cer', 'utf8');
var creds = {key: privKey, cert: cert, passphrase: "tembi", requestCert: false, rejectUnauthorized: false};

var db = require('./config/database');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
//-------------------------------------

//Config-------------------------------
mongoose.connect(db);

require('./config/passport')(passport);

if(process.env.NODE_ENV === 'development'){ // || process.env.NODE_ENV === 'test'
	app.use(logger('dev')); 
}
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//-------------------------------------

app.set('view engine', 'jade');

app.use(session({secret: 'thisisasecretforourtaskmanagementboard'}));
app.use(passport.initialize());
app.use(passport.session());

//Routes--------------------------------------
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.use(function(req, res, next){ //Cross-server authentication, whitelist a route to allow unauthenticated access
    var whitelist = ['/users/login',
    				'/users/signup',
    				'/users/logout',
    				'/users/reauth',
    				'/users/checkauth',
    				'/users/forgot-pw-auth-code',
    				'/users/forgot-pw-change-pw'];
    for(var i = 0; i < whitelist.length; i++){
    	if(whitelist[i] === req.url){
    		next();
    		return;
    	}
    }
    if(req.isAuthenticated()){
		next();
	}else{
		res.status(401).end();
	}
});

app.use('/activity', require('./routes/activity')());
app.use('/tasks', require('./routes/tasks')());
app.use('/users', require('./routes/users')(passport));
app.use('/workspace', require('./routes/workspace')());

//catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

//development error handler
//will print stacktrace
if (process.env.NODE_ENV === 'development') { // || process.env.NODE_ENV === 'test'
	app.use(function(err, req, res, next) {
		console.log(err);
		res.status(err.status || 500).end();
	});
}

// var server = app.listen(port, "0.0.0.0");
var httpServer = http.createServer(app).listen(port, "0.0.0.0", function(){
	console.log('Http server up at %d', port);
});

if(process.env.NODE_ENV != 'test'){
	var httpsServer = https.createServer(creds, app).listen(securePort, "0.0.0.0", function(){
		console.log('Https server up at %d', securePort);
	});
}


// console.log('Server up on port %d and %d', port, securePort);

exports.app = app;
exports.server = {
	close: function(){
		httpServer.close();
		if(httpsServer) httpsServer.close();
	}
};