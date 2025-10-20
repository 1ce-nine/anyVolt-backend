// Avoid port clash with the running dev server
process.env.PORT = process.env.PORT || '1338';
process.env.HOST = process.env.HOST || '127.0.0.1';

const strapiPkg = require('@strapi/strapi');

// 🧩 Product catalog
const PRODUCTS = [
  {
    slug: 'anyvolt-super-charger-5000',
    name: 'AnyVolt Super Charger 5000',
    price: 1500,
    description:
      'High-efficiency 5kW charging station designed for drone and EV systems. Features adaptive voltage control and solar input.',
  },
  {
    slug: 'solardock-mini',
    name: 'SolarDock Mini',
    price: 800,
    description:
      'Compact solar-powered docking station for small UAVs and robotics. Includes integrated battery and weatherproof shell.',
  },
  {
    slug: 'voltvision-sensor-kit',
    name: 'VoltVision Sensor Kit',
    price: 499,
    description:
      'Precision environmental monitoring kit with humidity, air-quality, and motion sensors. Ideal for smart infrastructure projects.',
  },
  {
    slug: 'voltguard-eco-battery',
    name: 'VoltGuard Eco Battery',
    price: 999,
    description:
      'Lightweight lithium battery with thermal stability and 25% improved energy retention. Built for off-grid use cases.',
  },
  {
    slug: 'anyvolt-fastcharge-pro',
    name: 'AnyVolt FastCharge Pro',
    price: 1899,
    description:
      'Professional-grade charger for high-demand energy storage units. Auto-balancing cells and advanced heat dispersion.',
  },
  {
    slug: 'voltlink-usb-c-hub',
    name: 'VoltLink USB-C Hub',
    price: 129,
    description:
      'Aluminium 6-in-1 hub providing lightning-fast connectivity and surge protection. Perfect companion for field technicians.',
  },
  {
    slug: 'ecocharge-portable-150',
    name: 'EcoCharge Portable 150',
    price: 349,
    description:
      '150W portable power bank with solar recharge and rugged case. Ideal for outdoor projects or emergency backup.',
  },
  {
    slug: 'aeropanel-flex-200',
    name: 'AeroPanel Flex 200',
    price: 799,
    description:
      'Flexible solar panel built with reinforced composite backing. Lightweight, foldable, and drone-mount compatible.',
  },
  {
    slug: 'voltmesh-network-node',
    name: 'VoltMesh Network Node',
    price: 950,
    description:
      'Edge network node for distributed drone communication. Provides low-latency mesh connectivity and encrypted data channels.',
  },
  {
    slug: 'voltcloud-gateway',
    name: 'VoltCloud Gateway',
    price: 1399,
    description:
      'Secure IoT gateway enabling centralized monitoring of multiple AnyVolt devices. Includes API integration and OTA updates.',
  },
  {
    slug: 'voltflow-energy-hub',
    name: 'VoltFlow Energy Hub',
    price: 2599,
    description:
        'A modular all-in-one power management system that intelligently balances solar, battery, and grid inputs. Features remote diagnostics and AI-driven efficiency tuning.',
},
    {
    slug: 'voltcore-smart-inverter',
    name: 'VoltCore Smart Inverter',
    price: 1890,
    description:
        'Next-generation inverter with adaptive load management and real-time analytics. Supports solar, battery, and grid input with seamless automatic switching for maximum uptime.',
    },


  {
    slug: 'volttracker-gps-module',
    name: 'VoltTracker GPS Module',
    price: 275,
    description:
      'Compact, high-precision GPS tracker with multi-band coverage and offline logging for field robotics.',
  },
  {
    slug: 'voltcare-maintenance-kit',
    name: 'VoltCare Maintenance Kit',
    price: 179,
    description:
      'Comprehensive maintenance toolkit for servicing AnyVolt systems. Includes diagnostics adapter and cleaning tools.',
  },
  {
    slug: 'anyvolt-ultra-dock',
    name: 'AnyVolt Ultra Dock',
    price: 2199,
    description:
      'Industrial-grade charging and data dock with modular expansion bays. Supports up to 10 simultaneous devices.',
  },
  {
    slug: 'voltcharge-wall-unit',
    name: 'VoltCharge Wall Unit',
    price: 899,
    description:
      'Wall-mounted smart charger for home or lab use. Features dynamic load balancing and cloud-connected monitoring.',
  },
  {
    slug: 'voltair-propulsion-core',
    name: 'VoltAir Propulsion Core',
    price: 3299,
    description:
      'Next-generation electric propulsion core for UAVs with advanced efficiency mapping and temperature regulation.',
  },
];

// -----------------------------------------------------------
// Seeding logic
// -----------------------------------------------------------
(async () => {
  console.log('🚀 Booting Strapi for seeding...');

  // Boot Strapi programmatically
  const app = strapiPkg.createStrapi({ distDir: './dist' });
  await app.start();

  console.log(`🌿 Seeding ${PRODUCTS.length} products...`);
  const svc = app.documents('api::product.product');

  // Delete existing entries (idempotent)
  for (const p of PRODUCTS) {
    const existing = await svc.findMany({
      filters: { slug: { $eq: p.slug } },
      fields: ['documentId'],
    });
    for (const e of existing) {
      await svc.delete({ documentId: e.documentId });
      console.log(`🗑️  Deleted existing: ${p.slug}`);
    }
  }

  // Create + publish new ones
  for (const p of PRODUCTS) {
    await svc.create({ data: p, status: 'published' });
    console.log(`✅ Created: ${p.name}`);
  }

  console.log(`🌱 Seed complete (${PRODUCTS.length} products).`);
  await app.destroy();
  process.exit(0);
})().catch(async (err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
