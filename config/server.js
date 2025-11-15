"use strict";

// JS twin of server.ts so programmatic Strapi boot has app.keys etc.

module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("STRAPI_PUBLIC_URL", "http://localhost:1337"),
  app: {
    // Uses APP_KEYS from your .env:
    // APP_KEYS=pk1_goes_here,pk2_goes_here,pk3_goes_here,pk4_goes_here
    keys: env.array("APP_KEYS"),
  },
});
