<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Store rules (catalogue, pricing/GST/coupons, floor plan) live in plain TS under `src/game/` with no React/three imports, so they stay unit-testable (`src/game/pricing.test.ts`).
- 3D scene (`src/components/store3d/`) only draws state; per-frame player/input state lives in `src/game/runtime.ts` refs, never React state.
- 3D/browser-only routes (`/store`, `/checkout`, `/receipt`, `/aisles`) use `ssr: false` because the basket persists in localStorage.
- Payments stay in clearly labelled test mode until Razorpay keys + server-side signature verification exist; never mark an order as really paid from the client.
- Prices/stock live in the `products` table; `useCatalogSync` (root) patches the bundled `PRODUCTS` objects so the 3D scene keeps its visuals in code.
- Signed-in orders go through the `place_order` SQL function, which recomputes prices from the DB and decrements stock atomically; keep its coupon logic in sync with `src/game/pricing.ts`. Guest orders stay local-only.
- Admin access is the `user_roles` table + `has_role`; the first account to sign up is made admin by the signup trigger.
- The shopping assistant is an authenticated server function (`src/lib/assistant.functions.ts`) so anonymous visitors cannot spend AI credits; model calls live in `src/lib/ai/*.server.ts`.
