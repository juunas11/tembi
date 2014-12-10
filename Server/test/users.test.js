var expect = require('expect.js');
var User = require('../models/user');
var Workspace = require('../models/workspace');
var Activity = require('../models/activity');
var supertest = require('supertest');

describe('/users', function(){
	var checkAuthUrl = '/users/checkauth';

	afterEach(function(done){ //After each run clears the User entities
		User.remove({}, done);
	});
	
	afterEach(function(done){ 
		Activity.remove({}, done);
	});

	afterEach(function(done){
		Workspace.remove({}, done);
	});

	/**
	 * Utility function for creating a user in the DB
	 * email: Email address of user
	 * pw: password of user
	 * locked: boolean, true if account is locked
	 * done: callback function(err) err will be truthy if there was an error, falsy otherwise
	 */
	var createTestUser = function(email, pw, locked, done){
		var testUser = new User();
		testUser.email = email;
		testUser.firstName = 'Test';
		testUser.lastName = 'User';
		testUser.accountLocked = locked;
		testUser.generateHash(pw, function(err, hash){
			if(err) return done(err);

			testUser.password = hash;
			testUser.save(function(err){
				if(err) return done(err);

				done();
			});
		});
	};

	var checkAuthentication = function(agent, result, done){
		agent.get(checkAuthUrl)
			.expect(200)
			.end(function(err, res){
				if(err) return done(err);

				expect(res.body.auth).to.eql(result);

				done();
			});
	};
	
	//2.1
	describe('/signup', function(){
		var url = '/users/signup';
		
		//2.1.2
		it('signs up with non-used email and pw, status 200, success', function(done){
			var testUser = {
				firstName : 'Joonas',
				lastName : 'Westlin',
				email: 'test@test.com',
				password: 'test'
			};

			var agent = supertest.agent(app);
			agent.post(url)
				.send(testUser)
				.end(function(err, res){
					if(err) return done(err);					
					expect(res.status).to.be(200);
					expect(res.body.success).to.be(true);
					checkAuthentication(agent, true, done);
				});
		});
		
		//2.1.3
		it('does not allow sign up if email is in use, status 401', function(done){
			var testUser = {
				firstName : 'Existing',
				lastName : 'User',
				email: 'existing@test.com',
				password: 'test'
			};
			createTestUser(testUser.email, testUser.password, false, function(err){
				if(err) return done(err);

				var agent = supertest.agent(app);

				agent.post(url)
					.send(testUser)
					.end(function(err, res){
						if(err) return done(err);
						expect(res.status).to.be(401); //Unauthorized
						expect(res.body.success).to.not.be.ok();
						checkAuthentication(agent, false, done);
					});
			});
		});

		//2.1.6
		it('does not allow first name to be empty', function(done){
			var testUser = {
				firstName : '',
				lastName : 'User',
				email: 'email@email.com',
				password: 'test'
			};
			var agent = supertest.agent(app);
			agent.post(url)
				.send(testUser)
				.end(function(err, res){
					if(err) return done(err);

					expect(res.status).to.be(400); //Bad request
					expect(res.body.success).to.not.be.ok();
					checkAuthentication(agent, false, done);
				});
		});

		//2.1.6
		it('does not allow last name to be empty', function(done){
			var testUser = {
				firstName : 'Test',
				lastName : '',
				email: 'email@email.com',
				password: 'test'
			};
			var agent = supertest.agent(app);
			agent.post(url)
				.send(testUser)
				.end(function(err, res){
					if(err) return done(err);

					expect(res.status).to.be(400); //Bad request
					expect(res.body.success).to.not.be.ok();
					checkAuthentication(agent, false, done);
				});
		});

		//2.1.6
		it('does not allow email to be empty', function(done){
			var testUser = {
				firstName : 'Test',
				lastName : 'User',
				email: '',
				password: 'test'
			};
			var agent = supertest.agent(app);
			agent.post(url)
				.send(testUser)
				.end(function(err, res){
					if(err) return done(err);

					expect(res.status).to.be(400); //Bad request
					expect(res.body.success).to.not.be.ok();
					checkAuthentication(agent, false, done);
				});
		});

		//2.1.6
		it('does not allow password to be empty', function(done){
			var testUser = {
				firstName : 'Test',
				lastName : 'User',
				email: 'test@test.com',
				password: ''
			};
			var agent = supertest.agent(app);
			agent.post(url)
				.send(testUser)
				.end(function(err, res){
					if(err) return done(err);

					expect(res.status).to.be(400); //Bad request
					expect(res.body.success).to.not.be.ok();
					checkAuthentication(agent, false, done);
				});
		});

		var tryInvalidEmail = function(email, done){
			var testUser = {
				firstName : 'Test',
				lastName : 'User',
				email: email,
				password: 'test'
			};
			var agent = supertest.agent(app);
			agent.post(url)
				.send(testUser)
				.end(function(err, res){
					if(err) return done(err);

					expect(res.status).to.be(400);
					expect(res.body.success).to.not.be.ok();
					checkAuthentication(agent, false, done);
				});
		};
		
		//2.1.7
		it('does not allow invalid email address 1', function(done){
			tryInvalidEmail('aaa@', done);
		});

		//2.1.7
		it('does not allow invalid email address 2', function(done){
			tryInvalidEmail('afsfsa@aa', done);
		});
		
		//2.1.7
		it('does not allow invalid email address 3', function(done){
			tryInvalidEmail('as@@aaa.com', done);
		});

		//2.1.7
		it('does not allow invalid email address 4', function(done){
			tryInvalidEmail('', done);
		});

		//2.1.7
		it('does not allow invalid email address 5', function(done){
			tryInvalidEmail('@', done);
		});
	});
	
	//2.2
	describe('/login', function(){
		var url = '/users/login';
		var reAuthUrl = '/users/reauth';
		
		//2.2.1
		it('logs in with valid id', function(done){
			var options = {
				email: 'test@test.com',
				password: 'test',
				status: 200,
				success: true
			};

			tryLogin(options, done);
		});

		//2.2.2
		it('does not log in with the wrong password', function(done){
			var options = {
				email: 'test@test.com',
				password: 'test',
				status: 401,
				success: false,
				error: 'email_or_pw_wrong',
				reqPassword: 'pw'
			};

			tryLogin(options, done);
		});
		
		//2.2.3
		it('does not log in with invalid id', function(done){ //We know db is empty
			var options = {
				email: 'asdf@asdf.com',
				password: 'asdf',
				status: 401,
				success: false,
				error: 'email_or_pw_wrong'
			};

			tryLoginWithoutCreatingUser(options, done);
		});

		//2.2.4
		it('does not log in when account is locked', function(done){
			var options = {
				email: 'test@test.com',
				password: 'test',
				status: 401,
				success: false,
				error: 'locked',
				locked: true
			};

			tryLogin(options, done);
		});
		
		//2.2.5
		it('allows email to be case-insensitive', function(done){
			var options = {
				email: 'test@test.com',
				password: 'test',
				status: 200,
				success: true,
				reqEmail: 'TeST@TEsT.cOM'
			};

			tryLogin(options, done);
		});
		
		//2.2.6
		it('does not log in without credentials', function(done){
			var options = {
				email: '',
				password: '',
				status: 400,
				success: false
			};

			tryLoginWithoutCreatingUser(options, done);
		});

		//2.2.6
		it('does not log in with only spaces for credentials', function(done){
			var options = {
				email: '  ',
				password: '   ',
				status: 400,
				success: false
			};

			tryLoginWithoutCreatingUser(options, done);
		});

		//2.2.6
		it('does not log in with a space as a password', function(done){
			var options = {
				email: 'test@test.com',
				password: ' ',
				status: 400,
				success: false
			};

			tryLoginWithoutCreatingUser(options, done);
		});

		//2.2.7
		it('returns a re-auth token upon login and re-authenticates with it', function(done){
			var options = {
				email: 'test@test.com', 
				password: 'aa',
				status: 200,
				success : true
			};

			tryReauth(options, done);
		});

		//Related to 2.2.7, though more of a security concern
		it('does not re-authenticate with a past token', function(done){
			var user = {
				email: 'test@test.com', 
				password: 'aa'
			};
			createTestUser(user.email, user.password, false, function(err){
				if(err) return done(err);

				request.post(url) //login
					.send(user)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);

						expect(res.body.token).to.be.ok();

						var pastToken = res.body.token;

						request.post(url) 
							.send(user)
							.expect(200)
							.end(function(err, res){//login
								if(err) return done(err);

								expect(res.body.token).to.be.ok();

								var agent = supertest.agent(app); //create agent for other session

								agent.post(reAuthUrl) //re-authenticate
									.send({
										email: user.email,
										token: pastToken
									})
									.expect(401)
									.end(function(err, res){
										if(err) return done(err);

										expect(res.body.token).to.not.be.ok();
										expect(res.body.error).to.equal('email_or_token_wrong');

										checkAuthentication(agent, false, done); //Check we are not authenticated
									});
							});
					});
			});
		});

		//2.2.7
		it('does not re-auth with no token', function(done){
			var options = {
				email: 'test@test.com', 
				password: 'aa',
				status: 400,
				sendToken: false,
				success : false
			};

			tryReauth(options, done);
		});

		//2.2.7
		it('does not re-auth with no email', function(done){
			var options = {
				email: 'test@test.com', 
				password: 'aa',
				status: 400,
				sendEmail: false,
				success : false
			};

			tryReauth(options, done);
		});

		//2.2.7
		it('does not re-auth with a non-existing email', function(done){
			var options = {
				email: 'test@test.com', 
				password: 'aa',
				status: 401,
				success : false,
				reqEmail : 'aaaa@aaaa.com',
				error : 'email_or_token_wrong'
			};

			tryReauth(options, done);
		});

		//2.2.10
		it('does not re-auth a locked user', function(done){
			var options = {
				email: 'test@test.com', 
				password: 'aa',
				locked : true,
				status: 401,
				success : false,
				error : 'locked'
			};

			tryReauth(options, done);
		});

		var tryReauth = function(options, done){
			var user = {
				email: options.email || 'test@test.com',
				password: options.paswrod || 'aa'
			};

			createTestUser(user.email, user.password, false, function(err){
				if(err) return done(err);

				request.post(url) //login
					.send(user)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);

						expect(res.body.token).to.be.ok();

						var token = res.body.token;

						var locked = !!options.locked;
						if(locked){
							User.findOneAndUpdate({email: user.email}, {accountLocked: true}, function(err){
								if(err) return done(err);

								reauth(user, token, options, done);
							});
						}else{
							reauth(user, token, options, done);
						}
					});
			});
		};

		var tryLoginWithoutCreatingUser = function(options, done){
			var user = {
				email: options.email,
				password: options.password
			};

			var success = options.success;
			var status = options.status || 200;
			var error = options.error;

			var agent = supertest.agent(app);
			agent.post(url)
				.send(user)
				.end(function(err, res){
					if(err) return done(err);

					expect(res.status).to.be(status);

					if(success){
						expect(res.body.token).to.be.ok();
						expect(res.body.success).to.equal(true);
						expect(res.body.user).to.be.ok();
						expect(res.body.user).to.have.property('firstName');
						expect(res.body.user).to.have.property('lastName');
					}else{
						expect(res.body.token).to.not.be.ok();
						expect(res.body.success).to.not.be.ok();
						expect(res.body.user).to.not.be.ok();
					}
					
					if(error){
						expect(res.body.error).to.equal(error);
					}else{
						expect(res.body.error).to.not.be.ok();
					}

					checkAuthentication(agent, success, done);
				});
		};

		var tryLogin = function(options, done){
			var email = options.email;
			var password = options.password;
			var status = options.status || 200;
			var locked = !!options.locked;
			var success = !!options.success;
			var error = options.error;

			createTestUser(email, password, locked, function(err){
				if(err) return done(err);

				var loginOpts = {
					email: options.reqEmail || email,
					password: options.reqPassword || password,
					status: status,
					success: success,
					error: error
				};

				tryLoginWithoutCreatingUser(loginOpts, done);
			});
		};

		var reauth = function(user, token, options, done){
			var sendEmail = options.sendEmail;
			if(sendEmail === undefined){
				sendEmail = true;
			}
			var sendToken = options.sendToken;
			if(sendToken === undefined){
				sendToken = true;
			}

			var obj = {};
			if(sendEmail){
				obj.email = options.reqEmail || user.email;
			}
			if(sendToken){
				obj.token = options.reqToken || token;
			}

			var status = options.status || 200;
			var error = options.error;
			var success = !!options.success;

			var agent = supertest.agent(app); //create agent for other session

			agent.post(reAuthUrl) //re-authenticate
				.send(obj)
				.expect(status)
				.end(function(err, res){
					if(err) return done(err);

					if(success){
						expect(res.body.success).to.equal(true);
						expect(res.body.token).to.be.ok();
					}else{
						expect(res.body.token).to.not.be.ok();
						expect(res.body.success).to.not.be.ok();
					}

					if(error){
						expect(res.body.error).to.equal(error);
					}else{
						expect(res.body.error).to.not.be.ok();
					}
					
					checkAuthentication(agent, success, done); //Check we are authenticated
				});
		};

	});

	describe('/logout', function(){
		var url = '/users/logout';

		//2.2.8
		it('makes a user non-authenticated', function(done){
			var user = {
				email : 'whatever@email.com',
				password : 'pass'
			};

			createTestUser(user.email, user.password, false, function(err){
				if(err) return done(err);

				var agent = supertest.agent(app);
				agent.post('/users/login')
					.send(user)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);

						agent.get(url).end(function(err, res){
							if(err) return done(err);

							checkAuthentication(agent, false, done);
						});
					});
			});
		});
	});

	describe('/forgot-pw-auth-code', function(){
		var url = '/users/forgot-pw-auth-code';

		before(function(){ //Daily usage limit on dat email service so~
			process.env.DISABLE_EMAIL = true;
		});

		after(function(){
			process.env.DISABLE_EMAIL = undefined;
		});

		it('sets a recovery token for an existing email', function(done){
			var user = {
				email: 'asdfasdfagaergrtg@asdfaergfergra.com'
			};
			var password = 'pass';
			createTestUser(user.email, password, false, function(err){
				if(err) return done(err);

				request.post(url).send(user).expect(200).end(function(err){
					if(err) return done(err);

					User.findOne({email: user.email}, function(err, user){
						if(err) return done(err);

						expect(user.forgotpwToken).to.be.ok();
						done();
					});
				});
			});
		});

	});

	describe('/users/forgot-pw-change-pw', function(){
		var url = '/users/forgot-pw-change-pw';

		it('successfully changes user\'s password with correct token', function(done){
			var user = new User({
				email: 'test@test.com'
			});

			user.generateForgotPwToken(function(err, token){
				if(err) return done(err);

				var password = 'aaa222aaa';

				var body = {
					email: user.email,
					token: token,
					password: password
				};

				request.post(url).send(body).expect(200).end(function(err){
					if(err) return done(err);

					User.findOne({email: user.email}, function(err, savedUser){
						if(err) return done(err);

						expect(savedUser.forgotpwToken).to.not.be.ok();

						savedUser.validPassword(password, function(err, res){
							if(err) return done(err);

							expect(res).to.equal(true);
							done();
						});
					});
				});
			});
		});

		it('does not change password with incorrect token', function(done){
			var user = new User({
				email: 'test@test.com'
			});

			user.generateHash('password', function(err, hash){
				if(err) return done(err);

				user.password = hash;
				user.forgotpwToken = 'realtokenhash';
				user.save(function(err){
					if(err) return done(err);

					var newPassword = 'aaa222aaa';

					var body = {
						email: user.email,
						token: 'faketoken',
						password: newPassword
					};

					request.post(url).send(body).expect(401).end(function(err){
						if(err) return done(err);

						User.findOne({email: user.email}, function(err, savedUser){
							if(err) return done(err);

							expect(savedUser.forgotpwToken).to.not.be.ok();

							savedUser.validPassword(newPassword, function(err, res){
								expect(err).to.not.be.ok();

								expect(res).to.equal(false);
								done();
							});
						});
					});
				});
			});
		});

	});
	
});