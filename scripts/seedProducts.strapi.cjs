require('dotenv').config(); // load .env early

if (!process.env.ADMIN_AUTH_SECRET) {
  console.error('Missing ADMIN_AUTH_SECRET in environment (.env)');
  process.exit(1);
}

// Avoid port clash with the running dev server
process.env.PORT = process.env.PORT || '1338';
process.env.HOST = process.env.HOST || '127.0.0.1';

const strapiPkg = require('@strapi/strapi');

// Toggle pruning of products that aren't in PRODUCTS (authoritative seeding)
const SYNC_UNLISTED = String(process.env.SYNC_UNLISTED || 'false').toLowerCase() === 'true';

// 🧩 Product catalog (make this your source of truth)
const PRODUCTS = [
  {
    slug: 'anyvolt-super-charger-5000',
    name: 'AnyVolt Super Charger 5000',
    price: 1500,
    description:
      'High-efficiency 5 kW charging station designed for drone and EV systems. Features adaptive voltage control and solar input.',
    voltage: 100,
    motorFamily: 'AC',
    motorType: 'Synchronous',
    supplyVoltageMinV: 90,
    supplyVoltageMaxV: 250,
    ratedPowerKw: 5,
    ratedTorqueNm: 50,
    peakCurrentA: 15,
    dutyCycle: 'Continuous',
    ipRating: 'IP55',
    frameSizeIec: 'IEC90',
    mountType: 'Foot',
    hasBrake: false,
    gearboxRequired: false,
    maxLengthMm: 420,
    maxWidthOrDiameterMm: 200,
    wireConnection: 'Connection Box',
    cooling: 'Fan',
    otherRequirements: 'Optimized for 24/7 operation with solar feed input.'
  },
  {
    slug: 'voltair-propulsion-core',
    name: 'VoltAir Propulsion Core',
    price: 3299,
    description:
      'Next-generation electric propulsion core for UAVs with advanced efficiency mapping and temperature regulation.',
    voltage: 70,
    motorFamily: 'DC_PM',
    motorType: 'Brushless',
    supplyVoltageMinV: 48,
    supplyVoltageMaxV: 90,
    ratedPowerKw: 3.5,
    ratedTorqueNm: 32,
    peakCurrentA: 20,
    dutyCycle: 'Intermittent S2',
    ipRating: 'IP67',
    frameSizeIec: 'IEC80',
    mountType: 'Flange',
    hasBrake: true,
    brakeVoltageV: 24,
    brakeHoldingTorqueNm: 10,
    gearboxRequired: true,
    gearboxType: 'Planetary',
    gearboxRatio: 3.5,
    maxLengthMm: 260,
    maxWidthOrDiameterMm: 140,
    wireConnection: 'Loose Cables',
    cooling: 'Liquid',
    otherRequirements: 'Lightweight carbon housing for drone integration.'
  },
  {
    slug: 'voltcore-smart-inverter',
    name: 'VoltCore Smart Inverter',
    price: 1890,
    description:
      'Next-generation inverter with adaptive load management and real-time analytics. Supports solar, battery, and grid input.',
    voltage: 140,
    motorFamily: 'AC',
    motorType: 'Three Phase',
    supplyVoltageMinV: 110,
    supplyVoltageMaxV: 240,
    ratedPowerKw: 4.8,
    ratedTorqueNm: 45,
    peakCurrentA: 18,
    dutyCycle: 'Continuous',
    ipRating: 'IP65',
    frameSizeIec: 'IEC100',
    mountType: 'Both',
    hasBrake: false,
    gearboxRequired: false,
    maxLengthMm: 310,
    maxWidthOrDiameterMm: 160,
    wireConnection: 'Connection Box',
    cooling: 'Water',
    otherRequirements: 'Integrated smart sensors for real-time monitoring.'
  },
  {
    slug: 'voltflow-energy-hub',
    name: 'VoltFlow Energy Hub',
    price: 2599,
    description:
      'A modular all-in-one power management system that balances solar, battery, and grid inputs.',
    voltage: 12,
    motorFamily: 'PM_FREE',
    motorType: 'Reluctance',
    supplyVoltageMinV: 10,
    supplyVoltageMaxV: 60,
    ratedPowerKw: 1.5,
    ratedTorqueNm: 20,
    peakCurrentA: 8,
    dutyCycle: 'Intermittent S2',
    ipRating: 'IP54',
    frameSizeIec: 'IEC63',
    mountType: 'Foot',
    hasBrake: false,
    gearboxRequired: true,
    gearboxType: 'Helical',
    gearboxRatio: 2,
    maxLengthMm: 240,
    maxWidthOrDiameterMm: 130,
    wireConnection: 'Connection Box',
    cooling: 'Fan',
    otherRequirements: 'Optimized for low-noise indoor installations.'
  },
  {
    slug: 'ecocharge-portable-150',
    name: 'EcoCharge Portable 150',
    price: 349,
    description:
      '150 W portable power bank with solar recharge and rugged case. Ideal for outdoor projects or emergency backup.',
    voltage: 114,
    motorFamily: 'DC_PM',
    motorType: 'Brushed',
    supplyVoltageMinV: 12,
    supplyVoltageMaxV: 24,
    ratedPowerKw: 0.15,
    ratedTorqueNm: 2,
    peakCurrentA: 4,
    dutyCycle: 'Continuous',
    ipRating: 'IP44',
    frameSizeIec: 'IEC56',
    mountType: 'Foot',
    hasBrake: false,
    gearboxRequired: false,
    maxLengthMm: 180,
    maxWidthOrDiameterMm: 90,
    wireConnection: 'Loose Cables',
    cooling: 'Fan',
    otherRequirements: 'Built-in solar recharge controller.'
  },

  // --- Extra 5 you asked for ---
  {
    slug: 'voltspin-ultra-light-axial',
    name: 'VoltSpin Ultra Light Axial',
    price: 2799,
    description:
      'Axial-flux motor for UAV propulsion and lightweight robotics. High torque density with minimal vibration.',
    voltage: 85,
    motorFamily: 'DC_PM',
    motorType: 'Axial-Flux',
    supplyVoltageMinV: 60,
    supplyVoltageMaxV: 100,
    ratedPowerKw: 2.8,
    ratedTorqueNm: 35,
    peakCurrentA: 22,
    dutyCycle: 'Continuous',
    ipRating: 'IP66',
    frameSizeIec: 'IEC71',
    mountType: 'Flange',
    hasBrake: false,
    gearboxRequired: false,
    maxLengthMm: 210,
    maxWidthOrDiameterMm: 120,
    wireConnection: 'Loose Cables',
    cooling: 'Fan',
    otherRequirements: 'Optimized for aerial maneuverability and efficiency.'
  },
  {
    slug: 'synvolv-industrial-reluctance-250',
    name: 'SynVolv Industrial Reluctance 250',
    price: 3120,
    description:
      'Synchronous reluctance motor for industrial automation. Robust torque with reduced magnetic losses.',
    voltage: 240,
    motorFamily: 'PM_FREE',
    motorType: 'Switched Reluctance',
    supplyVoltageMinV: 180,
    supplyVoltageMaxV: 260,
    ratedPowerKw: 7.5,
    ratedTorqueNm: 90,
    peakCurrentA: 30,
    dutyCycle: 'Continuous',
    ipRating: 'IP65',
    frameSizeIec: 'IEC132',
    mountType: 'Foot',
    hasBrake: true,
    brakeVoltageV: 48,
    brakeHoldingTorqueNm: 20,
    gearboxRequired: false,
    maxLengthMm: 480,
    maxWidthOrDiameterMm: 220,
    wireConnection: 'Connection Box',
    cooling: 'Water',
    otherRequirements: 'Great for automation lines and conveyors.'
  },
  {
    slug: 'dynapulse-marine-series-400',
    name: 'DynaPulse Marine Series 400',
    price: 4999,
    description:
      'Corrosion-resistant three-phase motor for marine propulsion with long operational life in saltwater.',
    voltage: 400,
    motorFamily: 'AC',
    motorType: 'Three Phase',
    supplyVoltageMinV: 320,
    supplyVoltageMaxV: 440,
    ratedPowerKw: 12,
    ratedTorqueNm: 150,
    peakCurrentA: 40,
    dutyCycle: 'Continuous',
    ipRating: 'IP68',
    frameSizeIec: 'IEC160',
    mountType: 'Flange',
    hasBrake: false,
    gearboxRequired: true,
    gearboxType: 'Helical',
    gearboxRatio: 2.8,
    maxLengthMm: 520,
    maxWidthOrDiameterMm: 280,
    wireConnection: 'Connection Box',
    cooling: 'Water',
    otherRequirements: 'Marine-grade hardware and anti-corrosion coating.'
  },
  {
    slug: 'microvolt-precision-servo-90',
    name: 'MicroVolt Precision Servo 90',
    price: 1450,
    description:
      'Compact servo with precision feedback for robotics/CNC. Smooth low-speed response.',
    voltage: 90,
    motorFamily: 'AC',
    motorType: 'Synchronous',
    supplyVoltageMinV: 24,
    supplyVoltageMaxV: 90,
    ratedPowerKw: 0.8,
    ratedTorqueNm: 10,
    peakCurrentA: 6,
    dutyCycle: 'Intermittent S2',
    ipRating: 'IP54',
    frameSizeIec: 'IEC63',
    mountType: 'Both',
    hasBrake: true,
    brakeVoltageV: 24,
    brakeHoldingTorqueNm: 5,
    gearboxRequired: true,
    gearboxType: 'Planetary',
    gearboxRatio: 4.2,
    maxLengthMm: 190,
    maxWidthOrDiameterMm: 110,
    wireConnection: 'Loose Cables',
    cooling: 'Fan',
    otherRequirements: 'Includes digital encoder for position tracking.'
  },
  {
    slug: 'thermocharge-industrial-fan-700',
    name: 'ThermoCharge Industrial Fan 700',
    price: 2140,
    description:
      'Rugged asynchronous AC motor for high-volume air/cooling systems. Built for continuous operation at elevated temps.',
    voltage: 415,
    motorFamily: 'AC',
    motorType: 'Asynchronous',
    supplyVoltageMinV: 380,
    supplyVoltageMaxV: 440,
    ratedPowerKw: 15,
    ratedTorqueNm: 120,
    peakCurrentA: 38,
    dutyCycle: 'Continuous',
    ipRating: 'IP55',
    frameSizeIec: 'IEC180',
    mountType: 'Foot',
    hasBrake: false,
    gearboxRequired: false,
    maxLengthMm: 560,
    maxWidthOrDiameterMm: 300,
    wireConnection: 'Connection Box',
    cooling: 'Fan',
    otherRequirements: 'Insulation/bearings rated up to 180°C.'
  }
];

// -----------------------------------------------------------
// Seeding logic
// -----------------------------------------------------------
(async () => {
  console.log('🚀 Booting Strapi for seeding...');
  const app = strapiPkg.createStrapi({ distDir: './dist' });
  await app.start();

  const svc = app.documents('api::product.product');

  // Helper: fetch ALL existing products (paginated)
  async function fetchAllExisting() {
    const all = [];
    let page = 1;
    const pageSize = 100;
    while (true) {
      const batch = await svc.findMany({
        fields: ['documentId', 'slug', 'name'],
        pagination: { page, pageSize }
      });
      all.push(...batch);
      if (batch.length < pageSize) break;
      page += 1;
    }
    return all;
  }

  // Optional sync: delete anything not in PRODUCTS
  const desiredSlugs = new Set(PRODUCTS.map(p => p.slug));
  const existing = await fetchAllExisting();

  if (SYNC_UNLISTED) {
    const toDelete = existing.filter(e => !desiredSlugs.has(e.slug));
    if (toDelete.length) {
      console.log(`🧹 Pruning ${toDelete.length} unlisted product(s)...`);
      for (const e of toDelete) {
        await svc.delete({ documentId: e.documentId });
        console.log(`🗑️  Deleted unlisted: ${e.slug}`);
      }
    } else {
      console.log('🧹 No unlisted products to prune.');
    }
  }

  console.log(`🌿 Seeding ${PRODUCTS.length} products (upsert by slug)...`);

  // Upsert: delete & recreate by slug (idempotent)
  for (const p of PRODUCTS) {
    const existingBySlug = await svc.findMany({
      filters: { slug: { $eq: p.slug } },
      fields: ['documentId', 'slug']
    });
    for (const e of existingBySlug) {
      await svc.delete({ documentId: e.documentId });
      console.log(`🗑️  Deleted existing: ${p.slug}`);
    }
    await svc.create({ data: p, status: 'published' });
    console.log(`✅ Created: ${p.name}`);
  }

  console.log('🌱 Seed complete.');
  await app.destroy();
  process.exit(0);
})().catch(async (err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
