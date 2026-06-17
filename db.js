'use strict';

const { Pool } = require('pg');

//env
const pool = new Pool({
  connectionString: process.env.DB_CON_STRING
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
