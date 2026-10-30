import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, HelpCircle, Home, Search, ShoppingBasket, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCTS, categoryById, productById } from "@/game/catalog";
import { COUNTERS, FACES, ROW_X, ROW_Z0, ROW_Z1, STORE, productSlot, standPoint } from "@/game/layout";
import { input, player, teleport, useUi } from "@/game/runtime";
import { useBasket, toLines } from "@/game/basket";
import { computeTotals, inr, sellingPrice } from "@/game/pricing";
import { isMuted, setMuted } from "@/game/sfx";
import { ProductPanel } from "@/components/shop/ProductCard";
import { BasketSheet } from "@/components/shop/BasketSheet";
import { AssistantSheet } from "@/components/shop/AssistantSheet";
import { useCatalogVersion } from "@/hooks/use-catalog";
import { Sparkles, UserRound } from "lucide-react";

const Supermarket = lazy(() => import("@/components/store3d/Supermarket"));

export const Route = createFileRoute("/store")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inside the store — FreshMart 3D" },
      { name: "description", content: "Walk the 3D aisles of FreshMart and pick products into your basket." },
      { property: "og:title", content: "Inside the store — FreshMart 3D" },
      { property: "og:description", content: "Walk the 3D aisles and pick products into your basket." },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(true);
  const selectedId = useUi((s) => s.selectedId);
  const hoveredId = useUi((s) => s.hoveredId);
  const nearCheckout = useUi((s) => s.nearCheckout);
  const basketOpen = useUi((s) => s.basketOpen);
  const viewed = useBasket((s) => s.viewed);
  const [assist, setAssist] = useState(false);
  useCatalogVersion((s) => s.v);

  useEffect(() => { if (selectedId) viewed(selectedId); }, [selectedId, viewed]);
  useEffect(() => () => { useUi.getState().select(null); }, []);

  const hovered = hoveredId ? productById(hoveredId) : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background" data-scene-ready={ready ? "" : undefined}>
      <Suspense fallback={null}>
        <Supermarket onReady={() => setReady(true)} />
      </Suspense>
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-hero text-primary-foreground">
          <div className="text-center"><div className="mb-3 animate-bounce text-5xl">🛒</div><p className="font-display text-2xl font-bold">Opening the doors…</p></div>
        </div>
      )}

      {/* crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground/60" />
      {hovered && !selectedId && (
        <div className="hud-glass pointer-events-none absolute left-1/2 top-[56%] -translate-x-1/2 rounded-xl px-3 py-2 text-center text-sm">
          <b>{hovered.name}</b> · {inr(sellingPrice(hovered))}
          <div className="text-xs text-muted-foreground">Click or press E to pick up</div>
        </div>
      )}

      <TopBar />

      {selectedId && (
        <div className="absolute bottom-4 right-4 left-4 flex justify-end sm:left-auto sm:top-20 sm:bottom-auto">
          <ProductPanel id={selectedId} onClose={() => useUi.getState().select(null)} />
        </div>
      )}

      {nearCheckout && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 animate-fly-in">
          <Button asChild size="lg" className="bg-accent text-accent-foreground shadow-pop hover:bg-accent/90">
            <Link to="/checkout">🧾 You're at the billing counter — Review & pay</Link>
          </Button>
        </div>
      )}

      <MiniMap />
      {!selectedId && <MovePad />}

      {help && ready && (
        <div className="absolute inset-0 grid place-items-center bg-foreground/40 p-4" onClick={() => setHelp(false)}>
          <div className="animate-fly-in max-w-sm rounded-2xl bg-card p-6 text-card-foreground shadow-pop">
            <h2 className="text-2xl font-bold">Welcome to FreshMart 👋</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>🚶 <b>W A S D</b> / arrows — walk & turn</li>
              <li>🖱️ Drag — look around</li>
              <li>👆 Click a product or press <b>E</b> — inspect it</li>
              <li>🗺️ Tap an aisle on the map to jump there</li>
              <li>🧾 Billing counters are to your right near the entrance</li>
            </ul>
            <Button className="mt-5 w-full" size="lg" onClick={() => setHelp(false)}>Start shopping</Button>
          </div>
        </div>
      )}
      <AssistantSheet open={assist} onOpenChange={setAssist} />
      <Button className="absolute left-3 top-16 bg-accent text-accent-foreground shadow-pop hover:bg-accent/90" onClick={() => setAssist(true)}><Sparkles /> Ask the assistant</Button>
      <BasketSheet open={basketOpen} onOpenChange={(v) => useUi.getState().setBasketOpen(v)} />
      <HelpToggle onClick={() => setHelp(true)} />
    </div>
  );
}

function HelpToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button size="icon" variant="secondary" className="absolute bottom-4 left-[13.5rem] hidden shadow-hud sm:flex" onClick={onClick} aria-label="Help"><HelpCircle /></Button>
  );
}

function TopBar() {
  const items = useBasket((s) => s.items);
  const coupon = useBasket((s) => s.coupon);
  const t = computeTotals(toLines(items), coupon || undefined);
  const [bump, setBump] = useState(0);
  const [fly, setFly] = useState<{ k: number; e: string } | null>(null);
  const [q, setQ] = useState("");
  const [muted, setM] = useState(isMuted());
  useEffect(() => {
    const h = (e: Event) => { setBump((b) => b + 1); setFly({ k: Date.now(), e: (e as CustomEvent).detail }); };
    window.addEventListener("basket-add", h);
    return () => window.removeEventListener("basket-add", h);
  }, []);
  const results = q.trim().length > 1
    ? PRODUCTS.filter((p) => (p.name + p.brand + categoryById(p.categoryId)?.name).toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="absolute inset-x-0 top-0 flex items-start gap-2 p-3">
      <Button asChild size="icon" variant="secondary" className="shadow-hud" aria-label="Leave store"><Link to="/"><Home /></Link></Button>
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a product…" className="hud-glass h-10 pl-9" />
        {results.length > 0 && (
          <div className="hud-glass absolute mt-1 w-full overflow-hidden rounded-xl">
            {results.map((p) => (
              <button key={p.id} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => {
                const { zCenter } = productSlot(p);
                const s = standPoint(p.categoryId, zCenter);
                teleport(s.x, s.z, s.yaw);
                useUi.getState().select(p.id);
                setQ("");
              }}>
                <span>{p.emoji}</span><span className="flex-1 truncate">{p.name}</span><span className="text-muted-foreground">{inr(sellingPrice(p))}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ml-auto flex gap-2">
        <Button asChild size="icon" variant="secondary" className="shadow-hud" aria-label="My account"><Link to="/account"><UserRound /></Link></Button>
        <Button size="icon" variant="secondary" className="shadow-hud" onClick={() => { setMuted(!muted); setM(!muted); }} aria-label="Toggle sound">{muted ? <VolumeX /> : <Volume2 />}</Button>
        <button
          key={bump}
          onClick={() => useUi.getState().setBasketOpen(true)}
          className={`relative flex h-12 items-center gap-2 rounded-2xl bg-primary px-4 text-primary-foreground shadow-pop ${bump ? "animate-bump" : ""}`}
        >
          <ShoppingBasket />
          <span className="text-left leading-tight"><span className="block text-xs opacity-80">{t.itemCount} items</span><b>{inr(t.grandTotal)}</b></span>
          {fly && <span key={fly.k} className="pointer-events-none absolute -bottom-6 left-2 animate-fly-in text-2xl">{fly.e}</span>}
        </button>
      </div>
    </div>
  );
}

const MAP_W = 180;
const sx = (x: number) => ((x - STORE.minX) / (STORE.maxX - STORE.minX)) * MAP_W;
const MAP_H = ((STORE.maxZ - STORE.minZ) / (STORE.maxX - STORE.minX)) * MAP_W;
const sz = (z: number) => ((z - STORE.minZ) / (STORE.maxZ - STORE.minZ)) * MAP_H;

function MiniMap() {
  const dot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (dot.current) dot.current.style.transform = `translate(${sx(player.x) - 6}px, ${sz(player.z) - 6}px) rotate(${-player.yaw}rad)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="hud-glass absolute bottom-4 left-4 hidden rounded-2xl p-2 sm:block">
      <p className="mb-1 px-1 text-xs font-semibold text-muted-foreground">Store map · tap to go</p>
      <div className="relative rounded-lg bg-muted" style={{ width: MAP_W, height: MAP_H }}>
        {ROW_X.map((x) => (
          <div key={x} className="absolute rounded-sm bg-foreground/25" style={{ left: sx(x) - 3, top: sz(ROW_Z0), width: 6, height: sz(ROW_Z1) - sz(ROW_Z0) }} />
        ))}
        {FACES.map((f) => {
          const c = categoryById(f.categoryId)!;
          return (
            <button key={c.id} title={c.name} onClick={() => { const s = standPoint(c.id); teleport(s.x, s.z, s.yaw); }}
              className="absolute grid h-6 w-6 place-items-center rounded-full bg-card text-xs shadow-hud transition hover:scale-125"
              style={{ left: sx(f.rowX + f.side * 2) - 12, top: sz(-12) - 12 }}>{c.emoji}</button>
          );
        })}
        {COUNTERS.map((c) => (
          <div key={c.x} className="absolute rounded-sm bg-accent" style={{ left: sx(c.x - c.w / 2), top: sz(c.z) - 2, width: sx(c.x + c.w / 2) - sx(c.x - c.w / 2), height: 4 }} />
        ))}
        <button className="absolute text-[10px] font-bold text-accent" style={{ left: sx(10), top: sz(8) }} onClick={() => teleport(13, 8.5, 0)}>BILLING</button>
        <div ref={dot} className="absolute left-0 top-0 h-3 w-3">
          <div className="h-3 w-3 rounded-full border-2 border-card bg-primary" />
          <div className="absolute -top-1.5 left-1 h-2 w-1 rounded bg-primary" />
        </div>
      </div>
    </div>
  );
}

function MovePad() {
  const hold = (key: "forward" | "right" | "turn", v: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); input[key] = v; },
    onPointerUp: () => (input[key] = 0),
    onPointerCancel: () => (input[key] = 0),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const cls = "h-12 w-12 rounded-xl shadow-hud select-none touch-none";
  return (
    <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1.5" aria-label="Movement controls">
      <span />
      <Button variant="secondary" className={cls} {...hold("forward", 1)} aria-label="Walk forward"><ArrowUp /></Button>
      <span />
      <Button variant="secondary" className={cls} {...hold("turn", -1)} aria-label="Turn left"><ArrowLeft /></Button>
      <Button variant="secondary" className={cls} {...hold("forward", -1)} aria-label="Walk back"><ArrowDown /></Button>
      <Button variant="secondary" className={cls} {...hold("turn", 1)} aria-label="Turn right"><ArrowRight /></Button>
    </div>
  );
}

