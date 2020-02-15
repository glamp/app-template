// add SSL for Heroku
let pgUri = process.env.DATABASE_URL;
if (process.env.NODE_ENV==='production') {
  pgUri += '?ssl=true';
}

const knex = require('knex')({
  client: 'postgresql',
  connection: pgUri,
});

module.exports = knex;
