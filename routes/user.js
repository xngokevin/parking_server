const saltRounds = 10;
var express = require('express');
var app = express();
var router = express.Router();

// Config
var config = require('../config/config');
var error_msg = require('../config/error_msg');
var success_msg = require('../config/success_msg');

// Stripe
var stripe = require("stripe")(config.stripe_test_key);

// Nodemailer for sending email
const nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport(config.smtp_transport);

// Database
var mysql = require('mysql');
var parking_db = parkingPoolCreate();

// Random string generator
var crypto = require('crypto');

// Asynchronous function helper
var async = require('async');

var http = require('http');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var methodOverride = require('method-override')
var bcrypt = require('bcrypt');
var salt = bcrypt.genSaltSync(10);

// Logger
var winston = require('winston');
var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)(),
    new(winston.transports.File)({
      filename: 'logs/user.log'
    })
  ]
});

// Parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({
  extended: true
}))
// Parse application/json
router.use(bodyParser.json())
router.use(methodOverride())

// Apply to routes that require authorization
router.use('/auth', function(req, res, next) {
  //  check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  //  decode token
  if (token) {
    //  verifies secret and checks exp
    jwt.verify(token, config.token_secret, function(err, decoded) {
      if (err) {
        return next(error_msg.global.invalid_token);
      }
      else {
        //  if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  }
  else {
    return next(config.error_msg.global.no_token);
  }

});;

router.post('/login', function(req, res, next) {
  var select_query = "SELECT id, customer_id, first_name, last_name, email, activated, password FROM users WHERE email = ?";

  // Check for email
  if (!req.body.email) {
    return next(error_msg.user.login_no_email);
  }

  // Check for password
  if (!req.body.password) {
    return next(error_msg.user.login_no_password);
  }

  // Connect to database
  parking_db.getConnection(function(err, connection) {
    if (err) {

      logger.log('error', err);
      return next(error_msg.global.error);
    }
    else {

      //Sql query
      connection.query(select_query, [req.body.email], function(err, results) {
        if (err) {

          connection.release();
          logger.log('error', err);
          return next(error_msg.user.login);
        }
        if (results.length == 0) {

          connection.release();
          return next(error_msg.user.login_no_user);
        }
        else {

          connection.release();

          //User retrieved from databse
          var user = results[0];

          // Check if passwords
          if (bcrypt.compareSync(req.body.password, user.password)) {
            var payload = {
              id: user.id,
              customer_id: user.customer_id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              activated: user.activated
            };
            var token = jwt.sign(payload, config.token_secret, {
              expiresIn: "2 days"
            })
            payload.token = token;

            logger.log('info', req.body.email + ": Successfully logged in user")
            res.send({
              user: payload
            });
          }
          else {
            logger.log('error', req.body.email + ": Incorrect password for user");
            return next(error_msg.user.login_incorrect_password);
          }
        }
      });
    }
  });
});

router.post('/register', function(req, res, next) {
  var select_query = "SELECT email FROM users WHERE email = ?";
  var insert_query = "INSERT INTO users SET ?";
  var user, email_key;

  // Check for first name
  if (!req.body.first_name) {
    return next(error_msg.user.register_no_first_name);
  }

  // Check for last name
  if (!req.body.last_name) {
    return next(error_msg.user.register_no_last_name)
  }

  // Check for email address
  if (!req.body.email) {
    return next(error_msg.user.register_no_email);
  }

  // Check for password
  if (!req.body.password) {
    return next(error_msg.user.register_no_password);
  }

  //Establish database connection
  parking_db.getConnection(function(err, connection) {
    if (err) {

      logger.log('error', err);
      return next(error_msg.global.error);
    }
    else {
      connection.query(select_query, [req.body.email], function(err, results) {
        if (err) {

          logger.log('error', err);
          connection.release();
          return next(error_msg.user.register);
        }
        if (results.length != 0) {
          connection.release();
          return next(error_msg.user.register_exists);
        }
        else {
          stripe.customers.create({
            description: '',
            email: req.body.email
          }, function(err, customer) {
            if (err) {
              logger.log('error', err);
              connection.release();
              return next(error_mst.stripe.customer_create);
            }
            else {
              bcrypt.hash(req.body.password, salt, function(err, hash) {
                if (err) {
                  logger.log('error', err);
                  connection.release();
                  return next(error_msg.global.error);
                }
                else {
                  email_key = crypto.randomBytes(52).toString('hex');
                  user = {
                    customer_id: customer.id,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    email: req.body.email,
                    password: hash,
                    created: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    email_key: email_key
                  }
                  connection.query(insert_query, user, function(err, results) {
                    if (err) {
                      logger.log('error', err);
                      connection.release();
                      return next(error_msg.user.register);
                    }
                    else {
                      connection.release();

                      // Create email verification link
                      host = req.get('host');
                      link = "http://" + req.get('host') + "/user/verify/" + email_key;
                      mail_options = {
                        to: req.body.email,
                        subject: "Email Verification at Online Parking",
                        html: "Hello,<br> Please click on the link to verify your email.<br><a href=" + link + ">Click here to verify</a>"
                      }

                      // Send email with link for verification
                      transporter.sendMail(mail_options, (error, info) => {
                        if (error) {
                          logger.log('error', error);
                          res.send(success_msg.user.register);
                        }
                        else {
                          logger.log('info', req.body.email + ": Successfully created account for user")
                          res.send(success_msg.user.register);
                        }
                        console.log('Message %s sent: %s', info.messageId, info.response);
                      });
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


router.post('/forgotpassword', function(req, res, next) {

  var update_query = "UPDATE users SET password_requested = ?, password_key = ? WHERE email = ?"

  if(!req.body.email) {
    return next(error_msg.user.forgotpassword_no_email);
  }

  var password_key = crypto.randomBytes(52).toString('hex');
  var date = new Date();
  var password_requested = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

  //Establish database connection
  parking_db.getConnection(function(err, connection) {
    if(err) {
      logger.log('error', err);
      connection.release();
      return next(error_msg.global.error);
    }
    else {
      connection.query(update_query, [password_requested, password_key, req.body.email], function(err, results) {
        if(err) {
          logger.log('error', err);
          connection.release();
          return next(error_msg.global.error);
        }
        if(results.affectedRows === 0) {
          connection.release();
          return next(error_msg.user.forgotpassword_no_user);
        }
        else {
          connection.release();

          // Create email verification link
          host = req.get('host');
          link = "http://" + req.get('host') + "/user/resetpassword/" + password_key;
          mail_options = {
            to: req.body.email,
            subject: "Reset Password at Online Parking",
            html: "Hello,<br> Please click on the link to reset your password.<br><a href=" + link + ">Click here to reset your password</a>"
          }

          // Send email with link for verification
          transporter.sendMail(mail_options, (error, info) => {
            if (error) {
              logger.log('error', error);
              res.send(success_msg.user.forgotpassword);
            }
            else {
              logger.log('info', req.body.email + ": Successfully sent reset password link")
              res.send(success_msg.user.forgotpassword);
            }
            console.log('Message %s sent: %s', info.messageId, info.response);
          });
        }
      });
    }
  });
});

router.get('/verify/:email_key', function(req, res, next) {
  //Check for email verification key
  if (!req.params.email_key) {
    return next(error_msg.user.verify_no_email_key);
  }
  parking_db.getConnection(function(err, connection) {
    if (err) {
      logger.log('error', err);
      return next(error_msg.global.error);
    }
    else {
      var select_query = "SELECT email, activated FROM users WHERE email_key = ?";
      connection.query(select_query, [req.params.email_key], function(err, results) {
        if (err) {
          logger.log('error', err);
          connection.release();
          return next(error_msg.global.error);
        }
        if (results.length === 0) {
          connection.release();
          return next(error_msg.user.verify_invalid_email_key);
        }
        var user = results[0];

        if (user.activated == 1) {
          connection.release();
          return next(error_msg.user.verify_email_activated);
        }
        else {
          var update_query = "UPDATE users SET activated = 1, email_key = NULL WHERE email_key = ?";
          connection.query(update_query, [req.params.email_key], function(err, results) {
            if (err) {
              logger.log('error', err);
              connection.release();
              return next(error_msg.global.error);
            }
            if (results.changedRows == 0) {
              connection.release();
              return next(error_msg.user.verify_invalid_email_key);
            }
            else {
              connection.release();
              logger.log('info', user.email + "Successfully verified email address for user");
              res.send(success_msg.user.verify);
            }
          });
        }
      })
    }
  })
});

router.get('/auth/transaction', function(req, res, next ) {
	var select_query = "SELECT * FROM transactions WHERE email = ? ORDER BY created DESC";
	var today = getDateTime().split(" ")[1];
	var todaySeconds = parseInt(today.split(":")[0]) * 3600 + parseInt(today.split(":")[1] * 60) + parseInt(today.split(":"));
  parking_db.getConnection(function(err, connection) {
    if (err) {
      logger.log('error', err);
      return next(error_msg.global.error);
    }
    else {
      connection.query(select_query, req.decoded.email, function(err, results) {
        if(err) {
          logger.log('error', err);
          connection.release();
          return next(error_msg.global.error);
        }
        else {
          if (results.length == 0) {
            connection.release();
            return next(error_msg.user.no_transaction);
          }
          else {
            var select_query = "SELECT name, address, description FROM locations WHERE id = ?";
            async.forEachOf(results, function (value, key, callback) {
            	var date = new Date(results[key].end_time).toTimeString().split(" ")[0];
							var dateSeconds = parseInt(date.split(":")[0]) * 3600 + parseInt(date.split(":")[1]) * 60 + parseInt(date.split(":"));
							var difference = (dateSeconds - todaySeconds);
              if(difference > 0) {
                results[key].in_progress = true;
              }
              else {
                results[key].in_progress = false;
              }
              connection.query(select_query, [value.location_id], function(err, location) {
                if(err) {
                  logger.log('error', err)
                  return next(error_msg.global.error);
                }
                if(results.length != 0) {
                  results[key].location = location[0];
                  callback();
                }
                else {
                  callback();
                }
              });
            }, function(err) {
              connection.release();
              if(err) {
                logger.log('error', err)
                return next(error_msg.global.error);
              }
              else {
                logger.log('info', req.decoded.email + " Successfully retrieved transactions");
                res.send(results);
              }
            });
          }
        }
      })
    }
  });
});


router.use(function(err, req, res, next) {
  logger.log('error', err);
  res.status(err.status || 500);
  res.send({
    message: err.message || "Internal server error."
  });
})

function getDateTime() {
  var now     = new Date();
  var year    = now.getFullYear();
  var month   = now.getMonth()+1;
  var day     = now.getDate();
  var hour    = now.getHours();
  var minute  = now.getMinutes();
  var second  = now.getSeconds();
  if(month.toString().length == 1) {
      var month = '0'+month;
  }
  if(day.toString().length == 1) {
      var day = '0'+day;
  }
  if(hour.toString().length == 1) {
      var hour = '0'+hour;
  }
  if(minute.toString().length == 1) {
      var minute = '0'+minute;
  }
  if(second.toString().length == 1) {
      var second = '0'+second;
  }
  var dateTime = year+'/'+month+'/'+day+' '+hour+':'+minute+':'+second;
  return dateTime;
}


function getDateTime() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    if (month.toString().length == 1) {
        var month = '0' + month;
    }
    if (day.toString().length == 1) {
        var day = '0' + day;
    }
    if (hour.toString().length == 1) {
        var hour = '0' + hour;
    }
    if (minute.toString().length == 1) {
        var minute = '0' + minute;
    }
    if (second.toString().length == 1) {
        var second = '0' + second;
    }
    var dateTime = year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second;
    return dateTime;
}

function parkingPoolCreate() {
  var pool = mysql.createPool(config.parking_db, function(err) {
    console.log(err);
    console.log("Error connecting to db");
  })
  return pool;
}


module.exports = router;