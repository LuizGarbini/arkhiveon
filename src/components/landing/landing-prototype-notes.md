# Landing Page Prototype — Notes

## Question

**Como a landing deve equilibrar atmosfera de marca vs. prova de valor operacional do Arkhiveon?**

## Variants

| Key | Name | URL | Focus |
|-----|------|-----|-------|
| A | Baseline | `/?variant=A` | Current mood-first layout with character sheet mockup |
| B | Product Demo | `/?variant=B` | Split hero + workflow demo (campaign → links → session recap) |
| C | Steps First | `/?variant=C` | Compact hero + dominant "Como funciona" timeline + long-form pricing copy |

## How to review

1. Run `pnpm dev`
2. Open `http://127.0.0.1:3000/?variant=A` (or B / C)
3. Use the floating bottom bar or ← → arrow keys to cycle variants
4. Note what works from each — the winner is often a mix ("header from B, steps from C")

## Verdict

<!-- Fill in after review -->

**Chosen variant:** _TBD_

**Why:**

**Elements to steal from other variants:**

**Next step:** Delete losing variants + switcher; rewrite winner as production code.
