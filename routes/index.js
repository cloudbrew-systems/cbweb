var mongoose = require('mongoose');   
var Subscribe = mongoose.model('Subscribe');
var express = require('express');
var router = express.Router();
var validator = require('validator');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
// var Invite = mongoose.model('Invite');
var User = mongoose.model('User');
var Validate = mongoose.model('Validate');


function IsAuthenticated(req,res,next){
    if(!req.isAuthenticated()){
        next();
    }else{
        res.redirect('/api/');
    }
}
/* GET home page. */
router.get('/', IsAuthenticated, function(req, res, next) {
	res.render('index');
});

/* GET login page*/
router.get('/login', IsAuthenticated, function(req, res, next) {
	res.render('login');
});

/* GET career page*/
router.get('/career', IsAuthenticated, function(req, res, next) {
	res.render('comingsoon');
});

/* GET terms page*/
router.get('/terms', IsAuthenticated, function(req, res, next) {
	res.render('terms');
});

/* GET about page*/
router.get('/about', IsAuthenticated, function(req, res, next) {
	res.render('about');
});

/* GET privacy page*/
router.get('/privacy', IsAuthenticated, function(req, res, next) {
	res.render('privacy');
});

router.get('/news', IsAuthenticated, function(req, res, next){
	res.render('news');
});

router.post('/requestsubscribe', IsAuthenticated, function(req, res, next) {
	// Subscribe.find().$where('email', req.code.email)
	var email_id = req.body.email.trim();
	Subscribe.findOne({'email': email_id},function(err,email){
		if (err){
			console.log('Error: '+err);
			throw err;
		}
		if (email) {
			res.redirect('/subscribe/duplicate');
		} else {
			if (validator.isEmail(email_id)) {
				var options = {
			  		auth: {
				    	api_user: 'adinesh',
				    	api_key: 'toakp0780269'
				  	}
				}

				var client = nodemailer.createTransport(sgTransport(options));
				var email = {
			  		from: 'CloudBrew abhinava@cloudbrewlabs.com',
				  	to: email_id,
				  	subject: 'Subscribed Successfully',
				  	html: '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html lang="en"><head><meta http-equiv="Content-Type" content="text/html;charset=utf-8"><title></title><style type="text/css">/* Client-specific Styles */#outlook a{padding: 0;}/* Force Outlook to provide a "view in browser" button. */body{width: 100% !important;}.ReadMsgBody{width: 100%;}.ExternalClass{width: 100%;}/* Force Hotmail to display emails at full width */body{-webkit-text-size-adjust: none;-ms-text-size-adjust: none;}/* Prevent Webkit and Windows Mobile platforms from changing default font sizes. *//* Reset Styles */body{margin: 0;padding: 0;}img{height: auto;line-height: 100%;outline: none;text-decoration: none;}p{margin: 1.5em 0 1.5em 0;}/* Style main text features */.outertable{padding-top: 0px;}.about{font-size:40px;color:#ffffff;line-height:38px;font-family:Arial, Helvetica, sans-serif;font-weight: bold;letter-spacing: -2px;}.small, .small a{font-family:Arial, Helvetica, sans-serif;font-size:11px;color:#999999;text-decoration: none;}.announce{font-size:28px;color:#333324;line-height:30px;font-family:Arial, Helvetica, sans-serif;font-weight: bold;letter-spacing: -1px;}.telephone{font-size:30px;color:#474139;line-height:38px;font-family:Arial, Helvetica, sans-serif;font-weight: bold;letter-spacing: -1px;}.telephone a{color:#474139;}.footer{font-size:11px;color:#333333;line-height:11px;font-family:Arial, Helvetica, sans-serif;font-weight: lighter;}.footer a{color:#333333;}@media only screen and (max-width: 480px){table[id="outertable"]{padding-top: 0px !important;}td[class="mast"]{height: 50px;}table[class="widetable"]{width: 320px !important;}table[class="narrowtable"]{width: 280px !important;}table[class="hide"], img[class="hide"], td[class="hide"]{display: none !important;}td[class="slim"]{width: 10px !important;}td[class="sm_img"]{width: 100px !important;}img[class="sm_img"]{width: 100px !important;padding: 10px;}a{color:#555555 !important;text-decoration: none;}td[class="logo"]{width: 210px !important;}td[class="about"]{font-size:23px !important;color:#ffffff !important;line-height:25px !important;width: 280px !important;}img[class="pic"]{max-width: 320px !important;}td[class="announce"]{font-size:24px !important;line-height:22px !important;letter-spacing:-0.099em !important;font-weight: bold !important;height: 180px !important;}td[class="telephone"]{font-size:18px !important;}td[class="socialtd"]{height: 50px !important;}td[class="social"]{width: 60px !important;}img[class="social"]{width: 60px !important;}}</style></head><body bgcolor="#fefefe" marginheight="0" topmargin="0" marginwidth="0" leftmargin="0"><div style="background-color:#fefefe;"><!--[if gte mso 9]><v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t"><v:fill type="tile" src="http://i.imgur.com/n8Q6f.png" color="#fefefe"/></v:background><![endif]--><table height="100%" width="100%" cellpadding="0" cellspacing="0" border="0" class="widetable"><tr><td valign="top" align="left"><table align="center" cellpadding="0" cellspacing="0" width="630" border="0" class="widetable" style="border: solid 1px #ececec;"><tr><td class="hide"><!-- <img src="img/top_shadow.png" style="display: block;" class="hide"> --></td></tr><tr><td width="630" valign="top" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" class="widetable" border="0"><tr><td height="90" colspan="3" class="mast"><table cellpadding="0" cellspacing="0" class="widetable" border="0"><tr><td width="30" class="slim"></td><td width="450" class="logo"><img width="157" src="http://cloudbrew.io/landingpage/images/logo.png" class="sm_img" style="height: auto;line-height: 100%;outline: none;text-decoration: none;"></td><td width="120" class="small" align="right"><a href="http://cloudbrew.io" style="padding: 0;">VIEW ONLINE</td><td width="30" class="slim"></td></tr></table></td></tr><tr><td colspan="3"><table cellpadding="0" cellspacing="0" class="widetable" border="0"><tr><td width="630"><img style="width: 100%;" src="http://cloudbrew.io/assets/img/cloudbrew_cover.png" class="CloudBrew Cover"></td></tr></table></td></tr><tr><td colspan="3"><table cellpadding="0" cellspacing="0" class="widetable" border="0"><tr><td width="30"></td><td width="570" height="210" style="border-bottom: 1px solid #cccccc;font-size:28px;color:#333324;line-height:30px;font-family:Arial, Helvetica, sans-serif;font-weight: bold;letter-spacing: -1px;" class="announce"> You have successfully enrolled for the CloudBrew Invite.<br><br> Visit <a href="http://cloudbrew.io" style="padding: 0;">website</a> for more details.</td><td width="30"></td></tr></table></td></tr><tr><td width="30" class="hide"></td><td width="570" height="90" class="socialtd"><table cellpadding="0" cellspacing="0" class="narrowtable" border="0" align="center"><tr><td width="360">Email. abhinava@cloudbrewlabs.com</td><td width="100" class="social"><!--<a href="http://"><img src="img/fb.jpg" width="94" class="social" border="0"></a>--></td><td width="10" class="slim"></td><td width="100" class="social"><!--<a href="http://"><img src="img/tw.jpg" width="94" class="social" border="0"></a>--></td></tr></table></td><td width="30" class="hide"></td></tr></table></td></tr><tr><td class="hide"><!-- <img src="img/bottom_shadow.png" style="display: block;" class="hide"> --></td></tr></table><table align="center" cellpadding="0" cellspacing="0" width="630" border="0" class="widetable"><tr><td height="65" class="footer" align="center">&copy; CloudBrew Labs 2016</td></tr></table><br/><br/></td></tr></table></div></body></html>'
				};
				var useremail = new Subscribe();
				useremail.email = email_id;
				useremail.save(function(err) {
					if (err){
						console.log('Error: '+err);  
						throw err;  
					}
					client.sendMail(email, function(err, info){
				    	if (err ){
				      		console.log(err);
				      		res.redirect('/subscribe/success');
					    }
					    else {
				      		console.log('Message sent: ' + info.response);
				      		res.redirect('/subscribe/success');
					    }
					});
				});
			} else {
				res.redirect('/subscribe/error');
			}
		}
	});
});


router.get('/reset', IsAuthenticated, function(req, res, next) {
	if(typeof(req.query.validate) !== 'undefined') {
		Validate.findOne({validation: req.query.validate, valid: '1'}).select({created_at: 1}).exec(function(err, user) {
			if(user) {
				var date1 = new Date(user.created_at);
				var date2 = new Date();
				var timeDiff = Math.abs(date2.getTime() - date1.getTime());
				var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
				if (diffDays <= 1) {
					res.render('resetsuccess',{token: req.query.validate});
				} else {
					res.render('reseterror',{message: 1});
				}
			} else {
				res.render('reseterror',{message: 2});
			}
		});
	} else {
		res.render('reseterror',{message: 2});
	}
});

/*router.get('/invite', IsAuthenticated, function(req, res, next) {
	var invite = new Invite();
	invite.email = 'abhinava@cloudbrewlabs.com';
	invite.invited_by = '0';
	invite.save(function(err){
		if (err) {
			console.log("Error occured while inviting");
			return;
		}
		res.redirect('/');
	})
});*/

module.exports = router;
