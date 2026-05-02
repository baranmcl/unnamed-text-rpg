# The Heroic Chronicle — Foundation (Plan 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the project scaffolding, the engine's pure-functional core, and a runnable two-panel UI shell with theme switching and a draggable divider — all proven by automated tests. By the end, a developer can run `npm run dev`, see the Heroic Chronicle layout with a hard-coded demo character, toggle Parchment ↔ Moonlit themes, drag the divider and have its width persist across reloads.

**Architecture:** Pure-functional event-sourced engine in TypeScript (`src/engine/*`) wrapped by a thin Svelte 5 store. Svelte 5 components in `src/ui/*` render derived state and dispatch events. localStorage persists state. No backend. Theme is a CSS-variable swap on `<html data-theme>`. Tests: vitest + @testing-library/svelte for unit/component tests; component tests use jsdom.

**Tech Stack:** Svelte 5 (Runes mode), TypeScript 5, Vite 5, vitest, @testing-library/svelte, jsdom. Google Fonts for IM Fell DW Pica + EB Garamond + Courier Prime.

**Spec reference:** `docs/superpowers/specs/2026-04-24-text-rpg-design.md`. This plan implements §4.1–4.6 (architecture, state, RNG, save/load), §6.1, §6.3, §6.6 (layout, palette, divider) and the structural skeletons of §6.4–6.5 and §6.9. Content authoring, combat, story beats, character creation, motion set pieces, and mobile polish are explicitly deferred to later plans.

---

## File map

This plan creates these files:

**Scaffolding:**
- `package.json`, `package-lock.json`
- `tsconfig.json`, `tsconfig.node.json`
- `vite.config.ts`
- `vitest.config.ts`
- `svelte.config.js`
- `index.html`
- `.editorconfig`
- `README.md`

**Engine (pure TypeScript, no Svelte):**
- `src/engine/types.ts` — content + state type definitions
- `src/engine/state.ts` — initial state factory, demo state factory
- `src/engine/rng.ts` — seeded LCG RNG with pure-function API
- `src/engine/events.ts` — event types + reducer skeleton (only a few events; rest stubbed in Plan 2+)
- `src/engine/save.ts` — serialize/deserialize with version migration entry point
- `src/engine/__tests__/rng.test.ts`
- `src/engine/__tests__/state.test.ts`
- `src/engine/__tests__/save.test.ts`

**UI:**
- `src/ui/store.svelte.ts` — Svelte 5 rune-based store wrapping engine state + dispatch
- `src/ui/theme.ts` — Parchment + Moonlit CSS variable maps + apply() helper
- `src/ui/global.css` — base typography, layout reset, theme variable defaults, paper background, foxing
- `src/ui/App.svelte` — top-level shell, two-panel grid, divider, page-margin tools
- `src/ui/Divider.svelte` — draggable vertical hairline + grabber, persists width
- `src/ui/WorldPanel.svelte` — header (act marker + location title + compass placeholder), log placeholder, button-bar placeholder
- `src/ui/CharacterPanel.svelte` — Dramatis Persona card with Vitals/Qualities/Accoutrements/Effects sections (collapsible)
- `src/ui/SettingsModal.svelte` — modal with theme toggle (other settings stubbed; see Task 12)
- `src/ui/PageTools.svelte` — settings gear (top-right) + folio page number (bottom-center)
- `src/ui/__tests__/App.test.ts` — smoke render
- `src/ui/__tests__/Divider.test.ts` — drag math + persistence
- `src/ui/__tests__/SettingsModal.test.ts` — theme toggle round-trip
- `src/main.ts` — mount App on `#app`

---

## Task 1: Initialize project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `svelte.config.js`, `index.html`, `.editorconfig`, `src/main.ts`, `src/ui/global.css`, `src/ui/App.svelte`

- [ ] **Step 1: Initialize npm and install dependencies**

Run from the project root:

```bash
npm init -y
npm pkg set name="heroic-chronicle" version="0.1.0" type="module" private=true
npm pkg set scripts.dev="vite" scripts.build="vite build" scripts.preview="vite preview" scripts.test="vitest run" scripts.test:watch="vitest" scripts.check="svelte-check --tsconfig ./tsconfig.json"
npm install --save-dev vite@^5 @sveltejs/vite-plugin-svelte@^4 svelte@^5 typescript@^5 svelte-check@^4 @tsconfig/svelte@^5
npm install --save-dev vitest@^2 @testing-library/svelte@^5 @testing-library/jest-dom@^6 @testing-library/user-event@^14 jsdom@^25
```

Expected: `package.json` is created and dependencies install with no errors.

- [ ] **Step 2: Write `tsconfig.json`**

Create `tsconfig.json`:

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "resolveJsonModule": true,
    "allowJs": false,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "moduleResolution": "Bundler",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "src/**/*.svelte.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write `tsconfig.node.json`**

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "svelte.config.js"]
}
```

- [ ] **Step 4: Write `svelte.config.js`**

Create `svelte.config.js`:

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true
  }
};
```

- [ ] **Step 5: Write `vite.config.ts`**

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: { port: 5173 }
});
```

- [ ] **Step 6: Write `vitest.config.ts`**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts']
  }
});
```

- [ ] **Step 7: Write the test setup file**

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 8: Write `index.html`**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="parchment">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Heroic Chronicle</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IM+Fell+DW+Pica:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 9: Write `.editorconfig`**

Create `.editorconfig`:

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

- [ ] **Step 10: Write a placeholder `src/main.ts` and `src/ui/App.svelte`**

Create `src/main.ts`:

```ts
import { mount } from 'svelte';
import App from './ui/App.svelte';
import './ui/global.css';

const target = document.getElementById('app');
if (!target) throw new Error('No #app element found');

mount(App, { target });
```

Create `src/ui/App.svelte`:

```svelte
<main>
  <h1>The Heroic Chronicle</h1>
  <p>Scaffolding placeholder. Full shell arrives in Task 7.</p>
</main>

<style>
  main { font-family: system-ui, sans-serif; padding: 2rem; }
</style>
```

Create `src/ui/global.css`:

```css
:root { color-scheme: light dark; }
html, body, #app { height: 100%; margin: 0; padding: 0; }
body { font-family: 'EB Garamond', Georgia, serif; }
```

- [ ] **Step 11: Verify dev server starts**

Run:

```bash
npm run dev
```

Expected output: `Local:   http://localhost:5173/` and the page renders "The Heroic Chronicle" heading. Stop the dev server with Ctrl+C.

- [ ] **Step 12: Verify build and tests run**

```bash
npm run build
npm run check
npm run test
```

Expected: build produces `dist/` with no errors; `npm run check` reports 0 errors; `npm run test` reports "No test files found" (we'll add tests next).

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts svelte.config.js index.html .editorconfig src/main.ts src/test-setup.ts src/ui/App.svelte src/ui/global.css
git commit -m "Scaffold Vite + Svelte 5 + TypeScript project with vitest"
```

---

## Task 2: Engine — content type definitions

**Files:**
- Create: `src/engine/types.ts`

This file establishes the type vocabulary used by every later piece of code. We're defining types only — no runtime code.

- [ ] **Step 1: Write the type definitions**

Create `src/engine/types.ts`:

```ts
// =====================================================================
// Heroic Chronicle — engine type definitions
// =====================================================================
// All identifiers are nominal-typed branded strings so the compiler
// catches "you passed a LocationId where an ItemId was expected".
// =====================================================================

declare const __brand: unique symbol;
type Brand<K, T> = K & { readonly [__brand]: T };

export type LocationId = Brand<string, 'LocationId'>;
export type MonsterId = Brand<string, 'MonsterId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type ClassId = Brand<string, 'ClassId'>;
export type SkillId = Brand<string, 'SkillId'>;
export type BeatId = Brand<string, 'BeatId'>;
export type EncounterId = Brand<string, 'EncounterId'>;
export type NarrativeNodeId = Brand<string, 'NarrativeNodeId'>;
export type QuestId = Brand<string, 'QuestId'>;
export type NpcId = Brand<string, 'NpcId'>;

// Helper constructors used in content files.
export const LocationId = (s: string) => s as LocationId;
export const MonsterId = (s: string) => s as MonsterId;
export const ItemId = (s: string) => s as ItemId;
export const ClassId = (s: string) => s as ClassId;
export const SkillId = (s: string) => s as SkillId;
export const BeatId = (s: string) => s as BeatId;
export const EncounterId = (s: string) => s as EncounterId;
export const NarrativeNodeId = (s: string) => s as NarrativeNodeId;
export const QuestId = (s: string) => s as QuestId;
export const NpcId = (s: string) => s as NpcId;

// =====================================================================
// Acts (hero's-journey stages collapsed to six)
// =====================================================================

export type ActId =
  | 'act_i'
  | 'act_ii'
  | 'act_iii'
  | 'act_iv'
  | 'act_v'
  | 'act_vi';

export const ACT_TITLES: Record<ActId, string> = {
  act_i: 'Act I · The Call to Adventure',
  act_ii: 'Act II · Tests, Allies, and Enemies',
  act_iii: 'Act III · The Approach',
  act_iv: 'Act IV · The Ordeal',
  act_v: 'Act V · The Return',
  act_vi: 'Act VI · Return with the Elixir'
};

// =====================================================================
// Stat block (the four Bs)
// =====================================================================

export type StatBlock = {
  brawn: number;
  brains: number;
  bravado: number;
  bluck: number;
};

export type EquipSlot = 'weapon' | 'armor' | 'trinket';

// =====================================================================
// Items, monsters, locations (content-side)
// =====================================================================

export type ItemKind = 'weapon' | 'armor' | 'trinket' | 'consumable' | 'quest';

export type ItemEffect =
  | { kind: 'heal_hp'; amount: number }
  | { kind: 'heal_mp'; amount: number }
  | { kind: 'set_flag'; flag: string; value: boolean | number | string };

export type Item = {
  id: ItemId;
  name: string;
  flavor: string;
  kind: ItemKind;
  slot?: EquipSlot;
  damage?: number;       // weapons only
  armor?: number;        // armor only
  statBonuses?: Partial<StatBlock>;
  effects?: ItemEffect[];
};

export type MonsterAction =
  | { kind: 'attack'; weight: number; flavor: string }
  | { kind: 'special'; weight: number; flavor: string; damageBonus: number }
  | { kind: 'flee_if_low_hp'; weight: number; flavor: string };

export type LootTableEntry = { itemId: ItemId; chance: number };

export type Monster = {
  id: MonsterId;
  name: string;
  flavor: string;
  hp: number;
  brawn: number;
  bravado: number;
  dodge: number;
  armor: number;
  weaponDamage: number;
  actions: MonsterAction[];
  loot: LootTableEntry[];
  noFlee?: boolean;
};

export type Exit = {
  label: string;
  targetId: LocationId;
  visibleIfFlag?: string;
};

export type Location = {
  id: LocationId;
  name: string;
  act: ActId;
  description: string;
  reEntryDescription?: string;
  exits: Exit[];
  encounterIds?: EncounterId[];
  npcIds?: NpcId[];
};

export type CharacterClass = {
  id: ClassId;
  name: string;
  epithet: string;
  startingStats: StatBlock;
  baseHp: number;
  baseMp: number;
  startingItems: Array<{ itemId: ItemId; equipped?: boolean; qty?: number }>;
  signatureMove: SkillId;
  openingLocationId: LocationId;
  openingNarrativeNodeId: NarrativeNodeId;
};

// =====================================================================
// State
// =====================================================================

export type LogEntryKind =
  | 'narration'
  | 'dialogue'
  | 'system'
  | 'combat'
  | 'loot'
  | 'scene-divider';

export type LogEntry = {
  id: number;            // monotonically increasing
  kind: LogEntryKind;
  text: string;
  speaker?: string;      // dialogue only
  systemLabel?: string;  // system only (e.g. "EXP.", "OFFERED")
};

export type CombatState = {
  encounterId: EncounterId;
  combatants: Array<{
    id: 'player' | string; // monster instance id
    kind: 'player' | 'monster';
    hp: number;
    initiative: number;
  }>;
  turnIndex: number;
  round: number;
};

export type GameState = {
  version: number;
  rng: { seed: number; step: number };
  character: {
    name: string;
    classId: ClassId;
    level: number;
    xp: number;
    hp: { current: number; max: number };
    mp: { current: number; max: number };
    stats: StatBlock;
    equipment: { weapon?: ItemId; armor?: ItemId; trinket?: ItemId };
    inventory: Array<{ itemId: ItemId; qty: number }>;
    knownSkills: SkillId[];
  };
  world: {
    currentLocation: LocationId;
    visited: LocationId[]; // sorted; in-memory representation matches save format
    flags: Record<string, boolean | number | string>;
  };
  story: {
    stage: ActId;
    currentBeat: BeatId | null;
    completedBeats: BeatId[];
    activeQuests: QuestId[];
  };
  combat: CombatState | null;
  log: LogEntry[]; // capped at MAX_LOG_ENTRIES
  settings: {
    theme: 'parchment' | 'moonlit';
    textSize: 'small' | 'medium' | 'large';
    autoSave: boolean;
  };
};

export const MAX_LOG_ENTRIES = 200;
export const SAVE_VERSION = 1;
```

- [ ] **Step 2: Run type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/types.ts
git commit -m "Define engine type vocabulary (branded ids, content types, GameState)"
```

---

## Task 3: Engine — RNG (TDD)

**Files:**
- Create: `src/engine/rng.ts`
- Create: `src/engine/__tests__/rng.test.ts`

A seeded linear-congruential generator with a pure-function API. Same input state always produces the same output value and the same next state.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/__tests__/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rng } from '../rng';

describe('rng', () => {
  it('produces deterministic d6 from a given seed', () => {
    const s0 = { seed: 12345, step: 0 };
    const r1 = rng.d6(s0);
    const r2 = rng.d6(s0);
    expect(r1.value).toBe(r2.value);
    expect(r1.state.step).toBe(1);
    expect(r1.value).toBeGreaterThanOrEqual(1);
    expect(r1.value).toBeLessThanOrEqual(6);
  });

  it('advances step on each call so successive calls vary', () => {
    let s = { seed: 12345, step: 0 };
    const values: number[] = [];
    for (let i = 0; i < 12; i++) {
      const r = rng.d6(s);
      values.push(r.value);
      s = r.state;
    }
    // Not all the same value (probabilistically near-impossible at p ~6^-11)
    const uniques = new Set(values).size;
    expect(uniques).toBeGreaterThan(1);
    expect(s.step).toBe(12);
  });

  it('d20 returns a value in [1, 20]', () => {
    let s = { seed: 99, step: 0 };
    for (let i = 0; i < 100; i++) {
      const r = rng.d20(s);
      expect(r.value).toBeGreaterThanOrEqual(1);
      expect(r.value).toBeLessThanOrEqual(20);
      s = r.state;
    }
  });

  it('pick returns a member of the array', () => {
    const arr = ['a', 'b', 'c', 'd'];
    let s = { seed: 7, step: 0 };
    for (let i = 0; i < 50; i++) {
      const r = rng.pick(s, arr);
      expect(arr).toContain(r.value);
      s = r.state;
    }
  });

  it('weighted respects weights over a large sample', () => {
    const table = [
      { value: 'attack', weight: 0.6 },
      { value: 'special', weight: 0.3 },
      { value: 'flee', weight: 0.1 }
    ];
    const counts: Record<string, number> = { attack: 0, special: 0, flee: 0 };
    let s = { seed: 42, step: 0 };
    for (let i = 0; i < 5000; i++) {
      const r = rng.weighted(s, table);
      counts[r.value as string]++;
      s = r.state;
    }
    expect(counts.attack).toBeGreaterThan(2700); // ~60%
    expect(counts.attack).toBeLessThan(3300);
    expect(counts.flee).toBeGreaterThan(350);    // ~10%
    expect(counts.flee).toBeLessThan(650);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm run test -- rng
```

Expected: tests fail with "Cannot find module '../rng'".

- [ ] **Step 3: Implement `src/engine/rng.ts`**

```ts
// Seeded linear congruential generator.
// Pure-function API: every call takes (state, ...) → { state, value }.
// state.seed is the seed; state.step counts how many random draws have occurred.

export type RngState = { seed: number; step: number };
export type RngResult<T> = { state: RngState; value: T };

// LCG constants (Numerical Recipes). uint32 modulo 2^32.
const A = 1664525;
const C = 1013904223;
const MOD = 0x100000000; // 2^32

function next(state: RngState): RngResult<number> {
  // Hash seed + step. Multiply step in so step=0 isn't always 0.
  const x0 = (state.seed + state.step * 2654435761) >>> 0;
  const x1 = ((Math.imul(x0, A) >>> 0) + C) >>> 0;
  const value = x1 / MOD; // [0, 1)
  return { state: { seed: state.seed, step: state.step + 1 }, value };
}

function d(state: RngState, sides: number): RngResult<number> {
  const r = next(state);
  return { state: r.state, value: 1 + Math.floor(r.value * sides) };
}

export const rng = {
  d6: (state: RngState): RngResult<number> => d(state, 6),
  d20: (state: RngState): RngResult<number> => d(state, 20),
  d100: (state: RngState): RngResult<number> => d(state, 100),

  pick: <T>(state: RngState, arr: readonly T[]): RngResult<T> => {
    if (arr.length === 0) throw new Error('rng.pick called on empty array');
    const r = next(state);
    return { state: r.state, value: arr[Math.floor(r.value * arr.length)]! };
  },

  weighted: <T>(
    state: RngState,
    table: ReadonlyArray<{ value: T; weight: number }>
  ): RngResult<T> => {
    if (table.length === 0) throw new Error('rng.weighted called on empty table');
    const total = table.reduce((s, e) => s + e.weight, 0);
    const r = next(state);
    const target = r.value * total;
    let acc = 0;
    for (const e of table) {
      acc += e.weight;
      if (target < acc) return { state: r.state, value: e.value };
    }
    // Fallback (numerical edge case)
    return { state: r.state, value: table[table.length - 1]!.value };
  }
};
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm run test -- rng
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts src/engine/__tests__/rng.test.ts
git commit -m "Add seeded RNG with deterministic d6/d20/d100/pick/weighted (engine)"
```

---

## Task 4: Engine — initial state factory + demo state (TDD)

**Files:**
- Create: `src/engine/state.ts`
- Create: `src/engine/__tests__/state.test.ts`

`createInitialState` builds the empty pre-character-creation state. `createDemoState` builds a fully-populated state for development use (so we can see the UI shell render real-looking data without character creation, which arrives in Plan 2).

- [ ] **Step 1: Write the failing tests**

Create `src/engine/__tests__/state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, createDemoState } from '../state';
import { SAVE_VERSION } from '../types';

describe('createInitialState', () => {
  it('returns a fresh state with no character', () => {
    const s = createInitialState(424242);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.rng.seed).toBe(424242);
    expect(s.rng.step).toBe(0);
    expect(s.character.name).toBe('');
    expect(s.character.level).toBe(0);
    expect(s.world.visited).toEqual([]);
    expect(s.combat).toBeNull();
    expect(s.log).toEqual([]);
    expect(s.settings.theme).toBe('parchment');
    expect(s.settings.textSize).toBe('medium');
    expect(s.settings.autoSave).toBe(true);
  });
});

describe('createDemoState', () => {
  it('returns a fully-populated state suitable for UI development', () => {
    const s = createDemoState();
    expect(s.character.name).toBe('Sir Brendan');
    expect(s.character.level).toBe(3);
    expect(s.character.stats.brawn).toBeGreaterThan(0);
    expect(s.character.hp.current).toBeGreaterThan(0);
    expect(s.character.hp.max).toBeGreaterThanOrEqual(s.character.hp.current);
    expect(s.world.currentLocation).toBeTruthy();
    expect(s.story.stage).toBe('act_i');
    expect(s.log.length).toBeGreaterThan(0);
    // Demo log includes at least one of each kind we render in Plan 1
    const kinds = new Set(s.log.map((e) => e.kind));
    expect(kinds.has('narration')).toBe(true);
    expect(kinds.has('dialogue')).toBe(true);
    expect(kinds.has('system')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm run test -- state
```

Expected: tests fail with "Cannot find module '../state'".

- [ ] **Step 3: Implement `src/engine/state.ts`**

```ts
import {
  ClassId,
  ItemId,
  LocationId,
  SAVE_VERSION,
  type GameState,
  type LogEntry
} from './types';

export function createInitialState(seed: number): GameState {
  return {
    version: SAVE_VERSION,
    rng: { seed, step: 0 },
    character: {
      name: '',
      classId: ClassId(''),
      level: 0,
      xp: 0,
      hp: { current: 0, max: 0 },
      mp: { current: 0, max: 0 },
      stats: { brawn: 0, brains: 0, bravado: 0, bluck: 0 },
      equipment: {},
      inventory: [],
      knownSkills: []
    },
    world: {
      currentLocation: LocationId(''),
      visited: [],
      flags: {}
    },
    story: {
      stage: 'act_i',
      currentBeat: null,
      completedBeats: [],
      activeQuests: []
    },
    combat: null,
    log: [],
    settings: {
      theme: 'parchment',
      textSize: 'medium',
      autoSave: true
    }
  };
}

// Demo state used by the UI shell in Plan 1 so we can render real-looking
// content without character creation. Replaced when character creation lands
// in Plan 2.
export function createDemoState(): GameState {
  const log: LogEntry[] = [
    {
      id: 1,
      kind: 'narration',
      text: 'You stand at a crossroads, which, as crossroads go, is unusually literal. A signpost leans drunkenly, pointing in four directions, three of which no longer exist. Wind carries the faint smell of onions and minor prophecy.'
    },
    {
      id: 2,
      kind: 'dialogue',
      speaker: 'Old Hermit',
      text: '"You must be the Chosen One. Right on schedule for your Refusal of the Call."'
    },
    {
      id: 3,
      kind: 'narration',
      text: 'The hermit produces a map, then immediately eats a corner of it. You are not certain whether this is part of the ritual.'
    },
    {
      id: 4,
      kind: 'system',
      systemLabel: 'EXP.',
      text: '+3 experience for listening politely.'
    }
  ];

  return {
    version: SAVE_VERSION,
    rng: { seed: 1, step: 0 },
    character: {
      name: 'Sir Brendan',
      classId: ClassId('reluctant_farmhand'),
      level: 3,
      xp: 35,
      hp: { current: 45, max: 60 },
      mp: { current: 12, max: 20 },
      stats: { brawn: 9, brains: 12, bravado: 7, bluck: 4 },
      equipment: {
        weapon: ItemId('rusty_pitchfork'),
        armor: ItemId('itchy_wool_tunic')
      },
      inventory: [
        { itemId: ItemId('hardtack'), qty: 1 },
        { itemId: ItemId('suspicious_coin'), qty: 1 },
        { itemId: ItemId('note_from_mother'), qty: 1 }
      ],
      knownSkills: []
    },
    world: {
      currentLocation: LocationId('dusty_crossroads'),
      visited: [LocationId('dusty_crossroads'), LocationId('family_farm')],
      flags: { met_hermit: true }
    },
    story: {
      stage: 'act_i',
      currentBeat: null,
      completedBeats: [],
      activeQuests: []
    },
    combat: null,
    log,
    settings: {
      theme: 'parchment',
      textSize: 'medium',
      autoSave: true
    }
  };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm run test -- state
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.ts src/engine/__tests__/state.test.ts
git commit -m "Add createInitialState + createDemoState factories"
```

---

## Task 5: Engine — save/load with version migration entry point (TDD)

**Files:**
- Create: `src/engine/save.ts`
- Create: `src/engine/__tests__/save.test.ts`

Round-trip serialization between `GameState` and JSON. The migration table is empty in v1 (only one version exists), but the structure is in place so future versions can register migrations.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/__tests__/save.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { serialize, deserialize, SaveLoadError } from '../save';
import { createDemoState } from '../state';

describe('serialize/deserialize', () => {
  it('round-trips a demo state losslessly', () => {
    const original = createDemoState();
    const json = serialize(original);
    const restored = deserialize(json);
    expect(restored).toEqual(original);
  });

  it('produces valid JSON', () => {
    const original = createDemoState();
    const json = serialize(original);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('throws SaveLoadError on malformed JSON', () => {
    expect(() => deserialize('{ not json')).toThrow(SaveLoadError);
  });

  it('throws SaveLoadError on unknown future version', () => {
    const future = JSON.stringify({ ...JSON.parse(serialize(createDemoState())), version: 9999 });
    expect(() => deserialize(future)).toThrow(SaveLoadError);
    expect(() => deserialize(future)).toThrow(/future edition/i);
  });

  it('throws SaveLoadError when shape is missing required fields', () => {
    expect(() => deserialize('{"version":1}')).toThrow(SaveLoadError);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm run test -- save
```

Expected: tests fail with "Cannot find module '../save'".

- [ ] **Step 3: Implement `src/engine/save.ts`**

```ts
import { SAVE_VERSION, type GameState } from './types';

export class SaveLoadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SaveLoadError';
  }
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

// Migration registry. v1 ships with no migrations because v1 IS the first
// version. Each entry transforms from key to key+1.
const MIGRATIONS: Record<number, (s: any) => any> = {
  // Example for the future:
  // 1: (s) => ({ ...s, version: 2, character: { ...s.character, newField: 0 } }),
};

export function deserialize(json: string): GameState {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new SaveLoadError('Save data is not valid JSON.', e);
  }

  if (typeof parsed !== 'object' || parsed === null || typeof parsed.version !== 'number') {
    throw new SaveLoadError('Save data is missing a version number.');
  }

  let v = parsed.version as number;
  while (v < SAVE_VERSION) {
    const migrate = MIGRATIONS[v];
    if (!migrate) {
      throw new SaveLoadError(`No migration registered from version ${v} to ${v + 1}.`);
    }
    parsed = migrate(parsed);
    v = parsed.version as number;
  }

  if (v > SAVE_VERSION) {
    throw new SaveLoadError(
      `This tale is from a future edition (save version ${v}, app expects ${SAVE_VERSION}).`
    );
  }

  validateShape(parsed);
  return parsed as GameState;
}

function validateShape(s: any): void {
  const required = ['version', 'rng', 'character', 'world', 'story', 'log', 'settings'];
  for (const key of required) {
    if (!(key in s)) {
      throw new SaveLoadError(`Save is missing required field "${key}".`);
    }
  }
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm run test -- save
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/save.ts src/engine/__tests__/save.test.ts
git commit -m "Add save serialize/deserialize with version migration entry point"
```

---

## Task 6: Engine — event reducer skeleton

**Files:**
- Create: `src/engine/events.ts`

This task lays down the *shape* of the reducer. We implement only the few events Plan 1 needs (`SetTheme`, `SetTextSize`, `ToggleAutoSave`) — combat, exploration, and story events arrive in subsequent plans.

- [ ] **Step 1: Write the failing tests**

Append to `src/engine/__tests__/state.test.ts`:

```ts
import { reduce } from '../events';

describe('reduce — settings events', () => {
  it('SetTheme switches the theme', () => {
    const s0 = createInitialState(1);
    const s1 = reduce(s0, { kind: 'SetTheme', theme: 'moonlit' });
    expect(s1.settings.theme).toBe('moonlit');
    // Other state untouched
    expect(s1.character).toEqual(s0.character);
  });

  it('SetTextSize switches the text size', () => {
    const s0 = createInitialState(1);
    const s1 = reduce(s0, { kind: 'SetTextSize', size: 'large' });
    expect(s1.settings.textSize).toBe('large');
  });

  it('ToggleAutoSave flips the autosave flag', () => {
    const s0 = createInitialState(1);
    const s1 = reduce(s0, { kind: 'ToggleAutoSave' });
    expect(s1.settings.autoSave).toBe(false);
    const s2 = reduce(s1, { kind: 'ToggleAutoSave' });
    expect(s2.settings.autoSave).toBe(true);
  });

  it('reduce is pure: original state is unchanged', () => {
    const s0 = createInitialState(1);
    const before = JSON.stringify(s0);
    reduce(s0, { kind: 'SetTheme', theme: 'moonlit' });
    expect(JSON.stringify(s0)).toBe(before);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm run test -- state
```

Expected: tests fail with "Cannot find module '../events'".

- [ ] **Step 3: Implement `src/engine/events.ts`**

```ts
import type { GameState } from './types';

// =====================================================================
// Event taxonomy
// =====================================================================
// Plan 1 ships only the settings events. Plans 2+ extend this union with
// exploration, combat, narrative, story, and inventory events.
// =====================================================================

export type GameEvent =
  | { kind: 'SetTheme'; theme: 'parchment' | 'moonlit' }
  | { kind: 'SetTextSize'; size: 'small' | 'medium' | 'large' }
  | { kind: 'ToggleAutoSave' };

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.kind) {
    case 'SetTheme':
      return { ...state, settings: { ...state.settings, theme: event.theme } };
    case 'SetTextSize':
      return { ...state, settings: { ...state.settings, textSize: event.size } };
    case 'ToggleAutoSave':
      return {
        ...state,
        settings: { ...state.settings, autoSave: !state.settings.autoSave }
      };
  }
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm run test
```

Expected: all engine tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/events.ts src/engine/__tests__/state.test.ts
git commit -m "Add reducer skeleton with settings events (theme, text size, autosave)"
```

---

## Task 7: UI — theme system

**Files:**
- Create: `src/ui/theme.ts`
- Modify: `src/ui/global.css`

CSS variables drive all colors and font choices. Switching `<html data-theme="moonlit">` swaps the entire palette. The base typography (font families, sizes, leading) lives in `global.css`.

- [ ] **Step 1: Write `src/ui/theme.ts`**

```ts
export type ThemeName = 'parchment' | 'moonlit';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

// Persisted separately from save data per spec §8.
const THEME_KEY = 'heroicchronicle.settings.v1.theme';

export function loadStoredTheme(): ThemeName | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'parchment' || v === 'moonlit') return v;
    return null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode / quota exceeded; ignore */
  }
}
```

- [ ] **Step 2: Replace `src/ui/global.css` with the full theme variables and base typography**

Replace the entire content of `src/ui/global.css`:

```css
/* =====================================================================
   The Heroic Chronicle — global stylesheet
   - Theme variables for Parchment (default) and Moonlit (alt)
   - Base typography
   - Page background (paper texture + corner foxing)
   ===================================================================== */

:root {
  --serif-display: 'IM Fell DW Pica', Georgia, serif;
  --serif-body: 'EB Garamond', Georgia, serif;
  --mono: 'Courier Prime', 'Courier New', monospace;

  --font-size-base: 17px;
  --line-height-base: 1.65;
  --max-content-width: 1400px;
}

/* Parchment (default) */
html[data-theme='parchment'] {
  --paper: #f4ecd8;
  --paper-warm: #efe4c8;
  --paper-shadow: rgba(83, 56, 22, 0.10);
  --foxing: rgba(139, 94, 44, 0.18);
  --ink: #1f1a12;
  --ink-muted: #6b5f47;
  --ink-faint: #9c8c6f;
  --hairline: #c5b48f;
  --crimson: #8b1a1a;
  --crimson-deep: #5d1010;
  --gilt: #a68338;
  --gilt-bright: #c89b3e;
  --moss: #4a6b3a;
}

/* Moonlit (sepia ink on deep-indigo vellum) */
html[data-theme='moonlit'] {
  --paper: #1a1f2e;
  --paper-warm: #232838;
  --paper-shadow: rgba(0, 0, 0, 0.3);
  --foxing: rgba(0, 0, 0, 0.4);
  --ink: #d8c89a;
  --ink-muted: #9c8e68;
  --ink-faint: #6f644a;
  --hairline: #4a4030;
  --crimson: #c54a4a;
  --crimson-deep: #8b2a2a;
  --gilt: #d4a849;
  --gilt-bright: #e8c062;
  --moss: #7a9c5a;
}

* { box-sizing: border-box; }

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--serif-body);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--ink);
  background-color: var(--paper);
  background-image:
    radial-gradient(ellipse 120% 80% at 50% 50%, transparent 50%, var(--paper-shadow) 100%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='3' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.07  0 0 0 0.05 0'/></filter><rect width='400' height='400' filter='url(%23n)'/></svg>");
  background-attachment: fixed;
  overflow: hidden; /* App component manages its own scrolling */
}

/* Foxing — corner age spots */
body::before,
body::after {
  content: "";
  position: fixed;
  width: 320px;
  height: 320px;
  pointer-events: none;
  background: radial-gradient(circle, var(--foxing) 0%, transparent 65%);
  mix-blend-mode: multiply;
  z-index: 0;
}
body::before { top: -80px; left: -80px; }
body::after  { bottom: -80px; right: -80px; }

#app {
  position: relative;
  z-index: 1;
}

button {
  font-family: inherit;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/theme.ts src/ui/global.css
git commit -m "Add theme system (Parchment + Moonlit) and base typography"
```

---

## Task 8: UI — Svelte 5 store wrapping engine state

**Files:**
- Create: `src/ui/store.svelte.ts`

The single source of truth in the UI. Wraps a `GameState` rune, exposes `dispatch(event)`, and triggers autosave on every dispatch (debounced).

- [ ] **Step 1: Write the store**

Create `src/ui/store.svelte.ts`:

```ts
import { reduce, type GameEvent } from '../engine/events';
import { createDemoState } from '../engine/state';
import { serialize, deserialize, SaveLoadError } from '../engine/save';
import { applyTheme, loadStoredTheme, storeTheme } from './theme';
import type { GameState } from '../engine/types';

const SAVE_KEY = 'heroicchronicle.save.v1';
const AUTOSAVE_DEBOUNCE_MS = 500;

function loadOrCreate(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return deserialize(raw);
  } catch (e) {
    if (e instanceof SaveLoadError) {
      // Future: show error toast. Plan 1 falls back to demo state.
      console.warn('Failed to load save:', e.message);
    }
  }
  return createDemoState();
}

function persist(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    /* quota exceeded / private mode */
  }
}

class GameStore {
  // $state.raw because GameState is replaced wholesale by the reducer; we
  // never deep-mutate it. Raw avoids Proxy overhead.
  state = $state.raw<GameState>(loadOrCreate());

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Theme is persisted independently of save data so it survives reset.
    const stored = loadStoredTheme();
    if (stored && stored !== this.state.settings.theme) {
      this.state = reduce(this.state, { kind: 'SetTheme', theme: stored });
    }
    applyTheme(this.state.settings.theme);
  }

  dispatch(event: GameEvent): void {
    const prev = this.state;
    const next = reduce(prev, event);
    this.state = next;

    // Side-effects that derive from event kind go here.
    if (event.kind === 'SetTheme') {
      applyTheme(event.theme);
      storeTheme(event.theme);
    }

    if (next.settings.autoSave) {
      this.scheduleAutosave();
    }
  }

  private scheduleAutosave(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      persist(this.state);
      this.autosaveTimer = null;
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  // Manual save (used by SettingsModal "Preserve thy tale")
  saveNow(): void {
    persist(this.state);
  }

  // Delete save and reset to demo state
  resetSave(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    this.state = createDemoState();
    applyTheme(this.state.settings.theme);
  }
}

// Singleton — Svelte 5 stores are typically classes exported as instances.
export const gameStore = new GameStore();
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/store.svelte.ts
git commit -m "Add Svelte 5 game store with autosave and theme persistence"
```

---

## Task 9: UI — Divider component (TDD)

**Files:**
- Create: `src/ui/Divider.svelte`
- Create: `src/ui/__tests__/Divider.test.ts`

Draggable vertical hairline that sets `--world-fraction` on its container. Width persists to localStorage. Min 25%, max 75%.

- [ ] **Step 1: Write the failing test**

Create `src/ui/__tests__/Divider.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import Divider from '../Divider.svelte';

const KEY = 'heroicchronicle.ui.dividerWidth';

describe('Divider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders with default world fraction of 0.62', () => {
    const { container } = render(Divider);
    const el = container.querySelector('[data-testid="divider"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.dataset.worldFraction).toBe('0.62');
  });

  it('reads stored fraction from localStorage on mount', () => {
    localStorage.setItem(KEY, '0.5');
    const { container } = render(Divider);
    const el = container.querySelector('[data-testid="divider"]') as HTMLElement;
    expect(el.dataset.worldFraction).toBe('0.5');
  });

  it('clamps stored fraction to [0.25, 0.75]', () => {
    localStorage.setItem(KEY, '0.05');
    const { container } = render(Divider);
    const el = container.querySelector('[data-testid="divider"]') as HTMLElement;
    expect(el.dataset.worldFraction).toBe('0.25');
  });

  it('ignores non-numeric stored values', () => {
    localStorage.setItem(KEY, 'banana');
    const { container } = render(Divider);
    const el = container.querySelector('[data-testid="divider"]') as HTMLElement;
    expect(el.dataset.worldFraction).toBe('0.62');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test -- Divider
```

Expected: tests fail with "Cannot find module '../Divider.svelte'".

- [ ] **Step 3: Implement `src/ui/Divider.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  const KEY = 'heroicchronicle.ui.dividerWidth';
  const DEFAULT_FRACTION = 0.62;
  const MIN = 0.25;
  const MAX = 0.75;

  function loadFraction(): number {
    try {
      const v = localStorage.getItem(KEY);
      if (v === null) return DEFAULT_FRACTION;
      const parsed = parseFloat(v);
      if (isNaN(parsed)) return DEFAULT_FRACTION;
      return Math.max(MIN, Math.min(MAX, parsed));
    } catch {
      return DEFAULT_FRACTION;
    }
  }

  let fraction = $state(loadFraction());
  let dragging = $state(false);
  let containerEl: HTMLElement | null = null;

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !containerEl) return;
    const rect = containerEl.parentElement!.getBoundingClientRect();
    const raw = (e.clientX - rect.left) / rect.width;
    fraction = Math.max(MIN, Math.min(MAX, raw));
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    try {
      localStorage.setItem(KEY, fraction.toString());
    } catch {
      /* ignore */
    }
  }

  onMount(() => {
    if (containerEl) {
      const parent = containerEl.parentElement;
      if (parent) {
        parent.style.setProperty('--world-fraction', fraction.toString());
      }
    }
  });

  $effect(() => {
    if (containerEl) {
      const parent = containerEl.parentElement;
      if (parent) {
        parent.style.setProperty('--world-fraction', fraction.toString());
      }
    }
  });
</script>

<div
  bind:this={containerEl}
  class="divider"
  data-testid="divider"
  data-world-fraction={fraction}
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize panels"
  aria-valuemin={MIN}
  aria-valuemax={MAX}
  aria-valuenow={fraction}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  <div class="grabber"></div>
</div>

<style>
  .divider {
    position: relative;
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      var(--hairline) 8%,
      var(--hairline) 92%,
      transparent 100%
    );
    cursor: col-resize;
    user-select: none;
    touch-action: none;
  }
  .grabber {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 42px;
    background: var(--paper);
    border-left: 1px solid var(--hairline);
    border-right: 1px solid var(--hairline);
  }
  .grabber::after {
    content: '❦';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--serif-display);
    color: var(--ink-muted);
    font-size: 16px;
    line-height: 1;
  }
</style>
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm run test -- Divider
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Divider.svelte src/ui/__tests__/Divider.test.ts
git commit -m "Add draggable divider component with persisted width"
```

---

## Task 10: UI — World panel skeleton

**Files:**
- Create: `src/ui/WorldPanel.svelte`

Renders header (act marker + location title + compass placeholder), log (with kind-aware styling), and a placeholder button bar. Reads from `gameStore.state`.

- [ ] **Step 1: Implement `src/ui/WorldPanel.svelte`**

```svelte
<script lang="ts">
  import { gameStore } from './store.svelte';
  import { ACT_TITLES } from '../engine/types';

  // Plan 1: location name comes from state.world.currentLocation id capitalized.
  // Plan 2 wires this to actual Location data.
  function locationDisplayName(id: string): string {
    if (!id) return '— (no location) —';
    return id
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  let actLabel = $derived(ACT_TITLES[gameStore.state.story.stage]);
  let locName = $derived(locationDisplayName(gameStore.state.world.currentLocation));
  let log = $derived(gameStore.state.log);
</script>

<section class="world" aria-label="World panel">
  <header class="world-header">
    <div class="header-text">
      <p class="act-marker">{actLabel}</p>
      <h1 class="location-title">{locName}</h1>
    </div>
    <button
      class="compass"
      aria-label="Look at the map"
      title="Look at the map (coming in Plan 5)"
      type="button"
    >
      <svg viewBox="0 0 64 64" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="32" cy="32" r="28" />
        <circle cx="32" cy="32" r="22" />
        <path d="M32 6 L36 32 L32 58 L28 32 Z" fill="currentColor" stroke="none" />
        <path d="M6 32 L32 28 L58 32 L32 36 Z" fill="currentColor" fill-opacity="0.35" stroke="none" />
        <circle cx="32" cy="32" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    </button>
  </header>

  <div class="rule"></div>

  <div class="log" aria-live="polite">
    {#each log as entry (entry.id)}
      {#if entry.kind === 'narration'}
        <p class="entry narration">{entry.text}</p>
      {:else if entry.kind === 'dialogue'}
        <div class="entry dialogue">
          <span class="speaker">{entry.speaker ?? ''}</span>
          <span class="line">{entry.text}</span>
        </div>
      {:else if entry.kind === 'system'}
        <div class="entry system">
          <span class="system-label">{entry.systemLabel ?? 'NOTE'} —</span>
          <span class="system-text">{entry.text}</span>
        </div>
      {:else if entry.kind === 'combat'}
        <p class="entry combat">{entry.text}</p>
      {:else if entry.kind === 'loot'}
        <p class="entry loot">{entry.text}</p>
      {:else if entry.kind === 'scene-divider'}
        <p class="entry scene-divider">· · ·</p>
      {/if}
    {/each}
  </div>

  <div class="button-bar">
    <p class="placeholder">Buttons appear here in Plan 2 (exploration) and Plan 4 (combat).</p>
  </div>
</section>

<style>
  .world {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    padding: 24px 36px;
    box-sizing: border-box;
  }

  .world-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
  }

  .act-marker {
    font-family: var(--serif-display);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin: 0;
  }

  .location-title {
    font-family: var(--serif-display);
    font-size: 36px;
    font-weight: normal;
    margin: 4px 0 0;
    line-height: 1.1;
  }

  .compass {
    color: var(--ink);
    opacity: 0.7;
    transition: opacity 160ms ease, transform 400ms ease;
    flex-shrink: 0;
    margin-bottom: 6px;
  }
  .compass:hover {
    opacity: 1;
    transform: rotate(8deg);
  }

  .rule {
    height: 1px;
    background: var(--ink);
    opacity: 0.6;
    margin: 18px 0 24px;
  }

  .log {
    flex: 1;
    overflow-y: auto;
    font-size: 18px;
    line-height: 1.75;
  }

  .entry {
    margin: 0 0 16px;
  }
  .narration {
    text-align: justify;
  }
  .dialogue {
    margin-left: 28px;
  }
  .dialogue .speaker {
    display: block;
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 4px;
  }
  .dialogue .line {
    display: block;
    font-style: italic;
  }
  .system {
    margin: 0 0 14px 28px;
    padding-left: 14px;
    border-left: 2px solid var(--hairline);
    font-style: italic;
    font-size: 14px;
    color: var(--ink-muted);
  }
  .system-label {
    font-family: var(--serif-display);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 11px;
    font-style: normal;
    color: var(--ink-faint);
    margin-right: 4px;
  }
  .combat { font-size: 16px; line-height: 1.5; }
  .loot { color: var(--gilt); }
  .scene-divider {
    text-align: center;
    font-family: var(--serif-display);
    color: var(--ink-faint);
    letter-spacing: 0.8em;
    margin: 24px 0;
  }

  .button-bar {
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--hairline);
  }
  .placeholder {
    font-style: italic;
    color: var(--ink-faint);
    margin: 0;
  }
</style>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/WorldPanel.svelte
git commit -m "Add WorldPanel skeleton (header, log, button-bar placeholder)"
```

---

## Task 11: UI — Character panel skeleton

**Files:**
- Create: `src/ui/CharacterPanel.svelte`

Dramatis Persona card. Four collapsible sections, each persisting its open/closed state to localStorage. Reads from `gameStore.state.character`.

- [ ] **Step 1: Implement `src/ui/CharacterPanel.svelte`**

```svelte
<script lang="ts">
  import { gameStore } from './store.svelte';

  const SECTION_KEY = 'heroicchronicle.ui.sectionsCollapsed';

  type SectionKey = 'vitals' | 'qualities' | 'accoutrements' | 'effects';

  function loadCollapsed(): Record<SectionKey, boolean> {
    try {
      const raw = localStorage.getItem(SECTION_KEY);
      if (!raw) return { vitals: false, qualities: false, accoutrements: false, effects: false };
      const parsed = JSON.parse(raw);
      return {
        vitals: !!parsed.vitals,
        qualities: !!parsed.qualities,
        accoutrements: !!parsed.accoutrements,
        effects: !!parsed.effects
      };
    } catch {
      return { vitals: false, qualities: false, accoutrements: false, effects: false };
    }
  }

  let collapsed = $state(loadCollapsed());

  function toggle(key: SectionKey) {
    collapsed = { ...collapsed, [key]: !collapsed[key] };
    try {
      localStorage.setItem(SECTION_KEY, JSON.stringify(collapsed));
    } catch { /* ignore */ }
  }

  let c = $derived(gameStore.state.character);

  function pct(part: number, whole: number): number {
    if (whole <= 0) return 0;
    return Math.max(0, Math.min(100, (part / whole) * 100));
  }

  function levelTitle(level: number): string {
    const ordinals = [
      'Untested', 'First-Degree', 'Second-Degree', 'Third-Degree',
      'Fourth-Degree', 'Fifth-Degree', 'Sixth-Degree', 'Seventh-Degree',
      'Eighth-Degree', 'Ninth-Degree', 'Tenth-Degree'
    ];
    const word = ordinals[Math.min(level, ordinals.length - 1)] ?? 'Legendary';
    return `${word} Hero`;
  }

  function epithet(): string {
    // Plan 2 will pull this from the class definition. Plan 1 hardcodes
    // for demo state.
    return 'the Reluctant Farmhand';
  }
</script>

<aside class="persona" aria-label="Character panel">
  <p class="persona-heading">Dramatis Persona</p>
  <div class="persona-rule"></div>

  <h2 class="persona-name">{c.name || '— (unnamed) —'}</h2>
  <p class="persona-epithet">{epithet()}</p>
  <p class="persona-level">{levelTitle(c.level)}</p>

  <!-- Vitals -->
  <section class="section">
    <button class="section-head" type="button" onclick={() => toggle('vitals')} aria-expanded={!collapsed.vitals}>
      <span>Vitals</span>
      <span class="chevron">{collapsed.vitals ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed.vitals}
      <div class="vitals">
        <span class="label">HP</span>
        <div class="bar"><div class="fill hp" style:width="{pct(c.hp.current, c.hp.max)}%"></div></div>
        <span class="value">{c.hp.current} / {c.hp.max}</span>

        <span class="label">MP</span>
        <div class="bar"><div class="fill mp" style:width="{pct(c.mp.current, c.mp.max)}%"></div></div>
        <span class="value">{c.mp.current} / {c.mp.max}</span>

        <span class="label">XP</span>
        <div class="bar"><div class="fill xp" style:width="{c.xp}%"></div></div>
        <span class="value">{c.xp}%</span>
      </div>
    {/if}
  </section>

  <!-- Qualities (the four B's) -->
  <section class="section">
    <button class="section-head" type="button" onclick={() => toggle('qualities')} aria-expanded={!collapsed.qualities}>
      <span>Qualities</span>
      <span class="chevron">{collapsed.qualities ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed.qualities}
      <div class="stats">
        <div class="stat"><span class="name">Brawn</span><span class="num">{c.stats.brawn}</span></div>
        <div class="stat"><span class="name">Brains</span><span class="num">{c.stats.brains}</span></div>
        <div class="stat"><span class="name">Bravado</span><span class="num">{c.stats.bravado}</span></div>
        <div class="stat"><span class="name">(B)Luck</span><span class="num">{c.stats.bluck}</span></div>
      </div>
    {/if}
  </section>

  <!-- Accoutrements -->
  <section class="section">
    <button class="section-head" type="button" onclick={() => toggle('accoutrements')} aria-expanded={!collapsed.accoutrements}>
      <span>Accoutrements</span>
      <span class="chevron">{collapsed.accoutrements ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed.accoutrements}
      <div class="equip">
        <span class="slot-label">Wpn</span>
        <span class="slot-item" class:empty={!c.equipment.weapon}>
          {c.equipment.weapon ?? '— unchosen —'}
        </span>
        <span class="slot-label">Arm</span>
        <span class="slot-item" class:empty={!c.equipment.armor}>
          {c.equipment.armor ?? '— unchosen —'}
        </span>
        <span class="slot-label">Trk</span>
        <span class="slot-item" class:empty={!c.equipment.trinket}>
          {c.equipment.trinket ?? '— unchosen —'}
        </span>
      </div>
    {/if}
  </section>

  <!-- Effects on his Person -->
  <section class="section">
    <button class="section-head" type="button" onclick={() => toggle('effects')} aria-expanded={!collapsed.effects}>
      <span>Effects on his Person</span>
      <span class="chevron">{collapsed.effects ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed.effects}
      <div class="effects">
        {#each Array(12) as _, i (i)}
          <div class="effect-slot" class:filled={i < c.inventory.length}>
            {#if i < c.inventory.length}<span class="glyph">✦</span>{/if}
          </div>
        {/each}
      </div>
      <div class="effects-count">{c.inventory.length} / 12</div>
    {/if}
  </section>

  <p class="persona-footer">(<em>dram. pers.: our hero</em>)</p>
</aside>

<style>
  .persona {
    height: 100%;
    overflow-y: auto;
    padding: 24px 28px;
    box-sizing: border-box;
    font-family: var(--serif-body);
    font-size: 15px;
    line-height: 1.5;
  }
  .persona-heading {
    font-family: var(--serif-display);
    font-size: 12px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--ink-muted);
    text-align: center;
    margin: 0 0 4px;
  }
  .persona-rule {
    height: 1px;
    background: var(--ink);
    opacity: 0.6;
    margin: 0 0 20px;
  }
  .persona-name {
    font-family: var(--serif-display);
    font-size: 30px;
    margin: 0;
    line-height: 1.1;
    text-align: center;
  }
  .persona-epithet {
    font-style: italic;
    font-size: 16px;
    color: var(--ink-muted);
    text-align: center;
    margin: 4px 0 2px;
  }
  .persona-level {
    font-family: var(--serif-body);
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--ink-muted);
    text-align: center;
    margin: 0 0 22px;
  }
  .section { margin-bottom: 22px; }
  .section-head {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 8px;
    font-family: var(--serif-body);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin: 0 0 10px;
  }
  .section-head .chevron {
    font-family: var(--serif-display);
    font-size: 13px;
    color: var(--ink-faint);
    margin-left: auto;
  }
  .vitals {
    display: grid;
    grid-template-columns: auto 1fr auto;
    column-gap: 10px;
    row-gap: 8px;
    align-items: center;
  }
  .vitals .label {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    color: var(--ink-muted);
    text-transform: uppercase;
  }
  .vitals .value {
    font-family: var(--mono);
    font-size: 13px;
    text-align: right;
  }
  .bar {
    position: relative;
    height: 10px;
    border: 1px solid var(--ink);
    background: transparent;
  }
  .fill {
    position: absolute;
    top: -1px; bottom: -1px; left: -1px;
    border: 1px solid;
  }
  .fill.hp { background: var(--crimson); border-color: var(--crimson-deep); }
  .fill.mp { background: var(--moss); border-color: #2e4525; }
  .fill.xp { background: var(--gilt); border-color: #6e5522; }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 20px;
  }
  .stat {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px dotted var(--hairline);
    padding: 3px 0;
  }
  .stat .name {
    font-style: italic;
    font-size: 15px;
  }
  .stat .num {
    font-family: var(--mono);
    font-size: 15px;
    font-weight: bold;
  }
  .equip {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 14px;
    row-gap: 6px;
    align-items: baseline;
  }
  .slot-label {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--ink-muted);
    text-transform: uppercase;
  }
  .slot-item {
    font-style: italic;
    font-size: 15px;
  }
  .slot-item.empty { color: var(--ink-faint); }
  .effects {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .effect-slot {
    aspect-ratio: 1;
    border: 1px solid var(--hairline);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--serif-display);
    font-size: 20px;
    color: var(--ink-muted);
  }
  .effect-slot.filled {
    border-color: var(--ink);
    color: var(--ink);
  }
  .effects-count {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-muted);
    text-align: right;
    margin-top: 8px;
    letter-spacing: 0.05em;
  }
  .persona-footer {
    margin-top: 28px;
    font-size: 12px;
    font-style: italic;
    color: var(--ink-faint);
    text-align: center;
  }
</style>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/CharacterPanel.svelte
git commit -m "Add CharacterPanel with collapsible Vitals/Qualities/Accoutrements/Effects"
```

---

## Task 12: UI — Settings modal (TDD)

**Files:**
- Create: `src/ui/SettingsModal.svelte`
- Create: `src/ui/__tests__/SettingsModal.test.ts`

Modal with theme toggle (Parchment / Moonlit), text size radio, autosave checkbox, "Preserve thy tale" manual save button, "Consign this tale to the flames?" reset button. The reset button requires confirmation (browser `confirm()` is acceptable for v1).

- [ ] **Step 1: Write the failing test**

Create `src/ui/__tests__/SettingsModal.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SettingsModal from '../SettingsModal.svelte';
import { gameStore } from '../store.svelte';

describe('SettingsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.dispatch({ kind: 'SetTheme', theme: 'parchment' });
    gameStore.dispatch({ kind: 'SetTextSize', size: 'medium' });
    if (!gameStore.state.settings.autoSave) {
      gameStore.dispatch({ kind: 'ToggleAutoSave' });
    }
  });

  it('renders nothing when closed', () => {
    const { queryByRole } = render(SettingsModal, { props: { open: false, onClose: () => {} } });
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog when open', () => {
    const { getByRole } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(getByRole('dialog')).toBeInTheDocument();
  });

  it('toggles the theme on radio change', async () => {
    const { getByLabelText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    const moonlit = getByLabelText('Moonlit') as HTMLInputElement;
    await fireEvent.click(moonlit);
    expect(gameStore.state.settings.theme).toBe('moonlit');
    expect(document.documentElement.dataset.theme).toBe('moonlit');
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const { getByRole } = render(SettingsModal, { props: { open: true, onClose } });
    const closeBtn = getByRole('button', { name: /close/i });
    await fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test -- SettingsModal
```

Expected: tests fail with "Cannot find module '../SettingsModal.svelte'".

- [ ] **Step 3: Implement `src/ui/SettingsModal.svelte`**

```svelte
<script lang="ts">
  import { gameStore } from './store.svelte';

  type Props = { open: boolean; onClose: () => void };
  let { open, onClose }: Props = $props();

  function setTheme(theme: 'parchment' | 'moonlit') {
    gameStore.dispatch({ kind: 'SetTheme', theme });
  }

  function setTextSize(size: 'small' | 'medium' | 'large') {
    gameStore.dispatch({ kind: 'SetTextSize', size });
  }

  function toggleAutoSave() {
    gameStore.dispatch({ kind: 'ToggleAutoSave' });
  }

  function preserveTale() {
    gameStore.saveNow();
  }

  function consignToFlames() {
    if (confirm('Consign this tale to the flames? This cannot be undone.')) {
      gameStore.resetSave();
      onClose();
    }
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

{#if open}
  <div
    class="backdrop"
    role="presentation"
    onclick={onBackdropClick}
    onkeydown={onKey}
  >
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header class="dialog-header">
        <h2 id="settings-title">Settings</h2>
        <button class="close" type="button" onclick={onClose} aria-label="Close">×</button>
      </header>

      <fieldset>
        <legend>Theme</legend>
        <label>
          <input
            type="radio"
            name="theme"
            value="parchment"
            checked={gameStore.state.settings.theme === 'parchment'}
            onchange={() => setTheme('parchment')}
          />
          Parchment
        </label>
        <label>
          <input
            type="radio"
            name="theme"
            value="moonlit"
            checked={gameStore.state.settings.theme === 'moonlit'}
            onchange={() => setTheme('moonlit')}
          />
          Moonlit
        </label>
      </fieldset>

      <fieldset>
        <legend>Text size</legend>
        {#each ['small', 'medium', 'large'] as size}
          <label>
            <input
              type="radio"
              name="text-size"
              value={size}
              checked={gameStore.state.settings.textSize === size}
              onchange={() => setTextSize(size as 'small' | 'medium' | 'large')}
            />
            {size.charAt(0).toUpperCase() + size.slice(1)}
          </label>
        {/each}
      </fieldset>

      <fieldset>
        <legend>Autosave</legend>
        <label>
          <input
            type="checkbox"
            checked={gameStore.state.settings.autoSave}
            onchange={toggleAutoSave}
          />
          Preserve every action
        </label>
      </fieldset>

      <div class="actions">
        <button type="button" onclick={preserveTale}>Preserve thy tale</button>
        <button type="button" class="danger" onclick={consignToFlames}>
          Consign this tale to the flames
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .dialog {
    background: var(--paper);
    color: var(--ink);
    padding: 28px 36px;
    min-width: 360px;
    max-width: 480px;
    border: 1px solid var(--hairline);
    box-shadow: 4px 6px 20px rgba(0, 0, 0, 0.25);
    font-family: var(--serif-body);
  }
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 18px;
  }
  .dialog-header h2 {
    font-family: var(--serif-display);
    font-size: 24px;
    margin: 0;
    font-weight: normal;
  }
  .close {
    font-size: 28px;
    line-height: 1;
    color: var(--ink-muted);
  }
  .close:hover { color: var(--ink); }
  fieldset {
    border: none;
    padding: 0;
    margin: 0 0 18px;
  }
  legend {
    font-family: var(--serif-display);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 8px;
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-right: 18px;
    font-size: 15px;
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: 12px;
    margin-top: 18px;
    flex-wrap: wrap;
  }
  .actions button {
    border: 1px solid var(--ink);
    padding: 8px 14px;
    font-family: var(--serif-body);
    font-size: 14px;
  }
  .actions button:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .actions button.danger {
    border-color: var(--crimson);
    color: var(--crimson);
  }
  .actions button.danger:hover {
    background: var(--crimson);
    color: var(--paper);
  }
</style>
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm run test -- SettingsModal
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/SettingsModal.svelte src/ui/__tests__/SettingsModal.test.ts
git commit -m "Add SettingsModal with theme toggle and save management"
```

---

## Task 13: UI — Page tools (gear + folio)

**Files:**
- Create: `src/ui/PageTools.svelte`

Settings gear in the top-right corner; folio page number `— i.i.0 —` in the bottom-center. The gear opens the SettingsModal.

- [ ] **Step 1: Implement `src/ui/PageTools.svelte`**

```svelte
<script lang="ts">
  import SettingsModal from './SettingsModal.svelte';

  let settingsOpen = $state(false);

  function openSettings() {
    settingsOpen = true;
  }

  function closeSettings() {
    settingsOpen = false;
  }

  // Plan 1 ships a static folio. Plan 6 will derive it from story stage.
  const folio = '— i.i.0 —';
</script>

<button
  class="gear"
  type="button"
  aria-label="Settings"
  onclick={openSettings}
>
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="12" cy="12" r="3" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
    />
  </svg>
</button>

<div class="folio">{folio}</div>

<SettingsModal open={settingsOpen} onClose={closeSettings} />

<style>
  .gear {
    position: fixed;
    top: 18px;
    right: 18px;
    color: var(--ink);
    opacity: 0.55;
    transition: opacity 160ms ease, transform 160ms ease;
    z-index: 50;
  }
  .gear:hover {
    opacity: 1;
    transform: translateY(-1px);
  }

  .folio {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--serif-display);
    font-size: 13px;
    color: var(--ink-faint);
    letter-spacing: 0.2em;
    z-index: 5;
    pointer-events: none;
  }
</style>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/PageTools.svelte
git commit -m "Add PageTools (settings gear + folio page number)"
```

---

## Task 14: UI — Wire it all together in App.svelte

**Files:**
- Create: `src/ui/__tests__/App.test.ts`
- Modify (replace): `src/ui/App.svelte`

This is the integration step. The existing placeholder `App.svelte` is replaced with the full two-panel shell.

- [ ] **Step 1: Write the failing smoke test**

Create `src/ui/__tests__/App.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import App from '../App.svelte';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the two-panel shell', () => {
    const { getByLabelText, getByRole } = render(App);
    expect(getByLabelText('World panel')).toBeInTheDocument();
    expect(getByLabelText('Character panel')).toBeInTheDocument();
    expect(getByLabelText('Settings')).toBeInTheDocument(); // gear button
  });

  it('renders the act marker text', () => {
    const { getByText } = render(App);
    expect(getByText(/Act I/)).toBeInTheDocument();
  });

  it('renders the demo character name in the persona header', () => {
    const { getByText } = render(App);
    expect(getByText('Sir Brendan')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test -- App
```

Expected: tests fail because App.svelte renders only the placeholder.

- [ ] **Step 3: Replace `src/ui/App.svelte`**

```svelte
<script lang="ts">
  import WorldPanel from './WorldPanel.svelte';
  import CharacterPanel from './CharacterPanel.svelte';
  import Divider from './Divider.svelte';
  import PageTools from './PageTools.svelte';
</script>

<div class="chronicle">
  <WorldPanel />
  <Divider />
  <CharacterPanel />
</div>

<PageTools />

<style>
  .chronicle {
    display: grid;
    grid-template-columns:
      calc(var(--world-fraction, 0.62) * 100%)
      1px
      calc((1 - var(--world-fraction, 0.62)) * 100%);
    height: 100vh;
    max-width: var(--max-content-width);
    margin: 0 auto;
  }

  /* Mobile: panels stack vertically (functional accordion polish in Plan 6) */
  @media (max-width: 900px) {
    .chronicle {
      grid-template-columns: 1fr;
      grid-template-rows: 60vh 1px 40vh;
      height: auto;
      min-height: 100vh;
    }
  }
</style>
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass (engine + Divider + SettingsModal + App).

- [ ] **Step 5: Verify the dev server renders correctly**

```bash
npm run dev
```

Open http://localhost:5173. You should see:
- Cream parchment background with corner foxing
- Left panel: "Act I · The Call to Adventure" / "Dusty Crossroads" location title / compass icon top-right of header / four log entries (narration, dialogue, narration, system)
- Vertical divider with `❦` grabber in the middle
- Right panel: "Dramatis Persona" heading / "Sir Brendan" / "the Reluctant Farmhand" / "Third-Degree Hero" / collapsible Vitals/Qualities/Accoutrements/Effects sections
- Top-right gear icon
- Bottom-center folio "— i.i.0 —"
- Drag the divider — widths shift, persists on reload
- Click gear — settings modal opens
- Switch theme to Moonlit — entire palette inverts; persists across reload
- Toggle a section — persists across reload

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/ui/App.svelte src/ui/__tests__/App.test.ts
git commit -m "Wire two-panel shell with World + Character + Divider + PageTools"
```

---

## Task 15: README and dev workflow

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

```markdown
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
```

- [ ] **Step 2: Verify the README renders correctly in any markdown previewer.** (Visual check, no command needed.)

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Add project README"
```

---

## Final verification

- [ ] **Step 1: Full test suite**

```bash
npm run test
```

Expected: all tests pass. There should be ~20 tests across engine and UI.

- [ ] **Step 2: Type-check the whole project**

```bash
npm run check
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: build succeeds; `dist/` contains an `index.html`, hashed JS bundle, and CSS.

- [ ] **Step 4: Sanity-test the production build locally**

```bash
npm run preview
```

Open the printed URL. Verify the same UI works as in dev mode (theme toggle, divider drag, section collapse).

- [ ] **Step 5: Spec coverage check**

| Spec section | Implemented in |
|---|---|
| §4.1 Tech stack | Tasks 1, 7, 8 |
| §4.2 Repo structure (engine + ui partial) | Tasks 2–8, 10–13 |
| §4.3 GameState shape | Task 2 |
| §4.4 Event-sourced reducer (skeleton) | Task 6 |
| §4.5 Seeded RNG | Task 3 |
| §4.6 Save format + migrations | Task 5 |
| §6.1 Two-panel layout, divider | Tasks 9, 14 |
| §6.3 Color palette (Parchment + Moonlit) | Task 7 |
| §6.4 World panel (header, log, button bar — placeholder) | Task 10 |
| §6.5 Character panel (Dramatis Persona, four sections) | Task 11 |
| §6.6 Divider (drag, persistence) | Task 9 |
| §6.9 Settings modal | Task 12 |
| §8 Save format details | Tasks 5, 8 |
| Page-margin tools (gear + folio) | Task 13 |

Sections deferred to later plans (no task in this plan):
- §3 Gameplay design (combat, classes, stats, signature moves) — Plans 2, 3, 4
- §3.6 Character creation — Plan 2
- §5 Content system + content authoring — Plans 2, 5
- §6.4 Wax-seal button, drop caps, system-message styling rules already covered structurally; visual polish in Plan 6
- §6.7 Mobile UX polish — Plan 6
- §6.8 Motion set pieces — Plan 6
- §9 MVP success criteria — fully covered when Plan 6 lands

---

## Done definition

This plan is complete when:

1. All 15 tasks above have all checkboxes marked done.
2. `npm run dev` boots, renders the two-panel shell, and is interactive.
3. `npm run test`, `npm run check`, and `npm run build` all succeed cleanly.
4. The dev server demonstrates: theme toggle (with palette swap), divider drag (with persistence), section collapse (with persistence), settings modal open/close, manual save, save reset.
5. The git log shows ~15 atomic commits, one per task.
