# Knit Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Laravel page that counts rows and stitches for many knitting projects, saved in the browser.

**Architecture:** Route `/` returns a Blade view. Pure state functions live in `resources/js/counter.js` (no DOM, no storage globals); `resources/js/app.js` wires them to an Alpine.js component that persists to localStorage.

**Tech Stack:** Laravel 13, Blade, Alpine.js, Tailwind 4 (ships with Laravel), Vite, PHPUnit, `node --test` (no extra test deps).

**Spec:** `docs/superpowers/specs/2026-11-17-knit-counter-design.md`

## Global Constraints

- No database, no API routes. Session/cache drivers are `file`.
- Data stored in localStorage under key `knit-counter:v1`.
- Stitches do not auto-reset when rows change.

## Review Focus

1. Tapping − at 0 → count stays 0 (never negative).
2. Missing or corrupt saved data → app starts with an empty project list, no crash.
3. Deleting the open project → another project (or none) becomes current.
4. Blank/whitespace project name on add or rename → add uses "Untitled project"; rename keeps the old name.
5. localStorage throws (private mode) → app still works in memory.

---

### Task 1: Counting logic

**Files:**
- Create: `resources/js/counter.js`
- Test: `tests/js/counter.test.js`
- Modify: `package.json` (add `"test": "node --test tests/js/"`)

**Interfaces — Produces:**
- State shape: `{ projects: [{ id: string, name: string, rows: number, stitches: number }], currentId: string|null }`
- `emptyState() -> State`
- `addProject(state, name) -> State` (new project becomes current)
- `renameProject(state, id, name) -> State`
- `deleteProject(state, id) -> State`
- `bump(state, id, field: 'rows'|'stitches', delta: number) -> State`
- `resetCounter(state, id, field) -> State`
- `loadState(storage) -> State`, `saveState(storage, state) -> void` (storage has `getItem`/`setItem`; both swallow exceptions)
- All functions return new state; never mutate input.

- [ ] Write failing tests: add sets current + defaults to 0/0; blank name → "Untitled project"; rename trims, blank rename keeps old name; bump +1/−1, − at 0 stays 0; reset → 0; delete current picks first remaining or null; loadState with missing/corrupt JSON/throwing storage → `emptyState()`; save→load round trip.
- [ ] `npm test` → FAIL (module missing).
- [ ] Implement `counter.js`.
- [ ] `npm test` → PASS.
- [ ] Commit.

### Task 2: Page

**Files:**
- Create: `resources/views/counter.blade.php`
- Modify: `routes/web.php` (`/` → `view('counter')`), `resources/js/app.js` (register Alpine component `knitCounter`), `package.json` (add `alpinejs`)
- Delete: `resources/views/welcome.blade.php`
- Test: `tests/Feature/CounterPageTest.php` (replace `ExampleTest.php`)

**Interfaces — Consumes:** Task 1 functions.

- [ ] Write failing feature test: `GET /` → 200, sees "Knit Counter", "Rows", "Stitches", and `x-data="knitCounter"`.
- [ ] `php artisan test` → FAIL.
- [ ] Build page: project picker + add/rename/delete; two counter cards with big −/+ and reset. Component saves via `saveState(localStorage, state)` after each change.
- [ ] `php artisan test` and `npm run build` → PASS.
- [ ] Preview in browser on phone width: add two projects, count, reload, counts persist.
- [ ] Commit.
