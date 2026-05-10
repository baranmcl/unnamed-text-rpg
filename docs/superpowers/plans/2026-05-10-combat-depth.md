# Combat Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the four tutorial monsters (Insolent Pell, Feral Footnote, Pointed Heckler, Officious Tax Rat) a signature `apply_status` action that debuffs the player for a turn or two, with a narrated expiration beat — teaching the status-effect system through exposure without requiring a new player counter mechanism.

**Architecture:** A new `MonsterAction` variant `apply_status` is added to the type system. A new dispatch case in `monsterTurn` handles the action: applies the status via the existing `applyStatus()` helper, emits two log entries (action flavor + applied-status flavor), and does no direct damage on that turn. Expiration narration emits when a player status ticks to zero via a wrapper around `tickPlayerCombatant` that diffs pre-tick and post-tick statuses. The four tutorial monsters get their signature `apply_status` actions in `src/content/monsters/index.ts`.

**Tech Stack:** TypeScript (strict), Vitest, jsdom.

## Spec Reference

[docs/superpowers/specs/2026-05-10-combat-depth-design.md](../specs/2026-05-10-combat-depth-design.md)

## File Structure

**Modified:**
- `src/engine/types.ts` — extend `MonsterAction` with the `apply_status` variant
- `src/engine/combat.ts` — add `apply_status` dispatch case in `monsterTurn`; wrap `tickPlayerCombatant` to emit expiration log entries
- `src/content/monsters/index.ts` — update Pell, Footnote, Heckler, Officious Tax Rat action lists
- `src/engine/__tests__/combat.test.ts` — extend with `apply_status` dispatch tests and expiration-narration tests
- `src/content/__tests__/validate.test.ts` — extend with `apply_status` action validation

**Created:**
- `src/__tests__/combatStatus.e2e.test.ts` — full-flow integration tests, one per tutorial monster

---

## Task 1: `MonsterAction` type extension

**Files:**
- Modify: `src/engine/types.ts`

This task introduces the new `apply_status` variant of `MonsterAction`. No runtime changes yet — just the type. After this task, content code that references the new variant will compile, but no monster uses it.

- [ ] **Step 1: Extend the `MonsterAction` type**

In [src/engine/types.ts](src/engine/types.ts), find the existing `MonsterAction` definition (around line 126):

```ts
export type MonsterAction =
  | { kind: 'attack'; weight: number; flavor: string }
  | { kind: 'special'; weight: number; flavor: string; damageBonus: number }
  | { kind: 'flee_if_low_hp'; weight: number; flavor: string };
```

Replace with:

```ts
export type MonsterAction =
  | { kind: 'attack'; weight: number; flavor: string }
  | { kind: 'special'; weight: number; flavor: string; damageBonus: number }
  | {
      kind: 'apply_status';
      weight: number;
      flavor: string;
      status: StatusKind;
      duration: StatusDuration;
      appliedFlavor: string;
      expirationFlavor: string;
    }
  | { kind: 'flee_if_low_hp'; weight: number; flavor: string };
```

`StatusKind` and `StatusDuration` are already exported from this file (lines ~78-93), so no new imports needed.

- [ ] **Step 2: Run typecheck — confirm clean**

Run: `npx tsc --noEmit`
Expected: PASS — adding a new union variant does not break any existing exhaustive switches (TypeScript will only flag exhaustiveness if a switch was declared exhaustive; the existing switches in `monsterTurn` will simply have a new case unhandled, but that's only a compile-time issue if they're explicitly typed `: never`).

If typecheck fails because an existing switch in `combat.ts` becomes non-exhaustive: that's expected behaviour and will be fixed in Task 2. Run `npx tsc --noEmit` and confirm any error is in `combat.ts` and only complains about the new `apply_status` case not being handled.

- [ ] **Step 3: Run full test suite — confirm no regression**

Run: `npx vitest run`
Expected: PASS — all 285 tests still pass. No monster uses the new variant yet, so behaviour is unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/engine/types.ts
git commit -m "feat(combat): add apply_status variant to MonsterAction"
```

---

## Task 2: `apply_status` dispatch + expiration narration in `monsterTurn`

**Files:**
- Modify: `src/engine/combat.ts`
- Modify: `src/engine/__tests__/combat.test.ts`

This task wires the new action variant into `monsterTurn`'s dispatch path and adds expiration narration. After this task, a monster with an `apply_status` action will correctly debuff the player and the status will fire its expiration log when it ticks out.

- [ ] **Step 1: Write the failing dispatch test**

In [src/engine/__tests__/combat.test.ts](src/engine/__tests__/combat.test.ts), append a new describe block at the bottom:

```ts
describe('monsterTurn — apply_status action', () => {
  function setupCombatWithApplyStatusMonster(): GameState {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    s = skipFarmhandOpener(s);
    // Inject a test monster with a single apply_status action (weight 1.0 = always fires).
    // Use a real monster id (insolent_pell), but the test only relies on the action
    // we inject; the monster definition will be updated in Task 3.
    // Directly set up combat with the test monster.
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: EncounterId('first_tax_rat') });
    return s;
  }

  it('applies the status to the player combatant when the action fires', () => {
    // We construct a state with combat active, then call monsterTurn with a
    // controlled monster action. The simplest harness: build a state where
    // the only action available is apply_status weight 1.0, so it must fire.
    let s = setupCombatWithApplyStatusMonster();
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');

    // Substitute a monster with a single apply_status action for this test.
    const testMonsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id as MonsterId;
    const originalMonster = content.monsters[testMonsterId];
    (content.monsters as Record<string, Monster>)[testMonsterId] = {
      ...originalMonster,
      actions: [{
        kind: 'apply_status',
        weight: 1.0,
        flavor: 'The thing does a thing.',
        status: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: 'Your weapon is held.',
        expirationFlavor: 'You free your weapon.'
      }]
    };

    try {
      const result = monsterTurn(s);
      if (result.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = result.combat.combatants.find((c) => c.kind === 'player')!;
      expect(hasStatus(player, 'weapon_suspended')).toBe(true);
    } finally {
      // Restore the monster so other tests aren't polluted.
      (content.monsters as Record<string, Monster>)[testMonsterId] = originalMonster;
    }
  });
});
```

The imports at the top of the file may need to be extended. Check the existing imports; add as needed:

```ts
import { ClassId, EncounterId, type GameState, type MonsterId, type Monster } from '../types';
import { hasStatus } from '../status';
import { skipFarmhandOpener } from './testHelpers';
```

- [ ] **Step 2: Run the test — confirm it fails**

Run: `npx vitest run src/engine/__tests__/combat.test.ts -t "apply_status"`
Expected: FAIL — the action's dispatch case doesn't exist yet, so the monster either acts as no-op or hits the default attack path. Either way, `hasStatus(player, 'weapon_suspended')` is false.

- [ ] **Step 3: Add the `apply_status` dispatch case in `monsterTurn`**

In [src/engine/combat.ts](src/engine/combat.ts), find the `monsterTurn` function. After the existing dispatch for `action.kind === 'flee_if_low_hp'` and `action.kind === 'special'`, add a new case for `apply_status`. The pattern to match: each existing case looks roughly like `if (action.kind === '...') { ... return s; }`.

Find the existing branches in `monsterTurn` (around line 278 onward, after `tickedMonster` is bound):

```ts
  if (action.kind === 'flee_if_low_hp' && tickedMonster.hp <= Math.floor(monster.hp / 4)) {
    s = pushLog(s, { kind: 'combat', text: action.flavor });
    // ... existing flee handling
  }
```

Add a new branch BEFORE the default attack branch (the spec specifies no damage on apply_status turns):

```ts
  if (action.kind === 'apply_status') {
    s = pushLog(s, { kind: 'combat', text: action.flavor });
    s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
      kind: action.status,
      duration: action.duration,
      source: monster.name
    });
    s = pushLog(s, { kind: 'combat', text: action.appliedFlavor });
    return s;
  }
```

You'll need to import `applyStatus` from `./status` if not already imported. Find the existing imports at the top of `combat.ts`:

```ts
import { hasStatus, ... } from './status';
```

Extend to include `applyStatus`:

```ts
import { hasStatus, applyStatus, ... } from './status';
```

(Don't disturb other imports — preserve their order; this is a one-symbol addition.)

- [ ] **Step 4: Run the dispatch test — confirm it passes**

Run: `npx vitest run src/engine/__tests__/combat.test.ts -t "apply_status"`
Expected: PASS — the single test passes. `hasStatus(player, 'weapon_suspended')` is now true after `monsterTurn`.

- [ ] **Step 5: Write the failing "no damage on apply turn" test**

Append to the same `describe('monsterTurn — apply_status action')` block:

```ts
  it('does NOT deal damage to the player on the apply_status turn', () => {
    let s = setupCombatWithApplyStatusMonster();
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');

    const testMonsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id as MonsterId;
    const originalMonster = content.monsters[testMonsterId];
    (content.monsters as Record<string, Monster>)[testMonsterId] = {
      ...originalMonster,
      actions: [{
        kind: 'apply_status',
        weight: 1.0,
        flavor: 'X',
        status: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: 'Y',
        expirationFlavor: 'Z'
      }]
    };

    const hpBefore = s.combat.combatants.find((c) => c.kind === 'player')!.hp;

    try {
      const result = monsterTurn(s);
      if (result.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const playerAfter = result.combat.combatants.find((c) => c.kind === 'player')!;
      expect(playerAfter.hp).toBe(hpBefore);
    } finally {
      (content.monsters as Record<string, Monster>)[testMonsterId] = originalMonster;
    }
  });
```

- [ ] **Step 6: Run the test — confirm it passes**

Run: `npx vitest run src/engine/__tests__/combat.test.ts -t "apply_status"`
Expected: PASS — both `apply_status` tests pass. The new dispatch case returns immediately after applying the status, never reaching the damage path.

- [ ] **Step 7: Write the failing expiration-narration test**

Append:

```ts
  it('emits the expirationFlavor log entry when the status ticks to zero', () => {
    let s = setupCombatWithApplyStatusMonster();
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');

    const testMonsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id as MonsterId;
    const originalMonster = content.monsters[testMonsterId];
    (content.monsters as Record<string, Monster>)[testMonsterId] = {
      ...originalMonster,
      actions: [{
        kind: 'apply_status',
        weight: 1.0,
        flavor: 'X',
        status: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: 'Y',
        expirationFlavor: 'YOU FREE YOUR WEAPON'
      }]
    };

    try {
      // Turn 1: monster applies the status.
      let result = monsterTurn(s);
      if (result.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = result.combat.combatants.find((c) => c.kind === 'player')!;
      expect(hasStatus(player, 'weapon_suspended')).toBe(true);

      // Turn 2: player acts (tickPlayerCombatant runs, status duration goes from 1 → 0 → removed).
      // The expiration narration should fire as the status is removed.
      result = playerAttack(result);
      if (result.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const expirationLog = result.log.find((e) => e.text === 'YOU FREE YOUR WEAPON');
      expect(expirationLog).toBeDefined();
    } finally {
      (content.monsters as Record<string, Monster>)[testMonsterId] = originalMonster;
    }
  });
```

- [ ] **Step 8: Run the test — confirm it fails**

Run: `npx vitest run src/engine/__tests__/combat.test.ts -t "apply_status"`
Expected: FAIL on the third (expiration narration) test — `YOU FREE YOUR WEAPON` is not in the log because expiration is silent.

- [ ] **Step 9: Implement expiration narration via a wrapper**

In [src/engine/combat.ts](src/engine/combat.ts), find the existing `tickPlayerCombatant` function (around line 87):

```ts
function tickPlayerCombatant(state: GameState): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const combat = state.combat;
  const combatants = combat.combatants.map((c) => (c.kind === 'player' ? tickStatuses(c) : c));
  return { ...state, combat: { ...combat, combatants } };
}
```

Replace with a version that diffs pre-tick and post-tick statuses, looks up the source monster's `apply_status` action for each expired status, and emits the `expirationFlavor` log entry:

```ts
function tickPlayerCombatant(state: GameState): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const combat = state.combat;
  const playerBefore = combat.combatants.find((c) => c.kind === 'player');
  if (!playerBefore) return state;

  const combatants = combat.combatants.map((c) => (c.kind === 'player' ? tickStatuses(c) : c));
  const playerAfter = combatants.find((c) => c.kind === 'player')!;

  // Diff: any status present before but missing after has expired.
  const expired = playerBefore.statuses.filter(
    (s) => !playerAfter.statuses.some((s2) => s2.id === s.id)
  );

  let s: GameState = { ...state, combat: { ...combat, combatants } };
  for (const status of expired) {
    // Look up the source monster's apply_status action with matching kind to fetch expirationFlavor.
    const sourceMonster = Object.values(content.monsters).find((m) => m.name === status.source);
    if (!sourceMonster) continue;
    const action = sourceMonster.actions.find(
      (a): a is Extract<MonsterAction, { kind: 'apply_status' }> =>
        a.kind === 'apply_status' && a.status === status.kind
    );
    if (!action) continue;
    s = pushLog(s, { kind: 'combat', text: action.expirationFlavor });
  }
  return s;
}
```

You'll need to import `MonsterAction` from `../types`. Add to the imports at the top of `combat.ts`:

```ts
import { ... type MonsterAction ... } from './types';
```

(Find the existing line that imports types like `type GameState`, `type MonsterId`, etc., and add `MonsterAction` to it.)

- [ ] **Step 10: Run the expiration-narration test — confirm it passes**

Run: `npx vitest run src/engine/__tests__/combat.test.ts -t "apply_status"`
Expected: PASS — all three `apply_status` tests pass.

- [ ] **Step 11: Run the full combat test suite — confirm no regressions**

Run: `npx vitest run src/engine/__tests__/combat.test.ts`
Expected: PASS — all combat tests pass. The expiration-narration wrapper only adds log entries for player statuses with a matching source-monster's `apply_status` action; statuses from skills (e.g., the player's own `tempt_fate` setting `guaranteed_crit`) have no matching action and emit no narration, preserving existing behaviour.

- [ ] **Step 12: Run full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass.

- [ ] **Step 13: Commit**

```bash
git add src/engine/combat.ts src/engine/__tests__/combat.test.ts
git commit -m "feat(combat): apply_status dispatch + expiration narration for monster-applied statuses"
```

---

## Task 3: Update tutorial monster actions

**Files:**
- Modify: `src/content/monsters/index.ts`

This task assigns each of the four tutorial monsters their signature `apply_status` action with the spec-defined status, duration, flavor copy, and weights. After this task, the four tutorial fights (Pell, Footnote, Heckler, Officious Tax Rat) each apply a debuff during combat.

- [ ] **Step 1: Update the `insolent_pell` monster**

In [src/content/monsters/index.ts](src/content/monsters/index.ts), find the `insolent_pell` entry and update its `actions`. Replace:

```ts
    actions: [
      { kind: 'attack', weight: 1, flavor: 'The pell sways meaningfully in your direction.' }
    ],
```

With:

```ts
    actions: [
      { kind: 'attack', weight: 0.7, flavor: 'The pell sways meaningfully in your direction.' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The pell tilts to catch your blade between its bracing-rails.',
        status: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: 'Your weapon is suspended.',
        expirationFlavor: 'You wrench your blade free.'
      }
    ],
```

- [ ] **Step 2: Update the `feral_footnote` monster**

Find the `feral_footnote` entry and update its `actions`. Replace:

```ts
    actions: [
      { kind: 'attack', weight: 1, flavor: 'The footnote nips at the punctuation around your sentences.' }
    ],
```

With:

```ts
    actions: [
      { kind: 'attack', weight: 0.7, flavor: 'The footnote nips at the punctuation around your sentences.' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The footnote zigzags into three positions simultaneously, then settles into none of them.',
        status: 'next_attack_misses',
        duration: { kind: 'one_shot' },
        appliedFlavor: 'You see triple. Your next attack is going to miss.',
        expirationFlavor: 'Your vision settles.'
      }
    ],
```

- [ ] **Step 3: Update the `pointed_heckler` monster**

Find the `pointed_heckler` entry and update its `actions`. Replace:

```ts
    actions: [
      { kind: 'attack', weight: 1, flavor: 'The heckler delivers a precisely-timed sigh.' }
    ],
```

With:

```ts
    actions: [
      { kind: 'attack', weight: 0.7, flavor: 'The heckler delivers a precisely-timed sigh.' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The heckler delivers a precisely-timed shout. You lose your line.',
        status: 'skip_turn',
        duration: { kind: 'turns', remaining: 1 },
        appliedFlavor: "You can't recover this turn.",
        expirationFlavor: 'You find your line again.'
      }
    ],
```

- [ ] **Step 4: Update the `officious_tax_rat` monster (replaces existing `special`)**

Find the `officious_tax_rat` entry and update its `actions`. Replace:

```ts
    actions: [
      { kind: 'attack', weight: 0.6, flavor: 'The rat strikes you with a clipboard, citing subsection 4.2(b).' },
      { kind: 'special', weight: 0.3, flavor: 'The rat invokes an obscure agricultural ordinance. You feel mildly fined.', damageBonus: 2 },
      { kind: 'flee_if_low_hp', weight: 0.1, flavor: 'The rat threatens to file a complaint and scurries off.' }
    ],
```

With:

```ts
    actions: [
      { kind: 'attack', weight: 0.6, flavor: 'The rat strikes you with a clipboard, citing subsection 4.2(b).' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The Tax Rat slips a fee-notice between two scales of your armor. The paperwork lodges.',
        status: 'armor_halved',
        duration: { kind: 'turns', remaining: 2 },
        appliedFlavor: 'Your armor is halved while the levy is in effect.',
        expirationFlavor: 'The levy lapses. Your guard returns.'
      },
      { kind: 'flee_if_low_hp', weight: 0.1, flavor: 'The rat threatens to file a complaint and scurries off.' }
    ],
```

(Note: the existing `special` damage-bonus action is DROPPED. The total weight remains 1.0: 0.6 + 0.3 + 0.1 = 1.0.)

- [ ] **Step 5: Run typecheck — confirm clean**

Run: `npx tsc --noEmit`
Expected: PASS — all four monsters' `actions` arrays now type-check against the extended `MonsterAction` union.

- [ ] **Step 6: Run full test suite — confirm no regressions**

Run: `npx vitest run`
Expected: PASS — all existing tests pass. The tutorial monsters now occasionally apply statuses; existing combat tests don't typically rely on monster action determinism, so this should be transparent.

If a flaky test surfaces because a tutorial monster's `apply_status` action fires on a turn the test didn't expect, that's a real flake — flag it but don't try to fix it in this task.

- [ ] **Step 7: Commit**

```bash
git add src/content/monsters/index.ts
git commit -m "feat(combat): give tutorial monsters signature apply_status actions"
```

---

## Task 4: Content validation + e2e tests

**Files:**
- Modify: `src/content/__tests__/validate.test.ts`
- Create: `src/__tests__/combatStatus.e2e.test.ts`

This task adds validation that the tutorial monsters' `apply_status` actions are correctly configured, plus full-flow e2e tests that exercise the apply → debuff → expire cycle for each tutorial monster.

- [ ] **Step 1: Extend `validate.test.ts` with `apply_status` action validation**

In [src/content/__tests__/validate.test.ts](src/content/__tests__/validate.test.ts), append a new describe block:

```ts
describe('apply_status action validation', () => {
  const VALID_STATUS_KINDS: StatusKind[] = [
    'weakness_revealed', 'intimidated', 'guaranteed_crit', 'next_attack_misses',
    'skip_turn', 'weapon_suspended', 'armor_halved', 'free_retaliation'
  ];

  it('every apply_status action references a valid StatusKind', () => {
    for (const monster of Object.values(content.monsters)) {
      for (const action of monster.actions) {
        if (action.kind !== 'apply_status') continue;
        expect(VALID_STATUS_KINDS).toContain(action.status);
      }
    }
  });

  it.each([
    ['insolent_pell', 'weapon_suspended'],
    ['feral_footnote', 'next_attack_misses'],
    ['pointed_heckler', 'skip_turn'],
    ['officious_tax_rat', 'armor_halved']
  ])('tutorial monster %s has exactly one apply_status action with status %s', (monsterId, expectedStatus) => {
    const monster = content.monsters[MonsterId(monsterId)];
    expect(monster).toBeDefined();
    const applyStatusActions = monster!.actions.filter((a) => a.kind === 'apply_status');
    expect(applyStatusActions).toHaveLength(1);
    expect(applyStatusActions[0]!.status).toBe(expectedStatus);
  });
});
```

The imports at the top of the file may need to be extended. Check the existing imports; add `MonsterId` and `type StatusKind` from the engine types if not already present:

```ts
import { MonsterId, type StatusKind } from '../../engine/types';
```

- [ ] **Step 2: Run validate.test.ts — confirm pass**

Run: `npx vitest run src/content/__tests__/validate.test.ts`
Expected: PASS — both new tests pass (the apply_status actions added in Task 3 are correctly configured).

- [ ] **Step 3: Create the e2e test file**

Create [src/__tests__/combatStatus.e2e.test.ts](src/__tests__/combatStatus.e2e.test.ts):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../ui/store.svelte';
import { ClassId, EncounterId, MonsterId, type GameState, type Monster } from '../engine/types';
import { content } from '../content';

function clearAllAndStart(classId: ReturnType<typeof ClassId>) {
  localStorage.clear();
  for (let i = 0; i < 6; i++) gameStore.consignSlot(i);
  gameStore.beginNewTaleInSlot(0);
  gameStore.forgetAchievements();
  gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId });
}

/**
 * Force the active monster's action rotation to fire apply_status deterministically
 * by mutating its actions list to weight=1.0 apply_status only. Returns a restore
 * function the caller must call after.
 */
function forceApplyStatusOnly(monsterId: ReturnType<typeof MonsterId>): () => void {
  const original = content.monsters[monsterId];
  const applyStatusAction = original.actions.find((a) => a.kind === 'apply_status');
  if (!applyStatusAction) throw new Error(`monster ${monsterId} has no apply_status action`);
  (content.monsters as Record<string, Monster>)[monsterId] = {
    ...original,
    actions: [{ ...applyStatusAction, weight: 1.0 }]
  };
  return () => {
    (content.monsters as Record<string, Monster>)[monsterId] = original;
  };
}

describe('combat status e2e', () => {
  beforeEach(() => {
    localStorage.clear();
    for (let i = 0; i < 6; i++) gameStore.consignSlot(i);
    gameStore.switchToSlotPicker();
  });

  it('Tax Rat applies armor_halved; expires after 2 turns; expiration narrated', () => {
    clearAllAndStart(ClassId('reluctant_farmhand'));
    // Walk past Farmhand opener.
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });

    const restore = forceApplyStatusOnly(MonsterId('officious_tax_rat'));
    try {
      gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: EncounterId('first_tax_rat') });
      // Player attacks first; monster's next turn fires apply_status.
      gameStore.dispatch({ kind: 'AttackTarget' });
      const combat1 = gameStore.state.combat;
      if (combat1?.kind !== 'turn-based') throw new Error('expected combat after first attack');
      const player1 = combat1.combatants.find((c) => c.kind === 'player')!;
      expect(player1.statuses.some((s) => s.kind === 'armor_halved')).toBe(true);

      // Player attacks again — status duration ticks from 2 → 1.
      gameStore.dispatch({ kind: 'AttackTarget' });
      // Player attacks again — status duration ticks from 1 → 0 → removed; expiration narrates.
      gameStore.dispatch({ kind: 'AttackTarget' });

      const expirationLog = gameStore.state.log.find((e) => e.text.includes('levy lapses'));
      expect(expirationLog).toBeDefined();
    } finally {
      restore();
    }
  });

  it('Insolent Pell applies weapon_suspended; expires after 1 turn', () => {
    clearAllAndStart(ClassId('disgraced_knight'));
    // Walk past Knight opener (engagement + commitment triggers Pell encounter).
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const restore = forceApplyStatusOnly(MonsterId('insolent_pell'));
    try {
      gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
      // Combat should be active; player attacks.
      gameStore.dispatch({ kind: 'AttackTarget' });
      const combat = gameStore.state.combat;
      if (combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((s) => s.kind === 'weapon_suspended')).toBe(true);

      gameStore.dispatch({ kind: 'AttackTarget' });
      const expirationLog = gameStore.state.log.find((e) => e.text.includes('wrench your blade free'));
      expect(expirationLog).toBeDefined();
    } finally {
      restore();
    }
  });

  it('Feral Footnote applies next_attack_misses; expires after one shot', () => {
    clearAllAndStart(ClassId('accidental_wizard'));
    // Walk past Wizard opener: engagement (choose margin 0) + commitment.
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const restore = forceApplyStatusOnly(MonsterId('feral_footnote'));
    try {
      gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
      gameStore.dispatch({ kind: 'AttackTarget' });
      const combat = gameStore.state.combat;
      if (combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((s) => s.kind === 'next_attack_misses')).toBe(true);

      gameStore.dispatch({ kind: 'AttackTarget' });
      const expirationLog = gameStore.state.log.find((e) => e.text.includes('vision settles'));
      expect(expirationLog).toBeDefined();
    } finally {
      restore();
    }
  });

  it('Pointed Heckler applies skip_turn; expires after 1 turn', () => {
    clearAllAndStart(ClassId('bard'));
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const restore = forceApplyStatusOnly(MonsterId('pointed_heckler'));
    try {
      gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
      gameStore.dispatch({ kind: 'AttackTarget' });
      const combat = gameStore.state.combat;
      if (combat?.kind !== 'turn-based') throw new Error('expected combat');
      const player = combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((s) => s.kind === 'skip_turn')).toBe(true);

      gameStore.dispatch({ kind: 'AttackTarget' });
      const expirationLog = gameStore.state.log.find((e) => e.text.includes('find your line again'));
      expect(expirationLog).toBeDefined();
    } finally {
      restore();
    }
  });
});
```

- [ ] **Step 4: Run the e2e tests — confirm pass**

Run: `npx vitest run src/__tests__/combatStatus.e2e.test.ts`
Expected: PASS — all 4 e2e tests pass.

If a test fails because the player dies before the status expires (the Tax Rat hits hard while the player has half armor), reduce the test's verifications to just "status was applied" and add a separate test for expiration. Alternatively, the test can mutate the player's hp to a high value before the attack loop. Use whichever workaround keeps the test deterministic.

- [ ] **Step 5: Run full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass. The total should be around 285 + 2 validate tests + 4 e2e tests + 3 combat unit tests = ~294.

- [ ] **Step 6: Commit**

```bash
git add src/content/__tests__/validate.test.ts src/__tests__/combatStatus.e2e.test.ts
git commit -m "test(combat): apply_status validation + e2e coverage per tutorial monster"
```

---

## Self-Review

**Spec coverage:**
- ✅ New `MonsterAction` variant with `apply_status` — Task 1
- ✅ Dispatch case in `monsterTurn` — Task 2
- ✅ No damage on apply turn — Task 2 (Step 5-6)
- ✅ Status appears in player combatant's statuses — Task 2 (Step 1-4)
- ✅ Action flavor + applied flavor both logged — Task 2 (dispatch case)
- ✅ Expiration narration via `tickPlayerCombatant` wrapper — Task 2 (Step 9)
- ✅ Pell signature: weapon_suspended, 1 turn — Task 3
- ✅ Footnote signature: next_attack_misses, one_shot — Task 3
- ✅ Heckler signature: skip_turn, 1 turn — Task 3
- ✅ Tax Rat signature: armor_halved, 2 turns; replaces existing `special` — Task 3
- ✅ Content validation (every apply_status references valid StatusKind; tutorial monsters each have exactly one) — Task 4
- ✅ E2E coverage per monster — Task 4
- ✅ UI: no new code needed — CharacterPanel already renders combat-scoped statuses; verified pre-spec

**Placeholder scan:** No "TBD", "TODO", or vague requirements. The "if a test flakes" guidance in Task 3 Step 6 and Task 4 Step 4 is explicit about what counts as a real flake vs. expected behaviour.

**Type consistency:**
- `MonsterAction` variant name `apply_status` used consistently across Tasks 1-4
- Field names (`status`, `duration`, `appliedFlavor`, `expirationFlavor`) used consistently
- Status kinds (`weapon_suspended`, `next_attack_misses`, `skip_turn`, `armor_halved`) matched to the right monsters in Task 3 and Task 4 validation
- Monster ids (`insolent_pell`, `feral_footnote`, `pointed_heckler`, `officious_tax_rat`) used consistently

No issues found.
