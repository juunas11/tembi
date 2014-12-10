var mongoose = require('mongoose');

var boardSchema = mongoose.Schema({
	members : [{type: mongoose.Schema.ObjectId, ref: 'users'}],
	tasks : [{type: mongoose.Schema.ObjectId, ref: 'tasks'}],
    activities: [{type: mongoose.Schema.ObjectId, ref: 'activities'}]
});

module.exports = mongoose.model('workspaces', boardSchema);