"use strict";

// config/database.js
// JS twin of database.ts so programmatic Strapi boot can see DB config.

module.exports = ({ env }) => ({
  connection: {
    client: env("DATABASE_CLIENT", "mysql"),

    connection: {
      host: env("DATABASE_HOST", "127.0.0.1"),
      port: env.int("DATABASE_PORT", 3306),
      database: env("DATABASE_NAME", "anyvolt_dev"),
      user: env("DATABASE_USERNAME", "anyvolt"),
      password: env("DATABASE_PASSWORD", "change_me"),
      ssl: env.bool("DATABASE_SSL", false)
        ? { rejectUnauthorized: env.bool("DATABASE_SSL_REJECT_UNAUTHORIZED", false) }
        : false,
      charset: "utf8mb4",
    },

    pool: { min: 2, max: 10 },
    acquireConnectionTimeout: 10000,
  },
});
