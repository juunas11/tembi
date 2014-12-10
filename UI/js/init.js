window.onload = function(){
	//add eventListener for tizenhwkey
	window.addEventListener('tizenhwkey', function(e) {
	    if(e.keyName == "back"){
	    	if($('.ui-page-active').attr('id') === 'login'){
	    		tizen.application.getCurrentApplication().exit();
	    	}else{
	    		history.back();
	    	}
	    }
	});	
};