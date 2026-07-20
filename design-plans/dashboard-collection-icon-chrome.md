# Align dashboard collection icons to EntityCard primary chrome

Written against: `72c4bff699e2fa1688882f0c8fc6374bef2a6ecb`

## Evidence chain

- Surface: `/dashboard` — StatPill row and Coleções `DashboardCard` grid
- Problem: Collection icons use ad-hoc Tailwind palette accents (`text-violet-300`, `text-fuchsia-300`, `text-amber-300`, `text-emerald-300`, `text-rose-300`, `text-indigo-300`) and `DashboardCard` renders the icon without the design-system primary chrome frame.
- Design evidence: `.agents/AGENTS.md` — use global tokens (`text-primary`, …); avoid ad-hoc solid colors. `src/routes/design-system.tsx` `EntityCard` (~779–780): `rounded-2xl border border-primary/15 bg-primary/10 text-primary`. `MotionRule` uses the same primary chrome.
- Owner: `sections`, `StatPill`, `DashboardCard` in `src/routes/dashboard.tsx`
- Scope and affected surfaces: Dashboard collection pills and cards only. Collection list pages (`/characters`, etc.) keep their own entity cards.
- Uncertainty: none — EntityCard is the binding icon chrome exemplar; AGENTS forbids the current accent palette.

## Design decision

Remove per-section rainbow `accent` colors and apply the design-system EntityCard icon chrome (`border-primary/15 bg-primary/10 text-primary`) to both `StatPill` and `DashboardCard` so collection entry points share one Arkhiveon accent owner.

## Reuse

- Token: `text-primary`, `border-primary/15`, `bg-primary/10`
- Composition: EntityCard icon well
- Exemplar: `src/routes/design-system.tsx` — `EntityCard` icon container

No new primitive. Do not invent a shared `CollectionIcon` component unless a third consumer appears; keep class strings local to dashboard helpers.

## Changes

1. `src/routes/dashboard.tsx` — `sections` array
   - Change: Delete the `accent` property from every section object.
   - Preserve: `to`, `title`, `description`, `Icon`, `key`.
   - Verify: Typecheck/compile — no remaining references to `section.accent`.

2. `src/routes/dashboard.tsx` — call sites mapping `sections`
   - Change: Stop passing `iconColor={section.accent}` into `StatPill` and `DashboardCard`.
   - Preserve: Stagger wrappers, counts, loading flags, routes.
   - Verify: Both grids still render six links with correct counts.

3. `src/routes/dashboard.tsx` — `StatPill`
   - Change: Remove `iconColor` from props/interface. Replace icon well `rounded-lg border border-border/70 bg-background/60` + colored `Icon` with EntityCard-scaled chrome: `flex h-8 w-8 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary` and `<Icon className="h-4 w-4" strokeWidth={1.7} />`.
   - Preserve: Link hover (`hover:border-primary/30`, lift/scale), typography, skeleton layout (skeleton icon well may use `rounded-lg` still).
   - Verify: All six pills show primary-tinted icon wells; no violet/fuchsia/amber/etc. classes remain.

4. `src/routes/dashboard.tsx` — `DashboardCard`
   - Change: Remove `iconColor` from props/interface. Replace the bare colored wrapper with EntityCard chrome at card size: `flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary` and icon `h-6 w-6` (or `h-5 w-5` if visual balance needs a slight downsize — prefer matching current `h-6 w-6` first).
   - Preserve: Card hover, top primary hairline, count block, footer “Abrir coleção”, skeleton structure (`Skeleton` for icon may use `rounded-2xl` to match).
   - Verify: Six collection cards show primary chrome icons; title hover still uses `group-hover:text-primary`.

## Scope

- Inherit: Dashboard StatPill row + Coleções grid only.
- Verify: Loading skeletons for both components still align dimensionally with the new wells.
- Exclude: Discord `#5865F2` banner; hero MetricCard glass (separate plan); mesh gradient hex palette; rewriting entity cards on other routes; inventing per-collection semantic color tokens.

## Validation

- Product: From `/dashboard`, open each collection via pill and card — icons read as Arkhiveon primary, not rainbow Tailwind.
- Interface: Loaded and loading states; light and dark theme (primary token must resolve in both); hover/active on pills and cards unchanged in motion.
- System: Icon chrome matches `EntityCard`; no leftover `accent` / `iconColor` API; no new color token file.
- Repository: `pnpm exec biome check --write src/routes/dashboard.tsx` → clean on that file.

## Stop conditions

- Stop if product explicitly requires distinct per-collection hues — that needs a documented token map in the design system before reintroducing accents.
- Stop if removing `iconColor` breaks tests that assert those class strings — update tests to assert primary chrome instead; do not restore rainbow.

## Design documentation

- After acceptance and validation: none required. Optional: in `src/routes/design-system.tsx`, note that dashboard collection shortcuts reuse EntityCard icon chrome — only if maintainers want the handoff recorded.
