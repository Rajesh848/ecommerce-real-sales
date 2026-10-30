import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { applyProductRows, type ProductRow } from "@/game/catalog";

export const useCatalogVersion = create<{ v: number; bump: () => void }>((set) => ({
  v: 0,
  bump: () => set((s) => ({ v: s.v + 1 })),
}));

export async function refreshCatalog() {
  const { data } = await supabase.from("products").select("id,name,brand,mrp,discount_pct,gst_rate,stock,active");
  if (data) {
    applyProductRows(data as ProductRow[]);
    useCatalogVersion.getState().bump();
  }
}

/** Mount once: loads live prices/stock and keeps them updated in real time. */
export function useCatalogSync() {
  useEffect(() => {
    void refreshCatalog();
    const ch = supabase
      .channel(`products-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
        if (payload.new && "id" in payload.new) {
          applyProductRows([payload.new as ProductRow]);
          useCatalogVersion.getState().bump();
        }
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, []);
}
