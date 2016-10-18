var mongoose = require('mongoose');   
var User = mongoose.model('User');
var Invite = mongoose.model('Invite');
var LocalStrategy   = require('passport-local').Strategy;
var bCrypt = require('bcrypt');

module.exports = function(passport){

	// Passport needs to be able to serialize and deserialize users to support persistent login sessions
	passport.serializeUser(function(user, done) {
		console.log('serializing user:',user.username);
		done(null, user._id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			console.log('deserializing user:',user.username);
			done(err, user);
		});
	});

	passport.use('login', new LocalStrategy({
			passReqToCallback : true
		},
		function(req, username, password, done) { 
			// check in mongo if a user with username exists or not
			User.findOne({ 'username' :  username }, 
				function(err, user) {
					// In case of any error, return using the done method
					if (err)
						return done(err);
					// Username does not exist, log the error and redirect back
					if (!user){
						console.log('User Not Found with username '+username);
						return done(null, false);                 
					}
					// User exists but wrong password, log the error 
					if (!isValidPassword(user, password)){
						console.log('Invalid Password');
						return done(null, false); // redirect back to login page
					}
					// User and password both match, return user from done method
					// which will be treated like success
					return done(null, user);
				}
			);
		}
	));

	passport.use('signup', new LocalStrategy({
			passReqToCallback : true // allows us to pass back the entire request to the callback
		},
		function(req, username, password, done) {
			Invite.findOne({'email':req.param('email')},function(err,invited){
				if (invited) {
					if (invited.registered === '0') {
						// find a user in mongo with provided username
						User.findOne({$or:[{ 'username' :  username },{'email' : req.param('email')}]}, function(err, user) {
							// In case of any error, return using the done method
							if (err){
								console.log('Error in SignUp: '+err);
								return done(err);
							}
							// already exists
							if (user) {
								console.log('User already exists with username: '+username);
								return done({msg:'User already exists',error_code:1}, false);
							} else {
								// check if password is matching the repeat password
								if(password === req.param('password_repeat') && password != '') {
									// if there is no user, create the user
									var newUser = new User();

									// set the user's local credentials
									newUser.username = username;
									newUser.password = createHash(password);
									newUser.email = req.param('email');
									// save the user
									newUser.save(function(err) {
										if (err){
											console.log('Error in Saving user: '+err);  
											throw err;  
										}
										invited.registered = '1';
										invited.save(function(err){
											if (err) {
												console.log('Error in Saving user: '+err);  
												throw err;
											}
											console.log(newUser.username + ' Registration succesful');    
											return done(null, newUser);
										});
									});
								} else {
									return done({msg:'Password do not match',error_code:1}, false);
								}
							}
						});
					} else {
						console.log('User already registered: '+username);
						return done({msg:'User already registered',error_code:1}, false);
					}
				} else {
					console.log('User not invited: '+username);
					return done({msg:'User not invited',error_code:0}, false);
				}
			});
		})
	);
	
	var isValidPassword = function(user, password){
		return bCrypt.compareSync(password, user.password);
	};
	// Generates hash using bCrypt
	var createHash = function(password){
		return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
	};

};