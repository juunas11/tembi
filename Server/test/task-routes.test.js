var expect = require('expect.js');
var supertest = require('supertest');
var Task = require('../models/task');
var User = require('../models/user');
var Workspace = require('../models/workspace');
var Activity = require('../models/activity');

describe('/tasks', function(){
	var url = '/tasks/';
	var urlUser = '/users/login';
	
	var user;
	var agent;	
	
	afterEach(function(done){
		Task.remove({}, done);
	});
	
	afterEach(function(done){ 
		User.remove({}, done);
	});	
	
	afterEach(function(done){ 
		Activity.remove({}, done);
	});

	afterEach(function(done){
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
	
	it('adds a task', function(done){
		generateUserAndLogin({}, function(err, user, agent){
			if(err) return done(err);
			agent.post(url).send({text: 'task name'}).expect(200).end(function(err, res){
				if(err) return done(err);
				expect(res.body.tasks[0].text).to.equal('task name');
				done();
			});
		});
	});
		
	it('deletes a task', function(done){
		generateUserAndLogin({}, function(err, user, agent){
			if(err) return done(err);

			var task = new Task({text: 'task name', state: 'Ready', assignedUsers: []});
			task.save(function(err, task){
				if(err) return done(err);

				Workspace.findByIdAndUpdate(user.workspace, {$push: {tasks: task._id}}, function(err){
					if(err) return done(err);

					agent.delete(url + task._id).expect(200).end(function(err, res){
						if(err) return done(err);
						
						Task.find({}, function(err, tasks){
							if(err) return done(err);

							expect(tasks.length).to.equal(0);

							Workspace.findById(user.workspace, function(err, workspace){
								if(err) return done(err);

								expect(workspace.tasks.length).to.equal(0);

								Activity.find({}, function(err, activities) {
									if(err) return done(err);
									
									expect(activities.length).to.equal(1);
									expect(activities[0].type).to.equal('deleted');
									expect(activities[0].text).to.equal('task name');
									done();
								});
							});
						});
					});
				});
			});
		});
	});
			
	it('changes task status', function(done){
		generateUserAndLogin({}, function(err, user, agent){
			if(err) return done(err);

			var task = new Task({text: 'task name', state:'Ready'});
			task.save(function(err, task){
				if(err) return done(err);

				agent.put(url + task._id).send({'state' : 'In Progress'}).end(function(err, res){
					if(err) return done(err);
					
					expect(res.body.state).to.equal('In Progress');
					
					Activity.find({}, function(err, activities) {
						if(err) return done(err);
						
						expect(activities.length).to.equal(1);
						expect(activities[0].type).to.equal('changed');
						expect(activities[0].text).to.equal('task name changed status from [Ready] to [In Progress]');
						done();
					});
				});
			});
		});
	});
	
	it('changes task text', function(done){
		generateUserAndLogin({}, function(err, user, agent){
			if(err) return done(err);

			var task = new Task({text: 'task name', state:'Ready'});
			task.save(function(err, task){
				if(err) return done(err);

				agent.put(url + task._id).send({ text : 'Updated text'}).expect(200).end(function(err, res){
					if(err) return done(err);
					
					expect(res.body.text).to.equal('Updated text');
					
					Activity.find({}, function(err, activities) {
						if(err) return done(err);
						
						expect(activities.length).to.equal(1);
						expect(activities[0].type).to.equal('changed');
						expect(activities[0].text).to.equal('[task name] to [Updated text]');
						done();
					});
				});
			});
		});
	});

	it('updates the assigned users in PUT', function(done){
		generateUserAndLogin({}, function(err, user, agent){
			if(err) return done(err);

			var task = new Task({text: 'task', state: 'Ready'});
			task.save(function(err, task){
				if(err) return done(err);

				var updTask = {
					assignedUsers : [user._id]
				};

				agent.put(url + task._id).send(updTask).expect(200).end(function(err, res){
					if(err) return done(err);

					Task.findById(task._id, function(err, task){
						if(err) return done(err);
						expect(task.assignedUsers[0]).to.eql(user._id);
						
						Activity.find({}, function(err, activities) {
							if(err) return done(err);
							
							expect(activities.length).to.equal(1);
							expect(activities[0].type).to.equal('assigned');
							expect(activities[0].text).to.equal('Test User to [task]');	
							done();					
						});											
					});
				});
			});
		});
	});

	it('updates the assigned users in POST', function(done){
		generateUserAndLogin({}, function(err, user, agent){
			if(err) return done(err);

			var task = {text: 'task', state: 'Ready', assignedUsers : [user._id]};

			agent.post(url).send(task).expect(200).end(function(err, res){
				if(err) return done(err);

				var task = res.body.tasks[0];
				expect(task.assignedUsers[0]).to.eql(String(user._id));
				done();
			});
		});
	});

});