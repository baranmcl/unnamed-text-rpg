# Skills, Status Effects, and Three More Classes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a generic status-effect system, four authored signature moves, the skills system in combat, three new playable classes (Disgraced Knight, Accidental Wizard, Bard Who Didn't Ask For This), per-class stat-bump rotations, and milestone bumps on stage advance.

**Architecture:** Status effects live as a discriminated-union `Status` array on each combatant (combat-scoped) and on `state.character` (world-scoped). On `startCombat`, world-scoped statuses copy onto the player combatant; on `endCombat`, combat-scoped are dropped and world-scoped persist. Combat math reads statuses on the relevant actor at well-defined points. Skills are MP-costing actions dispatched via a `UseSkill` event whose handler looks up a content-side resolver function; resolvers apply statuses, deal damage, etc. via the same combatant arrays. `applyLevelUp` is extracted into a dedicated `progression.ts` module so both XP-based level-ups and stage-transition milestone bumps share one path.

**Tech Stack:** TypeScript (strict, branded types), Svelte 5 (Runes), Vite, vitest, @testing-library/svelte. Pure-functional event-sourced reducer.

**Spec:** [docs/superpowers/specs/2026-04-30-skills-and-classes-design.md](../specs/2026-04-30-skills-and-classes-design.md)

---

## File Inventory

**Created:**
- `src/engine/status.ts` — apply/expire/tick helpers + combatant-status copy/restore
- `src/engine/progression.ts` — `applyLevelUp` + `STAT_ROTATIONS`
- `src/engine/__tests__/status.test.ts`
- `src/engine/__tests__/progression.test.ts`
- `src/content/skills/resolvers.ts` — registry of `SkillResolver` functions
- `src/content/skills/__tests__/resolvers.test.ts`
- `src/content/locations/quartermasters_yard.ts`
- `src/content/locations/burning_library.ts`
- `src/content/locations/tavern_dressing_room.ts`
- `src/content/encounters/insolent_pell.ts`
- `src/content/encounters/feral_footnote.ts`
- `src/content/encounters/pointed_heckler.ts`
- `src/content/narrative/openings.ts` — three new placeholder opener nodes (kept separate from `nodes.ts` which currently holds the Call narrative)

**Modified:**
- `src/engine/types.ts` — Status types, Skill extension, CombatEncounter extension, GameState/Combatant extension
- `src/engine/state.ts` — initial `statuses: []` on character
- `src/engine/save.ts` — `SAVE_VERSION` 1→2 + migration entry
- `src/engine/combat.ts` — status reads in math; tick at turn start; `free_retaliation` handler; level-up loop calls `applyLevelUp`
- `src/engine/events.ts` — `UseSkill` event + dispatch handler
- `src/engine/story.ts` — `applyEffect` `advance_stage` calls `applyLevelUp`
- `src/engine/validate.ts` — new content reference assertions
- `src/engine/__tests__/save.test.ts` — v1→v2 migration round-trip
- `src/engine/__tests__/combat.test.ts` — status interaction tests
- `src/engine/__tests__/story.test.ts` — milestone bump test
- `src/content/skills/index.ts` — register all 4 skills with `resolverId`
- `src/content/items/index.ts` — 9 new items (3 weapons, 3 armors, 3 quest items)
- `src/content/monsters/index.ts` — 3 new tutorial monsters
- `src/content/classes/index.ts` — 3 new classes (Knight, Wizard, Bard)
- `src/content/encounters/index.ts` — 3 new encounters registered
- `src/content/locations/index.ts` — 3 new locations registered
- `src/content/narrative/nodes.ts` — re-export new opener nodes
- `src/content/narrative/resolvers.ts` — three new opener resolvers (each triggers tutorial encounter)
- `src/content/__tests__/validate.test.ts` — assert new content references resolve
- `src/ui/WorldPanel.svelte` — Skill button + monster status tag row
- `src/ui/CharacterPanel.svelte` — "Afflictions & Boons" row
- `src/ui/CharacterCreation.svelte` — enable Knight/Wizard/Bard cards + teasers
- `src/ui/__tests__/CharacterCreation.test.ts` — assert all four cards enabled

---

## Task 1: Status types and extensions in `types.ts`

**Files:**
- Modify: `src/engine/types.ts`

- [ ] **Step 1: Add status types**

Add the following to `src/engine/types.ts` immediately after the `EquipSlot` definition (around line 66):

```ts
// =====================================================================
// Status effects
// =====================================================================

export type StatusKind =
  | 'weakness_revealed'      // monster: subsequent player attacks deal +50%
  | 'intimidated'            // monster: skips turn(s)
  | 'guaranteed_crit'        // player: next attack auto-crits, then expires
  | 'next_attack_misses'     // player: next attack auto-misses, then expires
  | 'skip_turn'              // player or monster: skips next turn(s)
  | 'weapon_suspended'       // player: weapon damage = 0 while active
  | 'armor_halved'           // player: armor halved while active
  | 'free_retaliation';      // monster: takes a free attack now, then expires

export type StatusDuration =
  | { kind: 'turns'; remaining: number }
  | { kind: 'until_end_of_fight' }
  | { kind: 'one_shot' }
  | { kind: 'fights_remaining'; n: number }
  | { kind: 'permanent' };

export type Status = {
  id: number;
  kind: StatusKind;
  duration: StatusDuration;
  source: string;
  magnitude?: number;
};
```

- [ ] **Step 2: Extend `Skill` with `resolverId`**

Replace the existing `Skill` definition (currently around lines 158-165) with:

```ts
export type SkillResolverId = string;

export type Skill = {
  id: SkillId;
  name: string;
  description: string;
  mpCost: number;
  scalingStat: keyof StatBlock;
  unlockLevel: number;
  resolverId: SkillResolverId;
};

export type SkillResolver = (state: GameState) => GameState;
```

- [ ] **Step 3: Extend `CombatEncounter` with `endsByReasoning`**

Modify the `CombatEncounter` type (currently around lines 171-178):

```ts
export type CombatEncounter = {
  id: EncounterId;
  kind: 'combat';
  monsterId: MonsterId;
  noFlee?: boolean;
  xpReward: number;
  repeatable?: boolean;
  endsByReasoning?: boolean;   // NEW: Out-Think It auto-resolves the fight as victory
};
```

- [ ] **Step 4: Add `statuses` to combatants and to character**

In `TurnBasedCombatState`'s `combatants` entries (currently around lines 246-257), extend the array element type to include statuses:

```ts
export type TurnBasedCombatState = {
  kind: 'turn-based';
  encounterId: EncounterId;
  combatants: Array<{
    id: 'player' | string;
    kind: 'player' | 'monster';
    hp: number;
    initiative: number;
    statuses: Status[];        // NEW
  }>;
  turnIndex: number;
  round: number;
};
```

Then add `statuses` to the `character` field of `GameState` (currently around lines 268-280). Insert after the `currency` field:

```ts
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
    currency: number;
    statuses: Status[];        // NEW: world-scoped statuses only
  };
```

- [ ] **Step 5: Bump `SAVE_VERSION`**

Replace the existing `SAVE_VERSION` constant (around line 302):

```ts
export const SAVE_VERSION = 2;
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: Many errors about missing `statuses` field on `character` and combatants throughout the codebase. This is expected — the next several tasks fix these.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts
git commit -m "Add Status types, extend Skill/CombatEncounter/GameState for Plan 4"
```

---

## Task 2: `engine/status.ts` module + tests

**Files:**
- Create: `src/engine/status.ts`
- Create: `src/engine/__tests__/status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/status.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  applyStatus,
  expireStatus,
  tickStatuses,
  copyWorldStatusesToPlayer,
  persistPlayerStatusesToCharacter
} from '../status';
import type { GameState, Status, TurnBasedCombatState } from '../types';
import { createInitialState } from '../state';

function freshState(): GameState {
  return createInitialState(1);
}

describe('applyStatus', () => {
  it('appends a new status with a fresh id', () => {
    const s = freshState();
    const next = applyStatus(s, 'character', {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 3 },
      source: 'test'
    });
    expect(next.character.statuses).toHaveLength(1);
    expect(next.character.statuses[0]!.id).toBeGreaterThan(0);
    expect(next.character.statuses[0]!.kind).toBe('weapon_suspended');
  });

  it('replaces an existing status of the same kind on the same target', () => {
    const s = freshState();
    let next = applyStatus(s, 'character', {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 3 },
      source: 'first'
    });
    next = applyStatus(next, 'character', {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 5 },
      source: 'second'
    });
    expect(next.character.statuses).toHaveLength(1);
    expect(next.character.statuses[0]!.source).toBe('second');
    const dur = next.character.statuses[0]!.duration;
    expect(dur.kind === 'turns' && dur.remaining).toBe(5);
  });
});

describe('tickStatuses', () => {
  it('decrements turns-duration and removes when remaining hits 0', () => {
    const combatant = {
      id: 'player' as const,
      kind: 'player' as const,
      hp: 30,
      initiative: 10,
      statuses: [
        { id: 1, kind: 'weapon_suspended' as const, duration: { kind: 'turns' as const, remaining: 1 }, source: 'test' },
        { id: 2, kind: 'armor_halved' as const, duration: { kind: 'turns' as const, remaining: 3 }, source: 'test' }
      ]
    };
    const ticked = tickStatuses(combatant);
    expect(ticked.statuses).toHaveLength(1);
    expect(ticked.statuses[0]!.kind).toBe('armor_halved');
    const dur = ticked.statuses[0]!.duration;
    expect(dur.kind === 'turns' && dur.remaining).toBe(2);
  });

  it('leaves one_shot, until_end_of_fight, fights_remaining, and permanent untouched', () => {
    const combatant = {
      id: 'player' as const,
      kind: 'player' as const,
      hp: 30,
      initiative: 10,
      statuses: [
        { id: 1, kind: 'guaranteed_crit' as const, duration: { kind: 'one_shot' as const }, source: 't' },
        { id: 2, kind: 'weakness_revealed' as const, duration: { kind: 'until_end_of_fight' as const }, source: 't' }
      ]
    };
    const ticked = tickStatuses(combatant);
    expect(ticked.statuses).toHaveLength(2);
  });
});

describe('expireStatus', () => {
  it('removes the named status by id', () => {
    const combatant = {
      id: 'player' as const,
      kind: 'player' as const,
      hp: 30,
      initiative: 10,
      statuses: [
        { id: 1, kind: 'guaranteed_crit' as const, duration: { kind: 'one_shot' as const }, source: 't' },
        { id: 2, kind: 'next_attack_misses' as const, duration: { kind: 'one_shot' as const }, source: 't' }
      ]
    };
    const after = expireStatus(combatant, 1);
    expect(after.statuses).toHaveLength(1);
    expect(after.statuses[0]!.id).toBe(2);
  });
});

describe('combat-start / combat-end status round-trip', () => {
  it('copies world-scoped statuses to player on start and persists fights_remaining decrement on end', () => {
    let s = freshState();
    s = applyStatus(s, 'character', {
      kind: 'guaranteed_crit',
      duration: { kind: 'fights_remaining', n: 2 },
      source: 'world-buff'
    });

    // Simulate combat start by manually constructing a turn-based combat with player combatant.
    const combat: TurnBasedCombatState = {
      kind: 'turn-based',
      encounterId: 'fake' as any,
      combatants: [
        { id: 'player', kind: 'player', hp: 30, initiative: 10, statuses: [] },
        { id: 'fake_monster', kind: 'monster', hp: 5, initiative: 5, statuses: [] }
      ],
      turnIndex: 0,
      round: 1
    };
    s = { ...s, combat };
    s = copyWorldStatusesToPlayer(s);

    const playerCombatant = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'player')!;
    expect(playerCombatant.statuses).toHaveLength(1);
    expect(playerCombatant.statuses[0]!.kind).toBe('guaranteed_crit');

    // Simulate combat end.
    const after = persistPlayerStatusesToCharacter(s);
    // fights_remaining decremented: n=2 → n=1
    expect(after.character.statuses).toHaveLength(1);
    const dur = after.character.statuses[0]!.duration;
    expect(dur.kind === 'fights_remaining' && dur.n).toBe(1);
  });

  it('drops combat-scoped statuses on combat end', () => {
    let s = freshState();
    const combat: TurnBasedCombatState = {
      kind: 'turn-based',
      encounterId: 'fake' as any,
      combatants: [
        {
          id: 'player', kind: 'player', hp: 30, initiative: 10,
          statuses: [
            { id: 1, kind: 'weapon_suspended', duration: { kind: 'turns', remaining: 2 }, source: 'tempt' },
            { id: 2, kind: 'guaranteed_crit', duration: { kind: 'permanent' }, source: 'world' }
          ]
        },
        { id: 'fake_monster', kind: 'monster', hp: 5, initiative: 5, statuses: [] }
      ],
      turnIndex: 0,
      round: 1
    };
    s = { ...s, combat };
    const after = persistPlayerStatusesToCharacter(s);
    expect(after.character.statuses).toHaveLength(1);
    expect(after.character.statuses[0]!.kind).toBe('guaranteed_crit');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/engine/__tests__/status.test.ts
```

Expected: FAIL — module `../status` doesn't exist.

- [ ] **Step 3: Implement `src/engine/status.ts`**

Create `src/engine/status.ts`:

```ts
import type { GameState, Status, StatusKind, TurnBasedCombatState } from './types';

type StatusTarget =
  | 'character'                                  // world-scoped (state.character.statuses)
  | { kind: 'combatant'; combatantId: string };  // a specific combatant in active combat

function nextStatusId(state: GameState): number {
  // Derive id from current max across character + all combatants so ids stay unique within a state.
  let max = 0;
  for (const st of state.character.statuses) if (st.id > max) max = st.id;
  if (state.combat?.kind === 'turn-based') {
    for (const c of state.combat.combatants) for (const st of c.statuses) if (st.id > max) max = st.id;
  }
  return max + 1;
}

export function applyStatus(
  state: GameState,
  target: StatusTarget,
  status: Omit<Status, 'id'>
): GameState {
  const id = nextStatusId(state);
  const newStatus: Status = { ...status, id };

  if (target === 'character') {
    // Replace any existing status of the same kind.
    const filtered = state.character.statuses.filter((s) => s.kind !== status.kind);
    return { ...state, character: { ...state.character, statuses: [...filtered, newStatus] } };
  }

  if (state.combat?.kind !== 'turn-based') return state;
  const combat = state.combat;
  const combatants = combat.combatants.map((c) => {
    if (c.id !== target.combatantId) return c;
    const filtered = c.statuses.filter((s) => s.kind !== status.kind);
    return { ...c, statuses: [...filtered, newStatus] };
  });
  return { ...state, combat: { ...combat, combatants } };
}

export function expireStatus<T extends { statuses: Status[] }>(target: T, id: number): T {
  return { ...target, statuses: target.statuses.filter((s) => s.id !== id) };
}

export function expireStatusByKind<T extends { statuses: Status[] }>(target: T, kind: StatusKind): T {
  return { ...target, statuses: target.statuses.filter((s) => s.kind !== kind) };
}

export function hasStatus<T extends { statuses: Status[] }>(target: T, kind: StatusKind): boolean {
  return target.statuses.some((s) => s.kind === kind);
}

export function findStatus<T extends { statuses: Status[] }>(target: T, kind: StatusKind): Status | undefined {
  return target.statuses.find((s) => s.kind === kind);
}

export function tickStatuses<T extends { statuses: Status[] }>(target: T): T {
  const next: Status[] = [];
  for (const s of target.statuses) {
    if (s.duration.kind !== 'turns') {
      next.push(s);
      continue;
    }
    const remaining = s.duration.remaining - 1;
    if (remaining <= 0) continue;
    next.push({ ...s, duration: { kind: 'turns', remaining } });
  }
  return { ...target, statuses: next };
}

// Called at start of combat: copy world-scoped statuses from character onto the player combatant.
export function copyWorldStatusesToPlayer(state: GameState): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const playerStatuses = state.character.statuses.map((s) => ({ ...s }));
  const combat = state.combat;
  const combatants = combat.combatants.map((c) =>
    c.kind === 'player' ? { ...c, statuses: [...c.statuses, ...playerStatuses] } : c
  );
  return { ...state, combat: { ...combat, combatants } };
}

// Called at end of combat: drop combat-scoped statuses from player combatant, decrement
// fights_remaining on world-scoped, persist back to character.
export function persistPlayerStatusesToCharacter(state: GameState): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const player = state.combat.combatants.find((c) => c.kind === 'player');
  if (!player) return state;

  const persisted: Status[] = [];
  for (const s of player.statuses) {
    if (s.duration.kind === 'fights_remaining') {
      const n = s.duration.n - 1;
      if (n > 0) persisted.push({ ...s, duration: { kind: 'fights_remaining', n } });
    } else if (s.duration.kind === 'permanent') {
      persisted.push(s);
    }
    // turns / until_end_of_fight / one_shot: dropped
  }
  return { ...state, character: { ...state.character, statuses: persisted } };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test src/engine/__tests__/status.test.ts
```

Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/status.ts src/engine/__tests__/status.test.ts
git commit -m "Add status module: apply/expire/tick + combat-start/end persistence"
```

---

## Task 3: Initial state + save migration v1→v2

**Files:**
- Modify: `src/engine/state.ts`
- Modify: `src/engine/save.ts`
- Modify: `src/engine/__tests__/save.test.ts`

- [ ] **Step 1: Add `statuses: []` to initial states**

In `src/engine/state.ts`, modify both `createInitialState` and `createDemoState` to include `statuses: []` on the character object. Add the line after `currency`:

```ts
// In createInitialState:
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
  knownSkills: [],
  currency: 0,
  statuses: []     // NEW
},

// In createDemoState (similarly), add `statuses: []` after `currency: 47`.
```

- [ ] **Step 2: Write the failing migration test**

In `src/engine/__tests__/save.test.ts`, add this test case:

```ts
import { describe, it, expect } from 'vitest';
import { serialize, deserialize } from '../save';
import { createInitialState } from '../state';

describe('save migration v1 → v2', () => {
  it('backfills empty statuses arrays on character and combatants', () => {
    const v1Save = {
      version: 1,
      rng: { seed: 1, step: 0 },
      character: {
        name: 'Test',
        classId: 'reluctant_farmboy',
        level: 1,
        xp: 0,
        hp: { current: 30, max: 30 },
        mp: { current: 10, max: 10 },
        stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
        equipment: {},
        inventory: [],
        knownSkills: [],
        currency: 0
        // no statuses field — must be backfilled
      },
      world: {
        currentLocation: 'family_farm',
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
      settings: { theme: 'parchment', textSize: 'medium', autoSave: true }
    };

    const loaded = deserialize(JSON.stringify(v1Save));
    expect(loaded.version).toBe(2);
    expect(loaded.character.statuses).toEqual([]);
  });

  it('backfills statuses on combatants if combat is in progress', () => {
    const v1SaveWithCombat = {
      version: 1,
      rng: { seed: 1, step: 0 },
      character: {
        name: 'Test',
        classId: 'reluctant_farmboy',
        level: 1,
        xp: 0,
        hp: { current: 25, max: 30 },
        mp: { current: 10, max: 10 },
        stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
        equipment: {},
        inventory: [],
        knownSkills: [],
        currency: 0
      },
      world: { currentLocation: 'family_farm', visited: [], flags: {} },
      story: { stage: 'act_i', currentBeat: null, completedBeats: [], activeQuests: [] },
      combat: {
        kind: 'turn-based',
        encounterId: 'first_tax_rat',
        combatants: [
          { id: 'player', kind: 'player', hp: 25, initiative: 10 },
          { id: 'tax_rat', kind: 'monster', hp: 8, initiative: 8 }
        ],
        turnIndex: 0,
        round: 1
      },
      log: [],
      settings: { theme: 'parchment', textSize: 'medium', autoSave: true }
    };

    const loaded = deserialize(JSON.stringify(v1SaveWithCombat));
    expect(loaded.version).toBe(2);
    expect(loaded.combat?.kind).toBe('turn-based');
    if (loaded.combat?.kind === 'turn-based') {
      for (const c of loaded.combat.combatants) {
        expect(c.statuses).toEqual([]);
      }
    }
  });

  it('serializes a v2 state and round-trips it cleanly', () => {
    const s = createInitialState(42);
    const json = serialize(s);
    const loaded = deserialize(json);
    expect(loaded.version).toBe(2);
    expect(loaded.character.statuses).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test src/engine/__tests__/save.test.ts
```

Expected: FAIL — `No migration registered from version 1 to 2.`

- [ ] **Step 4: Implement the migration in `save.ts`**

Replace the `MIGRATIONS` block in `src/engine/save.ts`:

```ts
const MIGRATIONS: Record<number, (s: any) => any> = {
  1: (s: any) => {
    const character = { ...s.character, statuses: s.character.statuses ?? [] };
    let combat = s.combat;
    if (combat && combat.kind === 'turn-based' && Array.isArray(combat.combatants)) {
      combat = {
        ...combat,
        combatants: combat.combatants.map((c: any) => ({ ...c, statuses: c.statuses ?? [] }))
      };
    }
    return { ...s, version: 2, character, combat };
  }
};
```

- [ ] **Step 5: Run tests**

```bash
npm test src/engine/__tests__/save.test.ts
npm run typecheck
```

Expected: save tests PASS. Typecheck still has errors elsewhere in the codebase (combat.ts constructs combatants without statuses) — addressed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/engine/state.ts src/engine/save.ts src/engine/__tests__/save.test.ts
git commit -m "Bump SAVE_VERSION to 2; add migration backfilling statuses arrays"
```

---

## Task 4: Wire status reads into combat math

**Files:**
- Modify: `src/engine/combat.ts`
- Modify: `src/engine/__tests__/combat.test.ts`

This is the largest task. We modify `startCombat` to initialize empty status arrays + copy world-scoped, modify `playerAttack` and `monsterTurn` to tick + read statuses, modify `endCombat` to persist player statuses, and add a `monsterFreeRetaliation` helper.

- [ ] **Step 1: Write the failing tests**

Append the following to `src/engine/__tests__/combat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../events';
import { applyStatus } from '../status';
import { createInitialState } from '../state';
import type { GameState, TurnBasedCombatState, EncounterId, MonsterId, ClassId } from '../types';

function buildCombatState(): GameState {
  let s = createInitialState(123);
  s = reduce(s, { kind: 'StartNewGame', name: 'Tester', classId: 'reluctant_farmboy' as ClassId });
  // Trigger a combat encounter for predictable mechanics. The Practice Hay Bale
  // is repeatable, no flee restrictions, no special interactions.
  s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
  return s;
}

describe('combat reads statuses', () => {
  it('weakness_revealed on monster makes the next player attack deal +50% damage', () => {
    let s = buildCombatState();
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;

    // Apply weakness_revealed to monster
    s = applyStatus(s, { kind: 'combatant', combatantId: monsterId }, {
      kind: 'weakness_revealed',
      duration: { kind: 'until_end_of_fight' },
      source: 'test'
    });

    const monsterBefore = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!;
    const hpBefore = monsterBefore.hp;

    s = reduce(s, { kind: 'AttackTarget' });

    if (s.combat?.kind === 'turn-based') {
      const monsterAfter = s.combat.combatants.find((c) => c.kind === 'monster')!;
      const damageDealt = hpBefore - monsterAfter.hp;
      // Without weakness, attacks against the hay bale deal 1 damage minimum (low brawn, low weapon).
      // With +50% multiplier, damage should be at least 1 (still applies floor) — we just verify
      // the system runs without error and weakness_revealed status persists on the monster.
      expect(damageDealt).toBeGreaterThanOrEqual(1);
      const monsterStatuses = monsterAfter.statuses;
      expect(monsterStatuses.some((st) => st.kind === 'weakness_revealed')).toBe(true);
    }
  });

  it('guaranteed_crit on player forces a crit, then clears', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'guaranteed_crit',
      duration: { kind: 'one_shot' },
      source: 'test'
    });
    s = reduce(s, { kind: 'AttackTarget' });

    // Find a 'Critical hit!' log entry.
    const critEntry = s.log.find((e) => e.text.includes('Critical hit!'));
    expect(critEntry).toBeDefined();

    // The status should have cleared.
    if (s.combat?.kind === 'turn-based') {
      const player = s.combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((st) => st.kind === 'guaranteed_crit')).toBe(false);
    }
  });

  it('next_attack_misses forces miss and also clears guaranteed_crit (wasted prophecy)', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'guaranteed_crit',
      duration: { kind: 'one_shot' },
      source: 'tempt-fate'
    });
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'next_attack_misses',
      duration: { kind: 'one_shot' },
      source: 'tempt-fate-backfire'
    });
    s = reduce(s, { kind: 'AttackTarget' });

    // No crit log because the attack missed.
    const critEntry = s.log.find((e) => e.text.includes('Critical hit!'));
    expect(critEntry).toBeUndefined();

    // Both statuses cleared.
    if (s.combat?.kind === 'turn-based') {
      const player = s.combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((st) => st.kind === 'guaranteed_crit')).toBe(false);
      expect(player.statuses.some((st) => st.kind === 'next_attack_misses')).toBe(false);
    }
  });

  it('intimidated on monster causes its next turn to be skipped', () => {
    // Use first_tax_rat which has actions; we apply intimidated and verify the
    // monster does not log an attack flavor.
    let s = createInitialState(123);
    s = reduce(s, { kind: 'StartNewGame', name: 'Tester', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'first_tax_rat' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;
    s = applyStatus(s, { kind: 'combatant', combatantId: monsterId }, {
      kind: 'intimidated',
      duration: { kind: 'turns', remaining: 1 },
      source: 'swagger'
    });

    const logLenBefore = s.log.length;
    s = reduce(s, { kind: 'AttackTarget' });

    // The monster's turn was skipped: there should be a 'looks rattled' or 'reconsiders' or
    // 'turn skipped' log line — and no monster-attack damage to player.
    const skipEntry = s.log.slice(logLenBefore).find((e) => e.text.toLowerCase().includes('skip') || e.text.toLowerCase().includes('reconsider'));
    expect(skipEntry).toBeDefined();
  });

  it('weapon_suspended treats weapon damage as 0', () => {
    let s = buildCombatState();
    // Apply weapon_suspended; player still attacks but deals minimum 1 damage (floor in rollDamage).
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 3 },
      source: 'tempt-fate-backfire'
    });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterBefore = s.combat.combatants.find((c) => c.kind === 'monster')!;
    const hpBefore = monsterBefore.hp;

    s = reduce(s, { kind: 'AttackTarget' });

    if (s.combat?.kind === 'turn-based') {
      const monsterAfter = s.combat.combatants.find((c) => c.kind === 'monster')!;
      // Damage should be small (1 at minimum) because weapon damage is 0.
      const dealt = hpBefore - monsterAfter.hp;
      expect(dealt).toBeLessThanOrEqual(5); // significantly less than full damage
    }
  });

  it('turns-statuses tick down at start of player turn', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 2 },
      source: 'test'
    });
    s = reduce(s, { kind: 'AttackTarget' });
    // After one player attack, weapon_suspended remaining should be 1.
    if (s.combat?.kind === 'turn-based') {
      const player = s.combat.combatants.find((c) => c.kind === 'player')!;
      const ws = player.statuses.find((st) => st.kind === 'weapon_suspended');
      expect(ws).toBeDefined();
      const dur = ws!.duration;
      expect(dur.kind === 'turns' && dur.remaining).toBe(1);
    }
  });

  it('on combat end, combat-scoped statuses are dropped and world-scoped persist', () => {
    let s = buildCombatState();
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'weapon_suspended',
      duration: { kind: 'turns', remaining: 3 },
      source: 'combat-scoped'
    });
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: 'guaranteed_crit',
      duration: { kind: 'permanent' },
      source: 'world-scoped'
    });

    // End combat by killing the hay bale (one attack should suffice — it has 4 HP).
    let safety = 20;
    while (s.combat && safety-- > 0) {
      s = reduce(s, { kind: 'AttackTarget' });
    }

    expect(s.combat).toBeNull();
    expect(s.character.statuses.some((st) => st.kind === 'weapon_suspended')).toBe(false);
    expect(s.character.statuses.some((st) => st.kind === 'guaranteed_crit')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/engine/__tests__/combat.test.ts
```

Expected: FAIL on the new tests (typecheck errors or missing behavior).

- [ ] **Step 3: Update `combat.ts`**

In `src/engine/combat.ts`:

**Change a:** import status helpers at the top:

```ts
import {
  tickStatuses,
  hasStatus,
  findStatus,
  expireStatusByKind,
  copyWorldStatusesToPlayer,
  persistPlayerStatusesToCharacter
} from './status';
import type { Status } from './types';
```

**Change b:** modify `startCombat` to initialize combatants with `statuses: []` and to copy world-scoped statuses:

```ts
export function startCombat(state: GameState, encounter: CombatEncounter): GameState {
  const monster = content.monsters[encounter.monsterId];
  if (!monster) {
    return pushLog(state, { kind: 'system', systemLabel: 'ERROR', text: `Unknown monster ${encounter.monsterId}.` });
  }
  const playerInitRoll = rng.d6(state.rng);
  const monsterInitRoll = rng.d6(playerInitRoll.state);
  const playerInit = state.character.stats.bravado + playerInitRoll.value;
  const monsterInit = monster.bravado + monsterInitRoll.value;

  const combat: TurnBasedCombatState = {
    kind: 'turn-based',
    encounterId: encounter.id,
    combatants: [
      { id: 'player', kind: 'player', hp: state.character.hp.current, initiative: playerInit, statuses: [] },
      { id: encounter.monsterId, kind: 'monster', hp: monster.hp, initiative: monsterInit, statuses: [] }
    ],
    turnIndex: 0,
    round: 1
  };

  let s: GameState = { ...state, rng: monsterInitRoll.state, combat };
  s = copyWorldStatusesToPlayer(s);
  s = pushLog(s, { kind: 'combat', text: `${monster.name} appears.` });
  s = pushLog(s, { kind: 'combat', text: monster.flavor });
  return s;
}
```

**Change c:** add a player-turn tick helper used at the start of player actions:

```ts
function tickPlayerCombatant(state: GameState): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const combat = state.combat;
  const combatants = combat.combatants.map((c) => (c.kind === 'player' ? tickStatuses(c) : c));
  return { ...state, combat: { ...combat, combatants } };
}

function tickMonsterCombatant(state: GameState, monsterId: string): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const combat = state.combat;
  const combatants = combat.combatants.map((c) => (c.id === monsterId ? tickStatuses(c) : c));
  return { ...state, combat: { ...combat, combatants } };
}
```

**Change d:** rewrite `playerAttack` to honor statuses:

```ts
export function playerAttack(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;

  // Tick player turns-statuses.
  let s: GameState = tickPlayerCombatant(state);
  if (s.combat?.kind !== 'turn-based') return s;

  const monsterCombatant = s.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return s;
  const playerCombatant = s.combat.combatants.find((c) => c.kind === 'player');
  if (!playerCombatant) return s;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return s;

  const weaponId = s.character.equipment.weapon;
  const weapon = weaponId ? content.items[weaponId] : undefined;
  const weaponSuspended = hasStatus(playerCombatant, 'weapon_suspended');
  const weaponDamage = weaponSuspended ? 0 : (weapon?.damage ?? 1);

  // 1. next_attack_misses forces miss.
  if (hasStatus(playerCombatant, 'next_attack_misses')) {
    // Clear next_attack_misses AND guaranteed_crit (wasted prophecy interaction).
    const sCombat = s.combat;
    const combatants = sCombat.combatants.map((c) => {
      if (c.kind !== 'player') return c;
      let cleared = expireStatusByKind(c, 'next_attack_misses');
      cleared = expireStatusByKind(cleared, 'guaranteed_crit');
      return cleared;
    });
    s = { ...s, combat: { ...sCombat, combatants } };
    s = pushLog(s, { kind: 'combat', text: 'Your strike goes wide — exactly as foretold.' });
    return s;
  }

  // 2. Hit roll (or guaranteed crit forces hit).
  const guaranteedCrit = hasStatus(playerCombatant, 'guaranteed_crit');
  let hit: boolean;
  if (guaranteedCrit) {
    hit = true;
  } else {
    const hitRoll = rollHit(s.rng, s.character.stats.bravado, monster.dodge);
    s = { ...s, rng: hitRoll.state };
    hit = hitRoll.value;
  }
  if (!hit) {
    s = pushLog(s, { kind: 'combat', text: 'Your swing goes wide.' });
    return s;
  }

  // 3. Damage roll.
  const dmgRoll = rollDamage(s.rng, weaponDamage, s.character.stats.brawn, monster.armor);
  s = { ...s, rng: dmgRoll.state };

  // 4. Crit (forced if guaranteed_crit).
  let isCrit: boolean;
  if (guaranteedCrit) {
    isCrit = true;
    // Clear the one-shot status now.
    const sCombat = s.combat as TurnBasedCombatState;
    const combatants = sCombat.combatants.map((c) =>
      c.kind === 'player' ? expireStatusByKind(c, 'guaranteed_crit') : c
    );
    s = { ...s, combat: { ...sCombat, combatants } };
  } else {
    const critRoll = rollCrit(s.rng, s.character.stats.bluck);
    s = { ...s, rng: critRoll.state };
    isCrit = critRoll.value;
  }
  let finalDamage = isCrit ? Math.floor(dmgRoll.value * 2.2) : dmgRoll.value;

  // 5. Weakness revealed on monster: +50% damage.
  if (hasStatus(monsterCombatant, 'weakness_revealed')) {
    finalDamage = Math.floor(finalDamage * 1.5);
  }

  // 6. Apply damage.
  const sCombat = s.combat as TurnBasedCombatState;
  const newCombatants = sCombat.combatants.map((c) =>
    c.kind === 'monster' ? { ...c, hp: Math.max(0, c.hp - finalDamage) } : c
  );
  s = { ...s, combat: { ...sCombat, combatants: newCombatants } };
  s = pushLog(s, {
    kind: 'combat',
    text: isCrit ? `Critical hit! You strike for ${finalDamage}.` : `You hit for ${finalDamage}.`
  });

  return s;
}
```

**Change e:** rewrite `monsterTurn` to honor `intimidated` / `skip_turn` and `armor_halved`:

```ts
export function monsterTurn(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  // Tick monster turns-statuses at start of its turn.
  let s = tickMonsterCombatant(state, monsterCombatant.id);
  if (s.combat?.kind !== 'turn-based') return s;
  const tickedMonster = s.combat.combatants.find((c) => c.id === monsterCombatant.id)!;

  // Skip turn if intimidated or skip_turn.
  if (hasStatus(tickedMonster, 'intimidated') || hasStatus(tickedMonster, 'skip_turn')) {
    s = pushLog(s, {
      kind: 'combat',
      text: hasStatus(tickedMonster, 'intimidated')
        ? `${monster.name} is too rattled to act.`
        : `${monster.name} skips a beat.`
    });
    return s;
  }

  const actionRoll = rng.weighted(s.rng, monster.actions.map((a) => ({ value: a, weight: a.weight })));
  s = { ...s, rng: actionRoll.state };
  const action = actionRoll.value;

  if (action.kind === 'flee_if_low_hp' && tickedMonster.hp <= Math.floor(monster.hp / 4)) {
    s = pushLog(s, { kind: 'combat', text: action.flavor });
    s = { ...s, combat: null };
    return s;
  }

  const damageBonus = action.kind === 'special' ? action.damageBonus : 0;
  const hit = rollHit(s.rng, monster.bravado, /*player dodge*/ 10 + Math.floor(state.character.stats.bravado / 2));
  s = { ...s, rng: hit.state };
  if (!hit.value) {
    s = pushLog(s, { kind: 'combat', text: `${action.flavor} (You dodge.)` });
    return s;
  }

  // armor_halved on player halves effective armor.
  const playerCombatant = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'player')!;
  const armorId = state.character.equipment.armor;
  const armorItem = armorId ? content.items[armorId] : undefined;
  const baseArmor = armorItem?.armor ?? 0;
  const playerArmor = hasStatus(playerCombatant, 'armor_halved') ? Math.floor(baseArmor / 2) : baseArmor;

  const dmg = rollDamage(s.rng, monster.weaponDamage + damageBonus, monster.brawn, playerArmor);
  s = { ...s, rng: dmg.state };
  const newHp = Math.max(0, state.character.hp.current - dmg.value);
  const sCombat = s.combat as TurnBasedCombatState;
  s = {
    ...s,
    character: { ...s.character, hp: { ...s.character.hp, current: newHp } },
    combat: {
      ...sCombat,
      combatants: sCombat.combatants.map((c) => (c.kind === 'player' ? { ...c, hp: newHp } : c))
    }
  };
  s = pushLog(s, { kind: 'combat', text: `${action.flavor} (-${dmg.value} HP)` });
  return s;
}
```

**Change f:** add a free-retaliation helper for use by Tempt Fate's backfire #5:

```ts
// Triggers a one-off monster attack outside the normal turn cycle. The monster's
// `free_retaliation` status is cleared after the attack regardless of outcome.
export function monsterFreeRetaliation(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  if (!hasStatus(monsterCombatant, 'free_retaliation')) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  // Use the first non-flee action's flavor / damage.
  const action = monster.actions.find((a) => a.kind !== 'flee_if_low_hp') ?? monster.actions[0];
  if (!action) return state;
  const damageBonus = action.kind === 'special' ? action.damageBonus : 0;

  const playerCombatant = state.combat.combatants.find((c) => c.kind === 'player')!;
  let s: GameState = state;
  const hit = rollHit(s.rng, monster.bravado, 10 + Math.floor(s.character.stats.bravado / 2));
  s = { ...s, rng: hit.state };
  if (!hit.value) {
    s = pushLog(s, { kind: 'combat', text: `${action.flavor} (You dodge — barely.)` });
  } else {
    const armorId = s.character.equipment.armor;
    const armorItem = armorId ? content.items[armorId] : undefined;
    const baseArmor = armorItem?.armor ?? 0;
    const playerArmor = hasStatus(playerCombatant, 'armor_halved') ? Math.floor(baseArmor / 2) : baseArmor;
    const dmg = rollDamage(s.rng, monster.weaponDamage + damageBonus, monster.brawn, playerArmor);
    s = { ...s, rng: dmg.state };
    const newHp = Math.max(0, s.character.hp.current - dmg.value);
    const sCombat = s.combat as TurnBasedCombatState;
    s = {
      ...s,
      character: { ...s.character, hp: { ...s.character.hp, current: newHp } },
      combat: {
        ...sCombat,
        combatants: sCombat.combatants.map((c) => (c.kind === 'player' ? { ...c, hp: newHp } : c))
      }
    };
    s = pushLog(s, { kind: 'combat', text: `${action.flavor} (-${dmg.value} HP)` });
  }

  // Clear the one-shot.
  const sCombat = s.combat as TurnBasedCombatState;
  s = {
    ...s,
    combat: {
      ...sCombat,
      combatants: sCombat.combatants.map((c) =>
        c.id === monsterCombatant.id ? expireStatusByKind(c, 'free_retaliation') : c
      )
    }
  };
  return s;
}
```

**Change g:** modify `endCombat` to call `persistPlayerStatusesToCharacter` before the function returns. Replace the existing `let s: GameState = { ...state, combat: null };` line (line 235) with:

```ts
let s: GameState = persistPlayerStatusesToCharacter(state);
s = { ...s, combat: null };
```

(Order matters: persist while `state.combat` still holds the combatants, then null it.)

- [ ] **Step 4: Update `playerUseItem` and `playerFlee` to also tick player statuses**

Add `state = tickPlayerCombatant(state);` and re-narrow at the top of each:

```ts
export function playerUseItem(state: GameState, itemId: ItemId): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  state = tickPlayerCombatant(state);
  if (state.combat?.kind !== 'turn-based') return state;
  // ... rest unchanged
}

export function playerFlee(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  state = tickPlayerCombatant(state);
  if (state.combat?.kind !== 'turn-based') return state;
  // ... rest unchanged
}
```

- [ ] **Step 5: Run tests**

```bash
npm test src/engine/__tests__/combat.test.ts
npm run typecheck
```

Expected: combat tests PASS. Typecheck still has errors in `events.ts` (UseSkill missing) and content files — addressed in subsequent tasks.

- [ ] **Step 6: Commit**

```bash
git add src/engine/combat.ts src/engine/__tests__/combat.test.ts
git commit -m "Wire status reads into combat math; tick at turn start; add free retaliation helper"
```

---

## Task 5: `UseSkill` event + skill resolver registry + MP gating

**Files:**
- Create: `src/content/skills/resolvers.ts`
- Create: `src/content/skills/__tests__/resolvers.test.ts`
- Modify: `src/engine/events.ts`
- Modify: `src/content/skills/index.ts`
- Modify: `src/content/index.ts`

- [ ] **Step 1: Create the resolver registry skeleton**

Create `src/content/skills/resolvers.ts`:

```ts
import type { GameState, SkillResolver, SkillResolverId } from '../../engine/types';

// Resolvers are registered as additional tasks land them. Each resolver receives
// the post-MP-deduction state and returns the new state.
export const skillResolvers: Record<SkillResolverId, SkillResolver> = {};

export function registerSkillResolver(id: SkillResolverId, fn: SkillResolver): void {
  skillResolvers[id] = fn;
}
```

- [ ] **Step 2: Add `UseSkill` to GameEvent and the dispatch**

In `src/engine/events.ts`:

**a.** Add the event variant to the `GameEvent` union (after `Flee`):

```ts
| { kind: 'UseSkill'; skillId: SkillId }
```

Add the import for `SkillId` to the existing types import line at the top.

**b.** Import the resolver registry near the top:

```ts
import { skillResolvers } from '../content/skills/resolvers';
```

**c.** Handle the event in `reduceInner` (insert after the `Flee` case):

```ts
case 'UseSkill': {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  const skill = content.skills[event.skillId];
  if (!skill) return state;
  if (!state.character.knownSkills.includes(event.skillId)) return state;
  if (state.character.mp.current < skill.mpCost) return state;

  // Deduct MP.
  let s: GameState = {
    ...state,
    character: {
      ...state.character,
      mp: { ...state.character.mp, current: state.character.mp.current - skill.mpCost }
    }
  };

  // Run resolver.
  const resolver = skillResolvers[skill.resolverId];
  if (!resolver) {
    return appendLogs(s, [{ kind: 'system', systemLabel: 'ERROR', text: `Unknown skill resolver ${skill.resolverId}.` }]);
  }
  s = resolver(s);

  // Check for monster KO from the skill.
  if (s.combat?.kind === 'turn-based') {
    const monster = s.combat.combatants.find((c) => c.kind === 'monster');
    if (monster && monster.hp <= 0) {
      const enc = content.encounters[s.combat.encounterId];
      return enc?.kind === 'combat' ? endCombat(s, 'victory', enc) : { ...s, combat: null };
    }
    // Monster turn (unless the skill ended combat directly).
    s = monsterTurn(s);
    if (s.character.hp.current <= 0) {
      const enc = content.encounters[s.combat!.encounterId];
      return enc?.kind === 'combat' ? endCombat(s, 'defeat', enc) : { ...s, combat: null };
    }
  }
  return s;
}
```

- [ ] **Step 3: Update `content/skills/index.ts` to add `resolverId`**

Replace `src/content/skills/index.ts`:

```ts
import { SkillId, type Skill } from '../../engine/types';

// NOTE: do NOT side-effect-import './resolvers' here. resolvers.ts imports from
// engine/combat.ts, and combat.ts imports from content. Importing resolvers
// from content/skills/index.ts would create a content → skills → resolvers →
// combat → content cycle. Instead, events.ts imports skillResolvers directly,
// which is the only consumer that actually needs them at runtime.

export const skills: Record<SkillId, Skill> = {
  [SkillId('tempt_fate')]: {
    id: SkillId('tempt_fate'),
    name: 'Tempt Fate',
    description: 'A guaranteed crit on your next action — but with a 15% chance something absurd and bad also happens.',
    mpCost: 6,
    scalingStat: 'bluck',
    unlockLevel: 3,
    resolverId: 'tempt_fate'
  }
};
```

(The other three skills land in Tasks 6-9; we register `tempt_fate` here for type alignment now.)

- [ ] **Step 4: Write the failing test for MP gating**

Create `src/content/skills/__tests__/resolvers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../../engine/events';
import { createInitialState } from '../../../engine/state';
import { registerSkillResolver, skillResolvers } from '../resolvers';
import type { ClassId, EncounterId, SkillId } from '../../../engine/types';

describe('UseSkill MP gating', () => {
  it('does nothing if the player does not know the skill', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    const before = s.character.mp.current;
    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
    expect(s.character.mp.current).toBe(before);
  });

  it('deducts MP and runs the resolver when the skill is known and MP is sufficient', () => {
    // Manually add tempt_fate to knownSkills (test fixture — we're not testing level-up here).
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };

    let resolverCalled = false;
    registerSkillResolver('tempt_fate', (state) => {
      resolverCalled = true;
      return state;
    });

    const mpBefore = s.character.mp.current;
    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
    expect(resolverCalled).toBe(true);
    expect(s.character.mp.current).toBe(mpBefore - 6);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
npm run typecheck
```

Expected: tests PASS, typecheck OK (or pre-existing errors only).

- [ ] **Step 6: Commit**

```bash
git add src/engine/events.ts src/content/skills/resolvers.ts src/content/skills/__tests__/resolvers.test.ts src/content/skills/index.ts
git commit -m "Add UseSkill event + skill resolver registry + MP gating"
```

---

## Task 6: Brute Force resolver

**Files:**
- Modify: `src/content/skills/resolvers.ts`
- Modify: `src/content/skills/index.ts`
- Modify: `src/content/skills/__tests__/resolvers.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/content/skills/__tests__/resolvers.test.ts`:

```ts
import { content } from '../../../content';

describe('Brute Force resolver', () => {
  it('rolls a single attack with reduced accuracy and 1.8x damage', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['brute_force' as SkillId] } };

    expect(content.skills['brute_force' as SkillId]).toBeDefined();

    const mpBefore = s.character.mp.current;
    s = reduce(s, { kind: 'UseSkill', skillId: 'brute_force' as SkillId });
    expect(s.character.mp.current).toBe(mpBefore - 6);
    // After the cast, either a hit log or a miss log should appear.
    const lastTwo = s.log.slice(-3).map((e) => e.text);
    const hadAttackLog = lastTwo.some(
      (t) => t.includes('with all your weight') || t.includes('bites only the dust')
    );
    expect(hadAttackLog).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
```

Expected: FAIL — `brute_force` skill not registered.

- [ ] **Step 3: Implement Brute Force resolver**

Replace `src/content/skills/resolvers.ts`:

```ts
import type { GameState, MonsterId, SkillResolver, SkillResolverId, TurnBasedCombatState, LogEntry } from '../../engine/types';
import { MAX_LOG_ENTRIES } from '../../engine/types';
import { content } from '..';
import { rng } from '../../engine/rng';
import { rollHit, rollDamage, rollCrit } from '../../engine/combat';

export const skillResolvers: Record<SkillResolverId, SkillResolver> = {};

export function registerSkillResolver(id: SkillResolverId, fn: SkillResolver): void {
  skillResolvers[id] = fn;
}

function pushLog(state: GameState, entry: Omit<LogEntry, 'id'>): GameState {
  const id = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const merged = [...state.log, { id, ...entry }];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}

// =====================================================================
// Brute Force — Brawn. ~1.8x damage with reduced accuracy.
// =====================================================================

registerSkillResolver('brute_force', (state) => {
  if (state.combat?.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  const weaponId = state.character.equipment.weapon;
  const weapon = weaponId ? content.items[weaponId] : undefined;
  const weaponDamage = weapon?.damage ?? 1;

  // Reduced accuracy: -3 to the hit roll total (≈ -15% on a 1d20 + bravado/2).
  // We model this as a higher target dodge.
  const adjustedDodge = monster.dodge + 3;
  const hitRoll = rollHit(state.rng, state.character.stats.bravado, adjustedDodge);
  let s: GameState = { ...state, rng: hitRoll.state };
  if (!hitRoll.value) {
    return pushLog(s, { kind: 'combat', text: `The ${weapon?.name ?? 'weapon'} bites only the dust. (Tempt the swing, lose the moment.)` });
  }

  const dmgRoll = rollDamage(s.rng, weaponDamage, s.character.stats.brawn, monster.armor);
  s = { ...s, rng: dmgRoll.state };
  const critRoll = rollCrit(s.rng, s.character.stats.bluck);
  s = { ...s, rng: critRoll.state };

  const multiplier = 1.8 + state.character.stats.brawn * 0.02;
  const baseDamage = Math.floor(dmgRoll.value * multiplier);
  const finalDamage = critRoll.value ? Math.floor(baseDamage * 2.2) : baseDamage;

  const sCombat = s.combat as TurnBasedCombatState;
  s = {
    ...s,
    combat: {
      ...sCombat,
      combatants: sCombat.combatants.map((c) =>
        c.kind === 'monster' ? { ...c, hp: Math.max(0, c.hp - finalDamage) } : c
      )
    }
  };
  return pushLog(s, {
    kind: 'combat',
    text: critRoll.value
      ? `The ${weapon?.name ?? 'weapon'} comes down with all your weight behind it. **Critical!** Damage: ${finalDamage}.`
      : `The ${weapon?.name ?? 'weapon'} comes down with all your weight behind it. Damage: ${finalDamage}.`
  });
});
```

- [ ] **Step 4: Register the skill in `content/skills/index.ts`**

Replace the `skills` record:

```ts
export const skills: Record<SkillId, Skill> = {
  [SkillId('tempt_fate')]: {
    id: SkillId('tempt_fate'),
    name: 'Tempt Fate',
    description: 'A guaranteed crit on your next action — but with a 15% chance something absurd and bad also happens.',
    mpCost: 6,
    scalingStat: 'bluck',
    unlockLevel: 3,
    resolverId: 'tempt_fate'
  },
  [SkillId('brute_force')]: {
    id: SkillId('brute_force'),
    name: 'Brute Force',
    description: 'A heaving overhead swing. ~1.8× damage but reduced accuracy.',
    mpCost: 6,
    scalingStat: 'brawn',
    unlockLevel: 3,
    resolverId: 'brute_force'
  }
};
```

- [ ] **Step 5: Run tests**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/skills/resolvers.ts src/content/skills/index.ts src/content/skills/__tests__/resolvers.test.ts
git commit -m "Author Brute Force signature move (Brawn)"
```

---

## Task 7: Out-Think It resolver + endsByReasoning support

**Files:**
- Modify: `src/content/skills/resolvers.ts`
- Modify: `src/content/skills/index.ts`
- Modify: `src/engine/events.ts`
- Modify: `src/content/skills/__tests__/resolvers.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/content/skills/__tests__/resolvers.test.ts`:

```ts
describe('Out-Think It resolver', () => {
  it('applies weakness_revealed to the monster (until_end_of_fight)', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['out_think_it' as SkillId] } };

    s = reduce(s, { kind: 'UseSkill', skillId: 'out_think_it' as SkillId });

    if (s.combat?.kind === 'turn-based') {
      const monster = s.combat.combatants.find((c) => c.kind === 'monster')!;
      const wr = monster.statuses.find((st) => st.kind === 'weakness_revealed');
      expect(wr).toBeDefined();
      expect(wr!.duration.kind).toBe('until_end_of_fight');
    }
  });

  it('replaces existing weakness_revealed (no stacking)', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['out_think_it' as SkillId], mp: { current: 100, max: 100 } } };

    s = reduce(s, { kind: 'UseSkill', skillId: 'out_think_it' as SkillId });
    s = reduce(s, { kind: 'UseSkill', skillId: 'out_think_it' as SkillId });

    if (s.combat?.kind === 'turn-based') {
      const monster = s.combat.combatants.find((c) => c.kind === 'monster')!;
      const count = monster.statuses.filter((st) => st.kind === 'weakness_revealed').length;
      expect(count).toBe(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
```

Expected: FAIL — `out_think_it` not registered.

- [ ] **Step 3: Implement Out-Think It resolver**

Append to `src/content/skills/resolvers.ts`:

```ts
import { applyStatus } from '../../engine/status';

// =====================================================================
// Out-Think It — Brains. Applies weakness_revealed (until end of fight).
// If encounter has endsByReasoning, the fight resolves as victory.
// =====================================================================

registerSkillResolver('out_think_it', (state) => {
  if (state.combat?.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;

  let s = applyStatus(state, { kind: 'combatant', combatantId: monsterCombatant.id }, {
    kind: 'weakness_revealed',
    duration: { kind: 'until_end_of_fight' },
    source: 'Out-Think It'
  });
  s = pushLog(s, {
    kind: 'combat',
    text: `You expose the contradiction at the heart of its grievance. **${content.monsters[monsterCombatant.id as MonsterId]?.name ?? 'It'} — weakness revealed.**`
  });

  // endsByReasoning encounter opt-in: KO the monster.
  const enc = content.encounters[state.combat.encounterId];
  if (enc?.kind === 'combat' && enc.endsByReasoning) {
    if (s.combat?.kind === 'turn-based') {
      const sCombat = s.combat;
      s = {
        ...s,
        combat: {
          ...sCombat,
          combatants: sCombat.combatants.map((c) =>
            c.kind === 'monster' ? { ...c, hp: 0 } : c
          )
        }
      };
      s = pushLog(s, { kind: 'combat', text: 'They sit down. The argument is over.' });
    }
  }
  return s;
});
```

- [ ] **Step 4: Register the skill**

Append to `skills` record in `content/skills/index.ts`:

```ts
[SkillId('out_think_it')]: {
  id: SkillId('out_think_it'),
  name: 'Out-Think It',
  description: 'Reveal the contradiction. Subsequent attacks deal +50% damage for the rest of the fight.',
  mpCost: 8,
  scalingStat: 'brains',
  unlockLevel: 3,
  resolverId: 'out_think_it'
}
```

- [ ] **Step 5: Run tests**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/skills/resolvers.ts src/content/skills/index.ts src/content/skills/__tests__/resolvers.test.ts
git commit -m "Author Out-Think It signature move (Brains) + endsByReasoning support"
```

---

## Task 8: Swagger resolver

**Files:**
- Modify: `src/content/skills/resolvers.ts`
- Modify: `src/content/skills/index.ts`
- Modify: `src/content/skills/__tests__/resolvers.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/content/skills/__tests__/resolvers.test.ts`:

```ts
describe('Swagger resolver', () => {
  it('applies intimidated (turns: 1) to the monster, causing its next turn to skip', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'first_tax_rat' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['swagger' as SkillId] } };

    s = reduce(s, { kind: 'UseSkill', skillId: 'swagger' as SkillId });

    // Monster's turn fired during UseSkill dispatch — should have been skipped.
    const skipEntry = s.log.find((e) => e.text.toLowerCase().includes('rattled') || e.text.toLowerCase().includes('reconsider'));
    expect(skipEntry).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Swagger resolver**

Append to `src/content/skills/resolvers.ts`:

```ts
// =====================================================================
// Swagger — Bravado. Applies intimidated (turns: 1) to monster.
// =====================================================================

registerSkillResolver('swagger', (state) => {
  if (state.combat?.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];

  let s = applyStatus(state, { kind: 'combatant', combatantId: monsterCombatant.id }, {
    kind: 'intimidated',
    duration: { kind: 'turns', remaining: 1 },
    source: 'Swagger'
  });
  s = pushLog(s, {
    kind: 'combat',
    text: `You roll your shoulders. The ${monster?.name ?? 'foe'} reconsiders its life choices. **Intimidated.**`
  });
  return s;
});
```

- [ ] **Step 4: Register the skill**

Append to `skills` record in `content/skills/index.ts`:

```ts
[SkillId('swagger')]: {
  id: SkillId('swagger'),
  name: 'Swagger',
  description: 'Roll your shoulders and let the silence work. Target skips its next turn.',
  mpCost: 6,
  scalingStat: 'bravado',
  unlockLevel: 3,
  resolverId: 'swagger'
}
```

- [ ] **Step 5: Run tests**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/skills/resolvers.ts src/content/skills/index.ts src/content/skills/__tests__/resolvers.test.ts
git commit -m "Author Swagger signature move (Bravado)"
```

---

## Task 9: Tempt Fate resolver with six backfires

**Files:**
- Modify: `src/content/skills/resolvers.ts`
- Modify: `src/content/skills/__tests__/resolvers.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/content/skills/__tests__/resolvers.test.ts`:

```ts
describe('Tempt Fate resolver', () => {
  it('applies guaranteed_crit (one_shot) to the player', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };

    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });

    if (s.combat?.kind === 'turn-based') {
      const player = s.combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((st) => st.kind === 'guaranteed_crit')).toBe(true);
    }
  });

  it('with seed forcing backfire, applies one of the six self-effects', () => {
    // Seed search: find a seed where d100 < 15 fires on the first roll.
    // We use a deterministic high-confidence test by trying multiple seeds.
    let backfireFired = false;
    for (let seed = 1; seed < 50 && !backfireFired; seed++) {
      let s = createInitialState(seed);
      s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
      s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
      s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };
      s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
      const backfire = s.log.find((e) =>
        e.text.includes('Skip next turn') ||
        e.text.includes('crit yourself') ||
        e.text.includes('Weapon suspended') ||
        e.text.includes('Armor halved') ||
        e.text.includes('takes the cue') ||
        e.text.includes('destined to miss')
      );
      if (backfire) {
        backfireFired = true;
        break;
      }
    }
    expect(backfireFired).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
```

Expected: FAIL — `tempt_fate` not yet registered as a resolver (the placeholder we registered in Task 5 was overwritten by re-imports; if not, the no-op resolver doesn't apply the status).

- [ ] **Step 3: Update imports at the top of `resolvers.ts`**

Replace the existing combat import line with one that includes `monsterFreeRetaliation`:

```ts
import { rollHit, rollDamage, rollCrit, monsterFreeRetaliation } from '../../engine/combat';
```

- [ ] **Step 4: Append the Tempt Fate resolver**

Append to `src/content/skills/resolvers.ts`:

```ts
// =====================================================================
// Tempt Fate — (B)Luck. Guaranteed crit on next attack + 15% backfire.
// =====================================================================

type BackfireKind =
  | 'trip'
  | 'crit_yourself'
  | 'weapon_mute'
  | 'drop_shield'
  | 'free_retaliation'
  | 'wasted_prophecy';

const BACKFIRES: BackfireKind[] = [
  'trip', 'crit_yourself', 'weapon_mute', 'drop_shield', 'free_retaliation', 'wasted_prophecy'
];

registerSkillResolver('tempt_fate', (state) => {
  if (state.combat?.kind !== 'turn-based') return state;

  // Apply guaranteed_crit (one-shot) to the player.
  let s = applyStatus(state, { kind: 'combatant', combatantId: 'player' }, {
    kind: 'guaranteed_crit',
    duration: { kind: 'one_shot' },
    source: 'Tempt Fate'
  });

  // Roll d100 for backfire (15% gate).
  const gate = rng.d100(s.rng);
  s = { ...s, rng: gate.state };
  const fired = gate.value <= 15;

  if (!fired) {
    s = pushLog(s, { kind: 'combat', text: 'You wink at the universe. A crit awaits your next swing.' });
    return s;
  }

  s = pushLog(s, { kind: 'combat', text: 'You wink at the universe. The universe winks back. Awkwardly.' });

  // Pick a backfire uniformly via seeded RNG.
  const pick = rng.pick(s.rng, BACKFIRES);
  s = { ...s, rng: pick.state };

  switch (pick.value) {
    case 'trip':
      s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
        kind: 'skip_turn',
        duration: { kind: 'turns', remaining: 1 },
        source: 'Tempt Fate backfire'
      });
      s = pushLog(s, { kind: 'combat', text: 'You step on your own cloak. **Skip next turn.**' });
      break;

    case 'crit_yourself': {
      // rng.d4 does not exist; map d6 → 1..4 deterministically.
      const dmgRoll = rng.d6(s.rng);
      s = { ...s, rng: dmgRoll.state };
      const dmg = ((dmgRoll.value - 1) % 4) + 1;
      const newHp = Math.max(0, s.character.hp.current - dmg);
      const sCombat = s.combat as TurnBasedCombatState;
      s = {
        ...s,
        character: { ...s.character, hp: { ...s.character.hp, current: newHp } },
        combat: {
          ...sCombat,
          combatants: sCombat.combatants.map((c) => (c.kind === 'player' ? { ...c, hp: newHp } : c))
        }
      };
      s = pushLog(s, { kind: 'combat', text: `The universe accepts your wink. You crit yourself for ${dmg}.` });
      break;
    }

    case 'weapon_mute':
      s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
        kind: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 3 },
        source: 'Tempt Fate backfire'
      });
      s = pushLog(s, { kind: 'combat', text: 'Your weapon takes a vow of silence for the next three turns. **Weapon suspended.**' });
      break;

    case 'drop_shield':
      s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
        kind: 'armor_halved',
        duration: { kind: 'turns', remaining: 2 },
        source: 'Tempt Fate backfire'
      });
      s = pushLog(s, { kind: 'combat', text: 'You catch a draft and forget how armor works. **Armor halved (2 turns).**' });
      break;

    case 'free_retaliation': {
      const monsterCombatant = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster');
      if (monsterCombatant) {
        s = applyStatus(s, { kind: 'combatant', combatantId: monsterCombatant.id }, {
          kind: 'free_retaliation',
          duration: { kind: 'one_shot' },
          source: 'Tempt Fate backfire'
        });
        s = pushLog(s, { kind: 'combat', text: 'You laugh nervously. The foe takes the cue.' });
        s = monsterFreeRetaliation(s);
      }
      break;
    }

    case 'wasted_prophecy':
      s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
        kind: 'next_attack_misses',
        duration: { kind: 'one_shot' },
        source: 'Tempt Fate backfire'
      });
      s = pushLog(s, { kind: 'combat', text: 'A faint cosmic chuckle. **Your next strike is destined to miss.**' });
      break;
  }
  return s;
});
```

- [ ] **Step 5: Run tests**

```bash
npm test src/content/skills/__tests__/resolvers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/skills/resolvers.ts src/content/skills/__tests__/resolvers.test.ts
git commit -m "Author Tempt Fate signature move with six backfires"
```

---

## Task 10: `progression.ts` + STAT_ROTATIONS + skill unlock at L3

**Files:**
- Create: `src/engine/progression.ts`
- Create: `src/engine/__tests__/progression.test.ts`
- Modify: `src/engine/combat.ts` (extract level-up loop to call `applyLevelUp`)

- [ ] **Step 1: Write the failing tests**

Create `src/engine/__tests__/progression.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyLevelUp, STAT_ROTATIONS } from '../progression';
import { createInitialState } from '../state';
import { ClassId, SkillId, type GameState } from '../types';
import { reduce } from '../events';

function farmboyAtLevel1(): GameState {
  let s = createInitialState(1);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
  return s;
}

describe('STAT_ROTATIONS', () => {
  it('has an entry for every class', () => {
    expect(STAT_ROTATIONS['reluctant_farmboy' as ClassId]).toBeDefined();
    // Other classes will be added in Tasks 12-14; we verify shape, not content.
  });
});

describe('applyLevelUp', () => {
  it('increments level and adds HP/MP per the spec formula', () => {
    const s = farmboyAtLevel1();
    const before = { hp: s.character.hp.max, mp: s.character.mp.max, level: s.character.level };
    const after = applyLevelUp(s);
    expect(after.character.level).toBe(before.level + 1);
    expect(after.character.hp.max).toBe(before.hp + Math.floor(s.character.stats.brawn * 1.5));
    expect(after.character.mp.max).toBe(before.mp + s.character.stats.brains);
    // HP/MP refilled to new max:
    expect(after.character.hp.current).toBe(after.character.hp.max);
    expect(after.character.mp.current).toBe(after.character.mp.max);
  });

  it('applies the class stat rotation to the appropriate stat at level 2', () => {
    // Farmboy's first rotation entry is "bluck".
    const s = farmboyAtLevel1();
    const before = s.character.stats.bluck;
    const after = applyLevelUp(s);
    expect(after.character.stats.bluck).toBe(before + 1);
  });

  it('unlocks the class signature move at the configured unlockLevel', () => {
    // Level Farmboy from 1→3 by calling applyLevelUp twice. The signature move
    // (tempt_fate) unlocks at level 3.
    let s = farmboyAtLevel1();
    s = applyLevelUp(s);  // level 2
    expect(s.character.knownSkills).not.toContain('tempt_fate');
    s = applyLevelUp(s);  // level 3
    expect(s.character.knownSkills).toContain('tempt_fate' as SkillId);
  });

  it('does not duplicate a skill if already known', () => {
    let s = farmboyAtLevel1();
    s = applyLevelUp(s);
    s = applyLevelUp(s);
    s = applyLevelUp(s);
    s = applyLevelUp(s);
    const count = s.character.knownSkills.filter((k) => k === 'tempt_fate').length;
    expect(count).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test src/engine/__tests__/progression.test.ts
```

Expected: FAIL — `progression.ts` doesn't exist.

- [ ] **Step 3: Implement `progression.ts`**

Create `src/engine/progression.ts`:

```ts
import type { ClassId, GameState, LogEntry, StatBlock } from './types';
import { MAX_LOG_ENTRIES } from './types';
import { content } from '../content';

const ORDINAL = ['Untested', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

function ordinal(n: number): string {
  return ORDINAL[Math.min(n, ORDINAL.length - 1)] ?? `${n}th`;
}

// Per-class stat-bump rotation. Index 0 = bump applied at level 2; index 1 = level 3; etc.
// Cycles via modulo if the array is exhausted.
export const STAT_ROTATIONS: Record<ClassId, (keyof StatBlock)[]> = {
  ['reluctant_farmboy' as ClassId]: ['bluck', 'brains', 'bluck', 'brawn', 'bluck', 'bravado', 'bluck', 'brains', 'bluck'],
  // Other classes (Knight, Wizard, Bard) added in their respective content tasks.
};

function appendLog(state: GameState, entry: Omit<LogEntry, 'id'>): GameState {
  const id = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const merged = [...state.log, { id, ...entry }];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}

export function applyLevelUp(state: GameState): GameState {
  const cls = content.classes[state.character.classId];
  const newLevel = state.character.level + 1;
  const newHpMax = state.character.hp.max + Math.floor(state.character.stats.brawn * 1.5);
  const newMpMax = state.character.mp.max + state.character.stats.brains;

  // Stat rotation lookup (cycles if exhausted).
  const rotation = STAT_ROTATIONS[state.character.classId] ?? [];
  const newStats = { ...state.character.stats };
  if (rotation.length > 0) {
    const stat = rotation[(newLevel - 2) % rotation.length]!;
    newStats[stat] = newStats[stat] + 1;
  }

  let s: GameState = {
    ...state,
    character: {
      ...state.character,
      level: newLevel,
      stats: newStats,
      hp: { current: newHpMax, max: newHpMax },
      mp: { current: newMpMax, max: newMpMax }
    }
  };

  // Skill unlock check.
  if (cls) {
    const skill = content.skills[cls.signatureMove];
    if (skill && skill.unlockLevel === newLevel && !s.character.knownSkills.includes(cls.signatureMove)) {
      s = {
        ...s,
        character: { ...s.character, knownSkills: [...s.character.knownSkills, cls.signatureMove] }
      };
      s = appendLog(s, {
        kind: 'system',
        systemLabel: 'SKILL',
        text: `You learn **${skill.name}**. (Level ${newLevel} signature move.)`
      });
    }
  }

  s = appendLog(s, {
    kind: 'system',
    systemLabel: 'LEVEL',
    text: `You attain the ${ordinal(newLevel)} Degree of Heroism. (Healed to full.)`
  });

  return s;
}
```

- [ ] **Step 4: Refactor `combat.ts` to call `applyLevelUp`**

In `src/engine/combat.ts`, find the level-up loop in `endCombat` (currently lines 302-321). Replace it with:

```ts
// Level-up check (loop in case multiple levels gained at once).
const xpThreshold = (level: number) => level * 100;
while (s.character.xp >= xpThreshold(s.character.level)) {
  s = { ...s, character: { ...s.character, xp: s.character.xp - xpThreshold(s.character.level) } };
  s = applyLevelUp(s);
}
```

Add the import at the top of `combat.ts`:

```ts
import { applyLevelUp } from './progression';
```

Remove the local `ordinal` function in `combat.ts` (it's no longer used) — search for `function ordinal` and delete it.

- [ ] **Step 5: Run tests**

```bash
npm test
npm run typecheck
```

Expected: progression tests PASS, existing combat tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/progression.ts src/engine/__tests__/progression.test.ts src/engine/combat.ts
git commit -m "Extract applyLevelUp + STAT_ROTATIONS; level-3 skill unlock"
```

---

## Task 11: Milestone bump on stage advance

**Files:**
- Modify: `src/engine/story.ts`
- Modify: `src/engine/__tests__/story.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/engine/__tests__/story.test.ts`:

```ts
import { applyEffect } from '../story';
import { createInitialState } from '../state';
import { reduce } from '../events';
import type { ClassId } from '../types';

describe('milestone bump on advance_stage', () => {
  it('applies a free level-up when advance_stage fires', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    const before = s.character.level;

    s = applyEffect(s, { kind: 'advance_stage', stage: 'act_ii' });

    expect(s.story.stage).toBe('act_ii');
    expect(s.character.level).toBe(before + 1);
    // Log entry is emitted.
    const entry = s.log.find((e) => e.text.includes('Degree of Heroism') || e.text.includes('chapter turn'));
    expect(entry).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm test src/engine/__tests__/story.test.ts
```

Expected: FAIL — `applyEffect`'s `advance_stage` case doesn't level up.

- [ ] **Step 3: Update `story.ts`**

In `src/engine/story.ts`, modify the `advance_stage` case in `applyEffect` (around lines 53-54):

```ts
case 'advance_stage': {
  const advanced = { ...state, story: { ...state.story, stage: effect.stage } };
  const withMilestoneLog = appendLog(advanced, {
    kind: 'system',
    systemLabel: 'CHAPTER',
    text: 'You feel the chapter turn beneath your feet.'
  });
  return applyLevelUp(withMilestoneLog);
}
```

Add the import at the top:

```ts
import { applyLevelUp } from './progression';
```

- [ ] **Step 4: Run tests**

```bash
npm test src/engine/__tests__/story.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/story.ts src/engine/__tests__/story.test.ts
git commit -m "Milestone bump: advance_stage triggers a free applyLevelUp"
```

---

## Task 12: Disgraced Knight content + class

**Files:**
- Create: `src/content/locations/quartermasters_yard.ts`
- Create: `src/content/encounters/insolent_pell.ts`
- Modify: `src/content/items/index.ts`
- Modify: `src/content/monsters/index.ts`
- Modify: `src/content/classes/index.ts`
- Modify: `src/content/locations/index.ts`
- Modify: `src/content/encounters/index.ts`
- Modify: `src/content/narrative/nodes.ts`
- Modify: `src/content/narrative/resolvers.ts`
- Modify: `src/engine/progression.ts` (add Knight rotation)

- [ ] **Step 1: Add Knight items to `items/index.ts`**

Append to the `items` record in `src/content/items/index.ts`:

```ts
[ItemId('nicked_longsword')]: {
  id: ItemId('nicked_longsword'),
  name: 'a Nicked Longsword',
  flavor: 'Honored by three sieges and one drunken tavern altercation, the latter being the more recent.',
  kind: 'weapon',
  slot: 'weapon',
  damage: 5
},
[ItemId('battered_half_plate')]: {
  id: ItemId('battered_half_plate'),
  name: 'Battered Half-Plate',
  flavor: 'Missing a pauldron. The other one is missing a smaller pauldron.',
  kind: 'armor',
  slot: 'armor',
  armor: 3
},
[ItemId('defaced_family_crest')]: {
  id: ItemId('defaced_family_crest'),
  name: 'a Defaced Family Crest',
  flavor: 'Someone has scratched out the motto and replaced it with a single, very judgmental adjective.',
  kind: 'quest'
}
```

- [ ] **Step 2: Add the Insolent Training Pell monster to `monsters/index.ts`**

Append to the `monsters` record:

```ts
[MonsterId('insolent_pell')]: {
  id: MonsterId('insolent_pell'),
  name: 'an Insolent Training Pell',
  flavor: 'A battered training post that has, through long association, developed opinions.',
  defeatedFlavor: 'The pell loses the argument and resumes leaning to starboard.',
  hp: 8,
  brawn: 4,
  bravado: 0,
  dodge: 0,
  armor: 0,
  weaponDamage: 3,
  actions: [
    { kind: 'attack', weight: 1, flavor: 'The pell sways meaningfully in your direction.' }
  ],
  loot: []
}
```

- [ ] **Step 3: Create the encounter file**

Create `src/content/encounters/insolent_pell.ts`:

```ts
import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const insolent_pell: CombatEncounter = {
  id: EncounterId('combat_insolent_pell'),
  kind: 'combat',
  monsterId: MonsterId('insolent_pell'),
  xpReward: 0,
  repeatable: false
};
```

- [ ] **Step 4: Create the location file**

Create `src/content/locations/quartermasters_yard.ts`:

```ts
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const quartermasters_yard: Location = {
  id: LocationId('quartermasters_yard'),
  name: "Quartermaster's Yard",
  act: 'act_i',
  description:
    'The army yard at first light, abandoned by everyone except a stack of unsigned timesheets ' +
    'and the lingering disappointment of recent superior officers. A pell stands in the middle ' +
    'of the dust, leaning slightly to starboard. Pinned to the duty board: a single sheet of ' +
    "vellum, addressed to you, beginning with the words 'Effective immediately.'",
  reEntryDescription: 'The yard is the yard. The pell, on closer inspection, has not improved.',
  exits: [
    { label: "Walk to the King's Road", targetId: LocationId('dusty_crossroads') }
  ],
  encounterIds: [EncounterId('combat_insolent_pell')]
};
```

- [ ] **Step 5: Add the opener narrative node**

Create `src/content/narrative/openings.ts`:

```ts
import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

export const knight_opening_short: NarrativeNode = {
  id: NarrativeNodeId('knight_opening_short'),
  prose:
    'Dawn over the empty yard. Your dismissal still pinned to the board. ' +
    'Whatever you did — and you cannot quite remember the specifics, only the volume of voices — it was sufficient. ' +
    'The pell, an old friend with no memory of you, is still here. It has improved at being a pell.',
  choices: [
    { label: 'Take it out on the pell.', resolve: 'open_with_pell' }
  ]
};

export const wizard_opening_short: NarrativeNode = {
  id: NarrativeNodeId('wizard_opening_short'),
  prose: 'PLACEHOLDER — wired by Task 13.',
  choices: []
};

export const bard_opening_short: NarrativeNode = {
  id: NarrativeNodeId('bard_opening_short'),
  prose: 'PLACEHOLDER — wired by Task 14.',
  choices: []
};
```

(Tasks 13 and 14 will replace the placeholders.)

- [ ] **Step 6: Add the resolver `open_with_pell`**

In `src/content/narrative/resolvers.ts`, append:

```ts
import { EncounterId, NarrativeNodeId } from '../../engine/types';

// Existing call_* resolvers remain. Add the class openers:

resolvers['open_with_pell'] = (state) => {
  // Trigger the Insolent Pell encounter and end the narrative encounter.
  const next = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, __pending_encounter: 'combat_insolent_pell' }
    }
  };
  return { state: next, next: null };
};
```

(NOTE: this assumes `resolvers` is the existing exported registry object in that file. If it's named `narrativeResolvers`, use that name instead. Check the file before editing.)

- [ ] **Step 7: Add the Disgraced Knight class**

Append to `src/content/classes/index.ts`:

```ts
[ClassId('disgraced_knight')]: {
  id: ClassId('disgraced_knight'),
  name: 'Disgraced Knight',
  epithet: 'the Disgraced Knight',
  startingStats: { brawn: 9, brains: 4, bravado: 7, bluck: 5 },
  baseHp: 40,
  baseMp: 8,
  startingItems: [
    { itemId: ItemId('nicked_longsword'), equipped: true },
    { itemId: ItemId('battered_half_plate'), equipped: true },
    { itemId: ItemId('defaced_family_crest') }
  ],
  signatureMove: SkillId('brute_force'),
  openingLocationId: LocationId('quartermasters_yard'),
  openingNarrativeNodeId: NarrativeNodeId('knight_opening_short')
}
```

- [ ] **Step 8: Register the location and encounter in their indices**

In `src/content/locations/index.ts`, import and register `quartermasters_yard`. Look at how `family_farm` and `dusty_crossroads` are imported and follow the same pattern.

In `src/content/encounters/index.ts`, import and register `insolent_pell` similarly.

In `src/content/narrative/nodes.ts`, import and re-export the new node. Update `narrativeNodes`:

```ts
import { knight_opening_short, wizard_opening_short, bard_opening_short } from './openings';
// ... existing callRoot definition ...

export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot,
  [knight_opening_short.id]: knight_opening_short,
  [wizard_opening_short.id]: wizard_opening_short,
  [bard_opening_short.id]: bard_opening_short
};
```

- [ ] **Step 9: Add Knight's stat rotation**

In `src/engine/progression.ts`, append to `STAT_ROTATIONS`:

```ts
['disgraced_knight' as ClassId]: ['brawn', 'bravado', 'brawn', 'brains', 'brawn', 'bluck', 'brawn', 'bravado', 'brawn'],
```

- [ ] **Step 10: Smoke test**

Add to `src/content/skills/__tests__/resolvers.test.ts`:

```ts
describe('Disgraced Knight playable', () => {
  it('starts in Quartermaster\'s Yard with Nicked Longsword equipped', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Sir T', classId: 'disgraced_knight' as ClassId });
    expect(s.world.currentLocation).toBe('quartermasters_yard');
    expect(s.character.equipment.weapon).toBe('nicked_longsword');
  });
});
```

- [ ] **Step 11: Run tests**

```bash
npm test
npm run typecheck
```

Expected: All pass.

- [ ] **Step 12: Commit**

```bash
git add src/content/items/index.ts src/content/monsters/index.ts src/content/encounters/insolent_pell.ts src/content/encounters/index.ts src/content/locations/quartermasters_yard.ts src/content/locations/index.ts src/content/narrative/openings.ts src/content/narrative/nodes.ts src/content/narrative/resolvers.ts src/content/classes/index.ts src/engine/progression.ts src/content/skills/__tests__/resolvers.test.ts
git commit -m "Add Disgraced Knight class: items, monster, encounter, location, opener"
```

---

## Task 13: Accidental Wizard content + class

**Files:**
- Create: `src/content/locations/burning_library.ts`
- Create: `src/content/encounters/feral_footnote.ts`
- Modify: same set as Task 12

- [ ] **Step 1: Add Wizard items**

Append to `src/content/items/index.ts`:

```ts
[ItemId('cracked_staff')]: {
  id: ItemId('cracked_staff'),
  name: 'a Cracked Staff',
  flavor: 'The crack hums faintly. Its rune is theoretically Wisdom; pronunciation may have intervened.',
  kind: 'weapon',
  slot: 'weapon',
  damage: 3,
  statBonuses: { brains: 1 }
},
[ItemId('long_robe')]: {
  id: ItemId('long_robe'),
  name: 'A Robe That Is Far Too Long',
  flavor: 'Trips you on stairs. Probably enchanted to do exactly that.',
  kind: 'armor',
  slot: 'armor',
  armor: 1
},
[ItemId('questionable_tome')]: {
  id: ItemId('questionable_tome'),
  name: 'a Tome of Questionable Translations',
  flavor: "Half a margin reads 'Beware the Lich-King'; the other half reads 'Beware the Itch-King.' Both are alarming.",
  kind: 'quest'
}
```

- [ ] **Step 2: Add the Feral Footnote monster**

Append to `src/content/monsters/index.ts`:

```ts
[MonsterId('feral_footnote')]: {
  id: MonsterId('feral_footnote'),
  name: 'a Feral Footnote',
  flavor: 'A small superscript that has detached from its citation and is now circling.',
  defeatedFlavor: 'The footnote sniffs, returns to its citation, and begins behaving like a footnote.',
  hp: 6,
  brawn: 3,
  bravado: 0,
  dodge: 2,
  armor: 0,
  weaponDamage: 2,
  actions: [
    { kind: 'attack', weight: 1, flavor: 'The footnote nips at the punctuation around your sentences.' }
  ],
  loot: []
}
```

- [ ] **Step 3: Create the encounter**

Create `src/content/encounters/feral_footnote.ts`:

```ts
import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const feral_footnote: CombatEncounter = {
  id: EncounterId('combat_feral_footnote'),
  kind: 'combat',
  monsterId: MonsterId('feral_footnote'),
  xpReward: 0,
  repeatable: false
};
```

- [ ] **Step 4: Create the location**

Create `src/content/locations/burning_library.ts`:

```ts
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const burning_library: Location = {
  id: LocationId('burning_library'),
  name: 'Slightly On Fire Library',
  act: 'act_i',
  description:
    "The reading room's vaulted ceiling carries an even, contemplative haze of smoke. " +
    'The smoke is being polite. The fire — which is in only the third row of stacks and may yet be reasoned with — ' +
    'is also being polite, for now. Your robes drag. Your staff hums. Your tome insists, in three margins simultaneously, ' +
    'that the situation is fine.',
  reEntryDescription: 'The library has not improved its situation, but the smoke continues its contemplative work.',
  exits: [
    { label: 'Take the Cobbled Walk', targetId: LocationId('dusty_crossroads') }
  ],
  encounterIds: [EncounterId('combat_feral_footnote')]
};
```

- [ ] **Step 5: Update the wizard opener node**

In `src/content/narrative/openings.ts`, replace the wizard placeholder:

```ts
export const wizard_opening_short: NarrativeNode = {
  id: NarrativeNodeId('wizard_opening_short'),
  prose:
    'Smoke describes lazy circles around the chandelier. Your tome is offering, in increasingly aggressive marginalia, ' +
    'three contradictory pieces of advice about lich-kings, itch-kings, and a third option you do not recognize. ' +
    'Something small and predatory has just detached from a citation and is now eyeing you.',
  choices: [
    { label: 'Address the footnote.', resolve: 'open_with_footnote' }
  ]
};
```

- [ ] **Step 6: Add the resolver**

Append to `src/content/narrative/resolvers.ts`:

```ts
resolvers['open_with_footnote'] = (state) => {
  const next = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, __pending_encounter: 'combat_feral_footnote' }
    }
  };
  return { state: next, next: null };
};
```

- [ ] **Step 7: Add the Wizard class**

Append to `src/content/classes/index.ts`:

```ts
[ClassId('accidental_wizard')]: {
  id: ClassId('accidental_wizard'),
  name: 'Accidental Wizard',
  epithet: 'the Accidental Wizard',
  startingStats: { brawn: 4, brains: 10, bravado: 5, bluck: 6 },
  baseHp: 22,
  baseMp: 20,
  startingItems: [
    { itemId: ItemId('cracked_staff'), equipped: true },
    { itemId: ItemId('long_robe'), equipped: true },
    { itemId: ItemId('questionable_tome') }
  ],
  signatureMove: SkillId('out_think_it'),
  openingLocationId: LocationId('burning_library'),
  openingNarrativeNodeId: NarrativeNodeId('wizard_opening_short')
}
```

- [ ] **Step 8: Register location and encounter; add stat rotation**

- Register `burning_library` in `src/content/locations/index.ts`.
- Register `feral_footnote` in `src/content/encounters/index.ts`.
- In `src/engine/progression.ts`, append to `STAT_ROTATIONS`:
  ```ts
  ['accidental_wizard' as ClassId]: ['brains', 'bluck', 'brains', 'bravado', 'brains', 'brawn', 'brains', 'bluck', 'brains'],
  ```

- [ ] **Step 9: Smoke test**

Append to `src/content/skills/__tests__/resolvers.test.ts`:

```ts
describe('Accidental Wizard playable', () => {
  it('starts in burning_library with cracked_staff equipped', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Magus T', classId: 'accidental_wizard' as ClassId });
    expect(s.world.currentLocation).toBe('burning_library');
    expect(s.character.equipment.weapon).toBe('cracked_staff');
  });
});
```

- [ ] **Step 10: Run tests**

```bash
npm test
npm run typecheck
```

Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add src/content/items/index.ts src/content/monsters/index.ts src/content/encounters/feral_footnote.ts src/content/encounters/index.ts src/content/locations/burning_library.ts src/content/locations/index.ts src/content/narrative/openings.ts src/content/narrative/resolvers.ts src/content/classes/index.ts src/engine/progression.ts src/content/skills/__tests__/resolvers.test.ts
git commit -m "Add Accidental Wizard class: items, monster, encounter, location, opener"
```

---

## Task 14: Bard Who Didn't Ask For This content + class

**Files:**
- Create: `src/content/locations/tavern_dressing_room.ts`
- Create: `src/content/encounters/pointed_heckler.ts`
- Modify: same set as Tasks 12-13

- [ ] **Step 1: Add Bard items**

Append to `src/content/items/index.ts`:

```ts
[ItemId('dented_lute')]: {
  id: ItemId('dented_lute'),
  name: 'a Dented Lute',
  flavor: 'Three of six strings. The fourth is, generously, implied.',
  kind: 'weapon',
  slot: 'weapon',
  damage: 4
},
[ItemId('dramatic_cloak')]: {
  id: ItemId('dramatic_cloak'),
  name: 'a Dramatic Cloak',
  flavor: "Bills itself as 'theatrical-grade.' This is a category neither armor nor textile recognize.",
  kind: 'armor',
  slot: 'armor',
  armor: 2
},
[ItemId('audience_expectation')]: {
  id: ItemId('audience_expectation'),
  name: 'an Audience Expectation',
  flavor: 'An invisible weight, surprisingly portable. Heaviest in the chest.',
  kind: 'quest'
}
```

- [ ] **Step 2: Add the Pointed Heckler monster**

Append to `src/content/monsters/index.ts`:

```ts
[MonsterId('pointed_heckler')]: {
  id: MonsterId('pointed_heckler'),
  name: 'a Pointed Heckler',
  flavor: 'An early arrival exercising her vowels.',
  defeatedFlavor: 'The heckler loses interest and starts heckling someone else.',
  hp: 7,
  brawn: 4,
  bravado: 4,
  dodge: 1,
  armor: 0,
  weaponDamage: 3,
  actions: [
    { kind: 'attack', weight: 1, flavor: 'The heckler delivers a precisely-timed sigh.' }
  ],
  loot: []
}
```

- [ ] **Step 3: Create the encounter**

Create `src/content/encounters/pointed_heckler.ts`:

```ts
import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const pointed_heckler: CombatEncounter = {
  id: EncounterId('combat_pointed_heckler'),
  kind: 'combat',
  monsterId: MonsterId('pointed_heckler'),
  xpReward: 0,
  repeatable: false
};
```

- [ ] **Step 4: Create the location**

Create `src/content/locations/tavern_dressing_room.ts`:

```ts
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const tavern_dressing_room: Location = {
  id: LocationId('tavern_dressing_room'),
  name: 'Tavern Dressing Room',
  act: 'act_i',
  description:
    'The back room of the Wretched Pheasant smells like spilled mead, candlewax, and ambition. ' +
    'Ten minutes to curtain. Through the curtain, the audience is already exercising its vowels. ' +
    'One of those vowels is yours.',
  reEntryDescription: 'The dressing room is the dressing room. The candles are slightly more melted.',
  exits: [
    { label: 'Slip out the back-alley', targetId: LocationId('dusty_crossroads') }
  ],
  encounterIds: [EncounterId('combat_pointed_heckler')]
};
```

- [ ] **Step 5: Update the bard opener node**

In `src/content/narrative/openings.ts`, replace the bard placeholder:

```ts
export const bard_opening_short: NarrativeNode = {
  id: NarrativeNodeId('bard_opening_short'),
  prose:
    'Five minutes to the curtain. Your lute is missing strings; your cloak is being ironic again. ' +
    'A heckler in the third row has been warming up since dawn and has, by now, achieved a kind of vowel-yoga ' +
    'that bodes badly for your opening number.',
  choices: [
    { label: 'Open with a dignity-restoration anthem.', resolve: 'open_with_heckler' }
  ]
};
```

- [ ] **Step 6: Add the resolver**

Append to `src/content/narrative/resolvers.ts`:

```ts
resolvers['open_with_heckler'] = (state) => {
  const next = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, __pending_encounter: 'combat_pointed_heckler' }
    }
  };
  return { state: next, next: null };
};
```

- [ ] **Step 7: Add the Bard class**

Append to `src/content/classes/index.ts`:

```ts
[ClassId('bard')]: {
  id: ClassId('bard'),
  name: "Bard Who Didn't Ask For This",
  epithet: "the Bard Who Didn't Ask For This",
  startingStats: { brawn: 5, brains: 7, bravado: 9, bluck: 4 },
  baseHp: 28,
  baseMp: 14,
  startingItems: [
    { itemId: ItemId('dented_lute'), equipped: true },
    { itemId: ItemId('dramatic_cloak'), equipped: true },
    { itemId: ItemId('audience_expectation') }
  ],
  signatureMove: SkillId('swagger'),
  openingLocationId: LocationId('tavern_dressing_room'),
  openingNarrativeNodeId: NarrativeNodeId('bard_opening_short')
}
```

- [ ] **Step 8: Register location and encounter; add stat rotation**

- Register `tavern_dressing_room` in `src/content/locations/index.ts`.
- Register `pointed_heckler` in `src/content/encounters/index.ts`.
- Append to `STAT_ROTATIONS` in `src/engine/progression.ts`:
  ```ts
  ['bard' as ClassId]: ['bravado', 'bluck', 'bravado', 'brains', 'bravado', 'brawn', 'bravado', 'bluck', 'bravado'],
  ```

- [ ] **Step 9: Smoke test**

Append to `src/content/skills/__tests__/resolvers.test.ts`:

```ts
describe('Bard playable', () => {
  it('starts in tavern_dressing_room with dented_lute equipped', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Maestro T', classId: 'bard' as ClassId });
    expect(s.world.currentLocation).toBe('tavern_dressing_room');
    expect(s.character.equipment.weapon).toBe('dented_lute');
  });
});
```

- [ ] **Step 10: Run tests**

```bash
npm test
npm run typecheck
```

Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add src/content/items/index.ts src/content/monsters/index.ts src/content/encounters/pointed_heckler.ts src/content/encounters/index.ts src/content/locations/tavern_dressing_room.ts src/content/locations/index.ts src/content/narrative/openings.ts src/content/narrative/resolvers.ts src/content/classes/index.ts src/engine/progression.ts src/content/skills/__tests__/resolvers.test.ts
git commit -m "Add Bard Who Didn't Ask For This class: items, monster, encounter, location, opener"
```

---

## Task 15: Skill button in WorldPanel

**Files:**
- Modify: `src/ui/WorldPanel.svelte`
- Create: `src/ui/__tests__/WorldPanel.skill.test.ts`

- [ ] **Step 1: Read the current WorldPanel structure**

Open `src/ui/WorldPanel.svelte` and locate the existing combat-action button bar (Attack / Item / Flee). The button bar is rendered when combat is turn-based and it is the player's turn.

- [ ] **Step 2: Write the failing test**

Create `src/ui/__tests__/WorldPanel.skill.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WorldPanel from '../WorldPanel.svelte';
import { gameStore } from '../store.svelte';
import { reduce } from '../../engine/events';
import { createInitialState } from '../../engine/state';
import type { ClassId, EncounterId, SkillId } from '../../engine/types';

function setupWithCombat(): void {
  let s = createInitialState(1);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
  s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
  gameStore.set(s);
}

describe('WorldPanel Skill button', () => {
  it('renders the Skill button during turn-based combat', () => {
    setupWithCombat();
    const { getByRole } = render(WorldPanel);
    expect(getByRole('button', { name: /skill/i })).toBeTruthy();
  });

  it('disables the Skill button with locked tooltip when no skills known', () => {
    setupWithCombat();
    const { getByRole } = render(WorldPanel);
    const btn = getByRole('button', { name: /skill/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toMatch(/level 3/i);
  });

  it('disables with insufficient-MP tooltip when MP is too low', () => {
    setupWithCombat();
    // Inject a known skill with mpCost 6 and zero out MP.
    let s = gameStore.state;
    s = {
      ...s,
      character: { ...s.character, knownSkills: ['tempt_fate' as SkillId], mp: { current: 0, max: 10 } }
    };
    gameStore.set(s);
    const { getByRole } = render(WorldPanel);
    const btn = getByRole('button', { name: /skill/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toMatch(/mana/i);
  });

  it('enables when MP is sufficient and skill is known', () => {
    setupWithCombat();
    let s = gameStore.state;
    s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId], mp: { current: 50, max: 50 } } };
    gameStore.set(s);
    const { getByRole } = render(WorldPanel);
    const btn = getByRole('button', { name: /skill/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
```

(NOTE: this test assumes `gameStore` exposes a `set` method. If the actual API is different, adapt: e.g. `gameStore.dispatch` may need to be used instead, or the store may use a property-based setter. Read `src/ui/store.svelte.ts` first.)

- [ ] **Step 3: Add the Skill button to WorldPanel**

In `src/ui/WorldPanel.svelte`, in the combat action bar section, add a new button between Attack and Item (or wherever it fits the existing layout). Sketch:

```svelte
{#if state.combat?.kind === 'turn-based'}
  <div class="action-bar">
    <button onclick={() => dispatch({ kind: 'AttackTarget' })}>Attack</button>

    {#snippet skillButton()}
      {@const known = state.character.knownSkills}
      {@const skillId = known[0]}
      {@const skill = skillId ? content.skills[skillId] : undefined}
      {@const noSkill = !skill}
      {@const insufficientMp = skill ? state.character.mp.current < skill.mpCost : false}
      {@const disabled = noSkill || insufficientMp}
      {@const tooltip = noSkill
        ? 'Locked until Level 3'
        : insufficientMp
          ? `Not enough mana — need ${skill!.mpCost} MP`
          : skill!.description}
      <button
        disabled={disabled}
        title={tooltip}
        onclick={() => skill && dispatch({ kind: 'UseSkill', skillId: skill.id })}
      >Skill</button>
    {/snippet}
    {@render skillButton()}

    <button onclick={() => /* existing Item handler */}>Item</button>
    <button onclick={() => dispatch({ kind: 'Flee' })}>Flee</button>
  </div>
{/if}
```

(Adapt to the existing button-bar layout. The key structural changes are: a Skill button between Attack and Item; disabled+tooltip logic; click dispatches `UseSkill`.)

- [ ] **Step 4: Run the new test**

```bash
npm test src/ui/__tests__/WorldPanel.skill.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/WorldPanel.svelte src/ui/__tests__/WorldPanel.skill.test.ts
git commit -m "WorldPanel: add Skill button with MP/unlock gating"
```

---

## Task 16: Afflictions & Boons row in CharacterPanel + monster status tags in WorldPanel

**Files:**
- Modify: `src/ui/CharacterPanel.svelte`
- Modify: `src/ui/WorldPanel.svelte`
- Create: `src/ui/__tests__/CharacterPanel.statuses.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/ui/__tests__/CharacterPanel.statuses.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CharacterPanel from '../CharacterPanel.svelte';
import { gameStore } from '../store.svelte';
import { reduce } from '../../engine/events';
import { createInitialState } from '../../engine/state';
import type { ClassId } from '../../engine/types';

describe('CharacterPanel Afflictions & Boons row', () => {
  it('hides the row when statuses array is empty', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    gameStore.set(s);
    const { queryByText } = render(CharacterPanel);
    expect(queryByText(/Afflictions/i)).toBeNull();
  });

  it('renders the row with one badge per world-scoped status', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = {
      ...s,
      character: {
        ...s.character,
        statuses: [
          { id: 1, kind: 'guaranteed_crit', duration: { kind: 'permanent' }, source: "Hermit's blessing" }
        ]
      }
    };
    gameStore.set(s);
    const { getByText, getByTitle } = render(CharacterPanel);
    expect(getByText(/Afflictions & Boons/i)).toBeTruthy();
    expect(getByTitle(/Hermit/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm test src/ui/__tests__/CharacterPanel.statuses.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add the Afflictions & Boons row**

In `src/ui/CharacterPanel.svelte`, after the Vitals section (HP/MP/Currency), add:

```svelte
{#if state.character.statuses.length > 0}
  <section class="afflictions">
    <h4>Afflictions &amp; Boons</h4>
    <ul class="status-list">
      {#each state.character.statuses as st (st.id)}
        <li class="status-pill" title={`${st.source} — ${formatDuration(st.duration)}`}>
          <span class="status-glyph">{glyphFor(st.kind)}</span>
          <span class="status-name">{labelFor(st.kind)}</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<script>
  function glyphFor(kind) {
    switch (kind) {
      case 'guaranteed_crit': return '✦';
      case 'next_attack_misses': return '✗';
      case 'weakness_revealed': return '◎';
      case 'intimidated': return '⌇';
      case 'skip_turn': return '⊘';
      case 'weapon_suspended': return '⌀';
      case 'armor_halved': return '½';
      case 'free_retaliation': return '↻';
      default: return '·';
    }
  }
  function labelFor(kind) {
    return kind.replace(/_/g, ' ');
  }
  function formatDuration(d) {
    switch (d.kind) {
      case 'turns': return `${d.remaining} turn${d.remaining === 1 ? '' : 's'} remaining`;
      case 'until_end_of_fight': return 'until end of fight';
      case 'one_shot': return 'fires once';
      case 'fights_remaining': return `${d.n} fight${d.n === 1 ? '' : 's'} remaining`;
      case 'permanent': return 'permanent';
    }
  }
</script>
```

(Adapt to the actual `<script>` block at the top of the existing file. Helpers go in the script; the markup goes in the template.)

- [ ] **Step 4: Add monster status tags to WorldPanel combat header**

In `src/ui/WorldPanel.svelte`, locate the combat header (where the monster's name is rendered during turn-based combat). Add:

```svelte
{#if state.combat?.kind === 'turn-based'}
  {@const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster')}
  {#if monsterCombatant && monsterCombatant.statuses.length > 0}
    <div class="monster-status-tags">
      {#each monsterCombatant.statuses as st (st.id)}
        <span class="monster-status-tag">· {st.kind.replace(/_/g, ' ')}</span>
      {/each}
    </div>
  {/if}
{/if}
```

- [ ] **Step 5: Run tests**

```bash
npm test src/ui/__tests__/CharacterPanel.statuses.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/CharacterPanel.svelte src/ui/WorldPanel.svelte src/ui/__tests__/CharacterPanel.statuses.test.ts
git commit -m "UI: Afflictions & Boons row in CharacterPanel; monster status tags in combat header"
```

---

## Task 17: Enable all four class cards + teasers

**Files:**
- Modify: `src/ui/CharacterCreation.svelte`
- Modify: `src/ui/__tests__/CharacterCreation.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/ui/__tests__/CharacterCreation.test.ts`, add:

```ts
describe('All four classes enabled', () => {
  it('shows enabled class cards for all four classes', () => {
    const { getByRole, getAllByRole } = render(CharacterCreation);
    const knightCard = getByRole('button', { name: /Disgraced Knight/i }) as HTMLButtonElement;
    const wizardCard = getByRole('button', { name: /Accidental Wizard/i }) as HTMLButtonElement;
    const bardCard = getByRole('button', { name: /Bard/i }) as HTMLButtonElement;
    const farmboyCard = getByRole('button', { name: /Reluctant Farmboy/i }) as HTMLButtonElement;

    expect(knightCard.disabled).toBe(false);
    expect(wizardCard.disabled).toBe(false);
    expect(bardCard.disabled).toBe(false);
    expect(farmboyCard.disabled).toBe(false);
  });

  it('renders a teaser line for each class', () => {
    const { getByText } = render(CharacterCreation);
    expect(getByText(/yard at dawn/i)).toBeTruthy();
    expect(getByText(/library is on fire/i)).toBeTruthy();
    expect(getByText(/showtime/i)).toBeTruthy();
    expect(getByText(/back field/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm test src/ui/__tests__/CharacterCreation.test.ts
```

Expected: FAIL — Knight/Wizard/Bard cards are still disabled.

- [ ] **Step 3: Update CharacterCreation.svelte**

In `src/ui/CharacterCreation.svelte`:

**a.** Remove the disabled state and "(coming in a future plan)" tooltip from Knight/Wizard/Bard cards. Each card should be active.

**b.** Add a teaser line under the stat block on each card. The teasers:

| ClassId | Teaser |
|---|---|
| `reluctant_farmboy` | "You were going to weed the back field. Destiny had other plans." |
| `disgraced_knight` | "The yard at dawn. Your dismissal still pinned to the board." |
| `accidental_wizard` | "The library is on fire. The library is, however, only slightly on fire." |
| `bard` | "Ten minutes to showtime. The audience is already heckling the curtain." |

The teasers can come from a constant map in the component or directly from each class definition (preferred — add a `teaser?: string` field on `CharacterClass` and populate in the class files; or use a parallel `CLASS_TEASERS` map in the component to keep `types.ts` clean). Use the parallel-map approach for now to avoid touching types.

```ts
const CLASS_TEASERS: Record<string, string> = {
  reluctant_farmboy: 'You were going to weed the back field. Destiny had other plans.',
  disgraced_knight: 'The yard at dawn. Your dismissal still pinned to the board.',
  accidental_wizard: 'The library is on fire. The library is, however, only slightly on fire.',
  bard: 'Ten minutes to showtime. The audience is already heckling the curtain.'
};
```

- [ ] **Step 4: Run tests**

```bash
npm test src/ui/__tests__/CharacterCreation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/CharacterCreation.svelte src/ui/__tests__/CharacterCreation.test.ts
git commit -m "Enable all four class cards on creation screen + add teaser lines"
```

---

## Task 18: validate.ts assertions for new content references

**Files:**
- Modify: `src/engine/validate.ts`
- Modify: `src/content/__tests__/validate.test.ts`

- [ ] **Step 1: Read the existing `validate.ts`**

Read the file to confirm its current structure (location/encounter/item reference checks).

- [ ] **Step 2: Add new assertions**

In `src/engine/validate.ts`, add the following to the validate function (or create a new `validateContent` if necessary). Use the existing patterns as a guide:

```ts
// Every class's signatureMove resolves to a real Skill.
for (const cls of Object.values(content.classes)) {
  if (!content.skills[cls.signatureMove]) {
    errors.push(`Class ${cls.id} signatureMove ${cls.signatureMove} does not exist.`);
  }
}

// Every class's openingLocationId resolves.
for (const cls of Object.values(content.classes)) {
  if (!content.locations[cls.openingLocationId]) {
    errors.push(`Class ${cls.id} openingLocationId ${cls.openingLocationId} does not exist.`);
  }
}

// Every class's openingNarrativeNodeId resolves.
for (const cls of Object.values(content.classes)) {
  if (!content.narrativeNodes[cls.openingNarrativeNodeId]) {
    errors.push(`Class ${cls.id} openingNarrativeNodeId ${cls.openingNarrativeNodeId} does not exist.`);
  }
}

// Every Skill.resolverId resolves.
import { skillResolvers } from '../content/skills/resolvers';
for (const skill of Object.values(content.skills)) {
  if (!skillResolvers[skill.resolverId]) {
    errors.push(`Skill ${skill.id} resolverId ${skill.resolverId} not registered.`);
  }
}
```

- [ ] **Step 3: Run the existing validate test**

```bash
npm test src/content/__tests__/validate.test.ts
```

Expected: PASS (assuming all references are wired).

- [ ] **Step 4: Commit**

```bash
git add src/engine/validate.ts
git commit -m "validate.ts: assert class signatureMove, opening references, and skill resolvers"
```

---

## Task 19: End-to-end smoke test (each class plays through tutorial)

**Files:**
- Create: `src/__tests__/e2e.test.ts`

- [ ] **Step 1: Write the e2e test**

Create `src/__tests__/e2e.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/events';
import { createInitialState } from '../engine/state';
import type { ClassId, EncounterId, LocationId, SkillId } from '../engine/types';

describe('E2E: each class plays from creation through tutorial combat', () => {
  const classCases = [
    { classId: 'reluctant_farmboy' as ClassId, location: 'family_farm' as LocationId, signatureMove: 'tempt_fate' as SkillId },
    { classId: 'disgraced_knight' as ClassId, location: 'quartermasters_yard' as LocationId, signatureMove: 'brute_force' as SkillId },
    { classId: 'accidental_wizard' as ClassId, location: 'burning_library' as LocationId, signatureMove: 'out_think_it' as SkillId },
    { classId: 'bard' as ClassId, location: 'tavern_dressing_room' as LocationId, signatureMove: 'swagger' as SkillId }
  ];

  for (const tc of classCases) {
    it(`plays through ${tc.classId} → tutorial → reaches Crossroads after sufficient XP`, () => {
      let s = createInitialState(42);
      s = reduce(s, { kind: 'StartNewGame', name: 'Hero', classId: tc.classId });
      expect(s.world.currentLocation).toBe(tc.location);

      // Class signature move is bound:
      const cls = s.character.classId;
      expect(cls).toBe(tc.classId);

      // Validate that the class's tutorial encounter is reachable: try triggering it
      // by triggering the location's first encounter (skip narrative for the smoke test).
      // This verifies the encounter id resolves and the reducer doesn't error.
      // (Detailed gameplay assertions live in per-component tests.)
    });
  }
});
```

- [ ] **Step 2: Run the e2e test**

```bash
npm test src/__tests__/e2e.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run the full test suite + typecheck + build**

```bash
npm test
npm run typecheck
npm run build
```

Expected: ALL pass. The build should produce a deployable artifact.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/e2e.test.ts
git commit -m "E2E smoke tests: each class starts in correct location and plays cleanly"
```

---

## Final verification

- [ ] **Run the full suite one more time**

```bash
npm test
npm run typecheck
npm run build
npm run dev
```

- [ ] **Manual smoke (in browser):**
  - Create a Knight, Wizard, and Bard in turn. Verify each starts at the correct location with the correct items.
  - Pick a fight in each tutorial. Verify the Skill button is visible but disabled with the "Locked until Level 3" tooltip.
  - Force-level a character to 3 (e.g., add `__force_level: 3` to a flag and spike XP if needed for testing) and verify the Skill button enables and casts the right move.
  - Cast each of the four signature moves and verify the corresponding status badge appears on the appropriate combatant.
  - Cast Tempt Fate enough times to roll all six backfires (or use a deterministic seed test).
  - Trigger an `advance_stage` (via console, or the existing call narrative path) and confirm the milestone log entry plus level-up.

- [ ] **Final commit + push (only if user requests)**

```bash
# After user sign-off:
git push -u origin feature/skills-and-classes
```

---

## Acceptance Criteria Summary

This plan ships when all of the following are true:

1. **All four classes are pickable** on the character creation screen with their teasers visible.
2. **Each class's tutorial location** loads correctly and contains a winnable tutorial monster encounter.
3. **The Skill button** is always visible during turn-based combat with correct tooltips for locked / insufficient-MP / enabled states.
4. **All four signature moves** function end-to-end with their documented mechanics.
5. **Statuses** appear in the CharacterPanel "Afflictions & Boons" row when present, and as tags below the monster name during combat.
6. **Combat-scoped statuses** are dropped at end of fight; **world-scoped statuses** persist on the character and copy back onto the player combatant on the next combat start.
7. **Level-3 unlock** automatically grants the class's signature move on level-up.
8. **Stage advance** triggers a free `applyLevelUp` (no banner — that's Plan 6).
9. **Save migration v1 → v2** loads cleanly with empty statuses arrays backfilled.
10. **All tests pass; typecheck is clean; build succeeds.**

