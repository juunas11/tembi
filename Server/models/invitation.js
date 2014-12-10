var mongoose = require('mongoose');

var schema = mongoose.Schema({
	email : String,
	workspace : {type: mongoose.Schema.ObjectId, ref: 'workspaces'},
	sender : {
		firstName : String,
		lastName : String
	}
});

var Invitation;

schema.statics.createUnique = function(email, workspace, firstName, lastName, done){
	Invitation.findOne({email: email, workspace: workspace}, function(err, invite){
		if(invite) return done(null, false);

		var invitation = new Invitation({
			email : email,
			workspace : workspace,
			sender : {
				firstName : firstName,
				lastName : lastName
			}
		});

		invitation.save(done);
	});
};

Invitation = mongoose.model('invitations', schema);

module.exports = Invitation;