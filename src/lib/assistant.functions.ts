import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CATEGORIES, PRODUCTS } from "@/game/catalog";
import { sellingPrice } from "@/game/pricing";

const Input = z.object({ request: z.string().trim().min(3).max(500), prefs: z.string().max(200).default("") });

export const recommendProducts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { recommend } = await import("./ai/assistant.server");
    // Live stock/prices from the database (public read).
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows } = await sb.from("products").select("id,mrp,discount_pct,stock,active");
    const live = new Map((rows ?? []).map((r) => [r.id, r]));
    const catalog = PRODUCTS.map((p) => {
      const r = live.get(p.id);
      const mrp = r ? Number(r.mrp) : p.mrp;
      const disc = r ? Number(r.discount_pct) : p.discountPct;
      return {
        id: p.id, name: p.name, brand: p.brand,
        category: CATEGORIES.find((c) => c.id === p.categoryId)?.name ?? "",
        price: sellingPrice({ mrp, discountPct: disc }),
        stock: r ? (r.active ? r.stock : 0) : p.stock,
      };
    }).filter((p) => p.stock > 0);

    try {
      const rec = await recommend(data.request, data.prefs, catalog);
      const byId = new Map(catalog.map((c) => [c.id, c]));
      const items = rec.items
        .filter((i) => byId.has(i.productId))
        .map((i) => ({ ...i, qty: Math.max(1, Math.min(Math.round(i.qty), byId.get(i.productId)!.stock)) }))
        .slice(0, 12);
      return { ok: true as const, summary: rec.summary, items, missing: rec.missing.slice(0, 8) };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("assistant failed", e);
      if (status === 429) return { ok: false as const, error: "The assistant is busy right now. Please try again in a minute." };
      if (status === 402) return { ok: false as const, error: "AI credits have run out for this store. Please add credits in workspace billing." };
      return { ok: false as const, error: e instanceof Error && !status ? e.message : "The assistant couldn't answer right now." };
    }
  });
