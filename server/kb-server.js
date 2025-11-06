// server/kb-server.js (CommonJS)
require('dotenv/config');
const express = require('express');
const cors = require('cors');
const Fuse = require('fuse.js');

const app = express();
app.use(cors());
app.use(express.json()); // ← NEW: to parse JSON bodies

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || '';
const PORT = process.env.KB_PORT || 4000;

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'; // ← NEW
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';             // ← NEW

let KB = [];
let fuse = null;

// ... (fetchAllStrapiProducts, buildFuseIndex, routes /health /kb /kb/refresh /search stay as-is)

/** Build a short context string from top Fuse hits */
function buildContext(query, topK = 4) {                                   // ← NEW
  if (!fuse) return '';
  const hits = fuse.search(query, { limit: topK });
  const blocks = hits.map(({ item }, i) => {
    const head = item.title ? `${item.title}` : `Product ${item.id}`;
    const body = (item.description || '').trim().slice(0, 800);
    return `#${i + 1} ${head}\n${body}`;
  });
  return blocks.join('\n\n');
}

async function fetchAllStrapiProducts() {
  const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
  const STRAPI_TOKEN = process.env.STRAPI_TOKEN || '';

  const out = [];
  let page = 1;
  const pageSize = 100;

  const stripHtml = (s) =>
    (s || '').toString().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  while (true) {
    // no fields filter (your 400 came from fields[]=...), just paginate
    const url =
      `${STRAPI_URL}/api/products` +
      `?pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

    const res = await fetch(url, {
      headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {},
    });
    if (!res.ok) throw new Error(`Strapi ${res.status}: ${await res.text()}`);

    const json = await res.json();

const items = (json?.data || []).map((p) => {
  // Support both shapes:
  // - v4 style: { id, attributes: { name, description, ... } }
  // - flat style (your output): { id, name, description, ... }
  const a = p.attributes ? p.attributes : p;

  const name = a.name ?? '';
  const description = stripHtml(a.description ?? '');

  const specs = [
    ['motorFamily', a.motorFamily],
    ['motorType', a.motorType],
    ['voltage', a.voltage],
    ['supplyVoltageMinV', a.supplyVoltageMinV],
    ['supplyVoltageMaxV', a.supplyVoltageMaxV],
    ['ratedPowerKw', a.ratedPowerKw],
    ['ratedTorqueNm', a.ratedTorqueNm],
    ['peakCurrentA', a.peakCurrentA],
    ['dutyCycle', a.dutyCycle],
    ['ipRating', a.ipRating],
    ['frameSizeIec', a.frameSizeIec],
    ['mountType', a.mountType],
    ['hasBrake', a.hasBrake ? 'Yes' : 'No'],
    ['brakeVoltageV', a.brakeVoltageV],
    ['brakeHoldingTorqueNm', a.brakeHoldingTorqueNm],
    ['gearboxRequired', a.gearboxRequired ? 'Yes' : 'No'],
    ['gearboxType', a.gearboxType],
    ['gearboxRatio', a.gearboxRatio],
    ['maxLengthMm', a.maxLengthMm],
    ['maxWidthOrDiameterMm', a.maxWidthOrDiameterMm],
    ['wireConnection', a.wireConnection],
    ['cooling', a.cooling],
    ['otherRequirements', a.otherRequirements],
    ['price', a.price],
    ['slug', a.slug],
  ]
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');

  return {
    id: p.id,
    title: name,
    description,
    searchableText: `${name}\n${description}\n${specs}`.trim(),
  };
});


    out.push(...items);

    const meta = json?.meta?.pagination;
    if (!meta || page >= meta.pageCount) break;
    page += 1;
  }

  // keep only records with at least a name or description
  return out.filter((p) => (p.title && p.title.trim()) || (p.description && p.description.trim()));
}

/** Minimal /ask: { question: string, topK?: number } */
app.post('/ask', async (req, res) => {                                     // ← NEW
  try {
    const question = (req.body?.question || '').trim();
    const topK = Math.max(1, Math.min(10, Number(req.body?.topK) || 4));
    if (!question) return res.status(400).json({ error: 'Missing question' });
    if (!fuse) return res.status(500).json({ error: 'Index not built yet' });

    const context = buildContext(question, topK);

    const prompt = `
You are a helpful product assistant. Answer ONLY using the provided product context.
If the context does not contain the answer, say you don't know and suggest asking a human.

Question:
${question}

Product Context:
${context}
`.trim();

    // Call Ollama /api/generate (non-streaming)
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(502).json({ error: `Ollama ${r.status}: ${errText}` });
    }

    const data = await r.json();
    // Ollama returns { response: "...", ... }
    res.json({ answer: data.response ?? '', model: OLLAMA_MODEL });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ---- Fuse.js index ----
function buildFuseIndex(products) {
  console.log('First 3 indexed products:', products.slice(0, 3));
  fuse = new Fuse(products, {
    includeScore: true,
    threshold: 0.5,
    keys: [
      { name: 'title', weight: 0.6 },
      { name: 'description', weight: 0.2 },
      { name: 'searchableText', weight: 0.2 },
    ],
  });
  console.log(`✅ Fuse index built with ${products.length} products`);
}



// Boot warmup stays the same
(async () => {
  try {
    KB = await fetchAllStrapiProducts();
    buildFuseIndex(KB);
  } catch (e) {
    console.warn('KB warmup failed (will still start server):', e?.message || e);
  }
})();

// Health + debug routes
app.get('/health', (req, res) => {
  res.json({ ok: true, productsIndexed: KB.length });
});

app.get('/kb', (req, res) => {
  res.json(KB);
});

// Temporary debug route to inspect Strapi response
app.get('/debug-products', async (req, res) => {
  try {
    const url = `${STRAPI_URL}/api/products?pagination[page]=1&pagination[pageSize]=3`;
    const response = await fetch(url, {
      headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {},
    });
    const json = await response.json();
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing q parameter' });
  if (!fuse) return res.status(500).json({ error: 'Search index not ready' });

  const results = fuse.search(q).map((r) => ({
    id: r.item.id,
    title: r.item.title,
    description: r.item.description,
    score: r.score
  }));

  res.json({ query: q, count: results.length, results });
});


app.listen(PORT, () => {
  console.log(`KB server running on http://localhost:${PORT}`);
});
