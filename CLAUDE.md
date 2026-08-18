# Claude Code Instructions — Arkhiveon (RPG Notes)

## Core Architectural Guidelines

### 1. Design System Verification
- Check `src/routes/design-system.tsx` before implementing UI features.
- Always apply global HSL semantic design tokens (`bg-background`, `bg-card-elevated`, `text-primary`, `border-border/70`). Avoid solid hex colors.
- Maintain glassmorphism (`backdrop-blur-md`), micro-animations, and responsive touch targets (`min-h-[44px]`).

### 2. Strict Anti-`useEffect` Rule
- Minimize or avoid `useEffect` usage.
- Derive state using `useMemo` or render-time calculations.
- Perform side-effects directly inside user event handlers (`onClick`, `onChange`, `onSubmit`).
- Use `useDeferredValue` for input filtering.

### 3. Zustand Performance Rules
- Selectors must return primitive values or stable references.
- Never instantiate new objects or arrays inside selectors (`useRPGStore(state => state.items.filter(...))`).
- Memoize heavy filtering with `useMemo`.

### 4. Code Standards & Tooling
- Package Manager: Always use `pnpm`.
- Formatting & Linting: Run `npx @biomejs/biome check --write <files>`.
- Type Safety: No `any` types. Verify build with `pnpm run build`.
- Branch naming: `garbini/*` or `arroyo/*`.

### 5. Mandatory Pull Request Description Format
Whenever pushing changes, completing a task, or preparing a branch for review, the AI MUST ALWAYS automatically provide a formatted, copy-paste ready Pull Request description following `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## ✨ What was added

- Clearly describe what was added or implemented in this PR.
Be specific and concise with bullet points.

## 📷 Implementation preview

<!-- Add screenshots or a short video showing the implemented feature.
Make sure the preview reflects the final behavior. -->
```
