var express = require('express');
var app = express();
var router = express.Router();

//Config
var config = require('../config/config');
var error_msg = require('../config/error_msg');
var success_msg = require('../config/success_msg');

//Stripe
var stripe = require("stripe")(config.stripe_test_key);

//Database
var mysql = require('mysql');
var parking_db = parkingPoolCreate();

var http = require('http');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var methodOverride = require('method-override')

// Logger
var winston = require('winston');
var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)(),
    new(winston.transports.File)({
      filename: 'logs/stripe.log'
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
    return next(error_msg.global.no_token);
  }
});

//Apply to routes that require authorization
app.use('/', router);

//Create customer
router.post('/customer', function(req, res, next) {
  if (!req.decoded.email) {
    return next(error_msg.stripe.customer_no_email);
  }

  stripe.customers.create({
    description: '',
    email: req.body.email
  }, function(err, customer) {
    if (err) {
    	logger.log('error', err);
      return next(error_msg.stripe.customer_create);
    }
    else {
      res.send(success_msg.stripe.customer_create);
    }
  });
});

//Retrieve card
router.get('/card', function(req, res, next) {
  stripe.customers.listCards(
    req.decoded.customer_id, {
      limit: 1
    },
    function(err, cards) {
      if (err) {
      	logger.log('error', err);
        return next(error_msg.stripe.card_retrieve);
      }
      else {
        res.send(cards.data);
      }
    }
  )
})

//Create card
router.post('/card', function(req, res, next) {
  var card = req.body;
  card.object = "card";

  stripe.customers.createSource(
    req.decoded.customer_id, {
      source: card
    },
    function(err, card) {
      if (err) {
        if (err.type == "StripeCardError") {
          return res.send({
            status: 402,
            type: err.type,
            message: err.message
          })
        }
        else {
        	logger.log('error', err);
          return next(error_msg.stripe.card_create);
        }
      }
      else {
        res.send(success_msg.stripe.card_create);
      }
    }
  )
});

router.delete('/card', function(req, res, next) {
  stripe.customers.deleteCard(
    req.decoded.customer_id,
    req.query.id,
    function(err, confirmation) {
      if (err) {
      	logger.log('error', err);
        return next(error_msg.stripe.card_delete);
      }
      else {
        res.send(success_msg.stripe.card_delete);
      }
    }
  );
});

//Create Transaction
router.post('/charge', function(req, res, next) {

	logger.log('info', req.decoded.email + ": Create charge");

  if (!req.body.parking_id) {
    return next(error_msg.stripe.no_parking_id);
  }

  if (!req.body.hours) {
    return next(error_msg.stripe.no_parking_hours);
  }

  if (!req.body.location_id) {
    return next(error_msg.stripe.no_location_id);
  }

	logger.log('info', req.decoded.email + ": location_id = " + req.body.parking_id + " hours = " + req.body.hours);

  var select_query = "SELECT * FROM parking_space WHERE location_id = ? AND space_id = ?";
  parking_db.getConnection(function(err, connection) {
    if (err) {
    	logger.log('error', err);
      return next(error_msg.global.error);
    }
    else {
      // Query parking spot information
      connection.query(select_query, [req.body.location_id, req.body.parking_id], function(err, results) {
        if (err) {
          logger.log('error', err);
          connection.release();
          return next(error_msg.global.error);
        }
        if (results.length == 0) {
          connection.release();
          return next(error_msg.stripe.no_parking_space);
        }
        else {
          //Parking spot details
          var parking_spot = results[0];

          logger.log('info', parking_spot);

          //Check status of parking spot
          if (parking_spot.status == "occupied") {
            //If occupied, return an error
            connection.release();
            return next(error_msg.stripe.parking_occupied);
          }

          //Amount to be charged (1 dollar per hour)
          var amount = req.body.hours * 100;

          // Create charge with Stripe API
          stripe.charges.create({
            amount: amount,
            currency: "USD",
            customer: req.decoded.customer_id,
            receipt_email: req.decoded.email,
            statement_descriptor: "Parking"
          }).then(function(charge) {
		      	logger.log('info', req.decoded.email + ": Successfully created charge");
          	logger.log('info', charge);
            var update_query = "UPDATE parking_space SET status = ?, occupied_by = ?, customer_id = ?, start_time = ?, end_time = ?, transaction_id = ? WHERE location_id = ? AND space_id = ?";
            var date = new Date();
            var start_time = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
            date.setHours(date.getHours() + parseInt(req.body.hours));
            var end_time = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours()+ ":" + date.getMinutes() + ":" + date.getSeconds();
            /*** Query for updating parking spot information ***/
            connection.query(update_query, ["occupied", req.decoded.email, req.decoded.customer_id, start_time, end_time, charge.id, req.body.location_id, req.body.parking_id], function(err, results) {
              if (err) {
                logger.log('error', err);
                connection.release();
                return next(error_msg.global.error);
              }
              else {
              	logger.log('info', req.decoded.email + ": Successfully updated parking spot");

                //Return success message
                res.send(success_msg.stripe.charge_create);
                var insert_query = "INSERT INTO transactions (transaction_id, created, customer_id, amount, failure_code, failure_message, email, invoice, paid, refunded, location_id, parking_space_id) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)";
                var created = new Date();
                var created_fixed = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
                connection.query(insert_query, [charge.id, created_fixed , charge.customer, charge.amount, req.decoded.email, charge.invoice, charge.paid, charge.refunded, req.body.location_id, req.body.parking_id], function(err, results) {
                  if (err) {
                  	logger.log('error', err);
                    connection.release();
                    return next(error_msg.global.error);
                  }
                  else {
                  	logger.log('info', req.decoded.email + ": Successfully logged transaction")
                    connection.release();
                  }
                })

              }
            })
          }).catch(function(err) {
            logger.log('error', err);
            return next(error_msg.global.error);
          })
        }
      });
    }
  })
});

router.use(function(err, req, res, next) {
  logger.log('error', err);
  res.status(err.status || 500);
  res.send({
    message: err.message || "Internal server error."
  });
})

//Helper function set add hours to a date object
Date.prototype.addHours = function(h) {
  this.setHours(this.getHours() + h);
  return this;
}

function parkingPoolCreate() {
  var pool = mysql.createPool(config.parking_db, function(err) {
    console.log(err);
    console.log("Error connecting to db");
  })
  return pool;
}


module.exports = router;