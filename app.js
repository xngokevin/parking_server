var express = require('express')

var app = module.exports = express.createServer();
var user = require('./routes/user');

// Configuration
app.configure(function(){
  // app.set('views', __dirname + '/views');
  // app.set('view engine', 'jade');
  // app.use(express.bodyParser());
  // app.use(express.methodOverride());
  // app.use(app.router);
  // app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

//Login route
app.get('/user/login', user.login);

app.listen(8080, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
