import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, MapPin, Package, Plus, Shield, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchAddresses, fetchMyOrders, formatAddress } from "@/lib/orders";
import { inr } from "@/game/pricing";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — FreshMart 3D" },
      { name: "description", content: "Your FreshMart profile, saved addresses and order history." },
      { property: "og:title", content: "My account — FreshMart 3D" },
      { property: "og:description", content: "Profile, addresses and past orders." },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };
  return (
    <main className="min-h-screen bg-secondary">
      <header className="flex items-center gap-2 border-b bg-card px-4 py-3">
        <Link to="/" className="font-display text-xl font-extrabold text-primary">🛒 FreshMart</Link>
        <div className="ml-auto flex gap-2">
          {isAdmin && <Button asChild variant="outline" size="sm"><Link to="/admin"><Shield /> Admin</Link></Button>}
          <Button asChild size="sm"><Link to="/store"><Store /> Enter store</Link></Button>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut /> Sign out</Button>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-extrabold">My account</h1>
        <p className="text-muted-foreground">{user?.email}</p>
        <Tabs defaultValue="orders" className="mt-6">
          <TabsList><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="addresses">Addresses</TabsTrigger><TabsTrigger value="profile">Profile</TabsTrigger></TabsList>
          <TabsContent value="orders">{user && <Orders userId={user.id} />}</TabsContent>
          <TabsContent value="addresses">{user && <Addresses userId={user.id} />}</TabsContent>
          <TabsContent value="profile">{user && <Profile userId={user.id} />}</TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Orders({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["my-orders", userId], queryFn: () => fetchMyOrders(userId) });
  if (isLoading) return <p className="py-6 text-muted-foreground">Loading orders…</p>;
  if (!data?.length) return <div className="rounded-2xl bg-card p-8 text-center"><Package className="mx-auto mb-2 text-muted-foreground" /><p>No orders yet.</p></div>;
  return (
    <div className="space-y-3">
      {data.map((o) => (
        <Link key={o.id} to="/receipt/$orderId" params={{ orderId: o.id }} className="block rounded-2xl bg-card p-4 transition hover:shadow-pop">
          <div className="flex items-center justify-between">
            <div><p className="font-mono text-sm font-semibold">{o.id}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")} · {o.payment_method}</p></div>
            <div className="text-right"><p className="font-bold">{inr(Number(o.total))}</p><span className="rounded bg-warning/30 px-2 py-0.5 text-xs font-semibold">TEST PAID</span></div>
          </div>
          <p className="mt-2 truncate text-sm text-muted-foreground">{o.order_items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
        </Link>
      ))}
    </div>
  );
}

const EMPTY = { label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

function Addresses({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["addresses"], queryFn: fetchAddresses });
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const save = async () => {
    if (!form) return;
    if (!/^\d{6}$/.test(form.pincode)) return toast.error("PIN code must be 6 digits");
    if (!/^[6-9]\d{9}$/.test(form.phone)) return toast.error("Enter a valid 10-digit mobile number");
    const { error } = await supabase.from("addresses").insert({ ...form, user_id: userId, is_default: !data?.length });
    if (error) return toast.error(error.message);
    setForm(null); qc.invalidateQueries({ queryKey: ["addresses"] }); toast.success("Address saved");
  };
  const makeDefault = async (id: string) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["addresses"] });
  };
  const del = async (id: string) => { await supabase.from("addresses").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["addresses"] }); };
  const f = (k: keyof typeof EMPTY, label: string) => (
    <div><Label htmlFor={k}>{label}</Label><Input id={k} value={form![k]} onChange={(e) => setForm({ ...form!, [k]: e.target.value })} /></div>
  );
  return (
    <div className="space-y-3">
      {data?.map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-2xl bg-card p-4">
          <MapPin className="mt-1 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">{a.label} {a.is_default && <span className="ml-1 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">Default</span>}</p>
            <p className="text-sm">{a.full_name} · {a.phone}</p>
            <p className="text-sm text-muted-foreground">{formatAddress(a)}</p>
          </div>
          {!a.is_default && <Button size="sm" variant="outline" onClick={() => makeDefault(a.id)}>Make default</Button>}
          <Button size="icon" variant="ghost" onClick={() => del(a.id)} aria-label="Delete address"><Trash2 /></Button>
        </div>
      ))}
      {form ? (
        <div className="grid gap-3 rounded-2xl bg-card p-4 sm:grid-cols-2">
          {f("label", "Label (Home, Work…)")}{f("full_name", "Full name")}{f("phone", "Mobile")}{f("pincode", "PIN code")}
          <div className="sm:col-span-2">{f("line1", "House / street")}</div>
          <div className="sm:col-span-2">{f("line2", "Area / landmark (optional)")}</div>
          {f("city", "City")}{f("state", "State")}
          <div className="flex gap-2 sm:col-span-2"><Button onClick={save}>Save address</Button><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button></div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setForm(EMPTY)}><Plus /> Add address</Button>
      )}
    </div>
  );
}

function Profile({ userId }: { userId: string }) {
  const { data, refetch } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });
  const [edit, setEdit] = useState<{ full_name: string; phone: string; dietary_prefs: string } | null>(null);
  const v = edit ?? { full_name: data?.full_name ?? "", phone: data?.phone ?? "", dietary_prefs: data?.dietary_prefs ?? "" };
  const save = async () => {
    const { error } = await supabase.from("profiles").update(v).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Profile saved"); setEdit(null); refetch();
  };
  return (
    <div className="max-w-md space-y-3 rounded-2xl bg-card p-4">
      <div><Label htmlFor="fn">Full name</Label><Input id="fn" value={v.full_name} onChange={(e) => setEdit({ ...v, full_name: e.target.value })} /></div>
      <div><Label htmlFor="ph">Mobile</Label><Input id="ph" value={v.phone} onChange={(e) => setEdit({ ...v, phone: e.target.value })} /></div>
      <div><Label htmlFor="dp">Shopping preferences</Label><Input id="dp" placeholder="e.g. vegetarian, no onion-garlic" value={v.dietary_prefs} onChange={(e) => setEdit({ ...v, dietary_prefs: e.target.value })} />
        <p className="mt-1 text-xs text-muted-foreground">The shopping assistant uses this when suggesting products.</p></div>
      <Button onClick={save} disabled={!edit}>Save</Button>
    </div>
  );
}
