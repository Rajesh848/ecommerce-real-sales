import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket, toLines } from "@/game/basket";
import { computeTotals, inr } from "@/game/pricing";
import { downloadReceiptPdf } from "@/game/receipt";

export const Route = createFileRoute("/receipt/$orderId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your receipt — FreshMart 3D" },
      { name: "description", content: "Digital receipt for your FreshMart order." },
      { property: "og:title", content: "Your receipt — FreshMart 3D" },
      { property: "og:description", content: "Digital receipt for your FreshMart order." },
    ],
  }),
  component: Receipt,
});

function Receipt() {
  const { orderId } = Route.useParams();
  const order = useBasket((s) => s.orders.find((o) => o.id === orderId));
  if (!order)
    return <main className="grid min-h-screen place-items-center"><div className="text-center"><h1 className="text-2xl font-bold">Receipt not found</h1><Button asChild className="mt-4"><Link to="/">Home</Link></Button></div></main>;
  const t = computeTotals(toLines(order.items), order.coupon);
  const Row = ({ k, v, b }: { k: string; v: string; b?: boolean }) => <div className={`flex justify-between ${b ? "font-bold" : ""}`}><span>{k}</span><span>{v}</span></div>;
  return (
    <main className="min-h-screen bg-secondary px-4 py-10">
      <div className="mx-auto max-w-md animate-fly-in rounded-2xl bg-card p-6 font-mono text-sm shadow-pop">
        <div className="text-center">
          <p className="text-4xl">🧾</p>
          <h1 className="font-display text-3xl font-extrabold">FreshMart</h1>
          <p className="text-muted-foreground">Virtual Supermarket</p>
          <p className="mt-3 rounded-md bg-warning/25 px-2 py-1 text-xs font-bold">TEST PAYMENT — not a real transaction</p>
        </div>
        <div className="my-4 space-y-0.5">
          <Row k="Order ID" v={order.id} /><Row k="Transaction" v={order.txnId} />
          <Row k="Date" v={new Date(order.createdAt).toLocaleString("en-IN")} />
          <Row k="Method" v={order.method} /><Row k="Status" v="PAID (test mode)" />
        </div>
        <div className="border-t border-dashed py-3">
          {t.lines.map((l) => (
            <div key={l.product.id} className="mb-1">
              <Row k={l.product.name} v={inr(l.lineTotal)} />
              <p className="text-xs text-muted-foreground">{l.qty} × {inr(l.unit)} · GST {Math.round(l.product.gstRate * 100)}% ({inr(l.gst)})</p>
            </div>
          ))}
        </div>
        <div className="space-y-0.5 border-t border-dashed pt-3">
          <Row k="MRP total" v={inr(t.mrpTotal)} /><Row k="Product discounts" v={"− " + inr(t.itemSavings)} />
          <Row k="Subtotal" v={inr(t.subtotal)} />
          {t.couponDiscount > 0 && <Row k={`Coupon ${t.coupon?.code}`} v={"− " + inr(t.couponDiscount)} />}
          <Row k="GST" v={inr(t.gst)} />
          <div className="pt-2 text-lg"><Row k="TOTAL" v={inr(t.grandTotal)} b /></div>
        </div>
        <div className="mt-6 grid gap-2 font-sans">
          <Button size="lg" onClick={() => downloadReceiptPdf(order)}><Download /> Download receipt (PDF)</Button>
          <Button asChild size="lg" variant="outline"><Link to="/store">Continue shopping</Link></Button>
        </div>
      </div>
    </main>
  );
}
