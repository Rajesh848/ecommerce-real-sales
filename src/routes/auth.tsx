import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/account");

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s["redirect"] === "string" ? (s["redirect"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — FreshMart 3D" },
      { name: "description", content: "Sign in or create your FreshMart account to save addresses and see past orders." },
      { property: "og:title", content: "Sign in — FreshMart 3D" },
      { property: "og:description", content: "Your FreshMart account: addresses and order history." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const target = safePath(redirect);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: target, replace: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") nav({ to: target, replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [nav, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + target, data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-secondary p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-pop">
        <Link to="/" className="font-display text-2xl font-extrabold text-primary">🛒 FreshMart</Link>
        <h1 className="mt-4 text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        {sent ? (
          <p className="mt-4 rounded-xl bg-muted p-4 text-sm">Check <b>{email}</b> for a confirmation link, then come back to sign in.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === "up" && (<div><Label htmlFor="n">Full name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} required /></div>)}
            <div><Label htmlFor="e">Email</Label><Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label htmlFor="p">Password</Label><Input id="p" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>{mode === "in" ? "Sign in" : "Sign up"}</Button>
            <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "in" ? "New here? " : "Already have an account? "}
          <button className="font-semibold text-primary" onClick={() => { setMode(mode === "in" ? "up" : "in"); setSent(false); }}>
            {mode === "in" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">You can also shop as a guest — no account needed.</p>
      </div>
    </main>
  );
}
