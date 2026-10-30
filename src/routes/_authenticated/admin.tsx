import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, IndianRupee, Package, ShoppingBag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, LOW_STOCK, PRODUCTS } from "@/game/catalog";
import { inr } from "@/game/pricing";
import { refreshCatalog } from "@/hooks/use-catalog";
import type { DbOrder } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.rpc("has_role", { _user_id: u.user!.id, _role: "admin" });
    if (!data) throw redirect({ to: "/account" });
  },
  head: () => ({
    meta: [
      { title: "Admin dashboard — FreshMart 3D" },
      { name: "description", content: "FreshMart sales, stock and order management." },
      { property: "og:title", content: "Admin dashboard — FreshMart 3D" },
      { property: "og:description", content: "Sales charts and stock management." },
    ],
  }),
  component: Admin,
});

type ProductDb = { id: string; name: string; brand: string; category_id: string; mrp: number; discount_pct: number; gst_rate: number; stock: number; active: boolean };

function Admin() {
  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => ((await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(1000)).data ?? []) as DbOrder[],
  });
  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => ((await supabase.from("products").select("*").order("id")).data ?? []) as ProductDb[],
  });
  const customers = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <main className="min-h-screen bg-secondary">
      <header className="flex items-center gap-2 border-b bg-card px-4 py-3">
        <Link to="/" className="font-display text-xl font-extrabold text-primary">🛒 FreshMart</Link>
        <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">ADMIN</span>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link to="/account">My account</Link></Button>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-3xl font-extrabold">Store dashboard</h1>
        <p className="text-sm text-muted-foreground">All orders so far are test payments — no real money has been collected.</p>
        <Tabs defaultValue="overview" className="mt-5">
          <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="stock">Products & stock</TabsTrigger><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="customers">Customers</TabsTrigger></TabsList>
          <TabsContent value="overview"><Overview orders={orders.data ?? []} products={products.data ?? []} customers={customers.data?.length ?? 0} /></TabsContent>
          <TabsContent value="stock"><Stock rows={products.data ?? []} /></TabsContent>
          <TabsContent value="orders"><OrdersTable orders={orders.data ?? []} /></TabsContent>
          <TabsContent value="customers">
            <div className="overflow-hidden rounded-2xl bg-card">
              {(customers.data ?? []).map((c) => (
                <div key={c.id} className="flex justify-between border-b px-4 py-3 text-sm last:border-0">
                  <span><b>{c.full_name || "—"}</b> <span className="text-muted-foreground">{c.email}</span></span>
                  <span className="text-muted-foreground">{(orders.data ?? []).filter((o) => o.user_id === c.id).length} orders · joined {new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function Overview({ orders, products, customers }: { orders: DbOrder[]; products: ProductDb[]; customers: number }) {
  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const today = dayKey(new Date());
    const todayRev = orders.filter((o) => o.created_at.slice(0, 10) === today).reduce((s, o) => s + Number(o.total), 0);
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return dayKey(d); });
    const daily = days.map((d) => ({ day: d.slice(5), revenue: Math.round(orders.filter((o) => o.created_at.slice(0, 10) === d).reduce((s, o) => s + Number(o.total), 0)) }));
    const months = new Map<string, number>();
    for (const o of orders) { const m = o.created_at.slice(0, 7); months.set(m, (months.get(m) ?? 0) + Number(o.total)); }
    const monthly = [...months.entries()].sort().slice(-6).map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }));
    const counts = new Map<string, { name: string; qty: number }>();
    for (const o of orders) for (const i of o.order_items) { const c = counts.get(i.product_id) ?? { name: i.name, qty: 0 }; c.qty += i.qty; counts.set(i.product_id, c); }
    const top = [...counts.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
    const low = products.filter((p) => p.active && p.stock <= LOW_STOCK);
    return { revenue, todayRev, daily, monthly, top, low };
  }, [orders, products]);

  const Kpi = ({ icon: I, label, value }: { icon: typeof Users; label: string; value: string }) => (
    <div className="rounded-2xl bg-card p-4"><I className="mb-2 text-primary" /><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-2xl font-extrabold">{value}</p></div>
  );
  const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 } };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi icon={IndianRupee} label="Total revenue (test)" value={inr(stats.revenue)} />
        <Kpi icon={IndianRupee} label="Today" value={inr(stats.todayRev)} />
        <Kpi icon={ShoppingBag} label="Orders" value={String(orders.length)} />
        <Kpi icon={Users} label="Customers" value={String(customers)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-4"><h3 className="mb-2 font-bold">Daily sales · last 14 days</h3>
          <ResponsiveContainer width="100%" height={220}><LineChart data={stats.daily}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip {...tip} /><Line dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div>
        <div className="rounded-2xl bg-card p-4"><h3 className="mb-2 font-bold">Monthly sales</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={stats.monthly}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip {...tip} /><Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="rounded-2xl bg-card p-4"><h3 className="mb-2 font-bold">Popular products</h3>
          {stats.top.length ? (
            <ResponsiveContainer width="100%" height={240}><BarChart data={stats.top} layout="vertical" margin={{ left: 40 }}><XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" width={120} fontSize={11} /><Tooltip {...tip} /><Bar dataKey="qty" fill="var(--primary)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">No sales yet.</p>}</div>
        <div className="rounded-2xl bg-card p-4"><h3 className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="text-accent" /> Low stock</h3>
          {stats.low.length ? stats.low.map((p) => (<div key={p.id} className="flex justify-between border-b py-1.5 text-sm last:border-0"><span>{p.name}</span><b className={p.stock === 0 ? "text-destructive" : ""}>{p.stock} left</b></div>))
            : <p className="text-sm text-muted-foreground">Everything is well stocked.</p>}</div>
      </div>
    </div>
  );
}

function Stock({ rows }: { rows: ProductDb[] }) {
  const qc = useQueryClient();
  const [cat, setCat] = useState("all");
  const [draft, setDraft] = useState<Record<string, Partial<ProductDb>>>({});
  const save = async (r: ProductDb) => {
    const d = draft[r.id];
    if (!d) return;
    const upd = { ...d, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("products").update(upd).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`${r.name} updated`);
    setDraft((x) => { const n = { ...x }; delete n[r.id]; return n; });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    void refreshCatalog();
  };
  const set = (id: string, k: keyof ProductDb, v: number | boolean) => setDraft((x) => ({ ...x, [id]: { ...x[id], [k]: v } }));
  const list = rows.filter((r) => cat === "all" || r.category_id === cat);
  const num = (r: ProductDb, k: "mrp" | "discount_pct" | "stock", step = 1) => (
    <Input type="number" step={step} min={0} className="h-8 w-24" value={String(draft[r.id]?.[k] ?? r[k])} onChange={(e) => set(r.id, k, Number(e.target.value))} />
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={cat === "all" ? "default" : "outline"} onClick={() => setCat("all")}>All</Button>
        {CATEGORIES.map((c) => <Button key={c.id} size="sm" variant={cat === c.id ? "default" : "outline"} onClick={() => setCat(c.id)}>{c.emoji} {c.name}</Button>)}
      </div>
      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Product</th><th>MRP ₹</th><th>Discount %</th><th>GST</th><th>Stock</th><th>On sale</th><th /></tr></thead>
          <tbody>
            {list.map((r) => {
              const emoji = PRODUCTS.find((p) => p.id === r.id)?.emoji;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3"><b>{emoji} {r.name}</b><div className="text-xs text-muted-foreground">{r.brand}</div></td>
                  <td>{num(r, "mrp", 0.5)}</td><td>{num(r, "discount_pct")}</td>
                  <td>{Math.round(Number(r.gst_rate) * 100)}%</td>
                  <td>{num(r, "stock")}{r.stock <= LOW_STOCK && <Package className="ml-1 inline h-4 w-4 text-accent" />}</td>
                  <td><Switch checked={draft[r.id]?.active ?? r.active} onCheckedChange={(v) => set(r.id, "active", v)} /></td>
                  <td className="pr-3"><Button size="sm" disabled={!draft[r.id]} onClick={() => save(r)}>Save</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersTable({ orders }: { orders: DbOrder[] }) {
  if (!orders.length) return <p className="rounded-2xl bg-card p-6 text-muted-foreground">No orders yet.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Order</th><th>Date</th><th>Items</th><th>Method</th><th>Payment</th><th className="pr-3 text-right">Total</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-3 font-mono"><Link to="/receipt/$orderId" params={{ orderId: o.id }} className="text-primary underline-offset-2 hover:underline">{o.id}</Link></td>
              <td>{new Date(o.created_at).toLocaleString("en-IN")}</td>
              <td>{o.order_items.reduce((s, i) => s + i.qty, 0)}</td>
              <td>{o.payment_method}</td>
              <td><span className="rounded bg-warning/30 px-2 py-0.5 text-xs font-semibold">TEST PAID</span></td>
              <td className="pr-3 text-right font-semibold">{inr(Number(o.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
