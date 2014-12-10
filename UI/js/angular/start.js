var module = angular.module('tmbStart', ['Auth']);

module.controller('startCtrl', function($scope, $location, AuthService){
	AuthService.reauthenticate(function(err){
		if(!err){
			$location.path('/ready');
		}
		else{
			console.log(err);
		}
	});

	$scope.submitLogin = function(){
		$scope.formSubmitted = true;
		$scope.err = {};

		if($scope.loginForm.$invalid){
			return;
		}

		var user = {
			email : $scope.userdata.email,
			password : $scope.userdata.password
		};

		user.email = user.email.trim();
		user.password = user.password.trim();

		AuthService.login(user, function(err){
			if(err){
				if(err.message === 'email_or_pw_wrong'){
					$scope.err[err.message] = true;
				}else if(err.message === 'locked'){
					$scope.err[err.message] = true;
				}
			}else{
				$location.path('/ready');
			}
		});
	};
});