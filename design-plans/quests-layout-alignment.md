# Make missions follow the Characters collection pattern

Written against: `8f09aaccd7956d5fe3ccd7412f370a901b65ae9e`

## Evidence chain

- Surface: `/quests/`, compared directly with `/characters/` in the user-provided rendered reference.
- Problem: The missions body combines `max-w-7xl` and horizontal padding on one element, so at wide viewports the padding is subtracted from the maximum width and the search, summary, and results become 64px narrower than the `PageHeader`. Characters applies padding on an outer element and `max-w-7xl` on an inner element, keeping header, search, and results the same width. Missions also inserts a route-specific progress-summary row between search and results, while the selected Characters pattern goes directly from search to the result grid or empty state.
- Design evidence: User-provided Characters screenshot; `src/routes/characters/index.tsx` lines 110–190; shared `PageHeader`, `ListLayout`, and `EmptyState`; `.agents/AGENTS.md` section 1 requires the design-system pattern to govern UI changes.
- Owner: `src/routes/quests/index.tsx`; visual exemplars and reused owners are `src/routes/characters/index.tsx`, `src/components/page-header.tsx`, `src/components/list-layout.tsx`, and `src/components/empty-state.tsx`.
- Scope and affected surfaces: `/quests/` empty, filtered-empty, and populated states at mobile and desktop widths.
- Uncertainty: none. The user explicitly selected Characters as the target, and the width difference follows deterministically from the two box-model compositions.

## Design decision

Make Missions use the exact collection flow selected by the user: `PageHeader`, then an outer gutter wrapper, then an inner `max-w-7xl` stack containing `ListLayout` followed immediately by one result grid. Remove the bespoke progress-summary row; the header count remains the collection-level summary. Render `EmptyState` inside the result grid exactly as Characters does.

## Reuse

- `PageHeader` for the hero and total mission count.
- `ListLayout` for search and filters.
- `EmptyState` as a full-span result-grid child.
- Exemplar: `src/routes/characters/index.tsx` lines 110–190.

No new primitive is required for this scoped correction. Copy the existing Characters composition without changing its owner or inventing another page shell.

## Changes

1. `src/routes/quests/index.tsx` — body width composition
   - Change: Replace the combined `mx-auto ... max-w-7xl ... px-6 ... sm:px-8` wrapper with the exact Characters nesting: outer `px-6 pb-10 sm:px-8`, inner `mx-auto flex w-full max-w-7xl flex-col gap-5`.
   - Preserve: `PageHeader`, header count/action, dialogs, filters, and all mission behavior.
   - Verify: At viewports wider than 1344px, the left and right edges of header, search, and results align exactly; at narrower widths, current gutters remain unchanged.

2. `src/routes/quests/index.tsx` — standard collection flow
   - Change: Remove the three-card progress-summary row and its derived `activeCount`/`completedCount` values. Keep the total in `PageHeader`.
   - Preserve: Status/category badges on mission cards and status filtering.
   - Verify: The visible sequence matches Characters: header → search/filter → results or empty state.

3. `src/routes/quests/index.tsx` — results and empty state
   - Change: Always render the mission results grid and place `EmptyState` inside it when no missions match, mirroring the Characters grid composition.
   - Preserve: The two-column mission-card density from `md` upward, mission card content/actions, and empty-state copy.
   - Verify: Empty and populated states occupy the same full body width and switching search/filter state does not change the page shell.

## Scope

- Inherit: `/quests/` only.
- Verify: Empty collection, zero search results, active filters, populated cards with long content, 320px, 768px, 1440px, and wider desktop viewports.
- Exclude: Mission data/store behavior, form fields, card visual redesign, Character route changes, and repository-wide migration of other collection routes.

## Validation

- Product: Search/filter missions, open create/edit dialogs, toggle completion, and confirm those flows are unchanged.
- Interface: Compare `/quests/` with the supplied `/characters/` reference; confirm identical outer widths and block order for header, search, and result/empty surfaces.
- System: Reuse `PageHeader`, `ListLayout`, and `EmptyState`; do not add a competing layout primitive.
- Repository: `.\\node_modules\\.bin\\biome.CMD check --write src\\routes\\quests\\index.tsx` then `pnpm run build` -> both succeed.

## Stop conditions

- Stop if Characters no longer renders the cited outer-gutter/inner-max-width composition.
- Stop if removing the summary row would remove the only access to a mission action or status; current source shows it is display-only.

## Design documentation

- After acceptance and validation: none. The correction follows the user-selected live exemplar.
