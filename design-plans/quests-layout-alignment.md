# Align the missions page with the collection layout

Written against: `9ceb3c849554f280bbd89b70ea43e5e94109201b`

## Evidence chain

- Surface: `/quests/`
- Problem: The missions route renders `PageHeader` inside the same padded, width-limited wrapper as the page body. Because `PageHeader` already owns `px-6 sm:px-8` and an inner `max-w-7xl`, the route applies the collection gutters and width constraint twice. The result is a narrower, inset hero whose edges do not align with the search, summary, and cards. The card action row also keeps three compact controls on one non-wrapping line at mobile widths.
- Design evidence: `src/routes/design-system.tsx` lines 214–236 defines the page pattern as `PageHeader` followed by a separate `mx-auto ... max-w-7xl ... px-6 ... sm:px-8` body. `src/routes/items/index.tsx` lines 86–136 and `src/routes/sessions/index.tsx` lines 34–82 use that composition at runtime. `.agents/AGENTS.md` sections 1 and 4 require reuse of the design system, mobile-first layout, 44px touch targets, and overflow prevention.
- Owner: `src/routes/quests/index.tsx`; reused owners are `src/components/page-header.tsx`, `src/components/list-layout.tsx`, `src/components/ui/button.tsx`, and `src/components/empty-state.tsx`.
- Scope and affected surfaces: `/quests/` at mobile and desktop widths, including empty and populated states. Create/edit dialog behavior is preserved.
- Uncertainty: none. The governing page composition and responsive requirements are explicit, and the same composition is live on sibling collection routes.

## Design decision

Make `/quests/` use the canonical collection-page composition: a full-width route wrapper, `PageHeader` as its first child, and one separate width-limited body wrapper for search, summary, empty state, and mission cards. Keep the two-column card grid from `md` upward, but make each card's action footer stack on narrow screens and use the shared `Button` sizes so controls meet the repository's mobile touch-target rule without horizontal overflow.

## Reuse

- `PageHeader` for hero spacing, width, icon, title, description, count, and primary action.
- `ListLayout` for search and filters.
- `EmptyState` for the collection's empty result.
- `Button` `sm`/`ghost` variants for mission actions.
- Exemplar: `src/routes/design-system.tsx` lines 214–236; runtime exemplars: `src/routes/items/index.tsx` and `src/routes/sessions/index.tsx`.

No new primitive is required. The existing owners express the whole correction.

## Changes

1. `src/routes/quests/index.tsx` — page composition
   - Change: Replace the outer padded wrapper with `w-full`; render `PageHeader` directly beneath it; move `ListLayout`, the progress summary, results, and dialogs into a sibling `mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8` body wrapper.
   - Change: Give `PageHeader` the missions count and a mission-specific eyebrow while retaining its default `text-primary` icon token.
   - Preserve: Search, filters, counts, create/edit dialog state, status changes, deletion, and the existing `md:grid-cols-2` mission-card density.
   - Verify: Hero and body share the same visual 7xl alignment without doubled horizontal padding; the route matches the page-pattern exemplar.

2. `src/routes/quests/index.tsx` — mobile card footer
   - Change: Stack status and edit/delete action groups at the base breakpoint, returning to a horizontal footer at `sm`; make the status action full-width on mobile and use shared `Button` components with at least `h-11` for all three controls.
   - Preserve: Completed-state toggle copy and styling, edit/delete handlers, semantic status colors, and the existing horizontal desktop arrangement.
   - Verify: At 320–430px widths no footer label clips or overflows and every action has a 44px-high touch target.

3. `src/routes/quests/index.tsx` — empty result
   - Change: Replace the route-local dashed empty panel with the shared `EmptyState` owner and mission copy.
   - Preserve: Empty-state meaning and the create action in the page header.
   - Verify: Empty missions and zero search results span the available grid/body width and match sibling collection pages.

## Scope

- Inherit: `/quests/` only.
- Verify: Empty list; populated list with main/side and active/completed/failed missions; long title, requester, location, reward, and notes; create/edit dialogs; 320px, 390px, 768px, and desktop widths.
- Exclude: Store schema and persistence, quest form fields, deletion confirmation behavior, new card primitives, motion redesign, and unrelated collection routes.

## Validation

- Product: Open `/quests/`, search/filter missions, toggle a mission complete, edit it, and open the create dialog; layout changes must not alter those flows.
- Interface: Compare hero/body alignment with `/items/`; verify empty and populated states at mobile and desktop widths; check long metadata and the stacked mobile action footer for overflow.
- System: Confirm `PageHeader`, `ListLayout`, `EmptyState`, and `Button` are reused and no parallel page-layout primitive or CSS file is added.
- Repository: `pnpm exec biome check --write src/routes/quests/index.tsx` then `pnpm run build` -> both succeed.

## Stop conditions

- Stop if `PageHeader` is no longer the active collection-page owner or if the design-system page-pattern composition has changed since the recorded commit.
- Stop if correcting mobile actions requires changing quest data or store behavior; that is outside this layout fix.

## Design documentation

- After acceptance and validation: none. The implementation conforms to the existing page pattern and mobile rules.
