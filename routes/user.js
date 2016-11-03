var express  = require('express');
var app = express();
var router = express.Router();
var http = require('http');
var jwt = require('jsonwebtoken');
var MongoClient = require('mongodb').MongoClient;
var config = require('../config/config');
var bodyParser = require('body-parser');
var methodOverride = require('method-override')
var bcrypt = require('bcrypt');
const saltRounds = 10;

// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({
  extended: true
}))
// parse application/json
router.use(bodyParser.json())
router.use(methodOverride())

router.get('/login', function(req, res, next) {
	console.log(config);
	console.log(req.query);
	res.send('ok');
});

router.post('/register', function(req, res, next) {
	if(!req.body.email) {
		return res.send("Missing email");
	}

	if(!req.body.password) {
		return res.send("Missing password");
	}

	MongoClient.connect(config.parking_db, function(err, db) {
	  	var collection = db.collection(config.user_collection);
  		collection.findOne({email: req.body.email}, function(err, result) {
  			if(result == null) {
				// Insert a single document
				bcrypt.genSalt(saltRounds, function(err, salt) {
				    bcrypt.hash(req.body.password, salt, function(err, hash) {
						collection.insertOne({email:req.body.email, password: hash}, function(err, result) {
							if(err) {
								console.log(err);
							}
							else {
								res.send("Successfully created user");
							}
						});
				    });
				});
  			}
  			else {
  				console.log("Email already exists");
  				res.send('Email already exists');
  			}
  		});
	});
});

router.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
    });
})

module.exports = router;