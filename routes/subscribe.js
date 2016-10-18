var express = require('express');
var router = express.Router();

function IsAuthenticated(req,res,next){
    if(!req.isAuthenticated()){
        next();
    }else{
        res.redirect('/api/');
    }
}

/* GET home page. */
router.get('/', IsAuthenticated, function(req, res, next) {
	res.render('subscribe');
});

/* Successful subscribe page */
router.get('/success', IsAuthenticated, function(req, res, next) {
	res.render('subscribesuccess');
});

/* User already exists */
router.get('/duplicate', IsAuthenticated, function(req, res, next) {
	res.render('subscribeduplicate');
});

/* Subsciption error page */
router.get('/error', IsAuthenticated, function(req, res, next) {
	res.render('subscribeerror');
});

module.exports = router;