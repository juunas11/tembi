var module = angular.module('tmbInvitations', ['tmbConfig']);

module.controller('invitationCtrl', function($scope, InvitationService, $location){
	$scope.data = {invitations : [], selectedInvite : null};

	InvitationService.getInvitations(function(err, invites){
		if(err){
			console.log('Error' + err);
		}else{
			$scope.data.invitations = invites;
		}
	});

	$scope.acceptInvitation = function(){
		var inviteId = $scope.data.selectedInvite;
		InvitationService.acceptInvitation(inviteId, function(err){
			if(err) {
				console.log('Error' + err);
			}else{
				$location.path('/ready');
			}
		});
	};

	$scope.rejectInvitations = function(){
		InvitationService.rejectInvitations(function(err){
			if(err){
				console.log('Error' + err);
			}else{
				InvitationService.createWorkspace(function(err){
					if(err){
						console.log('Error' + err);
					}else{
						$location.path('/ready');
					}
				});
			}
		});
	};


});

module.factory('InvitationService', function($http, config){
	return {
		getInvitations : function(done){
			$http.get(config.backendURL + '/workspace/invitation')
				.success(function(data){
					done(null, data);
				})
				.error(function(data, status){
					var err = new Error();
					err.status = status;
					done(err);
				});
		},
		acceptInvitation : function(invite_id, done){
			$http.post(config.backendURL + '/workspace/invitation/accept', {invite_id: invite_id})
				.success(function(){
					done();
				})
				.error(function(data, status){
					var err = new Error();
					err.status = status;
					done(err);
				});
		},
		rejectInvitations : function(done){
			$http.post(config.backendURL + '/workspace/invitation/reject')
				.success(function(){
					done();
				})
				.error(function(data, status){
					var err = new Error();
					err.status = status;
					done(err);
				});
		},
		createWorkspace : function(done){
			$http.post(config.backendURL + '/workspace')
				.success(function(){
					done();
				})
				.error(function(data, status){
					var err = new Error();
					err.status = status;
					done(err);
				});
		}
	};
});