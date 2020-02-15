const _ = require('lodash');
const jwt = require('jsonwebtoken');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const db = require('../db');
const utils = require('../utils');
const redis = require('./redis');
const redisClient = redis.getRedisClient();

exports.setPreUserIdToken = (id, token) => {
  redisClient.set(`preUserId-${id}`, token, 'ex', 15 * 60);
}


exports.getTokenForUser = (user) => {
  const tokenData = _.pick(user, [
    'id',
    'email',
    'created_at',
  ]);
  // profile is too big so we take only the important bits
  tokenData.profile = {
    _json: user.profile._json,
  };
  const token = jwt.sign({
    ...tokenData,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
  }, process.env.JWT_SECRET);
  return token;
};

exports.invalidateToken = (token) => {
  if (token) {
    // invalidate this token
    redisClient.set(`invalid-${token}`, "true", 'ex', 7 * 24 * 60 * 60 * 1000);
  }
}

exports.serializeUser = (user, done) => {
  done(null, user.id);
}

exports.deserializeUser = (id, done) => {
  db('users')
    .where('id', '=', id)
    .first()
    .then((user) => {
      if (! user) {
        console.log(`could not find user with id: ${id}`);
        done(null, false, { message: `could not find user with id: ${id}` });
        return;
     }
      done(null, user);
    })
    .catch((err) => done(err, null))
}

async function verifyCsrfStateToken(stateQueryString, cookies, done) {
  const state = utils.http.parseQuerystring(stateQueryString);

  // Cross-Site Request Forgery (CSRF)
  // when we auth to Google, we send a state token with the request that
  // comes back in the reply. this is so we can verify that the user is
  // returning from a request we initiated and that the request has not
  // been tampered with.
  if (!state.csrfStateToken) {
    // this rarely happens
    console.log(`[ERROR]: no csrfStateToken found. could be possible CSRF attack`);
    done({ errorTrackingCode: 'missing-csrf', message: 'No csrfStateToken found' });
    return;
  }

  // verify that the CSRF token attached to the user's request matches the
  // one we have stored in the database.
  const preUserId = cookies['waldo-pre-auth'];
  if (!preUserId) {
    console.log(`[ERROR]: no preUserId attached to request`);
    done({ errorTrackingCode: 'invalid-csrf', message: 'No CSRF token found for that preUserId' });
    return;
  }
  const csrfStateToken = await redisClient.get(`preUserId-${preUserId}`);
  if (!csrfStateToken) {
    // this is happening suspiciously frequently
    console.log(`csrfStateToken was null in db for waldo-pre-auth: ${preUserId}. expecting ${state.csrfStateToken}`);
    done({ errorTrackingCode: 'invalid-csrf', message: 'No CSRF token found for that preUserId' });
    return;
  }
  if (csrfStateToken!==state.csrfStateToken) {
    // this is happening suspiciously frequently
    console.log(`csrfStateToken mismatch`);
    done({ errorTrackingCode: 'invalid-csrf', message: 'Invalid CSRF token' });
    return;
  }
  done();
}

function getOrCreateUser(profile, done) {
  db('users')
    .where('id', '=', profile.id)
    .first()
    .then(user => {
      if (user) {
        done(null, user);
        return;
      }
      db('users')
        .insert({
          id: profile.id,
          email: profile._json.email,
          org_id: profile._json.hd,
          profile,
        })
        .returning('*')
        .then(user => {
          db('invitations')
            .where('email_address', '=', profile._json.email)
            .andWhere('org_id', '=', profile._json.hd)
            .delete(() => {
              done(null, user[0]);
            })
        })
    })
}

exports.googleLogin = () => (
  new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      if (utils.http.isSuspiciousRequest(req)) {
        console.log(`[ERROR]: suspicious request identified`);
        done({ errorTrackingCode: 'suspicious-request', message: 'Suspect request' });
        return;
      }

      verifyCsrfStateToken(req.query.state, req.cookies, err => {
        if (err) {
          done(err);
          return;
        }
        // keep moving...
        getOrCreateUser(profile, (err, user) => {
          done(err, user);
        });
      });
    }
  )
);

exports.restrictJWT = async function restrictJWT(req, res, next) {
  const token = req.cookies[utils.http.getAuthCookieName()] || req.headers['x-waldo-token'];
  if (!token) {
    res.status(401);
    res.json({ message: "Unauthorized", errorCode: 1 });
    return;
  }

  // check to see if the token has be deauthorized. this would happen if the
  // user logged out. we don't have sessions so this is a little trickier than
  // usual
  redisClient.get(`invalid-${token}`, async (err, isInvaild) => {
    if (err) {
      res.status(401);
      res.json({ message: "Unauthorized", errorCode: 2.1 });
      return;
    }

    // we put the invalid tokens in redis, so if they're in there, we'll get
    // a "true" back
    if (isInvaild==="true") {
      res.status(401);
      res.json({ message: "Unauthorized", errorCode: 2.2 });
      return;
    }

    try {
      const data = jwt.verify(token, process.env.JWT_SECRET);
      // req.user is the subset of the full user
      req.user = data;

      const user = await db('users').where('id', '=', req.user.id).first();
      if (!user) {
        res.status(401);
        res.json({ message: "Unauthorized", errorCode: 2.3 });
        return;
      }

      res.setAuthCookie(user);
      next();
      return;
    } catch (e) {
      console.log(e);
      res.status(401);
      res.json({ message: "Unauthorized", errorCode: 2.4 });
      return;
    }
  });
}
