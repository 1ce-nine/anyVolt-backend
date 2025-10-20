// knexfile.cjs
// -----------------------------------------------------
// Knex configuration for local MySQL migrations & seeds.
// Loads .env sitting in the backend root (next to package.json)
// using an absolute path so it works no matter where the CLI is run.
// -----------------------------------------------------

const path = require('path');
const dotenvPath = path.join(__dirname, '.env'); // Absolute path to .env
require('dotenv').config({ path: dotenvPath });  // Load environment vars

// Optional: uncomment to verify the environment variables being read
// console.log('ENV seen by Knex:', {
//   HOST: process.env.DATABASE_HOST,
//   USER: process.env.DATABASE_USERNAME,
//   DB: process.env.DATABASE_NAME,
//   PORT: process.env.DATABASE_PORT,
// });

module.exports = {
  // Use MySQL driver
  client: 'mysql2',

  // Connection settings with safe fallbacks
  connection: {
    host     : process.env.DATABASE_HOST     || '127.0.0.1',
    port     : Number(process.env.DATABASE_PORT || 3306),
    user     : process.env.DATABASE_USERNAME || 'anyvolt',
    password : process.env.DATABASE_PASSWORD || 'change_me',
    database : process.env.DATABASE_NAME     || 'anyvolt_dev',
  },

  // Prevent SQLite-specific warnings
  useNullAsDefault: true,

  // Migration settings
  migrations: {
    tableName: '_knex_migrations',
    directory: './migrations',
    disableTransactions: false,
  },

  // Seed settings
  seeds: {
    directory: './seeds',
  },
};
