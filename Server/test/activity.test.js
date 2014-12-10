var expect = require('expect.js');
var supertest = require('supertest');
var Task = require('../models/task');
var User = require('../models/user');
var Workspace = require('../models/workspace');
var Activity = require('../models/activity');
var activityService = require('../services/activity');
var user;
var agent;	

describe('/activity', function(){
	beforeEach(function(done){
		Task.remove({}, done);
	});

	beforeEach(function(done){ 
		User.remove({}, done);
	});	

	beforeEach(function(done){ 
		Activity.remove({}, done);
	});

	beforeEach(function(done){
		Workspace.remove({}, done);
	});	

	var createTestUser = function(options, done){
		var testUser = new User();
		testUser.email = options.email || 'test@test.com';
		testUser.firstName = options.firstName || 'Test';
		testUser.lastName = options.lastName || 'User';
		testUser.locked = !!options.locked;
		var pw = options.password || 'pass';

		testUser.generateHash(pw, function(err, hash){
			if(err) return done(err);

			testUser.password = hash;
			testUser.save(function(err, testUser){
				if(err) return done(err);

				if(options.noWorkspace){
					done(null, testUser);
				}else{
					var workspace = new Workspace({members: [testUser._id], tasks: [], activities:[]});
					workspace.save(function(err, s_workspace){
						if(err) return done(err);
							
						testUser.workspace = s_workspace._id;

						testUser.save(done);
					});
				}
			});
		});
	};

	var generateUserAndLogin = function(options, done){
		var pw = options.password || 'pass';
		options.password = pw;
		createTestUser(options, function(err, user){
			if(err) return done(err);

			var agent = supertest.agent(app);
			agent.post('/users/login')
				.send({email: user.email, password: pw})
				.expect(200)
				.end(function(err){
					if(err) return done(err);

					done(null, user, agent);
				});
		});
	};	
		
	it('logForUpdateTask with new text', function(done)
	{			
		generateUserAndLogin({}, function(err, user, agent)
		{			
			var myDone = function()
			{
				Activity.find({}, function(err, activities) {
					if(err) return done(err);
					
					expect(activities.length).to.equal(1);
					expect(activities[0].type).to.equal('changed');
					expect(activities[0].text).to.equal('[someText22] to [someText]');
					done();
				});
			};
			
			if(err) 
				return done(err);
			
			var afterTask =  {text: "someText"};
			var beforeTask = {text: "someText22"};			
			activityService.logForUpdateTask(user, beforeTask, afterTask, myDone);						
		});
	});
	
	it('logForUpdateTask with no change', function(done)
			{			
				generateUserAndLogin({}, function(err, user, agent)
				{			
					var myDone = function()
					{
						Activity.find({}, function(err, activities) {
							if(err) return done(err);
							
							expect(activities.length).to.equal(0);
							done();
						});
					};
					
					if(err) 
						return done(err);
					
					var afterTask =  {};
					var beforeTask = {};			
					activityService.logForUpdateTask(user, beforeTask, afterTask, myDone);						
				});
			});
	
	it('logForUpdateTask change status from [Ready] to [In Progress]', function(done)
			{			
				generateUserAndLogin({}, function(err, user, agent)
				{			
					var myDone = function()
					{
						Activity.find({}, function(err, activities) {
							if(err) return done(err);
							
							expect(activities.length).to.equal(1);
							expect(activities[0].type).to.equal('changed');
							expect(activities[0].text).to.equal('Bob changed status from [In Progress] to [Ready]');
							
							done();
						});
					};
					
					if(err) 
						return done(err);
					
					var afterTask =  {state: 'Ready', 		text: 'Bob'};
					var beforeTask = {state: 'In Progress', text: 'Bob'};			
					activityService.logForUpdateTask(user, beforeTask, afterTask, myDone);						
				});
			});
		
			it('logForUpdateTask assign users', function(done)
					{			
						generateUserAndLogin({}, function(err, user, agent)
						{						
							var myDone = function()
							{
								Activity.find({}, function(err, activities) {
									if(err) return done(err);
									
									expect(activities.length).to.equal(1);
									expect(activities[0].type).to.equal('assigned');
									expect(activities[0].text).to.equal('1Test 1User, 2Test 2User and 3Test 3User to [Bob]');									
									done();
								});
							};
							var noOfUsers = 0;		
							var myAssignedUsers = [];
							var createUser = function()
							{
								noOfUsers++;														
								var testUser = new User();
								testUser.email = noOfUsers + 'test@test.com';
								testUser.firstName = noOfUsers + 'Test';
								testUser.lastName = noOfUsers +'User';
								testUser.locked = false;
								testUser.save(function(err, user)
								{									
									if(err) return done(err);
								
									myAssignedUsers.push(user);
									
									if(noOfUsers < 3)
									{	
										createUser();
									}
									else
									{																		
										var beforeTask = {state: 'Ready', 	text: 'Bob', assignedUsers : []};	
										var afterTask =  {state: undefined, text: 'Bob', assignedUsers : myAssignedUsers};										
										activityService.logForUpdateTask(user, beforeTask, afterTask, myDone);
									}									
								});
							};
							
							createUser();
						});
					});
			
			it('logForUpdateTask remove users', function(done)
					{			
						generateUserAndLogin({}, function(err, user, agent)
						{						
							var myDone = function()
							{
								Activity.find({}, function(err, activities) {
									if(err) return done(err);
									
									expect(activities.length).to.equal(1);
									expect(activities[0].type).to.equal('removed');
									expect(activities[0].text).to.equal('3Test 3User, 4Test 4User and 5Test 5User from [Bob]');									
									done();									
								});
							};
							var noOfUsers = 0;		
							var beforeUsers = [];
							var afterUsers   = [];
							var createUser = function()
							{
								noOfUsers++;														
								var testUser = new User();
								testUser.email = noOfUsers + 'test@test.com';
								testUser.firstName = noOfUsers + 'Test';
								testUser.lastName = noOfUsers +'User';
								testUser.locked = false;
								testUser.save(function(err, user)
								{
									if(err) return done(err);
								
									beforeUsers.push(user);
									if(noOfUsers < 3)
										afterUsers.push(user);
									
									if(noOfUsers < 5)
									{	
										createUser();
									}
									else
									{																		
										var beforeTask = {state: 'Ready', 	text: 'Bob', assignedUsers : beforeUsers};	
										var afterTask =  {state: undefined, text: 'Bob', assignedUsers : afterUsers};										
										activityService.logForUpdateTask(user, beforeTask, afterTask, myDone);
									}									
								});
							};
							
							createUser();
						});
					});
});