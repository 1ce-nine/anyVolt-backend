// config/database.ts
// -----------------------------------------------------
// Strapi Database Configuration for Local Development
// -----------------------------------------------------
// This config tells Strapi to use MySQL instead of SQLite.
// It reads all connection info from .env.development.
// -----------------------------------------------------

export default ({ env }) => ({
  connection: {
    // Dev-comment: explicitly force MySQL as the database client.
    client: env('DATABASE_CLIENT', 'mysql'),

    // Dev-comment: define database connection settings.
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),         // MySQL host (Docker exposes this on localhost:3306)
      port: env.int('DATABASE_PORT', 3306),            // MySQL default port
      database: env('DATABASE_NAME', 'anyvolt_dev'),   // Database name
      user: env('DATABASE_USERNAME', 'anyvolt'),       // Database user
      password: env('DATABASE_PASSWORD', 'change_me'), // Database password

      // Dev-comment: disable SSL for local Docker MySQL; enable later for production.
      ssl: env.bool('DATABASE_SSL', false)
        ? { rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', false) }
        : false,

      charset: 'utf8mb4', // Dev-comment: ensures emoji/multilingual support
    },

    // Dev-comment: recommended pool settings for local dev.
    pool: { min: 2, max: 10 },

    // Dev-comment: optional connection timeout in milliseconds.
    acquireConnectionTimeout: 10000,
  },
});
