# Universal Agent Instructions — Arkhiveon (RPG Notes)

This document establishes development standards and workflow rules for ALL AI agents (Antigravity, Cursor, Claude, ChatGPT, GitHub Copilot, Roo Code, Windsurf) operating in this repository.

---

## 1. Design System & UI
- Before building or altering UI components, inspect `src/routes/design-system.tsx`.
- Use global semantic HSL design tokens (`bg-background`, `bg-card`, `bg-card-elevated`, `text-primary`, `text-foreground`, `text-muted-foreground`, `border-border/70`).
- Never introduce arbitrary hardcoded hex colors (e.g., `#1a1a1a`).
- Follow glassmorphism (`backdrop-blur-md`), micro-interactions (`active:scale-[0.98]`), and mobile touch target guidelines (minimum 44px).

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
- **Review Before Push**: Always test with `pnpm run build` and ask for confirmation before pushing to `origin/main`.

---

## 5. Automated E2E Video / Screenshot Preview Testing
- Whenever completing any frontend feature, UI/UX task, or visual component, ALL AI agents MUST execute:
  ```bash
  pnpm preview:record
  ```
- This runs Playwright to record a high-resolution video (`.webm`) and screenshot in `docs/previews/`, validating that the UI mounts, responds, and renders cleanly without runtime exceptions.

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
