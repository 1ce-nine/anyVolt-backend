import axios from "axios";
// Adjust the path based on where masterPrompt.ts lives
import { buildMasterPrompt, ProductForAI } from "../masterPrompt";


/**
 * Helper: extract product name from "tell me about X"
 */
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
    ctx.body = {
      ok: true,
      method: ctx.request.method,
      body: ctx.request.body ?? null,
    };
  },

  // main chat endpoint
  async chat(ctx: any) {
    try {
      const { message, productId, documentId } = ctx.request.body || {};

      // ---------------------------------------------------
      // 1. BASIC INPUT VALIDATION + SANITISATION
      // ---------------------------------------------------
      if (typeof message !== "string") {
        ctx.badRequest("Missing or invalid 'message'.");
        return;
      }

      let sanitizedMessage = message.trim();
      sanitizedMessage = sanitizedMessage.replace(/\s+/g, " "); // collapse whitespace
      sanitizedMessage = sanitizedMessage.replace(
        /[\u0000-\u001F\u007F]/g,
        ""
      ); // strip control chars

      if (!sanitizedMessage) {
        ctx.body = { reply: "Please enter a message." };
        return;
      }

      if (sanitizedMessage.length > 1000) {
        ctx.body = {
          reply:
            "Your message is too long. Please keep questions fairly short (under 1000 characters).",
        };
        return;
      }

      const userQuestion = sanitizedMessage;

      // ---------------------------------------------------
      // 2. SIMPLE PROMPT-INJECTION HEURISTICS
      //    (We don't block, just annotate)
      // ---------------------------------------------------
      const injectionPatterns = [
        "ignore previous instructions",
        "ignore all previous instructions",
        "act as ",
        "system prompt",
        "you are now",
        "jailbreak",
        "developer mode",
        "override your rules",
        "disregard previous",
      ];

      let suspectedInjection = false;
      const lowerMsg = userQuestion.toLowerCase();
      for (const p of injectionPatterns) {
        if (lowerMsg.includes(p)) {
          suspectedInjection = true;
          break;
        }
      }

      // ---------------------------------------------------
      // 3. PRODUCT RESOLUTION (your existing logic)
      // ---------------------------------------------------
      let entity: any = null;

      // 3a. EXPLICIT LOOKUP (productId / documentId)
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
          // ignore, fall through
        }
      }

      // 3b. NAME-BASED LOOKUP (only if no explicit match)
      if (!entity) {
        const requestedName = extractProductNameFromQuestion(userQuestion);

        // If they didn’t ask in a "tell me about X" style, guide them.
        if (!requestedName) {
          ctx.body = {
            reply: `Please ask: "Tell me about <exact product name>".`,
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
            reply: `I couldn’t find that product. Please ask: "Tell me about <exact product name>".`,
          };
          return;
        }
      }

      // ---------------------------------------------------
      // 4. MAP ENTITY → ProductForAI (DTO for prompt)
      // ---------------------------------------------------
      const product: ProductForAI = {
        id: entity.id,
        documentId: entity.documentId ?? null,
        name: entity.name ?? "Unknown product",
        description: entity.description ?? "",
        specs: (entity as any).specs ?? (entity as any).specifications ?? null,
        price: (entity as any).price ?? null,
      };

      const key = process.env.GOOGLE_API_KEY;

      // ---------------------------------------------------
      // 5. DEMO MODE (NO AI KEY) — for your assignment
      // ---------------------------------------------------
      if (!key) {
        const lines: string[] = [];
        lines.push("Demo mode (no AI provider configured).");
        lines.push("");
        lines.push(`Product: ${product.name}`);
        lines.push("");

        if (product.description) {
          lines.push(product.description);
        } else {
          lines.push("No description available in the product data.");
        }

        if (product.price != null) {
          lines.push("");
          lines.push(`Stored price: $${product.price}`);
        }

        ctx.body = { reply: lines.join("\n") };
        return;
      }

      // ---------------------------------------------------
      // 6. REAL AI CALL (Gemini) USING MASTER PROMPT
      // ---------------------------------------------------
      const systemPrompt = buildMasterPrompt({
        product,
      });


      const productJson = JSON.stringify(product, null, 2);

      const body = {
        contents: [
          // Master instructions first
          { role: "user", parts: [{ text: systemPrompt }] },
          // Then user question + data
          {
            role: "user",
            parts: [
              {
                text:
                  `USER QUESTION:\n${userQuestion}\n\n` +
                  `PRODUCT_DATA (JSON):\n${productJson}`,
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
