import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBasket, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, PRODUCTS } from "@/game/catalog";
import { useBasket, toLines } from "@/game/basket";
import { computeTotals, inr, sellingPrice } from "@/game/pricing";
import { PackShot, StockBadge, addToBasket } from "@/components/shop/ProductCard";
import { BasketSheet } from "@/components/shop/BasketSheet";
import { AssistantSheet } from "@/components/shop/AssistantSheet";
import { useCatalogVersion } from "@/hooks/use-catalog";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/aisles")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Quick shop aisles — FreshMart 3D" },
      { name: "description", content: "A fast 2D view of every FreshMart aisle for low-powered devices." },
      { property: "og:title", content: "Quick shop aisles — FreshMart 3D" },
      { property: "og:description", content: "Browse every aisle in a simple 2D layout." },
    ],
  }),
  component: Aisles,
});

function Aisles() {
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [assist, setAssist] = useState(false);
  useCatalogVersion((s) => s.v);
  const items = useBasket((s) => s.items);
  const t = computeTotals(toLines(items));
  const list = PRODUCTS.filter((p) => (!cat || p.categoryId === cat) && (p.name + p.brand).toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="font-display text-xl font-extrabold text-primary">🛒 FreshMart</Link>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="max-w-xs" />
        <Button asChild variant="outline" className="ml-auto hidden sm:flex"><Link to="/store"><Store /> 3D store</Link></Button>
        <Button variant="outline" onClick={() => setAssist(true)}><Sparkles /> Assistant</Button>
        <Button onClick={() => setOpen(true)}><ShoppingBasket /> {t.itemCount} · {inr(t.grandTotal)}</Button>
      </header>
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        <Button size="sm" variant={cat ? "outline" : "default"} onClick={() => setCat(null)}>All</Button>
        {CATEGORIES.map((c) => (
          <Button key={c.id} size="sm" variant={cat === c.id ? "default" : "outline"} onClick={() => setCat(c.id)} className="shrink-0">{c.emoji} {c.name}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pb-10 md:grid-cols-4 lg:grid-cols-6">
        {list.map((p) => (
          <div key={p.id} className="flex flex-col rounded-2xl border bg-card p-3">
            <PackShot p={p} />
            <p className="mt-2 text-sm font-semibold leading-tight">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.brand}</p>
            <p className="mt-1"><b className="text-primary">{inr(sellingPrice(p))}</b>{p.discountPct > 0 && <s className="ml-1 text-xs text-muted-foreground">{inr(p.mrp)}</s>}</p>
            <div className="my-2"><StockBadge p={p} inBasket={items[p.id] ?? 0} /></div>
            <Button size="sm" className="mt-auto" disabled={(items[p.id] ?? 0) >= p.stock} onClick={() => addToBasket(p)}>Add {items[p.id] ? `(${items[p.id]})` : ""}</Button>
          </div>
        ))}
      </div>
      <BasketSheet open={open} onOpenChange={setOpen} />
      <AssistantSheet open={assist} onOpenChange={setAssist} />
    </main>
  );
}
