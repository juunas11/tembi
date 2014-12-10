var tmbApp = angular.module('tmb', [
									'ngRoute',
									'ngMessages',
									'ngTouch',
									'tmbSignup', 
									'tmbStart', 
									'tmbConfig', 
									'Auth', 
									'tmbForgotpw',
									'tmbInvitations',
									'tmbInvite',
									'mobile-angular-ui'
									]);

tmbApp.run(function($rootScope, AuthService){
	$rootScope.currentUser = AuthService.currentUser();
});

tmbApp.controller('readyCtrl', function($rootScope, $scope, $http, config, $location, $routeParams, AuthService, WorkspaceService)
{
	$scope.pageState = $routeParams.status != undefined? $routeParams.status : 'Ready';

	$scope.workspaceUsers = [];
	$scope.data = {};

	$http.get(config.backendURL + '/workspace')
		.success(function(data)
		{
			$scope.workspace = data;
			WorkspaceService.getUsers(function(err, users){
				if(err){
					console.log(err);
				}else{
					$scope.data.selectedUsers = {};
					for (var i = 0; i < users.length; i++) {
						$scope.data.selectedUsers[users[i]._id] = false;
					}
					$scope.workspaceUsers = users;
				}
			});

		})
		.error(function(){
			console.log('Board fetch error');
		});
	
	$scope.viewWorkspace = function(state){
		$http.get(config.backendURL + '/workspace')
			.success(function(data){
				$scope.workspace = data;
				$scope.pageState = state;
			})
			.error(function(data, status){
				console.log('Board fetch error');
			});
		};

	$scope.addTask = function(){
		var assignedUsers = [];
		for (var i = 0; i < $scope.workspaceUsers.length; i++) {
			if($scope.data.selectedUsers[$scope.workspaceUsers[i]._id]){
				assignedUsers.push($scope.workspaceUsers[i]._id);
			}
		}

		var task = {text : $scope.userdata.task, assignedUsers: assignedUsers};
		$http.post(config.backendURL + '/tasks', task)
			.success(function(data, status)
			{
				$scope.data.selectedUsers = {};
				$scope.workspace = data;
			})
			.error(function(data, status){
				console.log('Board fetch error');
			});
	};
	
	$scope.changeStatus = function(id, state){
		$http.put(config.backendURL + '/tasks/' + id, {'state': state })
			.success(function(data, status){
				$http.get(config.backendURL + '/workspace')
					.success(function(data){
						$scope.workspace = data;
					})
					.error(function(){
						console.log('Board fetch error');

					});
			})
			.error(function(data, status){
				console.log('Board fetch error');
				$(".task-block").css('visibility', 'visible');
			});
		};

	$scope.swipeLeft = function(task){
		$scope.data.taskToDelete = task;
		$rootScope.Ui.turnOn('deleteModal');
	};
	
	$scope.deleteTask = function(){
		$rootScope.Ui.turnOff('deleteModal');
		var task = $scope.data.taskToDelete;

		WorkspaceService.deleteTask(task._id, function(err){
			if(err){
				console.log(err);
			}else{
				var index = -1;
				for( var i = 0; i < $scope.workspace.tasks.length; i++ ){
					if( $scope.workspace.tasks[i]._id === task._id ){
						index = i;
						break;
					}
				}
				if( index === -1 )
					alert('Something went wrong and your item wasnt deleted.');
				else
					$scope.workspace.tasks.splice( index, 1 );
			}
		});
	};

	$rootScope.logout = function(){
		AuthService.logout(function(){
			$location.path('/');
		});
	};

	$scope.findUserById = function(id){
		if($scope.workspaceUsers){
			for (var i = 0; i < $scope.workspaceUsers.length; i++) {
				if($scope.workspaceUsers[i]._id === id){
					return $scope.workspaceUsers[i];
				}
			}
			return null;
		}else{
			return null;
		}
	};
});

tmbApp.controller('taskCtrl', function($location, $scope, $routeParams, $http, config, WorkspaceService)
{
	$scope.data = {};

	$http.get(config.backendURL + '/tasks/' + $routeParams.taskId)
		.success(function(task){
			$scope.task = task;
			WorkspaceService.getUsers(function(err, users){
				if(err){
					console.log(err);
				}else{
					$scope.data.selectedUsers = {};
					for (var i = 0; i < users.length; i++) {
						$scope.data.selectedUsers[users[i]._id] = false;
					}

					for (var i = 0; i < task.assignedUsers.length; i++) {
						$scope.data.selectedUsers[task.assignedUsers[i]] = true;
					}
					$scope.data.users = users;
				}
			});
		})
		.error(function(){
			console.log('Board fetch error');
		});
	
	$scope.update = function(id){
		var assignedUsers = [];
		for (var i = 0; i < $scope.data.users.length; i++) {
			if($scope.data.selectedUsers[$scope.data.users[i]._id]){
				assignedUsers.push($scope.data.users[i]._id);
			}
		}

		$http.put(config.backendURL + '/tasks/' + id, {text: $scope.task.text, assignedUsers: assignedUsers})
			.success(function(data, status){
				$location.path('/ready/' + data.state);
			})
			.error(function(data, status){
				console.log('Board fetch error');
			});
	};

	$scope.cancel = function(){
		$location.path('/ready/' + $scope.task.state);
	};
});	

tmbApp.controller('activityCtrl', function($scope, $http, config){
	 $http.get(config.backendURL + '/activity')
	   .success(function(data)
	   {
		  $scope.activity = data;
	   })
	   .error(function(){
		  alert('Activity fetch error');
	   });
});

tmbApp.factory('WorkspaceService', function($http, config){
	return {
		getUsers : function(done){
			$http.get(config.backendURL + '/workspace/users')
				.success(function(data){
					done(null, data);
				})
				.error(function(data, status){
					var err = new Error();
					err.status = status;
					done(err);
				});
		},
		deleteTask : function(id, done){
			$http.delete(config.backendURL + '/tasks/' + id)
				.success(function(data, status){
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

tmbApp.config(function($routeProvider){
	$routeProvider.when('/', {
		templateUrl: 'partials/start.html',
		controller: 'startCtrl'
	}).when('/signup', {
		templateUrl: 'partials/signup.html',
		controller: 'signupCtrl'
	}).when('/index', {
		templateUrl: 'partials/index_partial.html',
		controller: 'indexCtrl'
	}).when('/ready', {
		templateUrl: 'partials/ready.html',
		controller: 'readyCtrl'
	}).when('/ready/:status', {
		templateUrl: 'partials/ready.html',
		controller: 'readyCtrl'
	}).when('/forgotpassword', {
		templateUrl: 'partials/forgotpw.html',
		controller: 'forgotPwCtrl'
	}).when('/task/:taskId', {
		templateUrl: 'partials/task.html',
		controller: 'taskCtrl'
	}).when('/activity', {
		templateUrl: 'partials/activity.html',
		controller: 'activityCtrl'
	}).when('/invitations', {
		templateUrl: 'partials/invitations.html',
		controller: 'invitationCtrl'
	}).when('/invite', {
		templateUrl: 'partials/invite.html',
		controller: 'inviteCtrl'
	}).otherwise({
		redirectTo: '/'
	});
});

tmbApp.directive('clickClearTextBox', ['$document', function($document) {
	return function(scope, element, attr) 
	{ 
		element.bind('click', function(e)
		{
			document.getElementById(attr.clickClearTextBox).value = "";
		});
	}	
}]);

tmbApp.directive('redirectTo', ['$document', function($document) {
	return function(scope, element, attr) 
	{ 
		element.bind('click', function(e)
		{
			window.location.href = attr.redirectTo;
		});
	}	
}]);

tmbApp.directive('myDraggable', ['$timeout', function($timeout) {
	return function(scope, element, attr) 
	{
		var coords = {};
		var longPressDelay = 300;
		var threshold = 10;
		var longPressed = false;
		var elemLoc = {};
		var elemSize = {};
		var draggedElem;
		var buttons;
		var collidingButton;
		var taskId;

		var findCollision = function(x, y){
			if(!buttons){
				return null;
			}else{
				for (var i = 0; i < buttons.length; i++) {
					var btn = buttons[i];
					if(x <= btn.minX || x >= btn.maxX || y <= btn.minY || y >= btn.maxY){
						continue;
					}else{
						return btn;
					}
				}
				return null;
			}
		};

		element.bind('touchstart', function(ev){
			coords.x = ev.originalEvent.touches[0].pageX;
			coords.y = ev.originalEvent.touches[0].pageY;
			var startCoords = {
				x: coords.x,
				y: coords.y
			};

			elemSize.width = $(this).width();
			elemSize.height = $(this).height();
			var elem = this;

			var btns = $(".status");
			buttons = [];
			for (var i = 0; i < btns.length; i++) {
				var pos = $(btns[i]).offset();
				var btn = {
					minX: pos.left,
					minY: pos.top,
					maxX : pos.left + btns[i].clientWidth,
					maxY: pos.top + btns[i].clientHeight,
					value: btns[i].value
				};
				buttons.push(btn);
			};

			$timeout(function(){
				if(coords.x && coords.y){
					var xDelta = Math.abs(coords.x - startCoords.x);
					var yDelta = Math.abs(coords.y - startCoords.y);
					if(xDelta <= threshold && yDelta <= threshold){
						longPressed = true;
						draggedElem = $(elem).clone();
						draggedElem.addClass('dragged');
						$(".app").append(draggedElem);

						$(elem).css('visibility', 'hidden');
						var pos = draggedElem.offset();
						elemLoc.x = pos.left;
						elemLoc.y = pos.top;

						var x = coords.x - elemLoc.x - (elemSize.width / 2);
						var y = coords.y - elemLoc.y - (elemSize.height / 2);
						draggedElem.css('webkitTransform', 'translate3d('+x+'px,'+y+'px,0)');

						taskId = element[0].id;
					}
				}
				
			}, longPressDelay);
		});

		element.bind('touchmove', function(e){
			coords.x = e.originalEvent.touches[0].pageX;
			coords.y = e.originalEvent.touches[0].pageY;
			if(longPressed){
				e.preventDefault();
				e.stopPropagation();
				var x = coords.x - elemLoc.x - (elemSize.width / 2);
				var y = coords.y - elemLoc.y - (elemSize.height / 2);
				draggedElem.css('webkitTransform', 'translate3d('+x+'px,'+y+'px,0)');
				var btn;
				if((btn = findCollision(coords.x, coords.y))){
					draggedElem.addClass('colliding');
					collidingButton = btn;
					highlightButton(btn);
				}else{
					draggedElem.removeClass('colliding');
					collidingButton = null;
					$('.status').removeClass('drag-hover');
				}
			}
		});

		element.bind('touchend', function(ev){
			coords = {};
			if(longPressed){
				ev.preventDefault();
				ev.stopPropagation();
				longPressed = false;
				draggedElem.remove();
				$('.status').removeClass('drag-hover');
				if(collidingButton){
					scope.$apply('changeStatus(\'' + taskId + '\',\'' + collidingButton.value + '\')');
				}else{
					$(element[0]).css('visibility', 'visible');
				}
			}
		});

		var highlightButton = function(btn){
			$('.status').removeClass('drag-hover');
			if(btn.value == 'Ready'){
				$('#ready').addClass('drag-hover');
			}else if(btn.value == 'In Progress'){
				$('#inProgress').addClass('drag-hover');
			}else if(btn.value == 'Done'){
				$('#done').addClass('drag-hover');
			}
		};
	};
}]);