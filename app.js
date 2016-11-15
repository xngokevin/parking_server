var express = require('express')
var app = express();
var config = require('./config/config');
var user = require('./routes/user');
var stripe = require('./routes/stripe');


//Set token secret
app.set('token_secret', config.token_secret);

//Login route
app.use('/api/v1/user', user);
app.use('/api/v1/stripe', stripe);

var port = process.env.PORT || 8080;
app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});
