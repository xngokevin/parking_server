var express  = require('express');
var app = express();
var router = express.Router();

//Config
var config = require('../config/config');
var error_msg = require('../config/error_msg');
var success_msg = require('../config/success_msg');

var http = require('http');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var methodOverride = require('method-override')

//Parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({
  extended: true
}))
//Parse application/json
router.use(bodyParser.json());
router.use(methodOverride());

//Checks the database every 5 minutes
// setInterval(function() {
//   console.log("Checking database...");
// }, 300000);

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
