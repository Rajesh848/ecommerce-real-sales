import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Footprints, MousePointerClick, ShoppingBasket, Store, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, PRODUCTS } from "@/game/catalog";
import { COUPONS, inr, sellingPrice } from "@/game/pricing";
import heroImg from "@/assets/store-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreshMart 3D — Walk-in Virtual Supermarket" },
      { name: "description", content: "Enter a 3D supermarket, walk the aisles, pick products into your basket and pay at the billing counter." },
      { property: "og:title", content: "FreshMart 3D — Walk-in Virtual Supermarket" },
      { property: "og:description", content: "Shop like you're really there: aisles, shelves, basket and billing counter." },
    ],
  }),
  component: Welcome,
});

const offers = PRODUCTS.filter((p) => p.discountPct >= 15).slice(0, 4);

function Welcome() {
  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden">
        <img src={heroImg} alt="Bright supermarket aisle" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero opacity-80" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-between px-6 py-8 text-primary-foreground">
          <header className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-xl">🛒</span>
            <span className="font-display text-2xl font-extrabold">FreshMart</span>
            <span className="ml-auto flex items-center gap-1 text-sm opacity-90"><Clock className="h-4 w-4" /> Open daily · 7:00 AM – 11:00 PM</span>
          </header>
          <div className="max-w-2xl py-16">
            <p className="mb-3 inline-block rounded-full bg-primary-foreground/15 px-3 py-1 text-sm">Your neighbourhood supermarket, in 3D</p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] md:text-7xl">Walk in.<br />Pick it off the shelf.</h1>
            <p className="mt-5 max-w-lg text-lg opacity-90">Stroll through nine aisles, inspect products up close, fill your basket and check out at the billing counter.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold shadow-pop">
                <Link to="/store"><Store /> ENTER STORE</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-primary-foreground/40 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/aisles">Quick shop (2D)</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <span key={c.id} className="rounded-full bg-primary-foreground/15 px-3 py-1 text-sm">{c.emoji} {c.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold"><Tag className="text-accent" /> Today's offers</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {offers.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                <span className="grid h-14 w-14 place-items-center rounded-xl text-3xl" style={{ background: p.color }}>{p.emoji}</span>
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm"><b className="text-primary">{inr(sellingPrice(p))}</b> <s className="text-muted-foreground">{inr(p.mrp)}</s> <span className="font-bold text-accent">{p.discountPct}% off</span></p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {COUPONS.map((c) => (
              <span key={c.code} className="rounded-lg border-2 border-dashed border-accent px-3 py-2 text-sm"><b className="font-mono">{c.code}</b> · {c.label}</span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-secondary p-6">
          <h2 className="text-2xl font-bold">How to shop</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="flex gap-3"><Footprints className="shrink-0 text-primary" /> Walk with <b>W A S D</b> or arrow keys. On phones, use the on-screen pad.</li>
            <li className="flex gap-3"><MousePointerClick className="shrink-0 text-primary" /> Drag to look around. Click a product (or aim and press <b>E</b>) to inspect it.</li>
            <li className="flex gap-3"><ShoppingBasket className="shrink-0 text-primary" /> Add to basket — your total updates instantly.</li>
            <li className="flex gap-3"><Store className="shrink-0 text-primary" /> Walk to the orange billing counters near the entrance to pay.</li>
          </ul>
          <Button asChild className="mt-6 w-full" size="lg"><Link to="/store">Start shopping</Link></Button>
        </div>
      </section>
    </main>
  );
}
