var Activity = require('../models/activity');
var User = require('../models/user');

var activityType = 
{
    removed : 'removed',
    assigned : 'assigned'
};

var logForUpdateTask = function(user, beforeTask, afterTask, callback)
{
	Array.prototype.indexOfValue = function(value) {
	    for (var i = 0; i < this.length; i++)				    	
	        if (this[i] == value)
	            return i;
	    return undefined;
	};
	
	var localCallback = true;
	var activityText;
	
	if((afterTask.text) && (afterTask.text != beforeTask.text))
	{ 
		activityText = '[' + beforeTask.text + '] to [' +afterTask.text + ']';
	}
	
	if(afterTask.state)
	{ 
		activityText = beforeTask.text + ' changed status from [' + beforeTask.state + '] to [' + afterTask.state + ']';
	}
	
	if(activityText)
	{
		localCallback = false; 
		Activity.log(user, 'changed', activityText, callback);
	}
	
	if(afterTask.assignedUsers)
	{
		var deleted = []; 
		var index;
		var ind;   			
		for(index = 0; index < beforeTask.assignedUsers.length; index++)
		{	
			ind = afterTask.assignedUsers.indexOfValue(beforeTask.assignedUsers[index]);
			if(ind === undefined)
				deleted.push(beforeTask.assignedUsers[index]);		
		}
		if(deleted.length > 0)
			logRemoveUsers(user, deleted, beforeTask, callback);
		
		var created = [];
		for(index = 0; index < afterTask.assignedUsers.length; index++)
		{					
			ind = beforeTask.assignedUsers.indexOfValue(afterTask.assignedUsers[index]);
			if(ind === undefined)
				created.push(afterTask.assignedUsers[index]);							
		}				
		if(created.length > 0)
			logCreateUsers(user, created, beforeTask, callback);
		
		if(deleted.length > 0 || created.length > 0)
			localCallback = false;
	}
	
	if(localCallback && callback)
		callback();
};

var logForManageUsers = function(user, users, type, task, callback)
{	
	if(users.length > 0)
	{
		User.find({
		    '_id': { $in: users}
		},
		function(err, users)
		{
			if(err){
				console.log(err);
				return;
			}	
			
			var message = '';
			for(var index = 0; index < users.length; index++)
			{
				message += users[index].firstName + ' ' + users[index].lastName;
				if(users.length > 1 && index < users.length - 1)
					message += index == users.length - 2 ? ' and ' : ', ';
			}
			
			message += activityType.removed == type ? ' from ' : ' to '; 
			message += '[' + task.text +']';	    
			
			Activity.log(user, type, message, callback);
		});
	}
};

var logRemoveUsers = function(user, users, task, callback)
{
	logForManageUsers(user, users, activityType.removed, task, callback);
};

var logCreateUsers = function(user, users, task, callback)
{
	logForManageUsers(user, users, activityType.assigned, task, callback);
};

exports.logForUpdateTask = logForUpdateTask;
exports.logCreateUsers = logCreateUsers;  
