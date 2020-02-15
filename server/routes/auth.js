const passport = require('passport');
const Router = require('express').Router;
const querystring = require('querystring');
const shortid = require('shortid');
const utils = require('../utils');

module.exports = () => {
  const router = Router();

  router.get('/google', (req, res) => {
    const preUserId = shortid.generate();
    const csrfStateToken = shortid.generate();
    res.cookie('waldo-pre-auth', preUserId, {
      expires: new Date(Date.now() + 15 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV==='production'
    });

    // https://auth0.com/docs/protocols/oauth2/oauth-state
    const state = {
      csrfStateToken
    }
    if (req.query.referral_code) {
      state.referral_code = req.query.referral_code;
    }

    if (req.query.redirectTo) {
      state.redirectTo = req.query.redirectTo;
    }

    utils.auth.setPreUserIdToken(preUserId, csrfStateToken);

    passport.authenticate('google', {
      accessType: 'offline',
      prompt: req.query.prompt==='consent' ? 'consent' : null,
      state: querystring.stringify(state),
      scope: [
        'profile',
        'email',
      ]
    })(req, res);
  });

  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
      (err, req, res, next) => {
        if (err) {
          console.log(`[ERROR]: error performing Google Oauth: ${err.message || err}`);
          if (err.errorTrackingCode) {
            console.log(err.errorTrackingCode);
            res.cookie('waldo-authentication-error-code', err.errorTrackingCode, {
              expires: new Date(Date.now() + 30 * 1000),
              httpOnly: false,
              secure: process.env.NODE_ENV==='production'
            });
          }
          res.redirect('/something-is-broken');
          return;
        }
        next();
      }, (req, res) => {
        if (!req.user) {
          console.log(`user was not serialized`);
          res.redirect('/app/login');
          return;
        }
        res.setAuthCookie(req.user);
        res.redirect(req.query.state.redirectTo || '/app/people');
      }
  );

  router.get('/logout', (req, res) => {
    const token = req.cookies[utils.http.getAuthCookieName()];
    utils.auth.invalidateToken(token);
    res.clearCookie(utils.http.getAuthCookieName(), { httpOnly: true, secure: process.env.NODE_ENV==='production' });
    req.logout();
    res.redirectHome();
  });

  return router;
}
