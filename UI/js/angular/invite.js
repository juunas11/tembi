var module = angular.module('tmbInvite', ['tmbConfig']);

module.controller('inviteCtrl', function($scope, InviteService){
	$scope.data = {};
	$scope.data.inviteSent = false;
	$scope.err = {};

	$scope.inviteUser = function(){
		$scope.formSubmitted = true;
		$scope.err = {};

		if($scope.inviteForm.$invalid){
			return;
		}

		var email = $scope.data.email.trim();
		$scope.data.inviteSent = false;

		InviteService.inviteUser(email, function(err){
			$scope.formSubmitted = false;
			if(!err){ 
				$scope.data.inviteSent = true;
			}else{
				console.log('Error: ' + err);
				if(err.message === 'user_has_workspace'){
					$scope.err.user_has_workspace = true;
				}
			}
		});
	};
});

module.factory('InviteService', function($http, config){
	return {
		inviteUser : function(email, done){
			$http.post(config.backendURL + '/workspace/invitation', {email: email})
				.success(function(data){
					if(!data || !data.error){
						done();
					}else{
						var err = new Error();
						err.message = data.error;
						done(err);
					}
				})
				.error(function(data, status){
					var err = new Error();
					err.status = status;
					done(err);
				});
		}
	};
});