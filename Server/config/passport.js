// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;

// load up the user model
var User       		= require('../models/user');

// expose this function to our app using module.exports
module.exports = function(passport) {

	// =========================================================================
	// passport session setup ==================================================
	// =========================================================================
	// required for persistent login sessions
	// passport needs ability to serialize and unserialize users out of session

	// used to serialize the user for the session
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	// used to deserialize the user
	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});

	// =========================================================================
	// LOCAL SIGNUP ============================================================
	// =========================================================================
	passport.use('local-signup', new LocalStrategy({
		// by default, local strategy uses username and password, we will override with email
		usernameField : 'email',
		passwordField : 'password',
		passReqToCallback: true // allows us to pass back the entire request to the callback
	},
	function(req, email, password, done) {
		email = email.trim().toLowerCase();
		// asynchronous
		// User.findOne wont fire unless data is sent back
		process.nextTick(function() {
			// find a user whose email is the same as the forms email
			// we are checking to see if the user trying to login already exists
			User.findOne({ 'email' :  email }, function(err, user) {
				// if there are any errors, return the error
				if (err)
					return done(err);
	
				// check to see if theres already a user with that email
				if (user) {
					return done(null, false);
				} else {
					// if there is no user with that email
					// create the user
					var newUser = new User();
					
					newUser.firstName = req.body.firstName;
					newUser.lastName = req.body.lastName;

					// set the user's local credentials
					newUser.email    = email;
					newUser.generateHash(password, function(err, hash){
						if(err) return done(err);
						
						newUser.password = hash;
						newUser.save(function(err){
							if(err) return done(err);

							return done(null, newUser);
						});
					});
				}
	
			});    

		});

	}));
	
	// =========================================================================
	// LOCAL LOGIN =============================================================
	// =========================================================================
	passport.use('local-login', new LocalStrategy({
		// by default, local strategy uses username and password, we will override with email
		usernameField : 'email',
		passwordField : 'password'
	},
	function(email, password, done) { // callback with email and password from our form
		email = email.trim().toLowerCase();
		// find a user whose email is the same as the forms email
		// we are checking to see if the user trying to login already exists
		User.findOne({ 'email' :  email }, function(err, user) {
			// if there are any errors, return the error before anything else
			if (err)
				return done(err);

			// if no user is found
			if (!user)
				return done(null, false, {message: 'email_not_found'});

			user.validPassword(password, function(err, res){
				if(err) return done(err);

				// if the user is found but the password is wrong
				if(!res){
					return done(null, false, {message:'pw_wrong'});
				}

				if(user.accountLocked){
					return done(null, false, {message:'locked'});
				}
				// all is well, return successful user
				return done(null, user);
			});
		});

	}));

};