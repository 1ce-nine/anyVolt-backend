// scripts/testQdrantSearch.cjs
const axios = require("axios");

async function embed(text) {
  const { data } = await axios.post("http://localhost:11434/api/embeddings", {
    model: "nomic-embed-text",   // same embed model you used for seeding
    prompt: text,
  });
  return data.embedding;
}

async function search(query) {
  const vector = await embed(query);
  const { data } = await axios.post(
    "http://localhost:6333/collections/anyvolt_products_v1/points/search",
    {
      vector,
      limit: 5,
      with_payload: true,
      score_threshold: 0.3,
    }
  );
  return data.result;
}

const query = "anyvolt charger";   // 👈 try something you know exists

search(query)
  .then((r) => {
    console.log("\nSearch results:");
    if (!r || r.length === 0) {
      console.log("No hits found.");
      return;
    }
    for (const hit of r) {
      console.log(`${hit.score.toFixed(3)}  -  ${hit.payload?.title}`);
    }
  })
  .catch((err) => console.error(err.message));
