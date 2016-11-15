const saltRounds = 10;
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
var bcrypt = require('bcrypt');
var salt = bcrypt.genSaltSync(10);
var mysql      = require('mysql');

//Create user pool
var user_db = userPoolCreate();


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


router.post('/login', function(req, res, next) {
	var select_query = "SELECT id, customer_id, first_name, last_name, email, password FROM users WHERE email = ?";

	if(!req.body.email) {
		return next(error_msg.user.login_no_email);
	}

	if(!req.body.password) {
		return next(error_msg.user.login_no_password);
	}

	user_db.getConnection(function(err, connection) {
		if(err) {
			return next(error_msg.global.error);
		}
		else {
			connection.query(select_query, [req.body.email], function(err, results) {
				if(err) {
					return next(error_msg.user.login);
				}
				if(results.length == 0) {
					return res.send(error_msg.login_no_user);
				}
				else {
					var user = results[0];

					if(bcrypt.compareSync(req.body.password, user.password)) {
						var payload = {
							id: user.id,
              customer_id: user.customer_id,
							first_name: user.first_name,
							last_name: user.last_name,
							email: user.email
						};
						var token = jwt.sign(payload, config.token_secret, {
							expiresIn: "2 days"
						})
						res.send({
							user: payload,
							token: token
						});
					}
					else {
						res.send(error_msg.user.login_incorrect_password);
					}
				}
			});
		}
	});
});

router.post('/register', function(req, res, next) {
	var select_query = "SELECT email FROM users WHERE email = ?";
	var insert_query = "INSERT INTO users SET ?";
	var user;

	if(!req.body.first_name) {
		return next(error_msg.user.register_no_first_name);
	}

	if(!req.body.last_name) {
		return next(error_msg.user.register_no_last_name)
	}

	if(!req.body.email) {
		return next(error_msg.user.register_no_email);
	}

	if(!req.body.password) {
		return next(error_msg.user.register_no_password);
	}

	user_db.getConnection(function(err, connection) {
		if(err) {
			return next(error_msg.global.error);
		}
		else {
			connection.query(select_query, [req.body.email], function(err, results) {
				if(err) {
					connection.release();
					return next(error_msg.user.register);
				}
				if(results.length != 0) {
					connection.release();
					return next(error_msg.user.register_exists);
				}
				else {
          stripe.customers.create({
            description:'',
            email: req.body.email
          }, function(err, customer) {
            if(err) {
              return next(error_mst.stripe.customer_create);
            }
            else {
              bcrypt.hash(req.body.password, salt, function(err, hash) {
                if(err) {
                 return res.send(error_msg.global.error);
                }
                else {
                  user = {
                    customer_id: customer.id,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    email: req.body.email,
                    password: hash,
                    created: new Date().toISOString().slice(0, 19).replace('T', ' ')
                  }
                  connection.query(insert_query, user, function(err, results) {
                    if(err) {
                      connection.release();
                      return next(error_msg.user.register);
                    }
                    else {
                      connection.release();
                      res.send(success_msg.user.register);
                    }
                  })
                }
              });
            }
          });
				}
			})
		}
	})
});

router.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send({
    	message: err.message || "Internal server error."
    });
})

function userPoolCreate() {
	var pool = mysql.createPool(config.local_db, function(err) {
		console.log(err);
		console.log("Error connecting to db");
	})
	return pool;
}


module.exports = router;