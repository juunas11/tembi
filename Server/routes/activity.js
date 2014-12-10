var Activities = require('../models/activity');
var express = require('express');
var User = require('../models/user');
var Workspace = require('../models/workspace');

module.exports = function(){
	var router = express.Router();
	
	router.get('/', function(req, res, next)
	{
		Workspace.findById(req.user.workspace)
			.populate('activities')
			.exec(function(err, workspace){
				if(err) return next(err);
				Activities.populate(workspace.activities, {path: "user", select: '-password -reauthToken -forgotpwToken'}, function (err, activities){
					if(err) return next(err);
					
					res.json(activities);
				});
			});
	});
	
	return router;
};