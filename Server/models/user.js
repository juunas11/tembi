var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');

var userSchema = mongoose.Schema({
	firstName : String,
	lastName : String,
	email : String,
	password : String,
	accountLocked : Boolean,
	workspace: {type:mongoose.Schema.ObjectId, ref: 'workspaces'},
	reauthToken : String,
	forgotpwToken : String
});

userSchema.methods.generateHash = function(password, done){
	bcrypt.genSalt(8, function(err, salt){
		if(err) return done(err);

		bcrypt.hash(password, salt, null, function(err, hash){
			if(err) return done(err);

			done(null, hash);
		});
	});
};

userSchema.methods.validPassword = function(password, done){
	bcrypt.compare(password, this.password, function(err, res){
		if(err) return done(err);

		done(null, res);
	});
};

userSchema.methods.generateReAuthToken = function(done){
	var user = this;

	crypto.randomBytes(128, function(err, buf){
		if(err) return done(err);

		var token = buf.toString('hex');
		user.reauthToken = crypto.createHash('sha256').update(token).digest('hex');

		user.save(function(err){
			if(err) return done(err);

			done(null, token);
		});
	});
};

userSchema.methods.validReAuthToken = function(token){
	var tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	return this.reauthToken === tokenHash;
};

userSchema.methods.generateForgotPwToken = function(done){
	var user = this;
	crypto.randomBytes(4, function(err, buf){
		if(err) return done(err);

		var token = buf.toString('hex');
		user.forgotpwToken = crypto.createHash('sha256').update(token).digest('hex');

		user.save(function(err){
			if(err) return done(err);

			done(null, token);
		});
	});
};

userSchema.methods.validForgotPwToken = function(token){
	var tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	return this.forgotpwToken === tokenHash;
};

module.exports = mongoose.model('users', userSchema);