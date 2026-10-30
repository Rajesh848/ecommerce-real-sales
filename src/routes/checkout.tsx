import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Landmark, QrCode, Smartphone, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBasket, toLines } from "@/game/basket";
import { COUPONS, computeTotals, inr } from "@/game/pricing";
import { sfx } from "@/game/sfx";
import { TotalsRows } from "@/components/shop/BasketSheet";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { refreshCatalog, useCatalogVersion } from "@/hooks/use-catalog";
import { fetchAddresses, formatAddress } from "@/lib/orders";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Billing counter — FreshMart 3D" },
      { name: "description", content: "Review your basket at the FreshMart billing counter and pay." },
      { property: "og:title", content: "Billing counter — FreshMart 3D" },
      { property: "og:description", content: "Review your basket and pay at the billing counter." },
    ],
  }),
  component: Checkout,
});

const METHODS = [
  { id: "UPI QR", icon: QrCode }, { id: "Google Pay", icon: Smartphone }, { id: "PhonePe", icon: Smartphone },
  { id: "Paytm", icon: Smartphone }, { id: "Debit Card", icon: CreditCard }, { id: "Credit Card", icon: CreditCard },
  { id: "Net Banking", icon: Landmark },
];

function Checkout() {
  const items = useBasket((s) => s.items);
  const coupon = useBasket((s) => s.coupon);
  const { setCoupon, placeTestOrder } = useBasket.getState();
  const [code, setCode] = useState(coupon);
  const [scanned, setScanned] = useState(0);
  const [method, setMethod] = useState("UPI QR");
  const [paying, setPaying] = useState(false);
  const nav = useNavigate();
  useCatalogVersion((s) => s.v);
  const { user } = useAuth();
  const addresses = useQuery({ queryKey: ["addresses", user?.id], queryFn: fetchAddresses, enabled: !!user });
  const [addrId, setAddrId] = useState<string | null>(null);
  const chosen = addresses.data?.find((a) => a.id === addrId) ?? addresses.data?.[0];
  const t = computeTotals(toLines(items), coupon || undefined);

  // POS "scans" each line one by one
  useEffect(() => {
    if (scanned >= t.lines.length) return;
    const id = setTimeout(() => { sfx.scan(); setScanned((s) => s + 1); }, 260);
    return () => clearTimeout(id);
  }, [scanned, t.lines.length]);

  const pay = async () => {
    setPaying(true);
    if (user) {
      const { data, error } = await supabase.rpc("place_order", {
        _items: Object.entries(items).map(([productId, qty]) => ({ productId, qty })),
        _coupon: coupon || "",
        _method: method,
        _address: chosen ? { label: chosen.label, full_name: chosen.full_name, phone: chosen.phone, text: formatAddress(chosen) } : null,
      });
      if (error || !data) { setPaying(false); sfx.error(); toast.error(error?.message ?? "Order failed"); void refreshCatalog(); return; }
      useBasket.getState().clear();
      void refreshCatalog();
      sfx.pay();
      nav({ to: "/receipt/$orderId", params: { orderId: data } });
      return;
    }
    setTimeout(() => {
      const order = placeTestOrder(method);
      sfx.pay();
      nav({ to: "/receipt/$orderId", params: { orderId: order.id } });
    }, 1400);
  };

  if (!t.itemCount)
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div><p className="text-5xl">🧺</p><h1 className="mt-3 text-3xl font-bold">Your basket is empty</h1>
          <Button asChild className="mt-5" size="lg"><Link to="/store">Back to the aisles</Link></Button></div>
      </main>
    );

  return (
    <main className="min-h-screen bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Button asChild variant="ghost"><Link to="/store"><ArrowLeft /> Continue shopping</Link></Button>
        <h1 className="mt-2 text-4xl font-extrabold">Billing counter</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* POS screen */}
          <section className="rounded-3xl border-8 border-foreground/80 bg-pos p-5 font-mono text-pos-foreground shadow-pop">
            <div className="flex justify-between text-xs opacity-80"><span>FRESHMART POS · COUNTER 1</span><span>{new Date().toLocaleDateString("en-IN")}</span></div>
            <div className="my-3 border-t border-dashed border-pos-foreground/40" />
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 text-sm">
              <span className="opacity-70">ITEM</span><span className="opacity-70">QTY</span><span className="opacity-70">RATE</span><span className="text-right opacity-70">AMT</span>
              {t.lines.slice(0, scanned).map((l) => (
                <div key={l.product.id} className="contents animate-fly-in">
                  <span className="truncate">{l.product.name}</span><span>{l.qty}</span><span>{l.unit.toFixed(2)}</span><span className="text-right">{l.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {scanned < t.lines.length && <p className="mt-2 animate-pulse text-xs">▌ scanning…</p>}
            <div className="my-3 border-t border-dashed border-pos-foreground/40" />
            <div className="text-sm"><TotalsRows t={t} /></div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl bg-card p-4">
              <h2 className="font-bold">Coupon</h2>
              <div className="mt-2 flex gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" className="font-mono uppercase" />
                <Button variant="outline" onClick={() => setCoupon(code.trim().toUpperCase())}>Apply</Button>
              </div>
              {t.couponError && <p className="mt-1 text-sm text-destructive">{t.couponError}</p>}
              {t.coupon && <p className="mt-1 text-sm text-success">✓ {t.coupon.code} applied — you save {inr(t.couponDiscount)}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Try: {COUPONS.map((c) => c.code).join(", ")}</p>
            </div>

            <div className="rounded-2xl bg-card p-4">
              <h2 className="font-bold">Delivery address</h2>
              {!user ? (
                <p className="mt-1 text-sm text-muted-foreground">Shopping as a guest. <Link to="/auth" search={{ redirect: "/checkout" }} className="font-semibold text-primary">Sign in</Link> to save this order to your account.</p>
              ) : addresses.data?.length ? (
                <div className="mt-2 space-y-2">
                  {addresses.data.map((a) => (
                    <button key={a.id} onClick={() => setAddrId(a.id)} className={`w-full rounded-xl border-2 p-3 text-left text-sm ${chosen?.id === a.id ? "border-primary bg-primary/5" : "border-border"}`}>
                      <b>{a.label}</b> · {a.full_name}<div className="text-muted-foreground">{formatAddress(a)}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No saved address. <Link to="/account" className="font-semibold text-primary">Add one</Link> or pick up in store.</p>
              )}
            </div>

            <div className="rounded-2xl bg-card p-4">
              <h2 className="font-bold">Payment method</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <Button key={m.id} variant={method === m.id ? "default" : "outline"} className="justify-start" onClick={() => setMethod(m.id)}><m.icon /> {m.id}</Button>
                ))}
              </div>
              <div className="mt-4 flex gap-2 rounded-xl border border-warning bg-warning/15 p-3 text-sm">
                <TriangleAlert className="shrink-0 text-accent" />
                <p><b>Test payment mode.</b> Razorpay isn't connected yet, so no real money moves and this order is marked as a test.</p>
              </div>
              <Button size="lg" className="mt-4 h-14 w-full text-lg" disabled={paying || scanned < t.lines.length} onClick={pay}>
                {paying ? "Processing test payment…" : `Proceed to payment · ${inr(t.grandTotal)}`}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
