var mongoose = require('mongoose');
var User = require('../models/user');
var Workspace = require('../models/workspace');

var activitySchema = mongoose.Schema({
	text: String,
	user: {type:mongoose.Schema.ObjectId, ref: 'users'},
	type: String,
	dateTime: { type : Date, default: Date.now }
});

var Activity;

activitySchema.statics.log = function(user, type, text, callback){
	var activity = new Activity();
	activity.type = type;
	activity.text  = text;
	activity.user = user;
	
	activity.save(function(err, activity){
		if(err){
			console.log(err);
			return;
		}
		Workspace.findOneAndUpdate(
			{_id: user.workspace},
			{$push: {activities:activity}}, function(err, model)
			{
				if(err){
					console.log(err);
					return;
				}
				
				if(typeof(callback) == "function")
					callback();
			});
	});
};

Activity = mongoose.model('activities', activitySchema);

module.exports = Activity;