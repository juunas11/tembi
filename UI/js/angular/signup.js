var module = angular.module('tmbSignup', ['Auth', 'tmbInvitations', 'validation.match']);

module.controller('signupCtrl', function($scope, $http, $location, AuthService, InvitationService){
	$scope.userdata = {};
	$scope.err = {};

	$scope.submitSignup = function(){
		$scope.formSubmitted = true;
		$scope.err = {};

		if($scope.signupForm.$invalid){
			return;
		}

		var user = {
			firstName : $scope.userdata.firstName,
			lastName : $scope.userdata.lastName,
			email : $scope.userdata.email,
			password : $scope.userdata.password
		};

		user.firstName = user.firstName.trim();
		user.lastName = user.lastName.trim();
		user.email = user.email.trim();
		user.password = user.password.trim();

		AuthService.signup(user, function(err){
			if(err){
				console.log(err);
				if(err.message === 'email_taken'){
					$scope.err.email_taken = true;
				}
			}else{
				InvitationService.getInvitations(function(err, invitations){
					if(err){
						console.log('Error' + err);
						return;
					}

					if(invitations.length > 0){
						$location.path('/invitations');
					}else{
						InvitationService.createWorkspace(function(err){
							if(err) console.log('Error' + err);
							else $location.path('/ready');
						});
					}
				});
			}
		});
	};
});