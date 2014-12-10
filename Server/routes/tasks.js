var Task = require('../models/task');
var express = require('express');
var User = require('../models/user');
var Workspace = require('../models/workspace');
var Activity = require('../models/activity');
var activityService = require('../services/activity');

module.exports = function(){
	var router = express.Router();
	
	router.param('task_id', function(req, res, next, id){
		Task.findById(id, function(err, task){
			if(err) return next(err);
			
			if(task){
				req.task = task;
				next();
			}else{
				var notFoundErr = new Error('Task not found');
				notFoundErr.status = 404;
				next(notFoundErr);
			}
		});
	});
	
	router.route('/')
		.post(function(req, res, next){
				var task = new Task();
				task.state = "Ready";
				task.text = req.body.text;
				task.assignedUsers = req.body.assignedUsers;
								
				task.save(function(err){
					if(err)
						return next(err);
								
					Workspace.findOneAndUpdate(
						{_id: req.user.workspace},
						{$push: {tasks: task}}, function(err, model){
							if(err) 
								return next(err);
							
							model.populate('tasks', function(err, workspace){
								if(err)
									return next(err);
								
								Activity.log(req.user, 'created', task.text);
								
								if(req.body.assignedUsers)
									activityService.logCreateUsers(req.user, req.body.assignedUsers, task);
								
								res.json(workspace);
							});
						});
				});
		});
	
	router.route('/:task_id')
		.get(function(req, res, next){
			res.json(req.task);
		})
		.put(function(req, res, next){
			activityService.logForUpdateTask(req.user, req.task, req.body);
			req.task.merge(req.body);
			req.task.save(function(err, task){
				if(err) return next(err);
				
				res.json(task);
			});
		})
		.delete(function(req, res, next){
			Workspace.findByIdAndUpdate(req.user.workspace, {$pull: {tasks: req.task._id}}, function(err){
				if(err) return next(err);

				req.task.remove();
				Activity.log(req.user, 'deleted', req.task.text);
				res.status(200).end();
			});
			
		});	
	return router;
};