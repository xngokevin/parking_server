var express = require('express')
var app = express();
var config = require('./config/config');
var user = require('./routes/user');
var stripe = require('./routes/stripe');
var monitor = require('./routes/monitor');
var parking = require('./routes/parking');


//Set token secret
app.set('token_secret', config.token_secret);

//Login route
app.use('/api/v1/user', user);

//Stripe route
app.use('/api/v1/stripe', stripe);

//Parking route
app.use('api/v1/parking', parking);

app.use('/api/v1/monitor', monitor);


var port = process.env.PORT || 8080;
app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});
