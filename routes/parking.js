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
var unirest = require('unirest');

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
      console.log('no token');
      return next(error_msg.global.no_token);
    }
});

//Apply to routes that require authorization
app.use('/', router);

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

router.get('/location/:id', function(req, res, next) {
  console.log("HERE");
  var select_query = "SELECT id, location_id, space_id, status FROM parking_space WHERE location_id = ?";
  /*** Query for selecting parking information from location id***/
  parking_db.query(select_query, [req.params.id], function(err, results) {
    if(err) {
      console.log(err);
      return next(error_msg.global.error);
    }
    else {
      res.send(results);
    }
  })
});


router.put('/unoccupy', function(req, res, next) {
  var update_query = "UPDATE parking_space SET status = 'unoccupied', transaction_id = NULL, occupied_by = NULL, customer_id = NULL, start_time = NULL, end_time = NULL WHERE id = ? AND customer_id = ?";

  parking_db.getConnection(function(err, connection) {
    if (err) {
      return next(error_msg.global.error);
    }
    else {
      connection.query(update_query, [req.body.id, req.decoded.customer_id], function (err, results) {
        if(err) {
          return next(error_msg.global.error);
        }
        else {
          if(results.length == 0) {
            console.log('nothing modified');
          }
          else {
            unirest.post('https://api.particle.io/v1/devices/3b0039000547333439313830/servo?access_token=89f8784572b79558afcd88d9c7b00c8e12934bf3')
            .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
            .send({ "arg": "close"})
            .end(function (response) {
              console.log(response.body);
              res.send(success_msg.parking.unoccupy);

            });
          }
        }
      });
    }
  });
});

router.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message || "Internal server error."
  });
})



function parkingPoolCreate() {
  var pool = mysql.createPool(config.parking_db, function(err) {
    console.log(err);
    console.log("Error connecting to db");
  })
  return pool;
}


module.exports = router;
