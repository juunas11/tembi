var authSvc = angular.module('Auth', ['tmbConfig']);

authSvc.factory('AuthService', function($http, $rootScope, config){
	var currentUser;

	var saveUserInfo = function(email, token, firstName, lastName){
		localStorage.setItem('useremail', email);
		localStorage.setItem('reauthtoken', token);
		localStorage.setItem('firstName', firstName);
		localStorage.setItem('lastName', lastName);
	};

	var saveNewToken = function(token){
		localStorage.setItem('reauthtoken', token);
	};

	var getUserInfo = function(){
		return { 
			email : localStorage.getItem('useremail'),
			token : localStorage.getItem('reauthtoken'),
			firstName : localStorage.getItem('firstName'),
			lastName : localStorage.getItem('lastName')	
		};
	};

	var _isLoggedIn = function(callback){
		$http.get(config.backendURL + '/users/checkauth')
			.success(function(data, status){
				if(status === 200){
					callback(null, data.auth);
				}else{
					console.log('Unknow statuscode returned!');
					callback(new Error('unknown_statuscode'));
				}
			})
			.error(function(data, status){
				console.log('Unknown error occurred!');
				console.log(JSON.stringify(data));
				console.log(status);
				callback(new Error('unknown_error'));
			});
	};

	return {
		signup: function(user, callback){
			$http.post(config.backendURL + '/users/signup', user)
				.success(function(data, status){
					switch(status){
						case 200:
							if(data.success){
								currentUser = {
									firstName:user.firstName,
									lastName:user.lastName,
									email:user.email
								};

								$rootScope.currentUser = currentUser;

								saveUserInfo(currentUser.email, data.token, currentUser.firstName, currentUser.lastName);
								callback();
							}else{
								callback(new Error('unknown_error'));
							}
							break;
						default:
							callback(new Error('unknown_statuscode'));
					}
				})
				.error(function(data, status){
					var errorMsg;
					switch(status){
						case 400:
							console.log('Invalid request, check the validation');
							errorMsg = 'bad_request';
							break;
						case 401:
							console.log('Email is taken');
							errorMsg = 'email_taken';
							break;
						default:
							errorMsg = 'unknown_error';
							break;
					}
					callback(new Error(errorMsg));
				});
		},
		login: function(user, callback){
			$http.post(config.backendURL + '/users/login', user)
				.success(function(data, status){
					if(status === 200){
						if(data.success){
							saveUserInfo(user.email, data.token, data.user.firstName, data.user.lastName);
							currentUser = {
								firstName: data.user.firstName,
								lastName: data.user.lastName,
								email: user.email
							};

							$rootScope.currentUser = currentUser;
							callback();
						}else{
							callback(new Error('unknown_error'));
						}
					}else{
						console.log('Unknow statuscode returned!');
					}
				})
				.error(function(data, status){
					if(status === 401){
						if(data.error === 'email_or_pw_wrong'){
							callback(new Error('email_or_pw_wrong'));
						}else if(data.error === 'locked'){
							callback(new Error('locked'));
						}else{
							console.log('Unknown error occurred!');
						}
					}else{
						console.log('Unknown error occurred!');
					}
				});
		},
		isLoggedIn: _isLoggedIn,
		currentUser: function(){
			if(!currentUser){
				var info = getUserInfo();
				currentUser = {
					email : info.email,
					firstName : info.firstName,
					lastName : info.lastName
				};
			}
			return currentUser;
		},
		reauthenticate: function(callback){
			_isLoggedIn(function(err, auth){
				if(err) callback(err);

				if(auth){
					callback();
				}else{
					var info = getUserInfo();

					if(!info.token)
						return callback(new Error('no_auth'));

					$http.post(config.backendURL + '/users/reauth', info)
						.success(function(data, status){
							if(status === 200){
								currentUser = {
									email : info.email,
									firstName : info.firstName,
									lastName : info.lastName
								};
								$rootScope.currentUser = currentUser;
								saveNewToken(data.token);
								callback();
							}else{
								callback(new Error('unknown_error'));
							}
						})
						.error(function(data, status){
							if(status === 401){
								callback(new Error('no_auth'));
							}else{
								callback(new Error('unknown_error'));
							}
							
						});
				}
			});
		},
		logout: function(done){
			saveUserInfo('', '', '', '');
			$rootScope.currentUser = null;
			$http.get(config.backendURL + '/users/logout')
				.success(function(){
					done();
				})
				.error(function(){
					done();
				});
		}
	};
});