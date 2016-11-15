var express  = require('express');
var app = express();
var router = express.Router();
var apiRoutes = express.Router();

//Config
var config = require('../config/config');
var error_msg = require('../config/error_msg');
var success_msg = require('../config/success_msg');

//Stripe
var stripe = require("stripe")(config.stripe_test_key);

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
apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {
    	// verifies secret and checks exp
    	jwt.verify(token, app.get('token_secret'), function(err, decoded) {
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
	    return next(config.error_msg.global.no_token);

  	}
});

//Apply to routes that require authorization
app.use('/auth', apiRoutes);


//Create customer
router.post('/customer', function(req, res, next) {
  if(!req.body.email) {
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
})

router.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message || "Internal server error."
    });
})


module.exports = router;

