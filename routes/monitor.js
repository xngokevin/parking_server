var express = require('express');
var app = express();
var router = express.Router();

//Config
var config = require('../config/config');
var error_msg = require('../config/error_msg');
var success_msg = require('../config/success_msg');
var mysql = require('mysql');
var parking_db = parkingPoolCreate();
var admin = require("firebase-admin");

var http = require('http');
var jwt = require('jsonwebtoken');
var Pusher = require('pusher');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var unirest = require('unirest');
const nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport(config.smtp_transport);

//Parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({
    extended: true
}));
//Parse application/json
router.use(bodyParser.json());
router.use(methodOverride());

var serviceAccount = require("../resources/parkingandroid-16ecf-firebase-adminsdk-h1ta3-193690839c.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://parkingandroid-16ecf.firebaseio.com"
});

var counter = 0;
var query = "SELECT * FROM parking_space;";
var alert = function () {
    parking_db.getConnection(function (err, connection) {
        if (err) {
            return next(error_msg.global.error);
        }
        else {
            connection.query(query, function (err, results) {
                connection.release();
                if (err) {
                    console.log(err);
                }
                else if (results.length == 0) {
                    console.log("NO DATA");
                }
                else {
                    var spaces = results;
                    var today = getDateTime().split(" ")[1];
                    var todaySeconds = parseInt(today.split(":")[0]) * 3600 + parseInt(today.split(":")[1] * 60) + parseInt(today.split(":"));
                    if (counter == 10) {
                        counter = 0;
                    }
                    counter++;
                    //console.log("COUNTER: " + counter);
                    for (var i = 0; i < spaces.length; i++) {
                        var date = new Date(spaces[i].end_time).toTimeString().split(" ")[0];
                        var dbDay = new Date(spaces[i].end_time).toDateString();
                        var today = new Date().toDateString();
                        var isToday = (today == dbDay) ? 1 : 0;
                        var dateSeconds = parseInt(date.split(":")[0]) * 3600 + parseInt(date.split(":")[1]) * 60 + parseInt(date.split(":"));
                        var difference = (dateSeconds - todaySeconds);
                        console.log("DIFFERENCE: " + difference);

                        if (difference <= 900 && difference >= 840 && isToday == 1) {
                            //console.log("REPORTED REPORTED REPORTED!!!");
                            var payload = {
                                notification: {
                                    body: "15 minutes left"
                                }
                            };
                            //var tokenQuery = ""
                            var registrationToken = "eS5_B1SW3dE:APA91bG1sKrFO_wwM8evV3hJ1KODqGGEoLshZIFu8USSi2ZBV095W_evNPTczTURu7uQvERvOMxKw0HVcQ_RM1rKQ12R46klXzA6yCBqkCNgs_DKD4iYy4h6D7xdlvpEimRdD-4ty9qS";
                            admin.messaging().sendToDevice(registrationToken, payload)
                                .then(function (response) {
                                    console.log("Sent Successfully: " + response);
                                }).catch(function (err) {
                                console.log("An Error Occurred while sending: " + err);
                            })
                        }
                        if (difference >= -900 && difference <= -840 && isToday == 1) {
                            var spaceId = spaces[i].space_id;
                            var locationId = spaces[i].location_id;
                            unirest.post('https://api.particle.io/v1/devices/3b0039000547333439313830/ultrasonic?access_token=89f8784572b79558afcd88d9c7b00c8e12934bf3')
                                .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
                                .send({"arg": "close"})
                                .end(function (response) {
                                    console.log(response.body);
                                    var occupied = response.body.return_value;
                                    if (occupied == 1) {
                                        console.log("LATE");
                                        // Send email with link for verification
                                        mail_options = {
                                            to: "onlineparkingseniordesign@gmail.com",
                                            subject: "Parking Space is LATE!",
                                            html: "Parking Space: " + spaceId + " In Location: " + locationId +  " is LATE!"
                                        };
                                        transporter.sendMail(mail_options, (error, info) => {
                                            if (error) {
                                                console.log("ERROR");
                                            }
                                            else {
                                                console.log("SUCCESS");
                                            }
                                            console.log('Message %s sent: %s', info.messageId, info.response);
                                        });

                                    }
                                });
                        }
                    }
                    console.log("\n");
                }
            })
        }
    })
}

setInterval(alert, 6000);

router.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        message: err.message || "Internal server error."
    });
});

function parkingPoolCreate() {
    var pool = mysql.createPool(config.parking_db, function (err) {
        console.log(err);
        console.log("Error connecting to db");
    });
    return pool;
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

module.exports = router;
