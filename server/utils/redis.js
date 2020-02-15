const Redis = require('ioredis');
const url = require('url');

exports.getRedisClient = () => {
  if (process.env.WALDO_ENV==='production') {
    console.info('[INFO] using SSL for redis connection');
    const redisURI = url.parse(process.env.REDIS_URL);
    return new Redis({
      port: Number(redisURI.port) + 1,
      host: redisURI.hostname,
      password: redisURI.auth.split(':')[1],
      db: 0,
      tls: {
        rejectUnauthorized: false,
        requestCert: true,
        agent: false
      }
    });
  } else {
    return new Redis(process.env.REDIS_URL);
  }
}
