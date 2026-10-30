import { Minus, Plus, ShoppingBasket, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOW_STOCK, categoryById, productById, type Product } from "@/game/catalog";
import { inr, sellingPrice } from "@/game/pricing";
import { useBasket } from "@/game/basket";
import { sfx } from "@/game/sfx";

export function PackShot({ p, size = "lg" }: { p: Product; size?: "sm" | "lg" }) {
  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-xl border ${size === "lg" ? "h-36" : "h-14 w-14 shrink-0"}`}
      style={{ background: `linear-gradient(140deg, ${p.color}, color-mix(in oklab, ${p.color} 60%, black))` }}
    >
      <span className={size === "lg" ? "text-6xl drop-shadow" : "text-2xl"}>{p.emoji}</span>
      {size === "lg" && (
        <span className="absolute bottom-2 rounded bg-card/90 px-2 py-0.5 text-xs font-bold text-card-foreground">{p.brand}</span>
      )}
    </div>
  );
}

export function StockBadge({ p, inBasket = 0 }: { p: Product; inBasket?: number }) {
  const left = p.stock - inBasket;
  if (left <= 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (left <= LOW_STOCK) return <Badge className="bg-warning text-foreground">Only {left} left</Badge>;
  return <Badge className="bg-success text-primary-foreground">In stock · {left}</Badge>;
}

export function addToBasket(p: Product) {
  const ok = useBasket.getState().add(p.id);
  if (ok) {
    sfx.add();
    toast.success(`${p.name} added to basket`, { description: `${inr(sellingPrice(p))} · ${p.brand}` });
    window.dispatchEvent(new CustomEvent("basket-add", { detail: p.emoji }));
  } else {
    sfx.error();
    toast.error("No more stock available for this product");
  }
  return ok;
}

export function ProductPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const p = productById(id);
  const qty = useBasket((s) => s.items[id] ?? 0);
  const setQty = useBasket((s) => s.setQty);
  if (!p) return null;
  const price = sellingPrice(p);
  const cat = categoryById(p.categoryId);
  return (
    <div className="hud-glass animate-fly-in w-full max-w-sm rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat?.emoji} {cat?.name}</p>
          <h3 className="text-xl font-bold leading-tight">{p.name}</h3>
          <p className="text-sm text-muted-foreground">by {p.brand}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close product"><X /></Button>
      </div>
      <PackShot p={p} />
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl font-extrabold text-primary">{inr(price)}</span>
        {p.discountPct > 0 && (
          <>
            <span className="text-sm text-muted-foreground line-through">{inr(p.mrp)}</span>
            <Badge className="bg-accent text-accent-foreground">{p.discountPct}% OFF</Badge>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">+ GST {Math.round(p.gstRate * 100)}% at billing</p>
      <p className="mt-2 text-sm">{p.description}</p>
      <div className="mt-2"><StockBadge p={p} inBasket={qty} /></div>
      <div className="mt-4 flex items-center gap-2">
        {qty > 0 && (
          <div className="flex items-center rounded-lg border">
            <Button size="icon" variant="ghost" onClick={() => { setQty(id, qty - 1); sfx.remove(); }} aria-label="Decrease"><Minus /></Button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <Button size="icon" variant="ghost" onClick={() => addToBasket(p)} aria-label="Increase"><Plus /></Button>
          </div>
        )}
        <Button className="flex-1" size="lg" disabled={qty >= p.stock} onClick={() => addToBasket(p)}>
          <ShoppingBasket /> {qty > 0 ? "Add one more" : "Add to basket"}
        </Button>
      </div>
    </div>
  );
}
