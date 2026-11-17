# Knit Counter — design

## Why
A simple counter to use while knitting, with several projects on the go at once.

## Goals
- A list of projects: add, rename, delete.
- Each project has a **Rows** counter and a **Stitches** counter, each with big + / − buttons and a reset.
- The last-open project is remembered.
- Phone-friendly: big tap targets, numbers update instantly.

## Non-goals (for now)
- Logins, syncing across devices, a database or API, pattern notes.

## Constraints
- Built in Laravel. Laravel serves the page; no API calls, no database.
- Data lives in the browser (localStorage), so it stays on one device/browser.

## Approaches
1. **Blade + a little JavaScript (Alpine.js), browser storage** — chosen. Instant taps, fewest moving parts.
2. Livewire — a server round trip per tap; adds a package.
3. Plain forms — full page reload per tap; tedious for repeated tapping.

## Decided
- One route `/` serving a Blade view; Alpine.js handles the UI state.
- Stitches do not auto-reset when a row is added (builder's call, confirmed in design).
- Session/cache/queue drivers switched to `file`/`sync` so the app needs no database.

## Left to the builder
- Visual styling (plain, clean, Tailwind which ships with Laravel).
- Tests: a feature test that the page renders; counting logic kept in a plain JS module with unit tests.
