// scripts/cleanupEmbeddedVideos.strapi.cjs

require("dotenv").config();

process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.HOST = process.env.HOST || "127.0.0.1";
process.env.PORT = process.env.PORT || "1338";

const { createStrapi } = require("@strapi/strapi");

(async () => {
  console.log("🚀 Booting Strapi to clean up embedded videos...");

  const app = await createStrapi().load();

  try {
    const uid = "api::embedded-video.embedded-video";

    // Delete any rows where publishedAt is null (the old, non-document rows)
    const result = await app.db.query(uid).deleteMany({
      where: { publishedAt: null },
    });

    console.log(`🧹 Deleted ${result.count ?? result} embedded video rows with publishedAt = null.`);
  } catch (err) {
    console.error("❌ Error cleaning up embedded videos:", err);
  }

  await app.destroy();
  console.log("👋 Strapi shut down after cleanup.");
  process.exit(0);
})();
