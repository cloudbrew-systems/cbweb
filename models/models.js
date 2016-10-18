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

mongoose.model('User', userSchema);
mongoose.model('Subscribe',subscribeSchema);
mongoose.model('Invite',inviteSchema);
mongoose.model('File',fileSchema);
mongoose.model('Validate',validateSchema);