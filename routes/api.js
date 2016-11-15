var mongoose = require('mongoose');   
var User = mongoose.model('User');
var File = mongoose.model('File');
var Invite = mongoose.model('Invite');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var googlecode = '';
// var dbox  = require("dbox");
var http = require('http');
var sqlite3 = require('sqlite3').verbose();
//var db = new sqlite3.Database('/home/cb/cbHash.db');
// var https = require('https');
// var Curl = require( 'node-libcurl' ).Curl;
var request = require('request');

http.post = require('http-post');
var execSync = require('child_process').execSync;
var async = require('async');
var multiparty = require('multiparty');
var cbUpload = require('../../cblib/node/cbUpload.node');
var cbDownload = require('../../cblib/node/cbDownload.node');

var validator = require('validator');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');

function IsAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        next();
    }else{
        res.redirect('/');
    }
}

function extend(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

router.get('/', IsAuthenticated,  function(req, res, next) {
	res.redirect('/api/console');
});

router.get('/console', IsAuthenticated, function(req, res, next){
	File.find({$and: [{user_id: req.user._id},{is_deleted: "0"}]}).select({ "filetype": 1, "filename": 1, "_id": 1, size: 1}).exec(function(err,filelist){
		if(typeof(req.user.linked_account.googledrive[0]) != 'object') {
			if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
				res.render('console', {filelist: filelist});
			} else {
				res.render('console', {filelist: filelist, dmenu : '/account/dropbox'});
			}
		} else {
			if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
				res.render('console', {filelist: filelist, gmenu : '/account/google'});
			} else {
				res.render('console', {filelist: filelist, gmenu : '/account/google', dmenu : '/account/dropbox'});
			}
		}
	});
});

router.get('/accounts', IsAuthenticated, function(req, res, next){
	if(typeof(req.user.linked_account.googledrive[0]) != 'object') {
		if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
			res.render('accounts', {gurl : '/api/drive', durl : '/api/dropbox'});
		} else {
			res.render('accounts', {gurl : '/api/drive', dmenu : '/account/dropbox'});
		}
	} else {
		if(typeof(req.user.linked_account.dropbox[0]) != 'object') {
			res.render('accounts', {durl : '/api/dropbox', gmenu : '/account/google'});
		} else {
			res.render('accounts',{gmenu : '/account/google', dmenu : '/account/dropbox'});
		}
	}
});

router.get('/drive', IsAuthenticated, function(req, res, next){
	var SCOPES = ['https://www.googleapis.com/auth/drive'];

	// Load client secrets from a local file.
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
	  	if(typeof(req.user.linked_account.googledrive[0]) !== 'object') {
			if (typeof(req.query.code) != 'undefined') {
				oauth2Client.getToken(req.query.code, function(err, token) {
			      	if (err) {
			        	console.log('Error while trying to retrieve access token', err);
			        	return;
			      	}
			      	req.user.linked_account.googledrive = new Array();
			      	req.user.linked_account.googledrive.push(token);
					User.findOne({_id: req.user._id},function(err,doc){
						if(err) console.log(err);
						doc.linked_account.googledrive = new Array();
						doc.linked_account.googledrive.push(token);
						doc.save();
						res.redirect('/api/accounts');
					});
			    });
			} else{
				getNewToken(oauth2Client);
			}
		} else {
			res.redirect('/api/accounts');
		}
	}

	function getNewToken(oauth2Client) {
	  	var authUrl = oauth2Client.generateAuthUrl({
	    	access_type: 'offline',
	    	scope: SCOPES
	  	});
	  	res.redirect(authUrl);
	}
});

router.get('/dropbox', IsAuthenticated, function(req, res, next){
	fs.readFile('cloudbrew_dropbox.json', function processClientSecrets(err, content) {
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
		if(typeof(req.user.linked_account.dropbox[0]) !== 'object') {
			if(typeof(req.query.code) != 'undefined') {
				http.post("https://api.dropboxapi.com/1/oauth2/token", {"code" : req.query.code, "grant_type" : "authorization_code", "client_id" : clientId, "client_secret" : clientSecret, "redirect_uri" : redirectUrl}, function(response){
					response.setEncoding('utf8');
					response.on('data', function(chunk) {
						req.user.linked_account.dropbox = new Array();
						req.user.linked_account.dropbox.push(JSON.parse(chunk));
						User.findOne({_id: req.user._id},function(err,doc){
							if(err) console.log(err);
							doc.linked_account.dropbox = new Array();
							doc.linked_account.dropbox.push(JSON.parse(chunk));
							doc.save();
			      			res.redirect('/api/accounts');
						});
					});
				});
			} else {
				res.redirect('https://www.dropbox.com/1/oauth2/authorize?client_id='+clientId+'&response_type=code&redirect_uri='+redirectUrl+'&state=testing');
			}
		} else {
			res.redirect('/api/accounts');
		}
	}
});

router.post('/upload', IsAuthenticated, function(req, res, next){
	var form = new multiparty.Form(); 
    form.parse(req, function(err, fields, files) {
		//Request file information
      	//{ fieldName: 'uploaded_file',  originalFilename: 'kapil.jpg',  path: '/tmp/x8y45YxeWhtihLJ97wd46_1P.jpg',  headers:    { 'content-disposition': 'form-data; name="uploaded_file"; filename="kapil.jpg"',     'content-type': 'image/jpeg' },  size: 13636 }
      	var timestamp = Date.now();
      	var folder = req.user._id;
      	// if(files.uploaded_file[0].size > 0 && files.uploaded_file[0].size < 2097152) {
      	if(files.uploaded_file[0].size > 0 && files.uploaded_file[0].size < 115343360) {
	      	fs.exists('/tmp/upload/'+timestamp+'_'+files.uploaded_file[0].originalFilename, function(exists) { 
	    		if (exists) {
	    			fs.unlink(files.uploaded_file[0].path,function() {
						// file deleted
					});
	    			res.json({success: 0, msg: 'Duplicate file'})
	    		} else {
	    			acc_obj = {};
					function movefile(account_object,functioncallback) {
	    				var totalspace = 0;
	    				if(account_object.length > 0 ) {
		    				async.forEachOf(account_object,function(item,key,callback){
		    					totalspace = parseInt(totalspace) + parseInt(item.TS) - parseInt(item.US);
		    					callback()
		    				}, function(err) {
		    					if (err) {
		    						console.log('Error has occured: ' + err);
		    						return;
		    					} else {
		    						if (totalspace > files.uploaded_file[0].size) {
		    							fs.rename(files.uploaded_file[0].path, '/tmp/upload/'+timestamp+'_'+files.uploaded_file[0].originalFilename, function(err) {
						    				if (err) {
						    					console.log(err);
						    					return;
						    				}
						    				var file = new File();
						    				file.user_id = req.user._id
						    				file.filename = files.uploaded_file[0].originalFilename;
						    				file.system_prefix = timestamp;
						    				file.size = files.uploaded_file[0].size;
						    				file.system_filename = timestamp+'_'+files.uploaded_file[0].originalFilename;
						    				var filestring = files.uploaded_file[0].originalFilename.split('.')
						    				file.filetype = filestring[filestring.length - 1];
						    				file.save(function(err) {
												if (err){
													console.log('Error in Saving user: '+err);  
													throw err;  
												}
												acc_obj = account_object;
						    					functioncallback();
											})
						    			});
		    						} else {
		    							fs.unlink(files.uploaded_file[0].path,function() {
											// file deleted
										});
		    							res.json({success: 0, msg: 'Insufficient space'});
		    						}
		    					}
		    				});
		    			} else {
		    				fs.unlink(files.uploaded_file[0].path,function() {
								// file deleted
							});
		    				res.json({success: 0, msg: 'Add accounts to upload file'});
		    			}
	    			}

	    			async.series([
	    				function(callback) {
	    					fetchAccountData(req,movefile,callback);
	    				}, function(callback) {
	    					var uploadInfo = {
								TYPE: "PSV",
								UID : folder,
								FN : timestamp+"_"+files.uploaded_file[0].originalFilename,
								FAL : "/tmp/upload/"+timestamp+"_"+files.uploaded_file[0].originalFilename,
								ACS : acc_obj
							};
							cbUpload.start_upload(JSON.stringify(uploadInfo), function(uploadJSON) {
								uploadJSON = JSON.parse(uploadJSON);
								var folders;
					      		function folderinfo(folder_array,functioncallback) {
				    				folders = folder_array;
				    				functioncallback();
				    			}
					      		async.series([
					      			function(innercallback) {
					      				createfolder(req,folderinfo,innercallback);
					      			}, function(innercallback) {
					      				uploadfiles(req,uploadJSON.FSES,uploadJSON.UID,uploadJSON.FN,folders,innercallback);
					      			}
					      		], function(err) {
				      				if(err){
				      					console.log(err)
				      				}
				      				fs.unlink(String('/tmp/upload/'+uploadJSON.FN), function(err){
										if (err) {
											console.log('Error occured while removing file '+err);
										}
									});
				      				File.findOne({user_id: req.user._id, system_filename: uploadJSON.FN}).select({ "filetype": 1, "filename": 1, "_id": 1, size: 1}).exec(function(err,fileobject){
				      					res.json({success: 1, filename: fileobject.filename, filetype: fileobject.filetype, _id: fileobject._id, filesize: fileobject.size});
				      				});
					      		});
							});
	    				}
	    			]);
	    		}
	    	});
	    } else {
	    	fs.unlink(files.uploaded_file[0].path,function() {
				// file deleted
			});
			res.json({success: 0, msg: 'Max upload file size is 8MB'});
	    }
    });
});

router.post('/filedownlaod',function(req, res, next){
	var fileid = req.param('token');
	File.findOne({_id: fileid, user_id: req.user._id}).select({filearray: 1, system_filename: 1, system_prefix: 1, filename: 1}).exec(function(err,fileobject){
		if(err) {
			console.log('Error while downloading file: '+err);
		}
		async.series([
			function(parentcallback) {
				filearray = fileobject.filearray.toObject();
				async.forEachOf(filearray, function(item,key,callback){
					if(item.length > 0) {
						switch(key) {
							case 'dropbox':
								dropboxfiledownload(req,item,callback)
							break;
							case 'googledrive':
								googledrivefiledownload(req,item,callback);
							break;
							default:
								console.log('Error occured while transversing through filearray');
							break;
						}
					} else {
						callback();
					} 
				}, function(err){
					if (err) {
						console.log(err);
						return;
					}
					parentcallback();
				});
			}, function(parentcallback) {
				// var code = execSync('\'/tmp/cbDownload\' \''+fileobject.system_filename+'\' \''+req.user._id+'\'');
				var downloadInfo = {
				        TYPE: "PSV",
				        UID : req.user._id,
				        FN : fileobject.system_filename
				};
				/* Initialize the cbDownload node by calling "start_download" that triggers the method DownloadDataAsync() in cbDownload_wrapper.cpp*/
				cbDownload.start_download(JSON.stringify(downloadInfo), function(downloadJSON) {
			    	// console.log("downloadJSON is " + JSON.stringify(downloadJSON));
			    	downloadJSON = JSON.parse(downloadJSON);
			    	var dir = '/tmp/'+req.user._id;
			    	if (fs.existsSync(downloadJSON['FJDS'].FAL)){
						fs.rename(downloadJSON['FJDS'].FAL,dir+'/'+fileobject.filename,function(err) {
							if (err) {
								console.log(err);
								return;
							}
							parentcallback();		
						});
					}
				});
			}
		], function(err) {
			if(err) {
				console.log(err);
			}
			res.json({success: 1, token: fileobject.system_prefix, file: fileobject.filename});
		});
	});
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
			// res.redirect('/api/console');
		}
	} catch(err) {
		console.log(err.message);
		return;
	}
});


//Function to delete file from the system
router.post('/filedelete',function(req, res, next){
	var fileid = req.param('token');
	File.findOne({_id: fileid, user_id: req.user._id}).select({filearray: 1, system_filename: 1, system_prefix: 1, filename: 1}).exec(function(err,fileobject){
		if(err) {
			console.log('Error while downloading file: '+err);
		}
		async.series([
			function(parentcallback) {
				filearray = fileobject.filearray.toObject();
				async.forEachOf(filearray, function(item,key,callback){
					if(item.length > 0) {
						switch(key) {
							case 'dropbox':
								dropboxfiledelete(req,item,callback)
							break;
							case 'googledrive':
								googledrivefiledelete(req,item,callback);
							break;
							default:
								console.log('Error occured while transversing through filearray');
							break;
						}
					} else {
						callback();
					} 
				}, function(err){
					if (err) {
						console.log(err);
					}
					parentcallback();
				});
			}, function(parentcallback) {
				fileobject.is_deleted = "1";
				fileobject.save(function(err) {
					if (err) {
						console.log(err);
						return;
					}
					parentcallback();
				})
			}, function(parentcallback) {
				// update_query = 'UPDATE cbHash SET isDeleted = "1" WHERE originalFileName = ? and userID = ?';
				// db.run(update_query,[fileobject.system_filename, String(req.user._id)],function(err, result) {
				// 	if(err) {
				// 		console.log(err);
				// 		return;
				// 	}
					parentcallback();
				// });
			}
		], function(err) {
			if(err) {
				console.log(err);
				return;
			}
			res.json({success: 1, token: req.param('token')});
		});
	});
});

//Function to fetch combined account information
function fetchAccountData(req, filecallback, functioncallback){
	try {
		linked_account = req.user.linked_account.toObject();
		var account_array = new Array();
		async.forEachOf(linked_account, function(item,key,callback){
			function pushobject(object) {
				account_array.push(object);
				callback();
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
				filecallback(account_array,functioncallback);
				return;
			}
		});
	} catch(err) {
		console.log('Error occured at check foreach: ' + err.message);
	}
}

//Function to create cloudbrew folder in linked accounts
function createfolder(req,filecallback,functioncallback){
	try {
		linked_account = req.user.linked_account.toObject();
		var folder_array = {};
		async.forEachOf(linked_account, function(item,key,callback){
			function pushobject(object) {
				folder_array = extend({}, folder_array, object);
				callback();
			}
			if (item.length > 0) {
		  		switch(key) {
		  			case 'googledrive':
		  				drivefolder(item[0],pushobject);
		  			break;
		  			case 'dropbox':
		  				dropboxfolder(item[0],pushobject);
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
				filecallback(folder_array,functioncallback);
				return;
			}
		});
	} catch(err) {
		console.log('Error occured at check foreach: ' + err.message);
	}
}

//Function to upload file 
function uploadfiles(req,filedata,user_id,originalfilename,foldersdata,functioncallback){
	async.forEachOf(filedata, function(item,key,callback){
		function uploadcomplete(response) {
			switch(response.type) {
				case 'dropbox':
					File.findOne({user_id: user_id, system_filename: originalfilename},function(err,fileobject){
						if(err){
							console.log('Error occured while fiding file '+err);
							return;
						}
						fs.unlink(String(response.filepath+response.filename), function(err){
							if (err) {
								console.log('Error occured while removing file '+err);
							}
							/*filedata.splice(key,1);
							console.log(filedata);*/
						});
						fileobject.filearray.dropbox.push(response);
						fileobject.save(function(err){
							if(err){
								console.log('Error occured while saving dropbox file info '+err);
							}
							callback();
						})
					});
				break;
				case 'googledrive':
					File.findOne({user_id: user_id, system_filename: originalfilename},function(err,fileobject){
						if(err){
							console.log('Error occured while fiding file '+err);
							return;
						}
						fs.unlink(String(response.filepath+response.filename), function(err){
							if (err) {
								console.log('Error occured while removing file '+err);
							}
							/*filedata.splice(key,1);
							console.log(filedata);*/
						});
						fileobject.filearray.googledrive.push(response);
						fileobject.save(function(err){
							if(err){
								console.log('Error occured while saving drive file info '+err);
							}
							callback();
						})
					});
				break; 
				default:
					console.log('Error occured with upload response');
					callback();
				break;
			}
		}
		switch(item.AN) {
			case 'Dropbox':
				uploaddropboxfile(req.user.linked_account.dropbox[0],foldersdata.dropbox,item.ESN,'/tmp/'+user_id+'/',uploadcomplete);
			break;
			case 'GoogleDrive':
				uploaddrivefile(req.user.linked_account.googledrive[0],foldersdata.googledrive,item.ESN,'/tmp/'+user_id+'/',uploadcomplete);
			break;
			default:
		}
	},function(err) {
		if (err) {
			console.log('some error occured: ' + err);
			return;
		} else {
			functioncallback();
			return;
		}
	});
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

//Function to get id of google drive folder
function drivefolder(auth_token,callback) {
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
		drive.files.list({
			orderBy: 'folder',
			pageSize: 1,
			q: 'name="CloudBrew"'
		}, function(err, response){
			if (err) {
				console.log('Error has occured: ' + err);
			} else {
				if (response.files.length > 0) {
					callback({googledrive: response.files[0].id});
				} else {
					var fileMetadata = {
				  		'name' : 'CloudBrew',
				  		'mimeType' : 'application/vnd.google-apps.folder'
					};
					drive.files.create({
					   resource: fileMetadata,
					   fields: 'id'
					}, function(err, file) {
					  	if(err) {
					    	// Handle error
					    	console.log(err);
					  	} else {
					    	callback({googledrive: file.id});
					  	}
					});
				}
			}
		});
	}
}

//Function to get path of dropbox folder
function dropboxfolder(auth_token,callback) {
	try {
		check_str = 'curl -X POST https://api.dropboxapi.com/2/files/get_metadata \
		--header "Authorization: Bearer '+auth_token.access_token+'" \
		--header "Content-Type: application/json" \
		--data \'{"path": "/CloudBrew","include_media_info": false}\'';
		var code = execSync(check_str,{encoding:'utf8'});
		var response = JSON.parse(code);
		if(response.hasOwnProperty('error')) {
			create_str = 'curl -X POST https://api.dropboxapi.com/2/files/create_folder \
    		--header "Authorization: Bearer '+auth_token.access_token+'" \
    		--header "Content-Type: application/json" \
    		--data \'{"path": "/CloudBrew"}\'';
    		var create_code = execSync(create_str,{encoding:'utf8'});
			var create_response = JSON.parse(create_code);
			// console.log('Create response: ', create_response);
			//Create response:  { name: 'CloudBrew', path_lower: '/cloudbrew', id: 'id:7EHL8cH2gbAAAAAAAAAABQ' }
			callback({dropbox: create_response.path_lower});
		} else {
			// console.log('Response: ', response);
			//Response:  { '.tag': 'folder', name: 'CloudBrew', path_lower: '/cloudbrew',  id: 'id:7EHL8cH2gbAAAAAAAAAABQ' }
			callback({dropbox: response.path_lower});
		}
	} catch(err) {
		console.log(err.message);
	}
}

//Function to upload dropboxfile
function uploaddropboxfile(auth_token,parentpath,filename,filepath,functioncallback){
	try {	
		upload_str = 'curl -X POST https://content.dropboxapi.com/2/files/upload \
	    --header "Authorization: Bearer '+auth_token.access_token+'" \
	    --header \'Dropbox-API-Arg: {"path": "'+parentpath+'/'+filename+'.txt","mode": "add","autorename": true,"mute": false}\' \
	    --header "Content-Type: application/octet-stream" \
	    --data-binary @\''+filepath+filename+'\'';
	    var code = execSync(upload_str,{encoding:'utf8'});
		var response = JSON.parse(code);
		functioncallback({type: 'dropbox', data: response, filename: filename, filepath: filepath})
		//{ name: 'test.png',  path_lower: '/cloudbrew/test.png',  id: 'id:7EHL8cH2gbAAAAAAAAAACQ',  client_modified: '2016-02-19T21:50:04Z',  server_modified: '2016-02-19T21:50:04Z',  rev: 'c43f5feae',  size: 13636 }
	} catch(err) {
		console.log(err.message);
	}
}


//Function to upload drivefile
function uploaddrivefile(auth_token,parentpath,filename,filepath,functioncallback) {
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
		try {
			var fileMetadata = {
			  'name': filename,
			  parents: [ parentpath ]
			};
			var media = {
			  body: fs.createReadStream(String(filepath+filename))
			};
			drive.files.create({
			   resource: fileMetadata,
			   media: media,
			   fields: 'id, mimeType, parents'
			}, function(err, file) {
			  if(err) {
			    // Handle error
			    console.log(err);
			  } else {
			    // console.log('File Id:' , file.id);
			    functioncallback({type: 'googledrive', data: file, filename: filename, filepath: filepath});
			  }
			});
		} catch(err) {
			console.log(err.message);
		}
	}
}

//Function to download file from google drive
function googledrivefiledownload(req,filearray,functioncallback) {
	// functioncallback();
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
		    async.forEachOf(filearray, function(item,key,callback){
		    	try {
					drive.files.get({
						auth: oauth2Client,
					    fields: 'downloadUrl',
					    fileId: item.data.id,
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
					  		console.log('No download url was returned by the Google Drive API');
					  		return;
						}

						requestSettings.url = url;
					    request(requestSettings, function (err, response, body) {
							if (err) {
					        	console.log(err);
					      		return;
					      	}
					      	// body is a buffer with the file's contents
					      	// console.log(body);
					      	fs.writeFile(dir+'/'+item.filename, body, function (err) {
								// Handle err somehow
						      	// Do other work necessary to finish the request
						      	if(err) {
						      		console.log(err);
						      	}
						      	callback();
						    });
					    });
					});
				} catch(err) {
					console.log('Error while downloading google drive file: '+ err.message);
				}
		    }, function(err){
		    	if (err) {
		    		console.log('Error while downloading google drive file');
		    		return;
		    	}
		    	functioncallback();
		    });
		} else {
			async.forEachOf(filearray, function(item,key,callback){
		    	try {
					drive.files.get({
						auth: oauth2Client,
					    fields: 'downloadUrl',
					    fileId: item.data.id,
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
					  		console.log('No download url was returned by the Google Drive API');
					  		return;
						}

						requestSettings.url = url;
					    request(requestSettings, function (err, response, body) {
							if (err) {
					        	console.log(err);
					      		return;
					      	}
					      	// body is a buffer with the file's contents
					      	// console.log(body);
					      	fs.writeFile(dir+'/'+item.filename, body, function (err) {
								// Handle err somehow
						      	// Do other work necessary to finish the request
						      	if(err) {
						      		console.log(err);
						      	}
						      	callback();
						    });
					    });
					});
				} catch(err) {
					console.log('Error while downloading google drive file: '+ err.message);
				}
		    }, function(err){
		    	if (err) {
		    		console.log('Error while downloading google drive file');
		    		return;
		    	}
		    	functioncallback();
		    });
		}
	}
}

//Function to download file from dropbox
function dropboxfiledownload(req,filearray,functioncallback) {
	// functioncallback();
	dir = '/tmp/'+req.user._id;
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
		async.forEachOf(filearray, function(item,key,callback){
			try{
				// var dest = fs.createWriteStream(dir+'/'+item.filename);
				download_str = 'curl -X POST https://content.dropboxapi.com/2/files/download \
		  		--header "Authorization: Bearer '+req.user.linked_account.dropbox[0].access_token+'" \
		  		--header \'Dropbox-API-Arg: {"path":"'+item.data.path_lower+'"}\'';
		  		var code = execSync(download_str,{timeout: 15000});
		  		fs.writeFile(dir+'/'+item.filename, code, function (err) {
					// Handle err somehow
			      	// Do other work necessary to finish the request
			      	if(err) {
			      		console.log(err);
			      	}
			      	callback();
			    });
		    } catch(err) {
				console.log('Error occured: ' + err.message);
			}
		}, function(err){
	    	if (err) {
	    		console.log('Error while downloading google drive file');
	    		return;
	    	}
	    	functioncallback();
	    });
	} else {
		async.forEachOf(filearray, function(item,key,callback){
			try{
				// var dest = fs.createWriteStream(dir+'/'+item.filename);
				download_str = 'curl -X POST https://content.dropboxapi.com/2/files/download \
		  		--header "Authorization: Bearer '+req.user.linked_account.dropbox[0].access_token+'" \
		  		--header \'Dropbox-API-Arg: {"path":"'+item.data.path_lower+'"}\'';
		  		var code = execSync(download_str,{timeout: 15000});
		    	fs.writeFile(dir+'/'+item.filename, code, function (err) {
					// Handle err somehow
			      	// Do other work necessary to finish the request
			      	if(err) {
			      		console.log(err);
			      	}
			      	callback();
			    });
		    } catch(err) {
				console.log('Error occured: ' + err.message);
			}
		}, function(err){
	    	if (err) {
	    		console.log('Error while downloading google drive file');
	    		return;
	    	}
	    	functioncallback();
	    });
	}
}

//Function to delete file from google drive
function googledrivefiledelete(req,filearray,functioncallback) {
	// functioncallback();
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
	    async.forEachOf(filearray, function(item,key,callback){
	    	try {
				drive.files.delete({
					fileId: item.data.id
				}, function (err) {
					if (err) {
						console.log('Error while deleting drive file: '+err);
						return;
					}
					callback();
				});
			} catch(err) {
				console.log('Error while deleting drive file: '+ err.message);
			}
	    }, function(err){
	    	if (err) {
	    		console.log('Error while downloading google drive file');
	    		return;
	    	}
	    	functioncallback();
	    });
	}
}

//Function to delete file from dropbox
function dropboxfiledelete(req,filearray,functioncallback) {
	// functioncallback();
	async.forEachOf(filearray, function(item,key,callback){
		try{
			// var dest = fs.createWriteStream(dir+'/'+item.filename);
			delete_str = 'curl -X POST https://api.dropboxapi.com/2/files/delete \
			--header "Authorization: Bearer '+req.user.linked_account.dropbox[0].access_token+'" \
			--header "Content-Type: application/json" \
			--data \'{"path": "'+item.data.path_lower+'"}\''
	  		var code = execSync(delete_str,{encoding: 'utf8'});
	  		callback();
	    } catch(err) {
			console.log('Error occured: ' + err.message);
		}
	}, function(err){
    	if (err) {
    		console.log('Error while downloading dropbox file');
    		return;
    	}
    	functioncallback();
    });
}

router.post('/invite',function(req,res,next){
	try{
		var emails = req.body.invite_emails.split(',');
		var options = {
			auth: {
				api_user: 'cloudbrew',
				api_key: 'enternow@5678'
			}
		};
		var client = nodemailer.createTransport(sgTransport(options));
		async.forEachOf(emails, function(item,key,callback){
			if (validator.isEmail(item.trim())) {
				Invite.findOne({'email': item.trim()},function(err,invited){
					if (err) {
						console.log("Some error occured while loading list");
						callback();
					}
					if (invited) {
						callback();
					} else {
						var invite = new Invite();
						invite.email = item.trim();
						invite.invited_by = req.user._id;
						invite.save(function(err){
							if (err) {
								console.log('Error occured while saving data');
								callback();
							} else {
								var email = {
									from: 'CloudBrew info@cloudbrewlabs.com',
									to: item.trim(),
									subject: 'Invite',
									html: 'Dear User,<br/><br/>You have been invited to be part of CloudBrew community by '+req.user.email+' . Please click on the following link to visit website <a href="https://www.cloudbrew.io">CloudBrew Website</a>.<br/><br/>Cheers,<br/>CloudBrew Team'
								};
								client.sendMail(email, function(err, info){
									if (err ){
										console.log(err);
										callback();
									} else {
										console.log('Message sent: ' + info.response);
										callback();
									}
								});
							}
						});
					}
				});
			} else {
				console.log("Invalid Email Id");
				callback();
			}
		}, function(err){
			if (err) {
				console.log('Error while inviting user');
				return;
			}
			res.json({success: 1});
		});
	} catch(err) {
		console.log(err.message);
	}
});

module.exports = router;
