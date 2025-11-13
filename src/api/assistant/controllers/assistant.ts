import axios from "axios";

function extractProductNameFromQuestion(q: string): string | null {
  const lower = q.toLowerCase();
  const marker = "tell me about";
  let namePart = q;

  const idx = lower.indexOf(marker);
  if (idx >= 0) {
    namePart = q.slice(idx + marker.length);
  }

  // trim leading punctuation / spaces
  namePart = namePart.replace(/^[\s:,\-]+/, "").trim();

  return namePart.length ? namePart : null;
}

export default {
  // quick debug endpoint
  async echo(ctx: any) {
    ctx.body = { ok: true, method: ctx.request.method, body: ctx.request.body ?? null };
  },

  // main chat endpoint
  async chat(ctx: any) {
    try {
      const { message, productId, documentId } = ctx.request.body || {};
      const userQuestion = (message ?? "").toString().trim();
      if (!userQuestion) return ctx.badRequest("Missing 'message'.");

      let entity: any = null;

      // -------------------------------------------------------------------
      // 1) OPTIONAL EXPLICIT LOOKUP (productId / documentId)
      //    If this fails, we still fall through to name-based logic.
      // -------------------------------------------------------------------
      if (productId) {
        try {
          entity = await strapi.entityService.findOne(
            "api::product.product",
            Number(productId),
            { populate: "*" }
          );
        } catch {
          // ignore, we'll try other strategies
        }
      }

      if (!entity && documentId) {
        try {
          const list: any[] = await strapi.entityService.findMany(
            "api::product.product",
            {
              filters: { documentId },
              populate: "*",
              publicationState: "live",
              limit: 1,
            } as any
          );
          entity = Array.isArray(list) ? list[0] : list;
        } catch {
          // also ignore
        }
      }

      // -------------------------------------------------------------------
      // 2) NAME-BASED LOOKUP (only give info if exact name matches)
      // -------------------------------------------------------------------
      if (!entity) {
        const requestedName = extractProductNameFromQuestion(userQuestion);

        // If they didn't ask in a "tell me about X" style, guide them.
        if (!requestedName) {
          const all: any[] = await strapi.entityService.findMany(
            "api::product.product",
            {
              fields: ["name"],
              publicationState: "live",
              sort: { id: "asc" },
              limit: 5,
            } as any
          );
          const names = (all || [])
            .map((p: any) => p?.name)
            .filter(Boolean);

          const examples = names.length
            ? "\n\nFor example, you can say:\n" +
              names
                .slice(0, 3)
                .map((n: string) => `- Tell me about ${n}`)
                .join("\n")
            : "";

            ctx.body = {
              reply: `Please ask: "Tell me about <exact product name>".`
          };
          return;
        }

        const requestedLower = requestedName.toLowerCase();

        // Load published products and look for an exact name match
        const all: any[] = await strapi.entityService.findMany(
          "api::product.product",
          {
            populate: "*",
            publicationState: "live",
            sort: { id: "asc" },
            limit: 100,
          } as any
        );

        entity =
          (all || []).find((p: any) => {
            const name = (p?.name ?? "").toLowerCase();
            return name && name === requestedLower; // strict equality
          }) || null;

        if (!entity) {
          ctx.body = {
            reply: `I couldn’t find that product. Please ask: "Tell me about <exact product name>".`
          };
          return;
        }

      }

      // -------------------------------------------------------------------
      // 3) At this point we have a specific product entity
      // -------------------------------------------------------------------
      const product = {
        id: entity.id,
        documentId: entity.documentId ?? null,
        name: entity.name ?? "Unknown product",
        description: entity.description ?? "",
        specs: (entity as any).specs ?? (entity as any).specifications ?? null,
        price: (entity as any).price ?? null,
      };

      const key = process.env.GOOGLE_API_KEY;

      // DEMO MODE: no Gemini key
      if (!key) {
        ctx.body = {
          reply:
            `Demo mode (no GOOGLE_API_KEY).\n\n` +
            (product.description || "No description available."),
        };
        return;
      }

      // -------------------------------------------------------------------
      // 4) Call Gemini with the chosen product
      // -------------------------------------------------------------------
      const system = `
You are AnyVolt’s product assistant.
- ONLY answer based on the product data provided.
- If the question doesn’t match this product, say so and ask the user to clarify.
- Use short paragraphs; bullets are OK for specs.
- Never invent features or prices.
`.trim();

      const productJson = "```json\n" + JSON.stringify(product, null, 2) + "\n```";
      const body = {
        contents: [
          { role: "user", parts: [{ text: system }] },
          {
            role: "user",
            parts: [
              {
                text:
                  `USER QUESTION:\n${userQuestion}\n\n` +
                  `PRODUCT DATA:\n${productJson}`,
              },
            ],
          },
        ],
      };

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        key;

      const { data } = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" },
      });

      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry—I couldn’t generate a response.";
      ctx.body = { reply: text };
    } catch (err: any) {
      const detail = err?.response?.data || err.message || String(err);
      strapi.log.error(
        `[assistant] error: ${
          typeof detail === "string" ? detail : JSON.stringify(detail)
        }`
      );
      ctx.status = 500;
      ctx.body = {
        error: `Assistant failed: ${
          typeof detail === "string" ? detail : JSON.stringify(detail)
        }`,
      };
    }
  },
};
