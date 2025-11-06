// src/api/assistant/controllers/assistant.js
const axios = require("axios");

module.exports = {
  async chat(ctx) {
    try {
      const userQuestion = ctx.request.body?.message;
      if (!userQuestion) {
        ctx.badRequest("Missing message field");
        return;
      }

      const reply = await handleChat(userQuestion);
      ctx.body = { reply };
    } catch (err) {
      console.error("[Assistant Error]", err);
      ctx.internalServerError("Something went wrong.");
    }
  },
};

async function handleChat(userQuestion) {
  // 1) Embed the question
  const { data: embed } = await axios.post("http://localhost:11434/api/embeddings", {
    model: "nomic-embed-text",
    prompt: userQuestion,
  });
  const vector = embed.embedding;

  // 2) Search Qdrant
  const { data: search } = await axios.post(
    "http://localhost:6333/collections/anyvolt_products_v1/points/search",
    { vector, limit: 5, with_payload: true, score_threshold: 0.3 }
  );
  const hits = search.result || [];

  if (!hits.length) {
    return "Sorry, I don’t have AnyVolt product information on that yet.";
  }

  // 3) Build concise context
  const context = hits.slice(0, 3).map((h, i) => {
    const p = h.payload || {};
    return `Product ${i + 1}: ${p.title || "Unknown"}
SKU: ${p.sku || "—"}
Category: ${p.category || "—"}
Summary: ${p.description || "—"}
Specs: ${p.specs || "—"}`;
  }).join("\n---\n");

  // 4) Ask the model with strict guardrails
  const system = `You are the AnyVolt assistant.
Only answer using the provided context. If the answer isn't in context, say you don't know. Be concise.`;

  const { data: chat } = await axios.post("http://localhost:11434/api/chat", {
    model: "mistral",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userQuestion },
      { role: "assistant", content: `Context:\n${context}` },
    ],
    stream: false,
  });

  return chat.message?.content || "Sorry, I couldn’t generate an answer.";
}
