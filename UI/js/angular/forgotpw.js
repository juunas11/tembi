var module = angular.module('tmbForgotpw', ['tmbConfig', 'validation.match']);

module.factory('ForgotPwService', function($http, config){

	return {
		requestAuthCode : function(email){
			localStorage.setItem('authCodeReceiverEmail', email);
			$http.post(config.backendURL + '/users/forgot-pw-auth-code', {email: email})
				.error(function(data, status){
					console.log('Error occurred: ' + status);
				});
		},
		getAuthCodeReceiver : function(){
			return localStorage.getItem('authCodeReceiverEmail');
		},
		changePassword : function(email, token, password, done){
			var obj = {
				email : email,
				token : token,
				password : password
			};
			$http.post(config.backendURL + '/users/forgot-pw-change-pw', obj)
				.success(function(data, status){
					if(status === 200){
						localStorage.setItem('authCodeReceiverEmail', '');
						done();	
					} 
					else console.log('Unknown status code');
				})
				.error(function(data, status){
					if(status === 401){
						var err = new Error();
						err.message = 'unauthorized';
						done(err);
					}else{
						console.log('Error occurred: %d', status);
					}
				});
		}
	};
});

module.controller('forgotPwCtrl', function($location, $scope, ForgotPwService){
	$scope.userdata = {email: ForgotPwService.getAuthCodeReceiver()};
	$scope.authCodeRequested = !!$scope.userdata.email;

	$scope.requestCode = function(){
		$scope.err = {};
		$scope.emailFormSubmitted = true;

		if($scope.emailForm.$invalid){
			return;
		}

		var email = $scope.userdata.email.trim();

		$scope.authCodeRequested = true;
		ForgotPwService.requestAuthCode(email);
	};

	$scope.changePassword = function(){
		$scope.err = {};
		$scope.pwFormSubmitted = true;
		if($scope.passwordForm.$invalid){
			return;
		}

		var email = $scope.userdata.email.trim();
		var code = $scope.userdata.authcode.trim();
		var password = $scope.userdata.password.trim();
		var password2 = $scope.userdata.password2.trim();

		ForgotPwService.changePassword(email, code, password, function(err){
			if(err){
				if(err.message === 'unauthorized'){
					$scope.userdata.authcode = '';
					$scope.err.codeInvalid = true;
				}
			}else{
				$location.path('/');
			}
		});
	};
});