const _ = require('lodash');
const enforce = require('express-sslify');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const RedisStore = require('rate-limit-redis');
const helmet = require('helmet');
const morgan = require('morgan');
const csurf = require('csurf');
const uuidv4 = require('uuid/v4');
const useragent = require('useragent');
const hpp = require('hpp');
const querystring = require('querystring');
const redisUtils = require('./redis');
const authUtils = require('./auth');


exports.getAuthCookieName = getAuthCookieName = () => {
  if (process.env.NODE_ENV==='production') {
    if (process.env.WALDO_ENV==='staging') {
      return 'waldo-web-token-staging';
    }
    return 'waldo-web-token';
  }
  return 'waldo-web-token-dev';
}

exports.fallbackErrorHandler = (err, req, res, next) => {
  if (err.code==='EBADCSRFTOKEN') {
    console.log('csurf detected form that had been tampered with');
    console.log('XSRF-TOKEN:', req.cookies['XSRF-TOKEN']);
    res.status(403);
    res.redirect('/error');
    return;
  }

  if (err) {
    console.error(`[SERVER ERRROR]: ${err.toString()}`);
    res.status(500);
    res.redirect('/error');
    return;
  }

  next();
}

exports.helpers = (req, res, next) => {
  res.redirectHome = () => {
    res.redirect('/');
  }

  res.replyOK = (data) => {
    if (_.isNil(data)) {
      res.json({ status: "OK" });
      return;
    }
    res.json({
      status: "OK",
      ...data
    });
  }

  res.replyError = (code, err) => {
    res.status(code);
    res.json({
      status: "ERROR",
      message: err.toString()
    });
  }

  res.setAuthCookie = (user) => {
    const token = authUtils.getTokenForUser(user);
    const expireIn = 7 * 24 * 60 * 60 * 1000; // 7 days
    res.cookie(getAuthCookieName(), token, {
      expires: new Date(Date.now() + expireIn),
      httpOnly: true,
      secure: process.env.NODE_ENV==='production'
    });
  }

  return next();
}

exports.forceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV==='production') {
    return enforce.HTTPS({ trustProtoHeader: true })(req, res, next);
  } else {
    return next();
  }
}

exports.csurf = csurf({
  cookie: {
    key: '_csrf-waldo-web',
    httpOnly: true,
    secure: process.env.NODE_ENV==='production',
    maxAge: 15 * 60,
  }
});

function getRateLimitStore() {
  if (process.env.REDIS_URL) {
    console.log('using redis for rateLimit memory store.');
    return new RedisStore({
      client: redisUtils.getRedisClient()
    });
  }
  return null; // will default to MemoryStore
}

const globalRateLimiter = rateLimit({
  store: getRateLimitStore(),
  windowMs: 2000,
  max: 50,
});

const userRateLimited = rateLimit({
  store: getRateLimitStore(),
  windowMs: 1000,
  max: 100,
  keyGenerator: (req) => {
    if (req.user) {
      return req.user.id;
    }
    return req.ip;
  }
});

exports.rateLimit = (req, res, next) => {
  if (req.user) {
    userRateLimited(req, res, next);
    return;
  }

  globalRateLimiter(req, res, next);
}

exports.helmet = helmet();
exports.hpp = hpp();
exports.csp = (req, res, next) => {
  if (process.env.NODE_ENV!=='production') {
    next();
    return;
  }
  helmet.contentSecurityPolicy({
    reportOnly: true,
    directives: {
      defaultSrc: [
        "'self'",
        'getwaldo.com',
        'apis.google.com',
      ],
      imgSrc: [
        "'self'",
        'www.google-analytics.com',
        'stats.g.doubleclick.net',
        'www.google.com',
      ],
      connectSrc: [
        "'self'",
        'rs.fullstory.com',
      ],
      scriptSrc: [
        "'self'",
        'www.googletagmanager.com',
        'googleads.g.doubleclick.net',
        'www.google-analytics.com',
        'www.googleadservices.com',
        'js.stripe.com',
        (req, res) => {
          return `nonce-${res.locals.nonce}`;
        },
      ],
      fontSrc: [
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'apis.google.com',
      ],
      styleSrc: [
        "'self'",
        'fonts.googleapis.com',
      ],
      objectSrc: [
        "'none'"
      ],
      // TODO: fix this
      // reportUri: '/csp',
    },
  })(req, res, next);
}

exports.nonce = (req, res, next) => {
  res.locals.nonce = Buffer.from(uuidv4()).toString('base64');
  next();
}

exports.useragent = (req, res, next) => {
  const agent = useragent.is(req.headers['user-agent']);
  if (agent.webkit || agent.opera || agent.ie || agent.chrome || agent.safari || agent.mobile_safari || agent.firefox || agent.mozilla || agent.android) {
    next();
    return;
  }
  console.log(`unsupported user agent: ${req.headers['user-agent']}`);
  res.replyError(401, 'Unauthorized');
}

exports.compression = (req, res, next) => (
  compression({
    filter: (req, res) => {
      // SSE apparently not compatible with compression
      if (req.path.endsWith('/stream')) {
        return false;
      }
      // fallback to standard filter function
      return compression.filter(req, res)
    }
  })(req, res, next)
)

exports.logger = morgan('dev');

/**
 * Should be called BEFORE bodyParser
 */
exports.bodyParserTimeout = (cfg) => {
  const { timeoutSeconds, httpStatusCode, httpStatus } = {
    timeoutSeconds: 10,
    httpStatusCode: 400,
    httpStatus: 'Timeout reading request input',
    ...cfg,
  }

  const timeout = timeoutSeconds * 1000

  return (req, res, next) => {
    req._bodyParserTimeout = setTimeout(() => {
      if (res.headersSent) return

      respondWithError(
        req,
        res,
        new HttpError(httpStatus, {
          code,
          httpStatusCode,
          userFriendly: true,
        }),
      )
    }, timeout)

    next()
  }
}

/**
 * Should be called AFTER bodyParser
 */
exports.clearBodyParserTimeout = () => {
  return (req, res, next) => {
    if (req._bodyParserTimeout) clearTimeout(req._bodyParserTimeout)
    next()
  }
}

exports.isSuspiciousRequest = (req) => {
  const referrer = req.header('Referer') || '';
  if (referrer.indexOf('accounts.google.ru') > -1) {
    return true;
  }
  return false;
}

exports.parseQuerystring = (q) => {
  try {
    let data = querystring.parse(q);
    if (data.referral_code==='null') {
      delete data['referral_code'];
    }
    return data;
  } catch (e) {
    console.log(e);
    return {};
  }
}
