"use strict";

// JS twin of config/admin.ts so programmatic Strapi boot has an admin.auth.secret

module.exports = ({ env }) => ({
  auth: {
    // This will use ADMIN_AUTH_SECRET from your .env
    secret: env("ADMIN_AUTH_SECRET", "put_random_string_here"),
  },
  apiToken: {
    salt: env("API_TOKEN_SALT", "put_random_string_here"),
  },
  transfer: {
    token: {
      salt: env("TRANSFER_TOKEN_SALT", "put_random_string_here"),
    },
  },
});
