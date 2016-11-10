const saltRounds = 10;
var express  = require('express');
var app = express();
var router = express.Router();
var apiRoutes = express.Router();

//Config
var config = require('../config/config');
var error_msg = require('../config/error_msg');
var success_msg = require('../config/success_msg');

var http = require('http');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var methodOverride = require('method-override')
var bcrypt = require('bcrypt');
var salt = bcrypt.genSaltSync(10);

var mysql      = require('mysql');
var user_db = userPoolCreate();


// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({
  extended: true
}))
// parse application/json
router.use(bodyParser.json())
router.use(methodOverride())



// route middleware to verify a token
apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {
    	// verifies secret and checks exp
    	jwt.verify(token, app.get('superSecret'), function(err, decoded) {
      	if (err) {
        	return res.json({ success: false, message: 'Failed to authenticate token.' });
      	}
      	else {
        	// if everything is good, save to request for use in other routes
        	req.decoded = decoded;
        		next();
      		}
    	});

  	}
  	else {
	    return res.status(403).send({
	        success: false,
	        message: 'No token provided.'
	    });

  	}
});

app.use('/auth', apiRoutes);


router.get('/login', function(req, res, next) {

	User.findOne({
		email: req.body.email
	}, function(err, user) {
		if(err) {
			console.log("Finding user error");
		}
		else if (user) {
			if(user.password != req.body.password) {
				console.log("Password did not match");
			}
			else {
		        var token = jwt.sign(user, config.token_secret, {
		          expiresInMinutes: 1440 // expires in 24 hours
		        });

		        //Return information with token
		        res.json({
		        	status: 200,
		        	message: "Successfully logged in.",
		        	token: token
		        })
			}
		}
	})
});

router.post('/register', function(req, res, next) {
	var select_query = "SELECT email FROM users WHERE email = ?";
	var insert_query = "INSERT INTO users SET ?";
	var user;

	if(!req.body.first_name) {
		return res.send(error_msg.no_first_name);
	}

	if(!req.body.last_name) {
		return res.send(error_msg.no_last_name)
	}

	if(!req.body.email) {
		return res.send(error_msg.no_email);
	}

	if(!req.body.password) {
		return res.send(error_msg.no_pasword);
	}

	user_db.getConnection(function(err, connection) {
		if(err) {
			return res.send(error_msg.global_error);
		}
		else {
			connection.query(select_query, [req.body.email], function(err, results) {
				if(err) {
					connection.release();
					return res.send(error_msg.global_error);
				}
				if(results.length != 0) {
					connection.release();
					return res.send(error_msg.user_exists);
				}
				else {
				    bcrypt.hash(req.body.password, salt, function(err, hash) {
				    	if(err) {
							return res.send(error_msg.global_error);

				    	}
				    	else {
							user = {
								first_name: req.body.first_name,
								last_name: req.body.last_name,
								email: req.body.email,
								password: hash,
								created: new Date().toISOString().slice(0, 19).replace('T', ' ')
							}
							connection.query(insert_query, user, function(err, results) {
								if(err) {
									connection.release();
									return res.send(error_msg.global_error);
								}
								else {
									connection.release();
									res.send(success_msg.user_create);
								}
							})
				    	}
				    });
				}
			})
		}
	})
});

router.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
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