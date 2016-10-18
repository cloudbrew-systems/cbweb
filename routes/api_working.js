var mongoose = require('mongoose');   
var User = mongoose.model('User');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var googlecode = '';
function IsAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        next();
    }else{
        res.redirect('/');
    }
}

router.get('/', IsAuthenticated,  function(req, res, next) {
	
});

router.get('/console', IsAuthenticated, function(req, res, next){
	res.render('console');
});

router.get('/accounts', IsAuthenticated, function(req, res, next){
	var SCOPES = ['https://www.googleapis.com/auth/drive'];

	// Load client secrets from a local file.
	fs.readFile('client_id.json', function processClientSecrets(err, content) {
	  if (err) {
	    console.log('Error loading client secret file: ' + err);
	    return;
	  }
	  authorize(JSON.parse(content));
	});

	function authorize(credentials, callback) {
  		var clientSecret = credentials.web.client_secret;
	  	var clientId = credentials.web.client_id;
	  	var redirectUrl = credentials.web.redirect_uris[0];
	  	var auth = new googleAuth();
	  	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
		if (req.user.linked_account.googledrive.length > 0) {
			// oauth2Client.setCredentials({
		 //  		access_token: req.user.linked_account.googledrive[0]
			// });
			// console.log(oauth2Client);
			// var drive = google.drive('v2');
		 //  	drive.about.get({
			//     auth: oauth2Client
		 //  	}, function(err, response) {
			//     if (err) {
			//       console.log('The API returned an error: ' + err);
			//       return;
			//     }
			//     console.log(response);
			// });
			//
			/*for(var index in req.user.linked_account.googledrive) {
				console.log(typeof(req.user.linked_account.googledrive[index]));
				if(typeof(req.user.linked_account.googledrive[index]).toLowerCase() != 'object') {
					oauth2Client.getToken(req.user.linked_account.googledrive[index], function(err, token) {
				      	if (err) {
				        	console.log('Error while trying to retrieve access token', err);
				        	return;
				      	}
				      	var string = req.user.linked_account.googledrive[index];
			      		req.user.linked_account.googledrive[index] = token;
						User.findOne({_id: req.user._id},function(err,doc){
							if(err) console.log(err);
							var mongo_index = doc.linked_account.googledrive.indexOf(string);
							doc.linked_account.googledrive[mongo_index] = token;
							doc.save();
						});
			      		oauth2Client.credentials = token;
			      		setUrl(oauth2Client);
				    });
				} else {
					oauth2Client.credentials = req.user.linked_account.googledrive[index].access_token;
					setUrl(oauth2Client);
				}
			}*/
			console.log(typeof(req.user.linked_account.googledrive[0]));
			if(typeof(req.user.linked_account.googledrive[0]) != 'object') {
				oauth2Client.getToken(req.user.linked_account.googledrive[0], function(err, token) {
			      	if (err) {
			        	console.log('Error while trying to retrieve access token', err);
			        	return;
			      	}
			      	req.user.linked_account.googledrive[0] = token;
					User.findOne({_id: req.user._id},function(err,doc){
						if(err) console.log(err);
						doc.linked_account.googledrive = new Array();
						doc.linked_account.googledrive.push(token);
						doc.save();
						console.log('1');
						console.log(req.user);
						console.log(token);
						oauth2Client.credentials = token;
		      			setUrl(oauth2Client);
					});
			    });
			} else {
				console.log('2');
				console.log(req.user);
				console.log(typeof(req.user.linked_account.googledrive))
				console.log(req.user.linked_account.googledrive[0]);
				oauth2Client.credentials = req.user.linked_account.googledrive[0];
				setUrl(oauth2Client);
			}
		} else{
			getNewToken(oauth2Client, addUrl);
		}
	}

	function getNewToken(oauth2Client, callback) {
	  	var authUrl = oauth2Client.generateAuthUrl({
	    	access_type: 'offline',
	    	scope: SCOPES
	  	});
	  callback(authUrl);
	}

	function setUrl(oauth2Client) {
		var drive = google.drive('v2');
	  	drive.about.get({
		    auth: oauth2Client
	  	}, function(err, response) {
		    if (err) {
		      console.log('The API returned an error: ' + err);
		      return;
		    }
		    console.log(response);
		});
		res.render('accounts');
	}

	function addUrl(url) {
		res.render('accounts', {gurl : url});
	}
});

router.get('/drive', IsAuthenticated, function(req, res, next){
	req.user.linked_account.googledrive.push(req.query.code);
	User.findOne({_id: req.user._id},function(err,doc){
		if(err) console.log(err);
		doc.linked_account.googledrive.push(req.query.code);
		doc.save();
		res.redirect('/api/accounts');
	});
});

router.get('/googleabout', IsAuthenticated, function(req, res, next){
	var service = google.drive('v3');
  	service.about.get({
	    auth: req.user.linked_account.googledrive[0]
  	}, function(err, response) {
	    if (err) {
	      console.log('The API returned an error: ' + err);
	      return;
	    }
	    console.log(response);
	});
});

module.exports = router;