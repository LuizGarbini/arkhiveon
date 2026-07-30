# Character Card Prototype — Notes

## Question

**Como devem ficar os cards de personagem em `/characters/` depois de sair do full-bleed portrait?**

## Verdict

**Chosen variant:** **B — Banner · title on media** (refined)

**Why:** Banner composition wins over elevated thumbnail (A) and dense roster (C). Title/meta/tags sit on the portrait with a *local* elliptical shadow (not a full-width wash). Compact metric cells (CA / Ini / PV) live in the elevated body below with breathing room above.

**Elements stolen during refinement:**
- Local elliptical scrim + `text-shadow` for name/meta (from D experiments)
- Taller aspect portrait (`aspect-[5/4]` / `sm:aspect-[4/3]`)
- Icon + mono metric cells
- Camera control top-left on media

**Discarded:** A (elevated thumb), C (dense roster), D (clean body fork — useful for shadow lessons only)

## Shipped

Folded into `src/components/character-card.tsx`. Prototype switcher and variant files deleted.

## Next (optional)

- Add Character mockup under design-system “Redesign dos Cards de Entidades”
- Retire or rewrite `design-plans/character-card-elevated-thumbnail.md` (plan assumed A; product chose B)
