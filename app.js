require('dotenv').config();
var express = require('express');
var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport = require('passport');
const passportConfig = require('./config/passport');
const mongoose = require('mongoose');
const cors = require('cors');

// MongoDB setup
mongoose.set("strictQuery", false);
const mongoDB = process.env.MONGODB_STRING;
main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(mongoDB);
};

// Routers
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const tweetsRouter = require('./routes/tweets');

var app = express();

// Middleware
app.use(logger('dev'));
app.use(passport.initialize());
passportConfig(passport);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Use Routers
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/tweets', tweetsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});
  
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
