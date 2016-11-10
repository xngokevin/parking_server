var express = require('express')
var app = express();
var user = require('./routes/user');

//Login route
app.use('/api/v1/user', user);

var port = process.env.PORT || 8080;
app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});

app.use(function(err, req, res, next) {
  // Do logging and user-friendly error message display
  // console.error(err);
  res.status(500).send({status:500, message: 'internal error'});
})