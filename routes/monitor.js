var express  = require('express');
var app = express();
var router = express.Router();
var cluster = require('cluster');

//Config
var config = require('../config/config');
var error_msg = require('../config/error_msg');
var success_msg = require('../config/success_msg');
var mysql = require('mysql');


var http = require('http');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

//Parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({
  extended: true
}));
//Parse application/json
router.use(bodyParser.json());
router.use(methodOverride());

// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for dying workers
    cluster.on('exit', function (worker) {

        // Replace the dead worker, we're not sentimental
        console.log('Worker %d died :(', worker.id);
        cluster.fork();

    });

// Code to run if we're in a worker process
} else {
    var connection = mysql.createConnection({
        host: '104.198.99.166',
        user: 'parking_server',
        password: 'testicicles',
        database: 'online_parking_database'
    });
    connection.connect(function (error) {
        if (error) {
            console.log('Cannot establish connection to database...');
            return;
        }
        console.log('Database connection established...');
    });
    //Checks the database every 5 minutes
    setInterval(function () {
        console.log('DB Request to worker %d', cluster.worker.id);
        //console.log("Checking database...");

    }, 3000);

    setInterval(function () {
        console.log('SERVER Request to worker %d', cluster.worker.id);
        //console.log("Checking server...");

        return http.get({
                host: "",
                path: "/"
            }, function (response) {
                var body;
                response.on('data', function () {
                    body += data;
                });
                response.on('end', function () {
                    var parsed = JSON.parse(body);
                    console.log(parsed);
                });
            }
        ).on('error', function (e) {
            console.log("Got error: " + e.message);
        });
    }, 3000);

    // Bind to a port
    var port = process.env.PORT || 8080;
    app.listen(port, function () {
        console.log("Express server listening on port %d in %s mode", port, app.settings.env);
        console.log('Worker %d running!', cluster.worker.id);

    });
}
//Checks the database every 5 minutes
 //setInterval(function() {
 //  console.log("Checking database...");
 //}, 3000);

 //setInterval(function(){
 //  console.log("Checking server...");
 //}, 3000);

router.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message || "Internal server error."
  });
});

function userPoolCreate() {
  var pool = mysql.createPool(config.local_db, function(err) {
    console.log(err);
    console.log("Error connecting to db");
  });
  return pool;
}



module.exports = router;
