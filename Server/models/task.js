var mongoose = require('mongoose');

var taskSchema = mongoose.Schema({
	text: String,
	state: String,
	assignedUsers : [{type: mongoose.Schema.ObjectId, ref: 'users'}]
});

taskSchema.methods.merge = function(other){
	if(other.text) this.text = other.text;
	if(other.state) this.state = other.state;
	if(other.assignedUsers) this.assignedUsers = other.assignedUsers;
};

module.exports = mongoose.model('tasks', taskSchema);