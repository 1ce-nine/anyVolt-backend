// scripts/seedEmbeddedVideos.strapi.cjs

require('dotenv').config();

if (!process.env.ADMIN_AUTH_SECRET || !process.env.APP_KEYS) {
  console.error('❌ Missing ADMIN_AUTH_SECRET or APP_KEYS in .env – Strapi cannot boot.');
  process.exit(1);
}

// Make sure we boot in dev mode with same DB as your dev server
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.HOST = process.env.HOST || '127.0.0.1';
process.env.PORT = process.env.PORT || '1338';

const { createStrapi } = require('@strapi/strapi');

const slugify = (str) =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");


const RAW_VIDEOS = [
  {
    title: "Drone Aerial Shots - Kiwi Aerial Shots",
    videoUrl: "https://player.vimeo.com/video/130584326",
    platform: "vimeo",
    isFeatured: true,
  },
  {
    title: "Tunisia Drone Shots - Cap Bon Showreel",
    videoUrl: "https://player.vimeo.com/video/139641480",
    platform: "vimeo",
    isFeatured: true,
  },
  {
    title: "Lemana Tech Intro",
    videoUrl: "https://player.vimeo.com/video/1077724782",
    platform: "vimeo",
    isFeatured: true,
  },
  {
    title: "High-Tech - HUD & VFX Reel",
    videoUrl: "https://player.vimeo.com/video/166206694",
    platform: "vimeo",
    isFeatured: true,
  },
  {
    title: "Tech Flower",
    videoUrl: "https://player.vimeo.com/video/18958759",
    platform: "vimeo",
    isFeatured: true,
  },
];

(async () => {
  console.log('🚀 Booting Strapi for embedded video seeding...');

  const app = await createStrapi().load();

  try {
    const docService = app.documents('api::embedded-video.embedded-video');

    // 1) Clear existing documents for this content type (including ones made in admin)
    const existing = await docService.findMany({
      // all locales, all statuses
      status: 'draft', // document API defaults to draft; we’ll just delete everything regardless of status
    });
    const existingPublished = await docService.findMany({
      status: 'published',
    });

    const allToDelete = [
      ...existing,
      ...existingPublished,
    ];

    // de-duplicate by documentId
    const seen = new Set();
    const uniqueToDelete = allToDelete.filter((doc) => {
      if (seen.has(doc.documentId)) return false;
      seen.add(doc.documentId);
      return true;
    });

    if (uniqueToDelete.length > 0) {
      console.log(`🧹 Clearing ${uniqueToDelete.length} existing embedded video documents...`);
      for (const doc of uniqueToDelete) {
        await docService.delete({
          documentId: doc.documentId,
          locale: '*', // delete all locales for this document
        });
      }
    } else {
      console.log('🧹 No existing embedded video documents to clear.');
    }

    // 2) Create new documents via Document Service (so Content Manager sees them)
    console.log('🌱 Seeding embedded video documents...');

    for (const video of RAW_VIDEOS) {
        await docService.create({
            data: {
                title: video.title,
                slug: slugify(video.title),         // ✅ explicitly set slug
                videoUrl: video.videoUrl,
                platform: video.platform,
                isFeatured: video.isFeatured,
                // description, Media will just default to null
            },
            status: 'published',                  // publish immediately
            });

    }

    console.log(`✅ Seeded ${RAW_VIDEOS.length} embedded video documents.`);
  } catch (err) {
    console.error('❌ Error while seeding embedded videos:', err);
    process.exitCode = 1;
  } finally {
    try {
      await app.destroy();
    } catch (e) {
      console.warn("⚠️ Ignoring pool abort error during shutdown:", e.message);
    }

    console.log("👋 Strapi has been shut down after seeding.");
    process.exit(0);
  }
})();

