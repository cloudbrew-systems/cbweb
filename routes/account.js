var express = require('express');
var router = express.Router();
var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var googlecode = '';
var async = require('async');
var drivefolderlist = new Array();
var drivefilelist = new Array();
var request = require('request');
var execSync = require('child_process').execSync;
function IsAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        next();
    }else{
        res.redirect('/api/console');
    }
}

router.get('/',IsAuthenticated,function(req, res, next){
	if (typeof(req.user.linked_account.googledrive[0]) === 'object') {
		res.redirect('/account/google');
	} else if (typeof(req.user.linked_account.dropbox[0]) === 'object') {
		res.redirect('/account/dropbox');
	} else {
		res.redirect('/api/console');	
	}
});

router.get('/google/:id?',IsAuthenticated,function(req,res,next){
	if (typeof(req.user.linked_account.googledrive[0]) === 'object') {
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
			oauth2Client.credentials = req.user.linked_account.googledrive[0];
			var drive = google.drive({version: 'v3', auth: oauth2Client});
			var query = (typeof(req.params.id) === 'undefined') ? '"root" in parents' : String('"' + req.params.id + '" in parents');
			drive.files.list({
				pageSize: 1000,
				orderBy: 'folder,name asc',
				q: query,
			    fields: "nextPageToken, files(id,name,mimeType,owners)"
		  	}, function(err, response) {
			    if (err) {
			      console.log('The API returned an error: ' + err);
			      return;
			    }
			    if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
		   			res.render('google', {gmenu : '/account/google', filelist: response});
				} else {
					res.render('google', {gmenu : '/account/google', dmenu : '/account/dropbox', filelist: response});
				}
			});
		}
	} else {
		res.redirect('/api/console');
	}
});

router.get('/dropbox/:path*?',IsAuthenticated,function(req,res,next){
	if (typeof(req.user.linked_account.dropbox[0]) === 'object') {
		try {
			var path = (typeof(req.params.path) === 'undefined' ) ? '' : String('/'+req.params.path+req.params[0]);
			str = 'curl -X POST https://api.dropboxapi.com/2/files/list_folder \
    		--header "Authorization: Bearer ' + req.user.linked_account.dropbox[0].access_token + '" \
    		--header "Content-Type: application/json" \
    		--data \'{"path": "'+path+'","recursive": false,"include_media_info": false,"include_deleted": false}\'';
    		var code = execSync(str,{encoding:'utf8'});
			var response = JSON.parse(code);
			if(typeof(req.user.linked_account.googledrive[0]) != 'object') {
				res.render('dropbox', {dmenu : '/account/dropbox', filelist: response})
			} else {
				res.render('dropbox', {gmenu : '/account/google', dmenu : '/account/dropbox', filelist: response});
			}
		} catch(err) {
			console.log(err.message);
		}
	} else {
		res.redirect('/api/console');
	}
});

router.post('/googledownlaod',function(req, res, next){
	if (req.isAuthenticated()) {
		var fileid = req.param('token');
		var filename = req.param('filename');
		var mimeType = req.param('mime');
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
			oauth2Client.credentials = req.user.linked_account.googledrive[0];
			var drive = google.drive('v2');
			dir = '/tmp/'+req.user._id;
			if (!fs.existsSync(dir)){
			    fs.mkdirSync(dir);
			    try {
					drive.files.get({
						auth: oauth2Client,
					    fields: 'downloadUrl',
					    fileId: fileid,
					}, function (err, file) {
						var url;
						var requestSettings = {
							method: 'GET',
					      	headers : {
					        	Authorization: 'Bearer ' + oauth2Client.credentials.access_token,
					      	},
					      	encoding: null, // Does not try to parse file contents as UTF-8
					    };

						if (err) {
					      console.log(err);
					      return;
					    }

						url = file.downloadUrl;
						if (!url) {
					  		var dest = fs.createWriteStream(dir+'/'+filename+'.pdf');
					  		var driveclient = google.drive({version: 'v3', auth: oauth2Client});
					  		driveclient.files.export({
					  			fileId: fileid,
					  			mimeType: 'application/pdf' 
					  		})
					  		.on('end', function() {
							  console.log('Done');
							  res.json({success:1, filename: filename+'.pdf'});
							})
							.on('error', function(err) {
							  console.log('Error during download', err);
							  res.json({success:0});
							})
							.pipe(dest);
						}

						requestSettings.url = url;
					    request(requestSettings, function (err, response, body) {
							if (err) {
					        	console.log(err);
					      		return;
					      	}
					      	// body is a buffer with the file's contents
					      	// console.log(body);
					      	fs.writeFile(dir+'/'+filename, body, function (err) {
								// Handle err somehow
						      	// Do other work necessary to finish the request
						      	if(err) {
						      		console.log(err);
						      	}
						      	res.json({success: 1, filename: filename});
						    });
					    });
					});
				} catch(err) {
					console.log('Error while downloading google drive file: '+ err.message);
				}
			} else {
				try {
					drive.files.get({
						auth: oauth2Client,
					    fields: 'downloadUrl',
					    fileId: fileid,
					}, function (err, file) {
						var url;
						var requestSettings = {
							method: 'GET',
					      	headers : {
					        	Authorization: 'Bearer ' + oauth2Client.credentials.access_token,
					      	},
					      	encoding: null, // Does not try to parse file contents as UTF-8
					    };

						if (err) {
					      console.log(err);
					      return;
					    }

						url = file.downloadUrl;
						if (!url) {
							var dest = fs.createWriteStream(dir+'/'+filename+'.pdf');
					  		var driveclient = google.drive({version: 'v3', auth: oauth2Client});
					  		driveclient.files.export({
					  			fileId: fileid,
					  			mimeType: 'application/pdf' 
					  		})
					  		.on('end', function() {
							  console.log('Done');
							  res.json({success:1, filename: filename+'.pdf'});
							})
							.on('error', function(err) {
							  console.log('Error during download', err);
							  res.json({success:0});
							})
							.pipe(dest);
						}

						requestSettings.url = url;
					    request(requestSettings, function (err, response, body) {
							if (err) {
					        	console.log(err);
					      		return;
					      	}
					      	// body is a buffer with the file's contents
					      	// console.log(body);
					      	fs.writeFile(dir+'/'+filename, body, function (err) {
								// Handle err somehow
						      	// Do other work necessary to finish the request
						      	if(err) {
						      		console.log(err);
						      	}
						      	res.json({success: 1, filename: filename});
						    });
					    });
					});
				} catch(err) {
					console.log('Error while downloading google drive file: '+ err.message);
				}
			}
		}
	} else {
		res.json({success: 0});
	}
});

router.post('/dropboxdownlaod',function(req, res, next){
	if (req.isAuthenticated()) {
		var fileid = req.param('token');
		var filename = req.param('filename');
		var filepath = req.param('mime');
		dir = '/tmp/'+req.user._id;
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
			try{
				// var dest = fs.createWriteStream(dir+'/'+item.filename);
				download_str = 'curl -X POST https://content.dropboxapi.com/2/files/download \
		  		--header "Authorization: Bearer '+req.user.linked_account.dropbox[0].access_token+'" \
		  		--header \'Dropbox-API-Arg: {"path":"'+filepath+'"}\'';
		  		var code = execSync(download_str,{timeout: 15000});
		  		fs.writeFile(dir+'/'+filename, code, function (err) {
					// Handle err somehow
			      	// Do other work necessary to finish the request
			      	if(err) {
			      		console.log(err);
			      		res.json({success: 0});
			      	}
			      	res.json({success: 1, filename: filename});
			    });
		    } catch(err) {
				console.log('Error occured: ' + err.message);
				res.json({success: 0});
			}
		} else {
			try{
				// var dest = fs.createWriteStream(dir+'/'+item.filename);
				download_str = 'curl -X POST https://content.dropboxapi.com/2/files/download \
		  		--header "Authorization: Bearer '+req.user.linked_account.dropbox[0].access_token+'" \
		  		--header \'Dropbox-API-Arg: {"path":"'+filepath+'"}\'';
		  		var code = execSync(download_str,{timeout: 15000});
		    	fs.writeFile(dir+'/'+filename, code, function (err) {
					// Handle err somehow
			      	// Do other work necessary to finish the request
			      	if(err) {
			      		console.log(err);
			      		res.json({success: 0});
			      	}
			      	res.json({success: 1, filename: filename});
			    });
		    } catch(err) {
				console.log('Error occured: ' + err.message);
				res.json({success: 0});
			}
		}
	} else {
		res.json({success: 0});
	}
});

router.post('/download',IsAuthenticated,function(req,res,next){
	try {
		dir = '/tmp/'+req.user._id;
		file = dir+'/'+req.param('file');
		if (fs.existsSync(file)){
			res.download(file);
			res.on('finish', function () {
			    fs.unlink(file, function() {
					// file deleted
				});
			});
		} else {
			res.redirect('/api/console');
		}
	} catch(err) {
		console.log(err.message);
		return;
	}
});

router.post('/googledelete',function(req, res, next){
	if (req.isAuthenticated()) {
		var fileid = req.param('token');
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
			oauth2Client.credentials = req.user.linked_account.googledrive[0];
			var drive = google.drive({version: 'v3', auth: oauth2Client});
		    try {
				drive.files.delete({
					fileId: fileid
				}, function (err) {
					if (err) {
						console.log('Error while deleting drive file: '+err);
						res.json({success: 0});
					}
					res.json({success: 1, token: fileid});
				});
			} catch(err) {
				console.log('Error while deleting drive file: '+ err.message);
				res.json({success: 0});
			}
		}
	} else {
		res.json({success: 0});
	}
});

router.post('/dropboxdelete',function(req, res, next){
	if (req.isAuthenticated()) {
		var fileid = req.param('token');
		var filename = req.param('filename');
		var filepath = req.param('mime');
		try{
			// var dest = fs.createWriteStream(dir+'/'+item.filename);
			delete_str = 'curl -X POST https://api.dropboxapi.com/2/files/delete \
			--header "Authorization: Bearer '+req.user.linked_account.dropbox[0].access_token+'" \
			--header "Content-Type: application/json" \
			--data \'{"path": "'+filepath+'"}\''
	  		var code = execSync(delete_str,{encoding: 'utf8'});
	  		res.json({success: 1, token: fileid});
	  	} catch(err) {
			console.log('Error occured: ' + err.message);
			res.json({success: 0});
		}
	} else {
		res.json({success: 0});
	}
});

function arrangedrivelist(list,rendercallback) {
	var filelist = {};
	var folderlist = {};
	async.series([
		function(parentcallback) {
			async.forEachOf(list, function(item,key,callback){
				if(item.mimeType === 'application/vnd.google-apps.folder') {
					if(folderlist.hasOwnProperty(item.parents[0])) {
						folderlist[item.parents].push({id: item.id, name: item.name, type: 'folder', children: item.id});
						callback();
					} else {
						folderlist[item.parents[0]] = [];
						folderlist[item.parents[0]].push({id: item.id, name: item.name, type:'folder', children: item.id});
						callback();
					}
				} else {
					if(filelist.hasOwnProperty(item.parents[0])) {
						filelist[item.parents].push({id: item.id, name: item.name, type: 'file', children: item.id, mimeType: item.mimeType});
						callback();
					} else {
						filelist[item.parents[0]] = [];
						filelist[item.parents].push({id: item.id, name: item.name, type: 'file', children: item.id, mimeType: item.mimeType});
						callback();
					}
				}
			},function(err) {
				if (err) {
					console.log(err)
				}
				parentcallback();
			});
		}, function(parentcallback) {
			drivefolderlist = [];
			drivefilelist = filelist;
			sortdrivelist(folderlist,folderlist,filelist,parentcallback);
		}
	],function(err){
		if (err) {
			console.log(err);
		}
		drivefolderlist.concat(drivefilelist);
		// console.log(drivefilelist);
		// console.log(drivefolderlist);
		drivefolderlist.push(drivefilelist);
		rendercallback(drivefolderlist);
	});
}

function sortdrivelist(list,parentlist,childlist,parentcallback) {
	async.forEachOf(list,function(item,key,callback){
		if (typeof(item.id) === 'undefined') {
			sortdrivelist(item,parentlist,childlist,callback);
		} else {
			var arr = new Array();
			if (parentlist.hasOwnProperty(item.children)) {
				arr.push(parentlist[item.children]);
			}
			if (childlist.hasOwnProperty(item.children)) {
				arr.push(childlist[item.children]);
				delete drivefilelist[item.children];
			}
			item.children = arr;
			drivefolderlist.push(JSON.stringify(item));
			callback();
		}
	},function(err){
		if (err) {
			console.log(err);
		}
		parentcallback();
	});
}

module.exports = router;