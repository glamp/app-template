if (process.env.NODE_ENV!=='production') {
  require('dotenv').config();
}
const fs = require('fs');
const path = require('path');
const express = require('express');
const passport = require('passport');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const request = require('request');

const routes = require('./routes');
const utils = require('./utils');

const app = express();
app.use(utils.http.logger);

app.use(bodyParser.json({ limit: '2MB', type: ['json', 'application/csp-report'] }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(utils.http.compression);
app.use(utils.http.helpers);
// security!
app.use(utils.http.forceHTTPS);
app.use(utils.http.helmet);
app.use(utils.http.hpp);
app.use(utils.http.nonce);


// auth middleware
app.use(passport.initialize());
passport.use(utils.auth.googleLogin());
passport.serializeUser(utils.auth.serializeUser);
passport.deserializeUser(utils.auth.deserializeUser);

// public routes
app.use('/auth', routes.auth());

// routes that need a CSRF token
app.use(utils.http.csurf);

// private routes
app.use('/stuff', utils.auth.restrictJWT, routes.stuff());

// serve the app
app.all('*', routes.app());

const port = process.env.PORT || 8888;
app.listen(port, () => console.log(`serving :${port}`));
