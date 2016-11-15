var mongoose = require('mongoose');
var User = mongoose.model('User');
var Group = mongoose.model('Group');
var File = mongoose.model('File');
var Usergroup = mongoose.model('Usergroup');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var googlecode = '';
var execSync = require('child_process').execSync;
var async = require('async');

function IsAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        next();
    }else{
        res.redirect('/');
    }
}
router.get('/',IsAuthenticated, function(req, res, next) {
	Usergroup.findOne({user_id: req.user._id},function(err,group_list){
		if (err) {
			console.log(err.message);
		}
		group = [];
		if (group_list) {
			group = group_list.groups.toObject();
		}
		if(typeof(req.user.linked_account.googledrive[0]) != 'object') {
			if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
				res.render('grouplist',{groups: group});
			} else {
				res.render('grouplist',{groups: group, dmenu : '/account/dropbox'});
			}
		} else {
			if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
				res.render('grouplist',{groups: group, gmenu : '/account/google'});
			} else {
				res.render('grouplist',{groups: group, gmenu : '/account/google', dmenu : '/account/dropbox'});
			}
		}
	})
});

router.get('/:id?',IsAuthenticated, function(req, res, next) {
	Group.findOne({_id:req.params.id, users: { $elemMatch: {user_id: req.user._id}}}).exec(function(err, group){
		if (err) {
			console.log(err.message);
			res.redirect('/group');
		}
		if (group) {
			File.find({group_id: group._id}).exec(function(err1,files){
				if (err1) {
					console.log(err1.message);
				}
				var filelist = [];
				if (files) {
					filelist = files;
				}
				if(typeof(req.user.linked_account.googledrive[0]) != 'object') {
					if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
						res.render('groupfile', {filelist: filelist});
					} else {
						res.render('groupfile', {filelist: filelist, dmenu : '/account/dropbox'});
					}
				} else {
					if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
						res.render('groupfile', {filelist: filelist, gmenu : '/account/google'});
					} else {
						res.render('groupfile', {filelist: filelist, gmenu : '/account/google', dmenu : '/account/dropbox'});
					}
				}
			});
		} else {
			res.redirect('/group');
		}
	});
	// console.log(req.params.id);
});

router.post('/create', IsAuthenticated, function(req, res, next){
	try {
		var newGroup = new Group();
		newGroup.group_name = req.body.group_name.trim();
		newGroup.created_by.user_id = req.user._id;
		newGroup.created_by.username = req.user.username;
		var admin = {};
		admin['user_id'] = req.user._id;
		admin['username'] = req.user.username;
		newGroup.admins.push(admin);
		var users = new Array();
		if (typeof(req.body.user_name) === 'object') {
			users = req.body.user_name;
		} else {
			users.push(req.body.user_name);
		}
		users.push(req.user._id);
		var user_array = new Array();
		var group_id = '';
		totalspace = 0;
		async.series([
			function(forward){
				async.forEachOf(users, function(item, key, callback){
					var user_id = item;
					User.findOne({_id: user_id}).exec(function(err, user){
						if (err) {
							console.log(err);
							callback();
						} else {
							if (user) {
								user_array.push(user._id);
								fetchUsableAccount(user,callback,function(json,returncallback){
									if (JSON.stringify(json) === JSON.stringify({})) {
										returncallback();
									} else {
										var groupusers = {};
										groupusers.user_id = user._id;
										groupusers.username = user.username;
										groupusers.account = json.account;
										if (json.freespace >= 1073741824) {
											totalspace = totalspace + 1073741824;
										} else {
											totalspace = totalspace + parseInt(json.freespace);
										}
										newGroup.users.push(groupusers);
										returncallback();
									}
								});
							} else {
								console.log('User not found');
								callback();
							}
						}
					});
				},function(err) {
					if (err) {
						console.log('some error occured: ' + err);
						return;
					} else {
						newGroup.total_space = totalspace;
						newGroup.used_space = 0;
						newGroup.save(function(err1, group){
							if (err1) {
								console.log('Error saving group');
								res.json({success: 0});
							} else {
								group_id = group._id;
								forward();
							}
						})
					}
				});
			},
			function(forward){
				async.forEachOf(user_array,function(item, key, callback){
					Usergroup.findOne({user_id: item}).exec(function(err, usergroup){
						if (err) {
							console.log('Error while finding user\'s group')
							callback();
						}
						if (usergroup) {
							var group = {};
							group.group_id = group_id;
							group.group_name = req.body.group_name.trim();
							usergroup.groups.push(group);
							usergroup.save(function(err1){
								if (err1) {
									console.log(err.message);
								}
								callback();
							})
						} else {
							var user_group = new Usergroup();
							console.log(user_group);
							user_group.user_id = item;
							var group = {};
							group.group_id = group_id;
							group.group_name = req.body.group_name.trim();
							user_group.groups.push(group);
							user_group.save(function(err1){
								if (err1) {
									console.log(err.message);
								}
								callback();
							});
						}
					}) 
				},function(err){
					if (err) {
						console.log(err.message);
					}
					forward();
				});
			}
		],function(err){
			if (err) {
				console.log(err.message);
				res.json({success: 0});
			}
			res.json({success: 1});
		});
	} catch(err) {
		console.log(err.message);
	}
});


function fetchUsableAccount(userinfo,functioncallback,filecallback){
	try {
		var space = 0;
		var usable_account = {};
		linked_account = userinfo.linked_account.toObject();
		async.forEachOf(linked_account, function(item,key,callback){
			function pushobject(object) {
				var freespace = 0;
				freespace = parseInt(object.TS) - parseInt(object.US);
				if (space < freespace) {
					space = freespace;
					usable_account['account'] = item[0];
					usable_account['freespace'] = freespace;
					callback();
				} else {
					callback();
				}
				
			}
			if (item.length > 0) {
		  		switch(key) {
		  			case 'googledrive':
		  				driveinfo(item[0],pushobject);
		  			break;
		  			case 'dropbox':
		  				dropboxinfo(item[0],pushobject);
		  			break;
		  			default:
		  				console.log('invalid key');
		  		}
	  		} else {
	  			callback();
	  		}
		},function(err) {
			if (err) {
				console.log('some error occured: ' + err);
				return;
			} else {
				filecallback(usable_account,functioncallback);
				return;
			}
		});
	} catch(err) {
		console.log('Error occured at check foreach: ' + err.message);
	}
}

//Function to get google drive account information
function driveinfo(auth_token,callback) {
	fs.readFile('cloudbrew_google.json', function processClientSecrets(err, content) {
	  if (err) {
	    console.log('Error loading client secret file: ' + err);
	    return;
	  }
	  authorize(JSON.parse(content));
	});

	function authorize(credentials) {
  		var clientSecret = credentials.web.client_secret;
	  	var clientId = credentials.web.client_id;
	  	var redirectUrl = credentials.web.redirect_uris[0];
	  	var auth = new googleAuth();
	  	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
		oauth2Client.credentials = auth_token;
		var drive = google.drive({version: 'v3', auth: oauth2Client});
		drive.about.get({
		    /*fields: 'importFormats,kind,maxImportSizes,maxUploadSize,storageQuota,user'*/
		    fields: 'kind,maxImportSizes,maxUploadSize,storageQuota,user'
	  	}, function(err, response) {
		    if (err) {
		      console.log('The API returned an error: ' + err);
		      return;
		    }
		    object = {"AN": "GoogleDrive", "TS": parseInt(response.storageQuota.limit),"US": parseInt(response.storageQuota.usage),"MFS": parseInt(response.maxUploadSize)};
		    callback(object);
		});
	}
}


//Function to get dropbox account information
function dropboxinfo(auth_token,callback) {
	try {
		str = 'curl -X POST https://api.dropboxapi.com/2/users/get_space_usage \
	    --header "Authorization: Bearer '+auth_token.access_token+'"';
	    var code = execSync(str,{encoding:'utf8'});
		var response = JSON.parse(code);
		object = {"AN": "Dropbox", "TS": parseInt(response.allocation.allocated),"US": parseInt(response.used),"MFS": parseInt(0)};
		callback(object);
	} catch(err) {
		console.log(err.message);
	}
}

router.post('/getusers',IsAuthenticated,function(req, res, next){
	var string = req.body.q.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	var regex = new RegExp('^'+string+'.*', "i");
	User.find({$and: [{$or:[{username: regex},{email: regex}]},{_id: {$ne: req.user._id}}]},{_id: 1, username: 1, email: 1}).exec(function(err, users){
		if (err) {
			console.log(err.message);
			return;
		} else {
			res.json({users: users});
		}
	});
});

module.exports = router;