var express = require('express');
var router = express.Router();
var mongoose = require('mongoose'); 
var Invite = mongoose.model('Invite');
var User = mongoose.model('User');
var Validate = mongoose.model('Validate');
var randomstring = require("randomstring");
var validator = require('validator');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
var bCrypt = require('bcrypt');
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

module.exports = function(passport){
	router.post('/signin', function handleLocalAuthentication(req, res, next) {

	    passport.authenticate('login', function(err, user, info) {
	    	if (err) return next(err);
	        if (!user) {
	            return res.json({success:0, msg: 'Error while signing in.'})
	        }

	        // Manually establish the session...
	        req.login(user, function(err) {
	            if (err) return next(err);
	            return res.json({success:1});
	        });

	    })(req, res, next);
	});

	router.post('/signup',function handleLocalAuthentication(req, res, next) {

	    passport.authenticate('signup', function(err, user, info) {
	    	// if (err) return next(err);
	        if (!user) {
	        	if (err) {
	        		if (err.error_code === 0) {
	        			return res.json({success:2, msg: 'CloudBrew is currently invite only.'});
	        		} else if (err.error_code === 1) {
	        			return res.json({success:0, msg: err.msg});
	        		}
	        	} else {
	            	return res.json({success:0, msg: 'Error while signing up user.'});
	            }
	        }

	        // Manually establish the session...
	        req.login(user, function(err) {
	            if (err) return next(err);
	            return res.json({success:1});
	        });

	    })(req, res, next);
	});

	router.post('/checkemail',function(req, res, next){
		Invite.findOne({'email':req.param('email')},function(err,invited){
			if (invited) {
				if (invited.registered === '0') {
					res.json({success: 1, email: req.param('email')});
				} else {
					// console.log('User already registered: '+username);
					return res.json({success: 0, msg:'User already registered'});
				}
			} else {
				// console.log('User not invited: '+username);
				res.json({success: 2, msg: 'CloudBrew is currently invite only.'});
			}
		});
	});

	router.post('/resetrequest',function(req, res, next){
		var instance_array = ['http://127.0.0.1:3000','https://beta.cloudbrew.io','https://www.cloudbrew.io'];
		if(instance_array.indexOf(req.headers.origin) !== -1){
			User.findOne({'username':req.param('login_username_reset')}).select({email: 1, _id: 1}).exec(function(err,user){
				if (user) {
					var email_id = user.email;
					if (validator.isEmail(email_id)) {
						var options = {
					  		auth: {
						    	api_user: 'adinesh',
						    	api_key: 'toakp0780269'
						  	}
						}
						var validate = new Validate();
						validate.user_id = user._id;
						rand_string = randomstring.generate();
						validate.validation = rand_string;
						validate.valid = '1';
						var client = nodemailer.createTransport(sgTransport(options));
						var email = {
					  		from: 'CloudBrew abhinava@cloudbrewlabs.com',
						  	to: email_id,
						  	subject: 'Reset Password',
						  	html: '<!DOCTYPE html><html><head><title></title></head><body>Hi,<br/><br/>Your request for reseting your password has been successful.<br/><br/>Please follow the following link to reset your password '+req.headers.origin+'/reset?validate='+rand_string+'.<br/><br/>Link will expire in 24 hours. If you haven\'t requested to change your password please ignore.<br/><br/>Thanks,<br/><strong>Team CloudBrew</strong></body></html>'
						};

						validate.save(function(err) {
							if (err){
								console.log('Error: '+err);  
								// throw err;
								return;
							}
							client.sendMail(email, function(err, info){
						    	if (err ){
						      		console.log(error);
						      		res.json({success: 0, msg: 'Error in sending mail. Please try again.'});
							    }
							    else {
						      		console.log('Message sent: ' + info.response);
						      		res.json({success: 1, msg: 'Mail has been sent to your email id. Please follow the instructions.'});
							    }
							});
						});
					} else {
						res.json({success: 0, msg: 'Invalid email. Please contact admin at abhinava@cloudbrewlabs.com'});
					}
				} else {
					res.json({success: 0, msg: 'User is not registered'});
				}
			});
		} else {
			res.json({success: 0, msg: 'Invalid request'});
		}
	});

	router.post('/reset',function(req,res,next){
		if (req.body.password === req.body.password_repeat) {
			Validate.findOne({validation: req.body.token, valid: '1'}).select({user_id: 1}).exec(function(err, user) {
				if (err) {
					console.log(err);
				}
				if(user) {
					user.valid = '0';
					user.save(function(err){
						if (err) {
							console.log('Error in updating validation key: '+err);  
							throw err;
						}
						User.update({_id: user.user_id}, { password: createHash(req.body.password) }, {}, function(err){
							if (err) {
								console.log('Error updating password: '+err);  
								throw err;
							}
							res.json({success: 1, msg: 'Password updated successfully. Please login using new password'});
						});
					});
				} else {
					res.json({success: 0, msg: 'Error in updating password. If problem persist, please mail to abhinava@cloudbrewlabs.com'})
				}
			});
		} else {
			res.json({success: 0, msg: 'Passwords do not match'});
		}
	});

	//log out
	router.get('/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	return router;
};