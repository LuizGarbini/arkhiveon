# Character card — banner + metrics (shipped)

Supersedes the earlier elevated-thumbnail plan. Prototype verdict: **B** won.

## Composition

- Elevated `bg-card-elevated` chassis with banner portrait (`aspect-[5/4]`, `sm:aspect-[4/3]`)
- Name, race · class, system/level(/player) tags on the media, over a **local** elliptical shadow (not full-width dark wash)
- Three metric cells below: CA / Ini / PV with icons
- EntityActions top-right; camera top-left on media (hidden for viewers)
- Whole-card Link to `/sheets/$characterId`

## Owner

`src/components/character-card.tsx` — `/characters/` only.

## Notes

See `src/components/character-card-prototype-notes.md` for prototype history.
