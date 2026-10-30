import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const MODEL = "openai/gpt-6-astra";

export const RecommendationSchema = z.object({
  summary: z.string(),
  items: z.array(z.object({ productId: z.string(), qty: z.number(), reason: z.string() })),
  missing: z.array(z.string()),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export interface CatalogLine { id: string; name: string; brand: string; category: string; price: number; stock: number }

export async function recommend(request: string, prefs: string, catalog: CatalogLine[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const list = catalog.map((p) => `${p.id} | ${p.name} | ${p.brand} | ${p.category} | ₹${p.price} | stock ${p.stock}`).join("\n");
  const result = streamText({
    model: provider.responses(MODEL),
    instructions:
      "You are FreshMart's friendly shopping assistant for an Indian supermarket. Recommend products ONLY from the catalogue below, " +
      "using the exact product id. Choose sensible quantities for the shopper's need (servings, people, days) and never exceed stock. " +
      "Keep each reason under 12 words. Put ingredients or needs that the catalogue does not carry in `missing`. " +
      "Write a one or two sentence summary. Recommend at most 12 products.\n\nCATALOGUE (id | name | brand | category | price | stock):\n" + list,
    messages: [{ role: "user", content: `${prefs ? `Shopper preferences: ${prefs}\n` : ""}Request: ${request}` }],
    output: Output.object({ schema: RecommendationSchema }),
    providerOptions: {
      openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
    },
  });
  try {
    return await result.output;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) throw new Error("The assistant couldn't build a list for that. Try describing it differently.");
    throw e;
  }
}
