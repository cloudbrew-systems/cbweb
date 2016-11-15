var mongoose = require('mongoose');

/*
User schema to save user information
*/
var userSchema = new mongoose.Schema({
	username: String,
	password: String,
	email: String,
	name: String,
	account_type: {type: String, required: true, default: 'beta'},
	linked_account: {
		googledrive: Array,
		dropbox: Array
	},
	created_at: {type: Date, default: Date.now}
});

/*
Subscribe schema to save subscriber information
*/
var subscribeSchema = new mongoose.Schema({
	email: String,
	created_at: {type: Date, default: Date.now}
});

/*
Invite schema to save user invite information
*/
var inviteSchema = new mongoose.Schema({
	email: String,
	invited_by: String,
	registered: {type: String, required: true, default: '0'},
	created_at: {type: Date, default: Date.now}
});


/*
File schema to save file details
*/
var fileSchema = new mongoose.Schema({
	user_id: String,
	group_id: String,
	filename: String,
	system_prefix: String,
	system_filename: String,
	filetype: String,
	size: String,
	filearray: {
		googledrive: Array,
		dropbox: Array
	},
	created_at: {type: Date, default: Date.now},
	modified_at: {type:Date, default: Date.now},
	is_deleted: {type: String, default: '0'}
});


var validateSchema = new mongoose.Schema({
	user_id: String,
	validation: String,
	valid: String,
	created_at: {type: Date, default: Date.now}
});

/*
Group Schema to store group related information
*/
var groupSchema = new mongoose.Schema({
	group_name: {type: String, default: 'Untitled', required: true},
	total_space: {type: String, default: 0, required: true},
	used_space: {type: String, default: 0, required: true},
	users: {type: Array, default: []},
	admins: {type: Array, default: []},
	files: {type: Array, default: []},
	created_by: {
		user_id: {type: String, default: '', required: true},
		username: {type: String, default: '', required: true}
	},
	created_at: {type: Date, default: Date.now},
	modified_at: {type:Date, default: Date.now},
	is_deleted: {type: String, default: '0'}
});

var usergroupSchema = new mongoose.Schema({
	user_id: {type: String, required: true},
	groups: Array /*{group_id, group_name}*/
})

mongoose.model('User', userSchema);
mongoose.model('Subscribe',subscribeSchema);
mongoose.model('Invite',inviteSchema);
mongoose.model('File',fileSchema);
mongoose.model('Validate',validateSchema);
mongoose.model('Group',groupSchema);
mongoose.model('Usergroup',usergroupSchema);