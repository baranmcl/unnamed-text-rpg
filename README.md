# The Heroic Chronicle

A web-based, single-player, text-based comedic RPG following the hero's journey.
Built with Svelte 5 + TypeScript + Vite.

**Status:** v1 foundation (Plan 1 complete). The two-panel shell renders a
hard-coded demo character. Character creation, exploration, combat, and
content arrive in subsequent plans.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # type-check
npm run test     # run vitest once
npm run test:watch
npm run build    # production build into dist/
```

## Project structure

- `src/engine/` — pure-functional game engine (types, state, RNG, events, save)
- `src/ui/` — Svelte 5 components and store
- `src/content/` — game data (added in subsequent plans)
- `docs/superpowers/specs/` — design specs
- `docs/superpowers/plans/` — implementation plans

## Tests

- Engine tests live alongside their modules in `src/engine/__tests__/`
- UI tests live in `src/ui/__tests__/`
- Tests run in jsdom via vitest

## Save format

State is persisted to `localStorage` under `heroicchronicle.save.v1`.
See `docs/superpowers/specs/2026-04-24-text-rpg-design.md` §8.
