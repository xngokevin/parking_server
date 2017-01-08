var express  = require('express');
var app = express();
var router = express.Router();

//Config
var config = require('../config/config');
var error_msg = require('../config/error_msg');
var success_msg = require('../config/success_msg');

//Database
var mysql = require('mysql');
var parking_db = parkingPoolCreate();

var http = require('http');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var methodOverride = require('method-override')

//Parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({
  extended: true
}))
//Parse application/json
router.use(bodyParser.json())
router.use(methodOverride())


//Route middleware to verify a token
router.use(function(req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {
    	// verifies secret and checks exp
    	jwt.verify(token, config.token_secret, function(err, decoded) {
      	if (err) {
        	return next(error_msg.global.invalid_token);
      	}
      	else {
        	// if everything is good, save to request for use in other routes
        	req.decoded = decoded;
        		next();
      		}
    	});

  	}
  	else {
	    return next(error_msg.global.no_token);
  	}
});


router.get('/location', function(req, res, next) {
  var select_query = "SELECT id, name, description, address FROM locations";
  /*** Query for selecting location information ***/
  parking_db.query(select_query, function(err, results) {
    if(err) {
      return next(error_msg.global.error);
    }
    else {
      res.send(results);
    }
  })
});

router.get('/location/:id/parking', function(req, res, next) {
  var select_query = "SELECT id, name, description, address FROM locations WHERE location_id = ?";
  /*** Query for selecting parking information from location id***/
  parking_db.query(select_query, [req.params.id], function(err, results) {
    if(err) {
      return next(error_msg.global.error);
    }
    else {
      res.send(results);
    }
  })
});



function parkingPoolCreate() {
  var pool = mysql.createPool(config.parking_db, function(err) {
    console.log(err);
    console.log("Error connecting to db");
  })
  return pool;
}


module.exports = router;
