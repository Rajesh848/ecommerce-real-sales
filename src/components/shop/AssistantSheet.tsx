import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { productById } from "@/game/catalog";
import { inr, sellingPrice } from "@/game/pricing";
import { useBasket } from "@/game/basket";
import { sfx } from "@/game/sfx";
import { recommendProducts } from "@/lib/assistant.functions";
import { PackShot } from "./ProductCard";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

const EXAMPLES = ["Paneer butter masala for 4 people", "Breakfast for a week for two", "Monthly cleaning supplies for a 2BHK", "Snacks for a cricket night with 6 friends"];

type Result = { summary: string; items: { productId: string; qty: number; reason: string }[]; missing: string[] };

export function AssistantSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, loading } = useAuth();
  const run = useServerFn(recommendProducts);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ask = async (q = text) => {
    if (q.trim().length < 3) return;
    setText(q); setBusy(true); setErr(null); setRes(null);
    try {
      const r = await run({ data: { request: q } });
      if (r.ok) setRes(r); else setErr(r.error);
    } catch {
      setErr("The assistant couldn't answer right now.");
    }
    setBusy(false);
  };

  const add = (id: string, qty: number) => {
    const p = productById(id);
    if (!p) return 0;
    const have = useBasket.getState().items[id] ?? 0;
    const q = Math.min(qty, p.stock - have);
    if (q > 0) useBasket.getState().add(id, q);
    return q;
  };
  const addAll = () => {
    if (!res) return;
    const n = res.items.reduce((s, i) => s + add(i.productId, i.qty), 0);
    sfx.add();
    toast.success(`Added ${n} items to your basket`);
    window.dispatchEvent(new CustomEvent("basket-add", { detail: "🛍️" }));
  };
  const total = res?.items.reduce((s, i) => { const p = productById(i.productId); return s + (p ? sellingPrice(p) * i.qty : 0); }, 0) ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader><SheetTitle className="flex items-center gap-2 font-display text-2xl"><Sparkles className="text-accent" /> Shopping assistant</SheetTitle></SheetHeader>
        <p className="text-sm text-muted-foreground">Tell me what you're cooking or what you need — I'll pick products and quantities from our shelves.</p>
        {!loading && !user ? (
          <div className="rounded-xl bg-muted p-4 text-sm">
            <p>Sign in to use the assistant — it also remembers your shopping preferences.</p>
            <Button asChild className="mt-3" size="sm"><Link to="/auth" search={{ redirect: "/store" }}>Sign in</Link></Button>
          </div>
        ) : (<>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Dinner for 4: dal, rice and a sabzi" rows={3} maxLength={500}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(); } }} />
        <Button onClick={() => ask()} disabled={busy || text.trim().length < 3}>{busy ? "Thinking…" : "Suggest products"}</Button>
        {!res && !busy && (
          <div className="flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} onClick={() => ask(e)} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">{e}</button>)}</div>
        )}
        {busy && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>}
        {err && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
        {res && (
          <div className="-mx-2 flex-1 space-y-2 overflow-y-auto px-2">
            <p className="text-sm">{res.summary}</p>
            {res.items.map((i) => {
              const p = productById(i.productId);
              if (!p) return null;
              return (
                <div key={i.productId} className="flex items-center gap-3 rounded-xl border bg-card p-2">
                  <PackShot p={p} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{i.qty} × {p.name}</p>
                    <p className="text-xs text-muted-foreground">{i.reason}</p>
                    <p className="text-xs">{inr(sellingPrice(p) * i.qty)}</p>
                  </div>
                  <Button size="icon" variant="outline" aria-label={`Add ${p.name}`} onClick={() => { const n = add(p.id, i.qty); sfx.add(); toast.success(n ? `Added ${n} × ${p.name}` : "Already at stock limit"); }}><Plus /></Button>
                </div>
              );
            })}
            {res.missing.length > 0 && <p className="text-xs text-muted-foreground">Not stocked here: {res.missing.join(", ")}</p>}
          </div>
        )}
        {res && res.items.length > 0 && <Button size="lg" onClick={addAll}>Add all to basket · {inr(total)}</Button>}
        </>)}
      </SheetContent>
    </Sheet>
  );
}
