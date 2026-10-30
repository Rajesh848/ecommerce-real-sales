import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBasket, toLines } from "@/game/basket";
import { computeTotals, inr } from "@/game/pricing";
import { sfx } from "@/game/sfx";
import { PackShot } from "./ProductCard";

export function TotalsRows({ t }: { t: ReturnType<typeof computeTotals> }) {
  const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <div className={`flex justify-between ${strong ? "text-lg font-bold" : "text-sm"}`}><span>{k}</span><span>{v}</span></div>
  );
  return (
    <div className="space-y-1">
      <Row k={`Items (${t.itemCount})`} v={inr(t.mrpTotal)} />
      {t.itemSavings > 0 && <Row k="Product discounts" v={`− ${inr(t.itemSavings)}`} />}
      <Row k="Subtotal" v={inr(t.subtotal)} />
      {t.couponDiscount > 0 && <Row k={`Coupon ${t.coupon?.code}`} v={`− ${inr(t.couponDiscount)}`} />}
      <Row k="GST" v={inr(t.gst)} />
      <div className="my-2 border-t border-dashed" />
      <Row k="Grand total" v={inr(t.grandTotal)} strong />
    </div>
  );
}

export function BasketSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const items = useBasket((s) => s.items);
  const coupon = useBasket((s) => s.coupon);
  const { setQty, remove } = useBasket.getState();
  const t = computeTotals(toLines(items), coupon || undefined);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader><SheetTitle className="font-display text-2xl">Your basket</SheetTitle></SheetHeader>
        <div className="-mx-2 flex-1 space-y-2 overflow-y-auto px-2">
          {t.lines.length === 0 && <p className="py-10 text-center text-muted-foreground">Your basket is empty. Pick something off a shelf!</p>}
          {t.lines.map((l) => (
            <div key={l.product.id} className="flex items-center gap-3 rounded-xl border bg-card p-2">
              <PackShot p={l.product} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{l.product.name}</p>
                <p className="text-xs text-muted-foreground">{inr(l.unit)} × {l.qty} = <b className="text-foreground">{inr(l.lineTotal)}</b></p>
                <div className="mt-1 flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => { setQty(l.product.id, l.qty - 1); sfx.remove(); }} aria-label="Decrease"><Minus /></Button>
                  <span className="w-6 text-center text-sm">{l.qty}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={l.qty >= l.product.stock} onClick={() => { setQty(l.product.id, l.qty + 1); sfx.add(); }} aria-label="Increase"><Plus /></Button>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { remove(l.product.id); sfx.remove(); }} aria-label="Remove"><Trash2 /></Button>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-muted p-3"><TotalsRows t={t} /></div>
        <Button asChild size="lg" disabled={!t.itemCount}>
          {t.itemCount ? <Link to="/checkout">Go to billing counter</Link> : <span>Go to billing counter</span>}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
