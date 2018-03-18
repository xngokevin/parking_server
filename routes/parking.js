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

// Logger
var winston = require('winston');
var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)(),
    new(winston.transports.File)({
      filename: 'logs/parking.log'
    })
  ]
});

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


router.get('/location', function(req, res, next) {
  var select_query = "SELECT id, name, description, address, image FROM locations";
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
  var select_query = "SELECT id, location_id, space_id, status FROM parking_space WHERE location_id = ?";

  //Query parking spots from location id
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
  var update_query = "UPDATE parking_space SET status = 'unoccupied', transaction_id = NULL, occupied_by = NULL, customer_id = NULL, start_time = NULL, end_time = NULL WHERE location_id = ? AND space_id = ? AND occupied_by = ?";
  parking_db.getConnection(function(err, connection) {
    if (err) {
      logger.log('error', err);
      return next(error_msg.global.error);
    }
    else {
      connection.query(update_query, [req.body.location_id, req.body.space_id, req.decoded.email], function (err, results) {
        if(err) {
          connection.release();
          logger.log('error', err);
          return next(error_msg.global.error);
        }
        else {
          if(results.affectedRows == 0) {
            connection.release();
            logger.log('error', 'Unable to find parking spot');
            return res.send(error_msg.parking.unoccupy);
          }
          else {

            update_query = "UPDATE transactions SET end_time = ? WHERE email = ?";
            var date = new Date();
            var end_time = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

            connection.query(update_query, [end_time, req.decoded.email], function(err, results) {
              if(err) {
                connection.release();
                logger.log('error', err);
                return next(error_msg.global.error);
              }
              if(results.affectedRows == 0) {
                connection.release();
                logger.log('error', 'Unable to update transactions');
                return res.send(error_msg.parking.unoccupy);
              }
              else {
                connection.release();
                unirest.post('https://api.particle.io/v1/devices/3b0039000547333439313830/servo?access_token=89f8784572b79558afcd88d9c7b00c8e12934bf3')
                .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
                .send({ "arg": "open"})
                .end(function (response) {
                  console.log(response.body);
                  logger.log('info', req.decoded.email + 'Successfully unoccupied parking spot');
                  res.send(success_msg.parking.unoccupy);

                });
              }
            })
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
