var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var passport = require('passport');
//global.passport = passport;
var mongoose = require('mongoose');
// var csrf = require('csurf');
//connect to mongodb
mongoose.connect('mongodb://localhost:27017/cloudbrew');
require('./models/models.js');

var routes = require('./routes/index');
// var users = require('./routes/users');
var subscribe = require('./routes/subscribe');
var api = require('./routes/api');
var group = require('./routes/group');
var account = require('./routes/account');
var auth = require('./routes/auth')(passport);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));
app.use(session({
  store: new RedisStore({ host: 'localhost', port: 6379 }),
  secret: 'cloudbrew.io web app',
  //cookie: { maxAge: 60000, expires: new Date(Date.now() + 3600000), httpOnly: true, secure: true}
  cookie: { maxAge: 60000, expires: false, httpOnly: true/*, secure: true*/}
}));
/*app.use(csrf());

app.use(function(req, res, next) {
  res.locals._csrf = req.csrfToken();
  next();
});*/
app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);
// app.use('/users', users);
app.use('/subscribe',subscribe);
app.use('/api', api);
app.use('/group', group);
app.use('/auth', auth);
app.use('/account', account);

//// Initialize Passport
var initPassport = require('./passport-init');
initPassport(passport);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    /*res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });*/
    if (err.status) {
      var request_url = req.url;
      res.render('404',{url:request_url});
    } else {
      res.render('500');
    }
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
