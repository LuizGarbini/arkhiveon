# World + Campaign Switcher Design

**Date:** 2026-07-18  
**Status:** Approved for implementation

## Goals

- Make Mundo + Campanha first-class in the sidebar switcher (two-level, single panel).
- Stop using `/world` as the place to switch tables.
- Enforce plan limits: worlds owned + campaigns owned per world.
- Keep invite model: guests use the campaign owner's plan (creations/storage).

## Limits

| | Free (owner) | Pro (owner) |
|---|---|---|
| Owned worlds | 1 | 5 |
| Owned campaigns **per world** | 1 | 5 |
| Joining invited campaigns | unlimited (does not consume own slots) | same |
| Creations / storage | unchanged; guest inherits active campaign owner's plan | unchanged |

Counts only entities where the user is world `ownerUserId` / campaign `myRole === owner`.

## Switcher (single panel)

**Trigger:** campaign name (+ role); subtitle = active world name.

**Dropdown:**

1. Active world row → submenu/list of accessible worlds (owned or member of ≥1 campaign).
2. Campaigns of the active world only (edit/invite/delete as today for owner).
3. Nova Campanha — always in active world; toast on per-world limit.
4. Novo Mundo — toast on world limit; on create, set as active world and open Nova Campanha.

**On world change:** if current campaign ∉ world, switch to first accessible campaign in that world; if none, show empty list + Nova Campanha CTA when allowed.

**Forms:** Nova Campanha has no world picker. Novo Mundo is name-only.

## Sidebar IA

**Mesa:** Dashboard, Personagens, Árvore, Sessões  
**Mundo:** Visão geral, NPCs, Facções, Mural, Itens, Locais, Lore, Imagens  

Shortcuts: Alt+1–4 mesa; Alt+5 NPCs; Alt+6–8 itens/locais/lore.

Context switching only via switcher. `/world` is overview (rename, list campaigns as shortcuts, grimoire links) — not primary create/switch UX.

## Billing

Update Free/Pro cards/copy to state world + per-world campaign limits and that invited players use the master's plan.

## Out of scope

- World delete UI polish beyond existing rules
- Stripe price changes
