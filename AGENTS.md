# Universal Agent Instructions — Arkhiveon (RPG Notes)

This document establishes development standards and workflow rules for ALL AI agents (Antigravity, Cursor, Claude, ChatGPT, GitHub Copilot, Roo Code, Windsurf) operating in this repository.

---

## 1. Design System & UI
- Before building or altering UI components, inspect `src/routes/design-system.tsx`.
- Use global semantic HSL design tokens (`bg-background`, `bg-card`, `bg-card-elevated`, `text-primary`, `text-foreground`, `text-muted-foreground`, `border-border/70`).
- Never introduce arbitrary hardcoded hex colors (e.g., `#1a1a1a`).
- Follow glassmorphism (`backdrop-blur-md`), micro-interactions (`active:scale-[0.98]`), and mobile touch target guidelines (minimum 44px).
- Adhere strictly to the **Web Interface Guidelines** (by Rauno Freiberg — https://interfaces.rauno.me/):
  - **Interactivity**: Input label focus, `<form>` submit on Enter, `select-none` on interactive elements, `pointer-events-none` on decorative background glows/shaders, no dead zones in list padding.
  - **Typography**: `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`, no font weight shifts on hover, `tabular-nums` for counters/timers/data.
  - **Motion**: Duration <= 200ms with snappy easing, scale transforms proportional to trigger size (`active:scale-[0.98]`), pause off-screen animations.
  - **Touch**: `@media (hover: hover)` for hover states, input font-size >= 16px to prevent iOS auto-zoom, 44x44px minimum touch targets.
  - **Accessibility**: Tailwind focus rings (`focus-visible:ring-2`), inline feedback near triggers, clear empty states with creation CTA.

---

## 2. Anti-`useEffect` Rule
- Avoid `useEffect` for derived state or local synchronizations.
- Derive state using `useMemo` or compute inline during render.
- Perform side-effects directly inside user event handlers (`onClick`, `onChange`, `onSubmit`).
- Use `useDeferredValue` for input filtering.

---

## 3. Zustand Performance & Selectors
- Selectors must return primitive values or stable object references.
- Never instantiate new arrays or objects inside selector functions (e.g. `useRPGStore(state => state.items.filter(...))`).
- Memoize list filtering with `useMemo`.

---

## 4. Package Manager & Git
- **Package Manager**: Exclusively use `pnpm`. Never run `npm` or `yarn`.
- **Branch Naming**:
  - `garbini/*` for Luiz Garbini (`garbasneto@gmail.com`)
  - `arroyo/*` for Gabriel Arroyo (`gabrielarroyoc18@gmail.com`)
- **Review Before Push**: During intermediate iterations, run only the targeted unit test for the modified component (`pnpm vitest run <path/to/test>`) and Biome. Reserve `pnpm run build` and full suite checks strictly for the final step before merging to `origin/main`.
- **No Repository Clutter**: Stage explicit files only (`git add <file>`); never run blanket `git add .`. Never commit temporary scratch scripts.

---

## 5. UI/UX Review & Lean Visual Workflow
- **Live Local Review (Default)**: Push feature commits directly to the user's branch (`garbini/*` or `arroyo/*`) so the developer can review live on their local dev server (`localhost:5173` with instant Vite HMR) without waiting minutes for headless browser boots or bloating context with image tokens.
- **Automated E2E Previews (On-Demand Only)**: Only run Playwright / `pnpm preview:record` when explicitly requested by the user. Do not generate heavy screenshots or screen recordings by default during iterative coding.
- **Git Protection**: `docs/previews/` is strictly ignored in `.gitignore` to avoid bloating repository history.
- **PR Attachment**: When requested, drag & drop previews directly into the GitHub PR description box.

---

## 6. Mandatory Pull Request Description Format
Whenever pushing changes to a branch or preparing a task for review, ALL AI agents MUST ALWAYS automatically generate and provide a ready-to-copy Pull Request description strictly conforming to `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## ✨ What was added

- Clearly describe what was added or implemented in this PR.
Be specific and concise with bullet points.

## 📷 Implementation preview

<!-- Add screenshots or a short video showing the implemented feature.
Make sure the preview reflects the final behavior. -->
```
