var express  = require('express');
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
  if(!req.decoded.email) {
    return next(error_msg.stripe.customer_no_email);
  }

  stripe.customers.create({
    description:'',
    email: req.body.email
  }, function(err, customer) {
    if(err) {
      return next(error_mst.stripe.customer_create);
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
			if(err) {
				return next(error_msg.stripe.card_retrieve);
			}
			else {
				console.log(cards.data);
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
    req.decoded.customer_id,
    {source: card},
    function(err, card) {
      if(err) {
        if(err.type == "StripeCardError") {
        	return res.send({
        		status: 402,
        		type: err.type,
        		message: err.message
        	})
        }
        else {
			return next(error_msg.stripe.card_create);
        }
      }
      else {
        res.send(success_msg.stripe.card_create);
      }
    }
  )
});

//Create Transaction
router.post('/charge', function(req, res, next) {
  /*
  Request Body for now.
    req.body: {
      parking_id: 1,
      hours: 1
    }
  */

  if(!req.body.parking_id) {
    return next(error_msg.stripe.no_parking_id);
  }

  if(!req.body.hours) {
    return next(error_msg.stripe.no_parking_hours);
  }

  var select_query = "SELECT * FROM parking_spot WHERE id = ?";
  parking_db.getConnection(function(err, connection) {
    if(err) {
      return next(error_msg.global.error);
    }
    else {
      /*** Query for selecting parking spot information ***/
      connection.query(select_query, [req.body.parking_id], function(err, results) {
        if(err) {
          return next(error_msg.global.errssssr);
        }
        else {
          //Parking spot details
          var parking_spot = results[0];
          //Check status of parking spot
          if(parking_spot.status == "occupied") {
            //If occupied, return an error
            return next(error_msg.stripe.parking_occupied);
          }

          //Amount to be charged (1 dollar per hour)
          var amount = req.body.hours * 100

          /*** Create a charge with Stripe API ***/
          stripe.charges.create({
            amount: amount,
            currency: "USD",
            customer: req.decoded.user.customer_id,
            receipt_email: req.decoded.user.email,
            statement_descriptor: "Parking"
          }).then(function(charge) {
            var update_query = "UPDATE parking_space SET status = ?, occupied_by = ?, start_time = ?, end_time = ?";
            var start_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
            var end_time = new Date().addHours(req.body,hours).toISOString().slice(0, 19).replace('T', ' ');

            /*** Query for updating parking spot information ***/
            parking_db.query(update_query, ["occupied", req.decoded.user.email, start_time, end_time], function(err, results) {
              if(err) {
                return next(error_msg.global.error);
              }
              else {
                //Return success message
                res.send(success_msg.stripe.charge_create);
              }
            });
          }).catch(function(err) {
            return next(error_msg.global.error);
          })
        }
      });
    }
  })
});

router.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message || "Internal server error."
  });
})

//Helper function set add hours to a date object
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
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

