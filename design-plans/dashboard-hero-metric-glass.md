# Align dashboard hero MetricCards to white/glass treatment

Written against: `72c4bff699e2fa1688882f0c8fc6374bef2a6ecb`

## Evidence chain

- Surface: `/dashboard` — campaign hero section, right-column metrics
- Problem: Within the same hero card, left-column copy and outline CTAs use white/glass (`text-white`, `border-white/30 bg-white/10`), while `MetricCard` uses theme surfaces (`bg-background/80`, `text-foreground`, `text-muted-foreground`), producing two color languages on one visual plane.
- Design evidence: Hero outline CTAs in `src/routes/dashboard.tsx` (~346–358) establish the glass pattern; AGENTS.md requires coherent token use and premium surfaces; design-system documents rich elevated surfaces on editorial openings.
- Owner: `MetricCard` in `src/routes/dashboard.tsx`
- Scope and affected surfaces: Only the three hero `MetricCard` instances (loaded + loading skeletons). No other routes import `MetricCard`.
- Uncertainty: none — exemplar CTAs already exist in the same section.

## Design decision

Restyle `MetricCard` (loaded and skeleton) to the same white/glass language as the hero outline buttons so metrics read as part of the dark mesh hero rather than as theme-page cards floating on it.

## Reuse

- Existing hero glass classes: `border-white/30`, `bg-white/10`, `backdrop-blur-sm`, `text-white`, `text-white/70`, `text-white/80`
- Existing hero outline CTA exemplar for hover/contrast on the mesh
- Exemplar: `src/routes/dashboard.tsx` — outline `Button` on “Registrar sessão” / “Convidar Jogadores”

No new primitive. The system already expresses this via utility classes used by sibling hero CTAs.

## Changes

1. `src/routes/dashboard.tsx` — `MetricCard` loaded state
   - Change: Replace container `border-border/70 bg-background/80 md:bg-background/45 … md:backdrop-blur-sm` with glass: `border-white/30 bg-white/10 shadow-sm shadow-black/5 backdrop-blur-sm` (keep `rounded-2xl p-5`). Set label to `text-white/70`, value to `text-white`, description to `text-white/80`, icon to `text-white` (drop `text-primary` on the icon so it matches the white plane; primary remains on the filled “Criar ficha” CTA).
   - Preserve: Layout (label/icon row, large value, truncated description), `font-display` on the value, loading branch structure, MetricCard call sites and props.
   - Verify: On `/dashboard` with a campaign loaded, the three metrics sit on the mesh with frosted white borders/type matching outline CTAs; no theme `background` fill.

2. `src/routes/dashboard.tsx` — `MetricCard` loading skeleton
   - Change: Apply the same glass container classes as the loaded state so skeletons do not flash theme-background cards.
   - Preserve: Skeleton sizes and layout.
   - Verify: While `isLoading` is true, metric placeholders use the same glass chrome.

## Scope

- Inherit: The three hero metrics only (Registros, Eventos, Sessões).
- Verify: Hero left column (white copy + primary/outline CTAs) still contrasts; soft vignette overlay unchanged.
- Exclude: Discord banner; StatPill / DashboardCard; mesh gradient colors; `ActivityFeed` / `LastSessionCard`; inventing new CSS tokens for glass.

## Validation

- Product: Open `/dashboard` with an active campaign — metrics remain readable on the purple mesh and feel continuous with outline CTAs.
- Interface: Desktop and mobile widths of the hero grid; loading (`isLoading`) and loaded states; long `description` truncation still works.
- System: No second glass pattern invented; reuse CTA class vocabulary; no parallel `MetricCard` API.
- Repository: `pnpm exec biome check --write src/routes/dashboard.tsx` → clean on that file.

## Stop conditions

- Stop if `MetricCard` is extracted/shared outside the hero and needs theme-aware styling for other surfaces — then parameterize variant instead of hardcoding glass.
- Stop if product intent requires metrics to remain theme cards (e.g. light-mode readability policy) — escalate before inventing a dual theme.

## Design documentation

- After acceptance and validation: none required beyond this plan; optional one-line note in `src/routes/design-system.tsx` under surfaces that dashboard hero metrics use white/glass on mesh — only if maintainers want it recorded.
