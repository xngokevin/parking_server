var express = require('express');
var app = express();
var config = require('./config/config');
var user = require('./routes/user');
var stripe = require('./routes/stripe');
var monitor = require('./routes/monitor');
var parking = require('./routes/parking');
// Include the cluster module
var cluster = require('cluster');
var mysql = require("mysql");
var http = require("http");

//Set token secret
app.set('token_secret', config.token_secret);

//Login route
app.use('/api/v1/user', user);

//Stripe route
app.use('/api/v1/stripe', stripe);

//Parking route
app.use('/api/v1/parking', parking);

app.use('/api/v1/monitor', monitor);


// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    // var cpuCount = require('os').cpus().length;
    var cpuCount = 2;

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
    if (cluster.worker.id == 1) {
        //Checks the database every 5 minutes
        console.log('DB Request to worker %d', cluster.worker.id);
        //console.log("Checking database...");


    } else if (cluster.worker.id == 2) {
        // Bind to a port
        var port = process.env.PORT || 8080;
        app.listen(port, function () {
            console.log("Express server listening on port %d in %s mode", port, app.settings.env);
            console.log('Worker %d running!', cluster.worker.id);
        });
    }

}

