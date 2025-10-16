// knexfile.cjs
// -----------------------------------------------------
// Knex configuration for local MySQL migrations.
// Loads .env sitting in the backend root (next to package.json),
// using an absolute path so it works no matter where the CLI is run.
// -----------------------------------------------------

const path = require('path');
const dotenvPath = path.join(__dirname, '.env'); // <-- your .env path
require('dotenv').config({ path: dotenvPath });  // load variables

// Dev-check (optional): uncomment to print what Knex sees
// console.log('ENV seen by Knex:', {
//   HOST: process.env.DATABASE_HOST,
//   USER: process.env.DATABASE_USERNAME,
//   DB: process.env.DATABASE_NAME,
//   PORT: process.env.DATABASE_PORT,
// });

module.exports = {
  // MySQL driver
  client: 'mysql2',

  // Connection settings from environment (with safe fallbacks)
  connection: {
    host     : process.env.DATABASE_HOST || '127.0.0.1',
    port     : Number(process.env.DATABASE_PORT || 3306),
    user     : process.env.DATABASE_USERNAME || 'anyvolt',
    password : process.env.DATABASE_PASSWORD || 'change_me',
    database : process.env.DATABASE_NAME || 'anyvolt_dev',
  },

  // Quietens occasional warnings if knex ever touches sqlite APIs
  useNullAsDefault: true,

  // Where migrations live + bookkeeping table
  migrations: {
    tableName: '_knex_migrations',
    directory: './migrations',
    disableTransactions: false,
  },
};
