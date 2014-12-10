var User = require('../models/user');
var Workspace = require('../models/workspace');
var Activity = require('../models/activity');
var express = require('express');
var crypto = require('crypto');
var mailer = require('../services/email');

var validEmail = function(email){
	return email.match('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$');
};

module.exports = function(passport){
	var router = express.Router();
	
	router.post('/login', function(req, res, next){
		//Parse the parameters, enforce required ones
		if(!req.body.email || !req.body.password || !req.body.email.trim() || !req.body.password.trim()){
			res.status(400).end();
		}else{
			next();
		}
	}, function(req, res, next){
		passport.authenticate('local-login', function(err, user, info){ //The local-login in config/passport.js gets run first
			if(err){								//Parameters are what was passed into done()
				return next(err); //Go to error handler
			}

			if(!user){ //Not authenticated
				var message = info.message;
				if(message === 'pw_wrong' || message === 'email_not_found'){ //Password wrong or user with email not found
					return res.status(401).json({error: 'email_or_pw_wrong'});
				}else if(message === 'locked'){
					return res.status(401).json({error: 'locked'});
				}else{
					var servErr = new Error('No handler defined for message');
					servErr.status = 500;
					return next(servErr);
				}
			}

			//No error, and a user object was returned
			req.logIn(user, function(err){ //Log in the user, stores into session
				if(err) return next(err);

				user.generateReAuthToken(function(err, token){
					if(err) return next(err);

					res.status(200).json({success:true, token: token, user: {firstName: user.firstName, lastName: user.lastName}});
				});
			});
		})(req, res, next);
	});
	
	router.post('/signup', function(req, res, next){
		//Parse the parameters, enforce required ones
		if(!req.body.firstName || !req.body.lastName || !req.body.email || !validEmail(req.body.email) || !req.body.password){
			res.status(400).end();
		}else{
			next();
		}
	}, 
		passport.authenticate('local-signup'), 
		function(req, res, next){
			req.user.generateReAuthToken(function(err, token){
				if(err) return next(err);
				
				res.status(200).json({success:true, token: token});
			});
		
	});
	
	router.get('/logout', function(req, res){
		if(req.user){
			var id = req.user._id;
			req.logout();

			User.findByIdAndUpdate(id, {reauthToken: null}, function(err){
				res.status(200).end();
			});
		}else{
			res.status(200).end();
		}
	});

	router.post('/reauth', function(req, res, next){
		var email = req.body.email;
		var token = req.body.token;

		if(!token || !email || !token.trim() || !email.trim()){
			return res.status(400).end();
		}

		email = email.trim();
		token = token.trim();

		User.findOne({email: email}, function(err, user){
			if(err) return next(err);

			if(!user) return res.status(401).json({error: 'email_or_token_wrong'});

			if(!user.reauthToken){
				return res.status(401).json({error: 'email_or_token_wrong'});
			}

			if(user.accountLocked){
				return res.status(401).json({error: 'locked'});
			}

			var tokenHash = crypto.createHash('sha256').update(token).digest('hex');

			if(!user.validReAuthToken(token)){
				return res.status(401).json({error: 'email_or_token_wrong'});
			}else{
				req.logIn(user, function(err){ //Log in the user, stores into session
					if(err) return next(err);

					user.generateReAuthToken(function(err, token){
						if(err) return next(err);

						res.status(200).json({success:true, token: token});
					});
				});
			}
		});
	});

	router.get('/checkauth', function(req, res){
		if(req.isAuthenticated()){
			res.json({auth: true});
		}else{
			res.json({auth: false});
		}
	});

	router.post('/forgot-pw-auth-code', function(req, res, next){
		var email = req.body.email;

		if(!email || !email.trim()){
			res.status(400).end();
		}

		User.findOne({email: email}, function(err, user){
			if(err) return next(err);

			if(!user){
				console.log('no user found');
				res.end();
			}else{
				user.generateForgotPwToken(function(err, token){
					if(err) return next(err);

					mailer.sendForgotPWEmail(email, token);
					res.end();
				});
			}
		});
	});

	router.post('/forgot-pw-change-pw', function(req, res, next){
		var email = req.body.email;
		var token = req.body.token;
		var password = req.body.password;

		if(!email || !email.trim() || !token || !password || !password.trim()){
			res.status(400).end();
			return;
		}

		User.findOne({email: email}, function(err, user){
			if(err) return next(err);

			if(!user){
				res.status(401).end();
			}else{
				if(!user.validForgotPwToken(token)){
					user.forgotpwToken = '';
					user.save(function(err){
						if(err) return next(err);

						res.status(401).end();
					});
				}else{
					user.generateHash(password, function(err, hash){
						if(err) return next(err);

						user.password = hash;
						user.forgotpwToken = '';
						user.save(function(err){
							if(err) return next(err);

							res.end();
						});
					});
				}
			}
		});
	});
	
	return router;
};