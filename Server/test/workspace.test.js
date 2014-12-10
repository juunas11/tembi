var expect = require('expect.js');
var supertest = require('supertest');
var User = require('../models/user');
var Task = require('../models/task');
var Workspace = require('../models/workspace');
var Invitation = require('../models/invitation');

describe('/workspace', function(){
	var url = '/workspace';

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
				}else if(options.workspace){
					Workspace.findByIdAndUpdate(options.workspace, {$push: {members: testUser}}, function(err, workspace){
						if(err) return done(err);

						testUser.workspace = options.workspace;
						testUser.save(done);
					});
				}else{
					var workspace = new Workspace();
					workspace.members.push(testUser._id);
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

	afterEach(function(done){
		User.remove({}, done);
	});

	afterEach(function(done){
		Workspace.remove({}, done);
	});

	afterEach(function(done){
		Invitation.remove({}, done);
	});

	it('gets the user\'s Workspace with proper authentication', function(done){
		generateUserAndLogin({}, function(err, user, agent){
			if(err) return done(err);
			agent.get(url).end(function(err, res){
				if(err) return done(err);

				expect(res.status).to.be(200);
				expect(res.body._id).to.be.ok();
				expect(res.body.tasks).to.be.ok();
				expect(res.body.members).to.be.ok();
				expect(res.body.members).to.contain(String(user._id));

				done();
			});
		});
	});

	it('does not return a workspace if user is unauthorized', function(done){
		request.get(url).expect(401).end(done);
	});

	it('creates a workspace', function(done){
		generateUserAndLogin({noWorkspace: true}, function(err, user, agent){
			if(err) return done(err);
			agent.post(url).expect(200).end(function(err){
				if(err) return done(err);

				User.findById(user._id, function(err, user){
					if(err) return done(err);

					expect(user.workspace).to.be.ok();
					Workspace.findById(user.workspace, function(err, workspace){
						if(err) return done(err);

						expect(workspace.members[0]).to.eql(user._id);
						done();
					});
				});
			});
		});
	});

	describe('/invitation', function(){

		var inviteUrl = url + '/invitation';

		before(function(){ //Daily usage limit on dat email service so~
			process.env.DISABLE_EMAIL = true;
		});

		after(function(){
			process.env.DISABLE_EMAIL = undefined;
		});

		//2.6.1
		it('creates an invitation for the user\'s workspace', function(done){
			generateUserAndLogin({email: 'user@test.com'}, function(err, user, agent){
				if(err) return done(err);

				var email = 'invite@aaaa.com';

				agent.post(inviteUrl).send({email : email}).end(function(err, res){
					if(err) return done(err);

					expect(res.status).to.equal(200);

					Invitation.findOne({email: email}, function(err, invite){
						if(err) return done(err);

						expect(invite).to.be.ok();
						expect(invite.email).to.equal(email);
						expect(invite.sender.firstName).to.equal(user.firstName);
						expect(invite.sender.lastName).to.equal(user.lastName);
						expect(invite.workspace).to.eql(user.workspace);
						done();
					});
				});

			});
		});

		//2.6.2
		it('returns all invitations for authenticated user', function(done){
			generateUserAndLogin({email: 'test@test.com'}, function(err, user, agent){
				if(err) return done(err);

				var workspace = new Workspace();
				workspace.save(function(err, workspace){
					if(err) return done(err);
					var invites = [
						{email: user.email, workspace: workspace._id, sender: { firstName: 'Inviting', lastName: 'User'}},
						{email: 'some_other@email.com', workspace: workspace._id, sender: { firstName: 'Some', lastName: 'User'}}
					];
					Invitation.create(invites, function(err){
						if(err) return done(err);

						agent.get(inviteUrl).expect(200).end(function(err, res){
							if(err) return done(err);

							expect(res.body.length).to.equal(1);
							var invite = res.body[0];
							expect(invite.email).to.equal(user.email);
							expect(invite.workspace).to.equal(String(workspace._id));
							expect(invite.sender).to.be.ok();
							expect(invite.sender.firstName).to.equal('Inviting');
							expect(invite.sender.lastName).to.equal('User');
							done();
						});
					});
				});
			});
		});

		//2.6.3
		it('sets user\'s workspace through /accept', function(done){
			generateUserAndLogin({noWorkspace: true}, function(err, user, agent){
				if(err) return done(err);

				var workspace = new Workspace();
				workspace.save(function(err, workspace){
					if(err) return done(err);

					var invite = new Invitation(
						{email: user.email,
							workspace: workspace._id,
							sender: {
								firstName: 'Inviting',
								lastName: 'User'
							}
						});

					invite.save(function(err, invite){
						if(err) return done(err);
						agent.post(inviteUrl + '/accept').send({invite_id: invite._id}).expect(200).end(function(err){
							if(err) return done(err);

							User.findById(user._id, function(err, user){
								if(err) return done(err);

								expect(user.workspace).to.eql(workspace._id);

								agent.get('/activity').expect(200).end(function(err, res){
									if(err) return done(err);

									var activities = res.body;
									expect(activities.length).to.equal(1);
									var activity = activities[0];
									expect(activity.type).to.equal('joined');
									expect(activity.text).to.equal('workspace');
									expect(activity.user._id).to.eql(String(user._id));
									done();
								});
							});
						});
					});
				});
			});
		});

		//2.6.4
		it('removes all invitations through /reject', function(done){
			generateUserAndLogin({noWorkspace: true}, function(err, user, agent){
				if(err) return done(err);

				var workspace = new Workspace();
				workspace.save(function(err, workspace){
					if(err) return done(err);

					var invite = new Invitation({email: user.email, workspace: workspace._id, sender: { firstName: 'Some', lastName: 'User'}});

					invite.save(function(err, invite){
						if(err) return done(err);

						agent.post(inviteUrl + '/reject').expect(200).end(function(err){
							if(err) return done(err);

							Invitation.find({email: user.email}, function(err, invites){
								if(err) return done(err);

								expect(invites.length).to.be(0);

								User.findById(user._id, function(err, user){
									if(err) return done(err);

									expect(user.workspace).to.not.be.ok();
									done();
								});
							});

						});
					});
				});
			});
		});
	});

	describe('/users', function(){
		var usersUrl = url + '/users';

		it('returns the members of the user\'s workspace', function(done){
			var options = {email: 'user@test.com', firstName: 'John'};
			createTestUser(options, function(err, user){
				if(err) return done(err);

				var options2 = {workspace : user.workspace, email: 'user2@test.com', firstName: 'Bruce'};
				generateUserAndLogin(options2, function(err, user2, agent){
					if(err) return done(err);

					agent.get(usersUrl).expect(200).end(function(err, res){
						if(err) return done(err);

						expect(res.body.length).to.equal(2);
						var firstIndex = 0, lastIndex = 1;
						if(res.body[0].firstName !== user.firstName){
							firstIndex = 1;
							lastIndex = 0;
						}
						expect(res.body[firstIndex].firstName).to.equal(user.firstName);
						expect(res.body[firstIndex].lastName).to.equal(user.lastName);
						expect(res.body[firstIndex].email).to.equal(user.email);
						expect(res.body[firstIndex].password).to.not.be.ok();
						expect(res.body[firstIndex].reauthToken).to.not.be.ok();
						expect(res.body[firstIndex].forgotpwToken).to.not.be.ok();

						expect(res.body[lastIndex].firstName).to.equal(user2.firstName);
						expect(res.body[lastIndex].lastName).to.equal(user2.lastName);
						expect(res.body[lastIndex].email).to.equal(user2.email);
						expect(res.body[lastIndex].password).to.not.be.ok();
						expect(res.body[lastIndex].reauthToken).to.not.be.ok();
						expect(res.body[lastIndex].forgotpwToken).to.not.be.ok();
						done();
					});
				});
			});
		});
	});
});