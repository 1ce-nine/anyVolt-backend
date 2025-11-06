/* src/api/product/controllers/product.ts */
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const axios = require('axios');

/** Config (env overrides allowed) */
const OLLAMA_BASE        = process.env.OLLAMA_URL || 'http://localhost:11434';
const QDRANT_BASE        = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION  = process.env.QDRANT_COLLECTION || 'anyvolt_products_v1';
const EMBED_MODEL        = process.env.EMBED_MODEL || 'nomic-embed-text:latest';
const CHAT_MODEL_DEFAULT = process.env.CHAT_MODEL || 'llama3.1:8b';
const RAG_TOP_N          = Number(process.env.RAG_TOP_N || '2'); // how many items to include in context/lists

/** HTTP client (longer timeout for first model load) */
const http = axios.create({ timeout: 120_000 });

/** Small helpers */
const isArray = (v: unknown): v is any[] => Array.isArray(v);
const trim = (s: unknown): string | null => (typeof s === 'string' ? s.trim() : null);
const safe = (s: any, n = 300) => (typeof s === 'string' ? s.slice(0, n) : (s ?? '—'));
const fmtRange = (min?: number, max?: number, unit = '') => {
  if (min != null && max != null) return `${min}–${max}${unit}`;
  if (min != null) return `${min}${unit}`;
  if (max != null) return `${max}${unit}`;
  return '—';
};

/** Ollama endpoints */
function OLLAMA_EMBED_URL() { return `${OLLAMA_BASE}/api/embeddings`; }
function OLLAMA_CHAT_URL()  { return `${OLLAMA_BASE}/api/chat`; }
function OLLAMA_GEN_URL()   { return `${OLLAMA_BASE}/api/generate`; }

/** Try multiple chat models until one answers (404 model-not-found tolerated) */
async function askModel(httpInst: any, strapi: any, system: string, userQuestion: string, models: string[]) {
  for (const model of models) {
    try {
      strapi.log.info(`[assistant] trying model: ${model}`);
      const { data } = await httpInst.post(OLLAMA_CHAT_URL(), {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: userQuestion },
        ],
        stream: false,
      }, { timeout: 120_000 });

      const msg =
        trim(data?.message?.content) ??
        trim(data?.choices?.[0]?.message?.content) ??
        null;

      if (msg) return msg;
    } catch (e: any) {
      const code = e?.response?.status;
      const txt  = e?.response?.data?.error || e?.message;
      strapi.log.warn(`[assistant] model ${model} failed (${code}): ${txt}`);
      if (code !== 404) throw e; // network/other errors bubble up
    }
  }
  return null;
}

module.exports = createCoreController('api::product.product', ({ strapi }) => ({

  // POST /api/products/assistant-chat
  async chat(ctx) {
    const userQuestion = ctx.request.body?.message as string | undefined;
    if (!userQuestion) return ctx.badRequest("Missing 'message' field");

    try {
      // 1) Embed the question
      strapi.log.info(`[assistant] embed -> ${userQuestion}`);
      const { data: embed } = await http.post(OLLAMA_EMBED_URL(), {
        model: EMBED_MODEL,
        prompt: userQuestion,
      }, { timeout: 120_000 });

      const vector = embed?.embedding;
      if (!isArray(vector)) {
        strapi.log.error('[assistant] bad embedding response', embed);
        return ctx.internalServerError('Embedding failed');
      }

      // 2) Qdrant vector search (slightly lenient threshold)
      strapi.log.info(`[assistant] qdrant search in ${QDRANT_COLLECTION}`);
      const { data: search } = await http.post(
        `${QDRANT_BASE}/collections/${QDRANT_COLLECTION}/points/search`,
        { vector, limit: Math.max(RAG_TOP_N, 5), with_payload: true, score_threshold: 0.10 },
        { timeout: 120_000 }
      );

      const hits = (search?.result ?? []) as any[];
      strapi.log.info(`[assistant] hits: ${hits.length}`);

      if (!hits.length) {
        ctx.body = { reply: "Sorry, I don’t have AnyVolt product information on that yet." };
        return;
      }

      // --- FIELD QUESTION FAST-PATH (no LLM) ------------------------------
      // If the user asks for a specific field (motor type, voltage, etc.),
      // answer directly from the top hits' structured payloads to avoid hallucinations.
      const fieldMatchers: { key: string; rx: RegExp; label: string }[] = [
        { key: 'motorType',          rx: /\bmotor\s*type\b/i,                 label: 'Motor Type' },
        { key: 'motorFamily',        rx: /\bmotor\s*family\b/i,               label: 'Motor Family' },
        { key: 'supplyVoltage',      rx: /\b(voltage|supply\s*voltage)\b/i,   label: 'Supply Voltage' },
        { key: 'ratedPowerKw',       rx: /\b(power|rated\s*power)\b/i,        label: 'Rated Power' },
        { key: 'ratedTorqueNm',      rx: /\b(torque|rated\s*torque)\b/i,      label: 'Rated Torque' },
        { key: 'ipRating',           rx: /\bip\s*rating\b/i,                  label: 'IP Rating' },
        { key: 'cooling',            rx: /\bcooling\b/i,                      label: 'Cooling' },
        { key: 'mountType',          rx: /\bmount(ing)?\s*(type)?\b/i,        label: 'Mount Type' },
        { key: 'hasBrake',           rx: /\b(has|with)\s*a?\s*brake\b/i,      label: 'Brake' },
      ];
      function detectFieldIntent(q: string) {
        return fieldMatchers.find(m => m.rx.test(q));
      }
      const candidates: any[] = hits
        .slice(0, Math.max(RAG_TOP_N, 2))
        .map((h: any) => h?.payload ?? {})
        .filter(Boolean);

      const fieldIntent = detectFieldIntent(userQuestion);
      if (fieldIntent && candidates.length) {
        const q = userQuestion.toLowerCase();
        let chosen = candidates[0];
        for (const c of candidates) {
          const nm = (c.name ?? c.title ?? '').toLowerCase();
          if (nm && q.includes(nm)) { chosen = c; break; }
        }
        const f = fieldIntent.key;
        let value: any = null;
        if (f === 'supplyVoltage') {
          const minV = chosen.supplyVoltageMinV;
          const maxV = chosen.supplyVoltageMaxV;
          value = (minV != null || maxV != null) ? `${minV ?? '—'}–${maxV ?? '—'} V` : null;
        } else if (f === 'hasBrake') {
          value = (typeof chosen.hasBrake === 'boolean') ? (chosen.hasBrake ? 'Yes' : 'No') : null;
        } else {
          value = chosen[f] ?? null;
        }
        if (value != null && value !== '') {
          const name = chosen.name ?? chosen.title ?? 'This product';
          ctx.body = { reply: `${fieldIntent.label} for ${name}: ${value}` };
          return;
        } else {
          ctx.body = { reply: `I don't know that ${fieldIntent.label.toLowerCase()} from the available data.` };
          return;
        }
      }
      // --------------------------------------------------------------------

      // --- FAST-PATH: "list/show/top/catalog/range" intent (skip LLM) -----
      const isListIntent = /\b(list|show|top|catalog|range)\b/i.test(userQuestion);
      if (isListIntent) {
        const list = hits.slice(0, RAG_TOP_N).map((h: any, i: number) => {
          const p = h?.payload ?? {};
          const title = (p.name ?? p.title ?? 'Unnamed Product') as string;
          const motor = [p.motorFamily, p.motorType].filter(Boolean).join(' / ') || '—';
          return `${i + 1}) ${title} — ${motor}`;
        }).join('\n');
        ctx.body = { reply: list || "I don't know." };
        return;
      }
      // --------------------------------------------------------------------

      // 3) Build CONTEXT (uses your schema fields; trimmed for performance)
      const context = hits.slice(0, RAG_TOP_N).map((h: any, i: number) => {
        const p = h?.payload ?? {};
        return [
          `Product ${i + 1}: ${safe(p.name ?? p.title, 120)}`,
          `Motor: ${p.motorFamily ?? '—'}${p.motorType ? ` / ${p.motorType}` : ''}`,
          `Voltage: ${fmtRange(p.supplyVoltageMinV, p.supplyVoltageMaxV, 'V')}`,
          `Rated Power: ${p.ratedPowerKw != null ? `${p.ratedPowerKw} kW` : '—'}`,
          `Torque: ${p.ratedTorqueNm != null ? `${p.ratedTorqueNm} Nm` : '—'}`,
          `Cooling: ${p.cooling ?? '—'}`,
          `IP: ${p.ipRating ?? '—'}`,
          `Mount: ${p.mountType ?? '—'}`,
          `Brake: ${p.hasBrake ? `Yes (${p.brakeVoltageV ?? '—'} V, ${p.brakeHoldingTorqueNm ?? '—'} Nm)` : 'No'}`,
          `Gearbox: ${p.gearboxRequired ? `${p.gearboxType ?? '—'}${p.gearboxRatio != null ? ` x${p.gearboxRatio}` : ''}` : 'Not required'}`,
          `Size: ${p.maxLengthMm ?? '—'} L x ${p.maxWidthOrDiameterMm ?? '—'} W/D (mm)`,
          `Summary: ${safe(p.description, 400)}`
        ].join('\n');
      }).join('\n---\n');

      strapi.log.info(`[assistant] context length: ${context.length}`);
      strapi.log.info(`[assistant] using models at ${process.env.OLLAMA_URL ?? '(default)'} -> ${process.env.CHAT_MODEL ?? '(default)'}`);

      // 4) Ask model — CONTEXT in system prompt; hide internal details
      const system = `You are the AnyVolt assistant.

RULES:
- Only use the CONTEXT below.
- If the answer is not in the context, say "I don't know".
- Do NOT mention similarity scores, retrieval steps, or internal details.
- Be concise.

CONTEXT:
${context}
`;

      // Try configured model first, then fallbacks you likely have
      const modelCandidates = [
        CHAT_MODEL_DEFAULT,
        'llama3.1',
        'mistral:latest',
        'mistral',
      ];

      let reply: string | null = await askModel(http, strapi, system, userQuestion, modelCandidates);

      // 5) Fallback: /api/generate (single prompt)
      if (!reply) {
        const prompt = `You are the AnyVolt assistant.
Only answer using the provided product CONTEXT. If the answer is not in the context, say "I don't know".
Be concise and specific.

CONTEXT:
${context}

QUESTION:
${userQuestion}

ANSWER:`;

        const { data: gen } = await http.post(OLLAMA_GEN_URL(), {
          model: modelCandidates[0],
          prompt,
          stream: false,
        }, { timeout: 120_000 });

        reply = trim(gen?.response) ?? null;
      }

      ctx.body = { reply: reply ?? 'Sorry, I don’t have an answer from the model.' };

    } catch (err: any) {
      // DEV SURFACE ERRORS (remove once stable)
      strapi.log.error('[assistant] error', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      ctx.status = 500;
      ctx.body = {
        error: 'upstream',
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      };
    }
  },

}));
