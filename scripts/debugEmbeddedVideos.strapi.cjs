require("dotenv").config();

process.env.PORT = process.env.PORT || "1338";
process.env.HOST = process.env.HOST || "127.0.0.1";

const { createStrapi } = require("@strapi/strapi");

(async () => {
  console.log("🚀 Booting Strapi to WIPE embedded videos table...");

  const app = await createStrapi().load();

  try {
    const uid = "api::embedded-video.embedded-video";

    const deleted = await app.db.query(uid).deleteMany({});
    console.log(`🧹 Deleted ${deleted.count ?? deleted} rows from embedded_videos table.`);
  } catch (err) {
    console.error("❌ Error wiping embedded videos:", err);
  }

  await app.destroy();
  console.log("👋 Strapi shut down after hard wipe.");
  process.exit(0);
})();
