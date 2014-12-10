var Workspace = require('../models/workspace');
var User = require('../models/user');
var express = require('express');
var Invitation = require('../models/invitation');
var Activity = require('../models/activity');
var mailer = require('../services/email');

var validEmail = function(email){
	return email.match('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$');
};

module.exports = function(){
	var router = express.Router();
	
	router.get('/', function(req, res, next){
		User.findById(req.user._id, function(err, user){
			if(err) return next(err);
			
			Workspace.findById(user.workspace)
				.populate('tasks')
				.exec(function(err, workspace){
					if(err) return next(err);
					
					res.json(workspace);
				});
		});
	});

	router.get('/users', function(req, res, next){
		User.findById(req.user._id, function(err, user){
			if(err) return next(err);

			Workspace.findById(user.workspace)
				.populate('members', '-password -reauthToken -forgotpwToken')
				.exec(function(err, workspace){
					if(err) return next(err);
					
					res.json(workspace.members);
				});
		});
	});
	
	router.get('/state', function(req, res, next){
		User.findById(req.user._id, function(err, user){
			if(err) return next(err);
			
			Workspace.findById(user.workspace)
				.populate('tasks')
				.exec(function(err, workspace){
					if(err) return next(err);									
					
					res.json(workspace);
				});
		});
	});

	router.post('/', function(req, res, next){
		User.findById(req.user._id, function(err, user){
			if(err) return next(err);

			if(user.workspace){
				res.status(400).end();
			}else{
				var workspace = new Workspace({
					members: [user._id]
				});
				workspace.save(function(err, workspace){
					if(err) return next(err);

					user.workspace = workspace._id;
					user.save(function(err){
						if(err) return next(err);
						
						Activity.log(user, 'created', 'workspace');

						res.status(200).end();
					});
				});
			}
		});
	});

	router.post('/invitation', function(req, res, next){
		var email = req.body.email;
		if(!email || !email.trim() || !validEmail(email.trim())){
			res.status(400).end();
		}
		email = email.trim();

		User.find({email: email}, function(err, users){
			if(err) return next(err);

			if(users.length > 0) return res.status(200).json({error: 'user_has_workspace'});

			Invitation.createUnique(email, req.user.workspace, req.user.firstName, req.user.lastName, function(err, inviteCreated){
				if(err) return next(err);

				if(inviteCreated){
					mailer.sendWorkspaceInvitation(email, req.user);
				}

				res.status(200).end();
			});
		});
	});

	router.get('/invitation', function(req, res, next){
		Invitation.find({email: req.user.email}, function(err, invites){
			if(err) return next(err);

			res.json(invites);
		});
	});

	router.post('/invitation/accept', function(req, res, next){
		var invite_id = req.body.invite_id;

		if(!invite_id) return res.status(400).end();

		Invitation.findById(invite_id, function(err, invite){
			if(err) return next(err);

			if(invite.email !== req.user.email) return res.status(401).end();

			User.findById(req.user._id, function(err, user){
				if(err) return next(err);

				if(user.workspace){
					res.status(400).json({error: 'workspace_set'}); //This would naturally need a change if Workspace Management is implemented
				}else{
					user.workspace = invite.workspace;
					user.save(function(err){
						if(err) return next(err);

						Workspace.findByIdAndUpdate(user.workspace, {$push: {members: user._id}}, function(err){
							if(err) return next(err);

							Invitation.remove({email : user.email}, function(err){
								if(err) console.log(err);
							});

							Activity.log(user, 'joined', 'workspace');

							res.status(200).end();
						});
					});
				}
			});
		});
	});

	router.post('/invitation/reject', function(req, res, next){
		Invitation.remove({email: req.user.email}, function(err){
			if(err) return next(err);

			res.status(200).end();
		});
	});
	
	return router;
};