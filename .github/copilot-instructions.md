# GitHub Copilot Instructions — Arkhiveon (RPG Notes)

When generating code or suggesting edits in this codebase, follow these rules strictly:

1. **Design System Alignment**: Inspect `src/routes/design-system.tsx`. Use established HSL Tailwind classes (`bg-card-elevated`, `bg-background`, `text-primary`, `border-border/70`). Never introduce ad-hoc hex colors. Include glassmorphic styling and smooth micro-animations (`transition-all duration-150 active:scale-[0.98]`).
2. **Avoid Unnecessary `useEffect`**: Do NOT use `useEffect` for derived state or inline synchronization. Compute derived data with `useMemo` or inside event handlers. Multiple `useEffect` hooks create exponential cognitive complexity and re-render loops.
3. **Zustand Selector Safety**: Never instantiate new arrays or objects inside Zustand selectors. Return stable state fields only.
4. **Mobile Responsiveness**: Enforce touch-friendly button targets (min 44px) and responsive grid layouts (`grid-cols-1 sm:grid-cols-2`).
5. **Quality Checks**: Always use `pnpm` (never `npm`). Maintain clean TypeScript types (no `any`) and verify formatting with `npx @biomejs/biome check --write <files>`.
