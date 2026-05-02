# The Heroic Chronicle — Story Beats + Narrative Combat (Plan 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the hero's-journey scaffolding to the game. After defeating the Tax Rat, a beat fires that unlocks a path to the Dusty Crossroads. On entering the Crossroads, an Old Hermit triggers the Call to Adventure as a narrative-choice encounter (Accept Quest / Refuse — traditional / Insult Hat / Cry, Briefly). Refuse loops back with a narrator-sighs marginalia line; Insult and Cry produce flavor and loop back; Accept advances the player to Act II, banner and all. Plan 3 ends with the player at the Crossroads with a visible-but-disabled "Cross the threshold" exit.

**Architecture:** Three new engine modules — `story.ts` (beat preconditions/effects), `narrative.ts` (narrative-encounter sub-reducer), expanded `combat.ts` (CombatState becomes a discriminated union). Beats auto-check after every reducer call. Narrative resolvers live in `src/content/narrative/` as a registered map of pure-functional `(state) → { state, next }` handlers. UI: WorldPanel renders narrative prose + custom choice buttons when in narrative-combat mode.

**Tech Stack:** Same as Plan 2. No new runtime deps.

**Spec reference:** `docs/superpowers/specs/2026-04-24-text-rpg-design.md`. Implements §3.2 hero's-journey backbone (acts I → II), §3.3 narrative-choice combat, §5 story beats, §6.4 button-bar narrative mode. The Refusal-of-the-Call rewind animation ships in minimal form here (state-restore + marginalia line); the full crumple-and-smooth set piece is deferred to Plan 6 (Polish). The "Crossing the Threshold" beat and its destination location defer to Plan 5 (Content + map). Other classes' opening scenes still defer to Plan 5; remaining locations defer to Plan 5.

**Confirmed scope decisions** (from brainstorm before this plan):
- Insult Hat / Cry, Briefly = pure flavor (narrator interjections, loops back). Only Accept and Refuse have mechanical effects in Plan 3. Future plans can add stat-flagged consequences.
- Crossroads exit unlock = via a new beat (`hermit_beckons`) that fires when `defeated:first_tax_rat` flag is set. Beat sets `unlocked_crossroads` and pushes a "figure waves" log line.
- End of Plan 3 = Act II banner, player back at the Crossroads, single new exit "Cross the threshold" rendered as visible-but-disabled (tooltip "the road is yet unwritten").

---

## File map

**New engine modules:**
- `src/engine/story.ts` — beat-checking engine (predicate evaluator + effect applier + checkBeats(state) → state)
- `src/engine/narrative.ts` — narrative encounter sub-reducer (startNarrativeEncounter, chooseNarrativeOption, endNarrativeEncounter)
- `src/engine/__tests__/story.test.ts`
- `src/engine/__tests__/narrative.test.ts`

**Modified engine modules:**
- `src/engine/types.ts` — add NarrativeEncounter, NarrativeNode, Predicate, BeatEffect, NarrativeResolver, NarrativeResolverId; CombatState becomes a discriminated union (`kind: 'turn-based' | 'narrative'`); update Encounter to a union
- `src/engine/events.ts` — add ChooseNarrativeOption event; hook `checkBeats` into reduce; update narrative-encounter trigger path to use new sub-reducer
- `src/engine/combat.ts` — adapt sub-reducer to the new CombatState union (`kind === 'turn-based'`); narrative path handled in narrative.ts

**New content modules:**
- `src/content/locations/family_farm.ts` — split into its own file (currently in locations/index.ts as the only entry)
- `src/content/locations/dusty_crossroads.ts` — new location
- `src/content/locations/index.ts` — re-export aggregate
- `src/content/narrative/resolvers.ts` — registry of resolver functions (Record<NarrativeResolverId, ResolverFn>)
- `src/content/narrative/nodes.ts` — registry of NarrativeNode data (call_root)
- `src/content/encounters/the_call.ts` — split out the existing first_tax_rat to its own file too; add the_call narrative encounter
- `src/content/story/beats.ts` — three beats: ordinary_world_established, hermit_beckons, call_received

**Modified content modules:**
- `src/content/index.ts` — add `narrativeNodes` and `beats` registries; extend validateContent to validate beat references and narrative-node references
- `src/content/encounters/index.ts` — re-export both encounter files
- `src/content/locations/index.ts` — already noted; add Dusty Crossroads

**Modified UI:**
- `src/ui/WorldPanel.svelte` — render narrative-combat mode with prose + dialogue speaker + choice buttons (instead of Attack/Skill/Item/Flee); show Act marker via gameStore.state.story.stage; render visible-but-disabled exit
- `src/ui/CharacterPanel.svelte` — already reads ACT from stage; will pick up Act II automatically when stage advances

---

## Task 1: Type extensions for narrative encounters, beats, predicates

**Files:**
- Modify: `src/engine/types.ts`

This task expands the type vocabulary with the shapes Plan 3 needs. No runtime changes; subsequent tasks fill in the runtime.

- [ ] **Step 1: Append to `src/engine/types.ts`**

After the existing `Encounter` type alias (which currently aliases `CombatEncounter`), replace it and append:

Find:
```ts
// Narrative encounters land in Plan 3.
export type Encounter = CombatEncounter;
```

Replace with:
```ts
// =====================================================================
// Narrative encounters (Plan 3)
// =====================================================================

export type NarrativeResolverId = string;

export type NarrativeChoice = {
  label: string;
  visible?: Predicate;
  resolve: NarrativeResolverId;
};

export type NarrativeNode = {
  id: NarrativeNodeId;
  speaker?: string;          // small-caps speaker attribution above prose
  prose: string;
  choices: NarrativeChoice[];
};

export type NarrativeEncounter = {
  id: EncounterId;
  kind: 'narrative';
  rootNodeId: NarrativeNodeId;
  noFlee?: boolean;
};

export type Encounter = CombatEncounter | NarrativeEncounter;
```

Then find the existing `CombatState`:
```ts
export type CombatState = {
  encounterId: EncounterId;
  combatants: Array<{
    id: 'player' | string;
    kind: 'player' | 'monster';
    hp: number;
    initiative: number;
  }>;
  turnIndex: number;
  round: number;
};
```

Replace with:
```ts
// CombatState is a discriminated union — turn-based for monster fights,
// narrative for choice-driven encounters. The `state.combat` slot holds
// either; UI checks `state.combat?.kind` to render the right buttons.
export type CombatState =
  | TurnBasedCombatState
  | NarrativeCombatState;

export type TurnBasedCombatState = {
  kind: 'turn-based';
  encounterId: EncounterId;
  combatants: Array<{
    id: 'player' | string;
    kind: 'player' | 'monster';
    hp: number;
    initiative: number;
  }>;
  turnIndex: number;
  round: number;
};

export type NarrativeCombatState = {
  kind: 'narrative';
  encounterId: EncounterId;
  currentNodeId: NarrativeNodeId;
};
```

Then append the predicate and beat types at the bottom of the file (after `SAVE_VERSION`):

```ts
// =====================================================================
// Story beats (Plan 3)
// =====================================================================

export type Predicate =
  | { kind: 'flag'; flag: string; equals?: boolean | number | string }   // default: flag is truthy
  | { kind: 'visited'; locationId: LocationId }
  | { kind: 'beat_completed'; beatId: BeatId }
  | { kind: 'stage'; stage: ActId };

export type BeatEffect =
  | { kind: 'set_flag'; flag: string; value: boolean | number | string }
  | { kind: 'grant_item'; itemId: ItemId; qty?: number }
  | { kind: 'advance_stage'; stage: ActId }
  | { kind: 'log'; entry: Omit<LogEntry, 'id'> }
  | { kind: 'trigger_encounter'; encounterId: EncounterId };

export type StoryBeat = {
  id: BeatId;
  stage: ActId;
  preconditions: Predicate[];   // ALL must be true for the beat to fire
  onTrigger: BeatEffect[];
  transitionAnim?: 'actMarker' | 'giltUnfurl' | 'refusalRewind';   // hint for Plan 6 polish
};
```

- [ ] **Step 2: Update existing combat.ts to handle the discriminated CombatState**

The existing code in combat.ts directly accesses `state.combat.combatants`, `state.combat.turnIndex`, etc. After this type change, those fields only exist on `TurnBasedCombatState`. Any access that doesn't first narrow via `state.combat.kind === 'turn-based'` will be a TypeScript error.

Update `src/engine/combat.ts`:

1. In `startCombat`, the `combat` constant should be typed as `TurnBasedCombatState`:
```ts
const combat: CombatState = {
  kind: 'turn-based',
  encounterId: encounter.id,
  combatants: [...],
  turnIndex: 0,
  round: 1
};
```

2. Throughout `playerAttack`, `playerUseItem`, `playerFlee`, `monsterTurn`, every access to `state.combat.combatants` (etc.) must be guarded:
```ts
if (!state.combat || state.combat.kind !== 'turn-based') return state;
```
Replace existing `if (!state.combat) return state;` lines with the kind check. The narrative encounter functions live in narrative.ts (Task 3) and won't pass through these.

3. `endCombat` is shared — but it accesses `state.combat?.encounterId` only via the encounter parameter. Look for any usages that would fail under the new union and narrow them.

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: 0 errors. If TS reports errors in combat.ts about missing `combatants`, `turnIndex`, `round` properties, it means a kind-guard is missing — add the `kind === 'turn-based'` check before the access.

- [ ] **Step 4: Verify tests still pass**

```bash
npm run test
```

Expected: all 51 tests pass. The combat tests construct CombatState — make sure the test helpers in combat.test.ts include `kind: 'turn-based'` if any test directly synthesizes a CombatState. (Most tests construct via `startCombat`, which is fine.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/combat.ts
git commit -m "Add narrative-encounter, beat, and predicate types; CombatState is a discriminated union"
```

---

## Task 2: Beat-checking engine (TDD)

**Files:**
- Create: `src/engine/story.ts`
- Create: `src/engine/__tests__/story.test.ts`

The beat engine has two responsibilities: evaluate predicates against state, and apply effects to state. The exported `checkBeats(state)` function scans the beat registry, finds beats whose preconditions are met AND that haven't completed yet, fires them in order, marks them completed, and applies their effects.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/__tests__/story.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evalPredicate, applyEffect, checkBeats } from '../story';
import { createInitialState } from '../state';
import { ClassId, LocationId, BeatId, ItemId, type GameState, type Predicate, type BeatEffect } from '../types';

function freshState(): GameState {
  let s = createInitialState(1);
  s = { ...s, character: { ...s.character, name: 'Test', classId: ClassId('reluctant_farmhand') } };
  return s;
}

describe('evalPredicate', () => {
  it('flag predicate returns true when flag is truthy and false when missing', () => {
    const s = freshState();
    const p: Predicate = { kind: 'flag', flag: 'foo' };
    expect(evalPredicate(s, p)).toBe(false);
    const s2 = { ...s, world: { ...s.world, flags: { foo: true } } };
    expect(evalPredicate(s2, p)).toBe(true);
  });

  it('flag predicate with equals checks specific value', () => {
    const s = { ...freshState(), world: { ...freshState().world, flags: { count: 5 } } };
    expect(evalPredicate(s, { kind: 'flag', flag: 'count', equals: 5 })).toBe(true);
    expect(evalPredicate(s, { kind: 'flag', flag: 'count', equals: 3 })).toBe(false);
  });

  it('visited predicate matches state.world.visited', () => {
    const s = { ...freshState(), world: { ...freshState().world, visited: [LocationId('family_farm')] } };
    expect(evalPredicate(s, { kind: 'visited', locationId: LocationId('family_farm') })).toBe(true);
    expect(evalPredicate(s, { kind: 'visited', locationId: LocationId('elsewhere') })).toBe(false);
  });

  it('beat_completed predicate matches state.story.completedBeats', () => {
    const s = { ...freshState(), story: { ...freshState().story, completedBeats: [BeatId('beat_a')] } };
    expect(evalPredicate(s, { kind: 'beat_completed', beatId: BeatId('beat_a') })).toBe(true);
    expect(evalPredicate(s, { kind: 'beat_completed', beatId: BeatId('beat_b') })).toBe(false);
  });

  it('stage predicate matches state.story.stage', () => {
    const s = freshState();
    expect(evalPredicate(s, { kind: 'stage', stage: 'act_i' })).toBe(true);
    expect(evalPredicate(s, { kind: 'stage', stage: 'act_ii' })).toBe(false);
  });
});

describe('applyEffect', () => {
  it('set_flag writes to world.flags', () => {
    const s = freshState();
    const e: BeatEffect = { kind: 'set_flag', flag: 'foo', value: true };
    const s2 = applyEffect(s, e);
    expect(s2.world.flags['foo']).toBe(true);
  });

  it('grant_item adds to inventory and accumulates qty', () => {
    const s = freshState();
    const e: BeatEffect = { kind: 'grant_item', itemId: ItemId('hardtack'), qty: 2 };
    const s2 = applyEffect(s, e);
    expect(s2.character.inventory.find((x) => x.itemId === ItemId('hardtack'))?.qty).toBe(2);
    const s3 = applyEffect(s2, e);
    expect(s3.character.inventory.find((x) => x.itemId === ItemId('hardtack'))?.qty).toBe(4);
  });

  it('advance_stage updates story.stage', () => {
    const s = freshState();
    const s2 = applyEffect(s, { kind: 'advance_stage', stage: 'act_ii' });
    expect(s2.story.stage).toBe('act_ii');
  });

  it('log appends a log entry', () => {
    const s = freshState();
    const s2 = applyEffect(s, { kind: 'log', entry: { kind: 'narration', text: 'Hello.' } });
    expect(s2.log[s2.log.length - 1]?.text).toBe('Hello.');
  });
});

describe('checkBeats', () => {
  it('does not fire a beat whose preconditions are not met', () => {
    const s = freshState();
    const s2 = checkBeats(s);
    // No beats fire on a fresh state since no triggers have happened yet.
    expect(s2.story.completedBeats.length).toBe(0);
  });

  it('fires a beat once preconditions are met and marks it completed', () => {
    let s = freshState();
    // Family Farm is in visited (createInitialState seeds nothing; we add manually)
    s = { ...s, world: { ...s.world, visited: [LocationId('family_farm')] } };
    s = checkBeats(s);
    expect(s.story.completedBeats).toContain(BeatId('ordinary_world_established'));
  });

  it('does not fire the same beat twice', () => {
    let s = freshState();
    s = { ...s, world: { ...s.world, visited: [LocationId('family_farm')] } };
    s = checkBeats(s);
    const completedAfterFirst = s.story.completedBeats.length;
    s = checkBeats(s);
    expect(s.story.completedBeats.length).toBe(completedAfterFirst);
  });
});
```

- [ ] **Step 2: Run the failing tests**

```bash
npm run test -- story
```

Expected: "Cannot find module '../story'".

- [ ] **Step 3: Implement `src/engine/story.ts`**

```ts
import { content } from '../content';
import type {
  ActId, BeatEffect, BeatId, GameState, ItemId, LogEntry,
  Predicate, StoryBeat
} from './types';
import { MAX_LOG_ENTRIES } from './types';

// =====================================================================
// Predicate evaluation
// =====================================================================

export function evalPredicate(state: GameState, p: Predicate): boolean {
  switch (p.kind) {
    case 'flag': {
      const v = state.world.flags[p.flag];
      if (p.equals !== undefined) return v === p.equals;
      return Boolean(v);
    }
    case 'visited':
      return state.world.visited.includes(p.locationId);
    case 'beat_completed':
      return state.story.completedBeats.includes(p.beatId);
    case 'stage':
      return state.story.stage === p.stage;
  }
}

// =====================================================================
// Effect application
// =====================================================================

function appendLog(state: GameState, entry: Omit<LogEntry, 'id'>): GameState {
  const nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const merged = [...state.log, { ...entry, id: nextId }];
  return {
    ...state,
    log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged
  };
}

export function applyEffect(state: GameState, effect: BeatEffect): GameState {
  switch (effect.kind) {
    case 'set_flag':
      return { ...state, world: { ...state.world, flags: { ...state.world.flags, [effect.flag]: effect.value } } };
    case 'grant_item': {
      const qty = effect.qty ?? 1;
      const existing = state.character.inventory.find((e) => e.itemId === effect.itemId);
      const inv = existing
        ? state.character.inventory.map((e) => e.itemId === effect.itemId ? { ...e, qty: e.qty + qty } : e)
        : [...state.character.inventory, { itemId: effect.itemId, qty }];
      return { ...state, character: { ...state.character, inventory: inv } };
    }
    case 'advance_stage':
      return { ...state, story: { ...state.story, stage: effect.stage } };
    case 'log':
      return appendLog(state, effect.entry);
    case 'trigger_encounter':
      // Triggering an encounter from a beat is forwarded to the events
      // reducer (see events.ts) — this effect is implemented as a state
      // marker that the reducer detects after checkBeats runs.
      return appendLog(state, {
        kind: 'system',
        text: `(Encounter ${effect.encounterId} triggered.)`,
        systemLabel: 'BEAT'
      });
      // NOTE: The actual encounter-start happens in events.ts after
      // checkBeats() returns. We leave this as a marker; events.ts
      // scans the most recent BEAT log entries and starts encounters.
      // (See Task 4 for the events.ts integration.)
  }
}

// =====================================================================
// Beat checking
// =====================================================================

// Returns a state with any newly-eligible beats fired and marked completed.
// Beats fire in registry order. A single call may fire multiple beats if
// they cascade (effect of one beat satisfies the preconditions of another).
export function checkBeats(state: GameState): GameState {
  let s = state;
  let fired = true;
  // Loop in case an effect cascades into another beat's preconditions.
  // Cap at 8 iterations to prevent infinite loops in malformed content.
  let iters = 0;
  while (fired && iters < 8) {
    fired = false;
    iters++;
    for (const beat of Object.values(content.beats) as StoryBeat[]) {
      if (s.story.completedBeats.includes(beat.id)) continue;
      const allMet = beat.preconditions.every((p) => evalPredicate(s, p));
      if (!allMet) continue;
      // Fire it: apply effects in order, mark completed.
      for (const effect of beat.onTrigger) {
        s = applyEffect(s, effect);
      }
      s = {
        ...s,
        story: {
          ...s.story,
          completedBeats: [...s.story.completedBeats, beat.id],
          currentBeat: beat.id
        }
      };
      fired = true;
    }
  }
  return s;
}
```

- [ ] **Step 4: Update `src/content/index.ts` to expose `beats` registry**

The story.ts code references `content.beats`. The aggregate registry doesn't have a `beats` field yet. Update `src/content/index.ts` to import from a new beats module (which will be authored in Task 8):

Add to imports:
```ts
import { beats } from './story/beats';
```

Add to the `content` object:
```ts
beats: beats as Record<BeatId, StoryBeat>,
```

Add to imports at top:
```ts
import type { StoryBeat, BeatId } from '../engine/types';
```

Create a stub `src/content/story/beats.ts` so the import resolves:
```ts
import type { BeatId, StoryBeat } from '../../engine/types';
export const beats: Record<BeatId, StoryBeat> = {} as Record<BeatId, StoryBeat>;
```

(Task 8 will fill in the real beats.)

- [ ] **Step 5: Run tests, confirm pass**

```bash
npm run test -- story
```

Expected: 9 of the 11 tests pass. The two `checkBeats` tests that depend on `ordinary_world_established` will FAIL because that beat isn't authored yet (Task 8). That's expected; mark this task DONE_WITH_CONCERNS noting those two tests will pass after Task 8.

Alternative: skip those two tests with `it.todo` for now and uncomment them in Task 8. Pick whichever you prefer.

- [ ] **Step 6: Commit**

```bash
git add src/engine/story.ts src/engine/__tests__/story.test.ts src/content/index.ts src/content/story/beats.ts
git commit -m "Add beat-checking engine (predicate eval, effect application, checkBeats)"
```

---

## Task 3: Narrative encounter sub-reducer (TDD)

**Files:**
- Create: `src/engine/narrative.ts`
- Create: `src/engine/__tests__/narrative.test.ts`

Three pure functions: `startNarrativeEncounter(state, encounter)`, `chooseNarrativeOption(state, choiceIndex)`, `endNarrativeEncounter(state)`. They operate on the `state.combat` slot when its `kind === 'narrative'`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/__tests__/narrative.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { startNarrativeEncounter, chooseNarrativeOption } from '../narrative';
import { createInitialState } from '../state';
import { ClassId, EncounterId, LocationId, NarrativeNodeId, type GameState, type NarrativeEncounter } from '../types';
import { content } from '../../content';

function callEncounter(): NarrativeEncounter {
  return {
    id: EncounterId('the_call'),
    kind: 'narrative',
    rootNodeId: NarrativeNodeId('call_root'),
    noFlee: true
  };
}

function freshState(): GameState {
  let s = createInitialState(1);
  s = {
    ...s,
    character: { ...s.character, name: 'Test', classId: ClassId('reluctant_farmhand') },
    world: { ...s.world, currentLocation: LocationId('dusty_crossroads') }
  };
  return s;
}

describe('narrative sub-reducer', () => {
  it('startNarrativeEncounter sets combat to narrative kind at the root node', () => {
    const s = freshState();
    const s1 = startNarrativeEncounter(s, callEncounter());
    expect(s1.combat).not.toBeNull();
    expect(s1.combat?.kind).toBe('narrative');
    if (s1.combat?.kind === 'narrative') {
      expect(s1.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
    }
    // The root node's prose is pushed to the log.
    const lastEntries = s1.log.slice(-2);
    expect(lastEntries.some((e) => e.kind === 'dialogue')).toBe(true);
  });

  it('chooseNarrativeOption with a looping resolver returns to the same node', () => {
    let s = freshState();
    s = startNarrativeEncounter(s, callEncounter());
    // 'Refuse (traditional)' loops back. Choice index 1 = second choice.
    const s2 = chooseNarrativeOption(s, 1);
    expect(s2.combat?.kind).toBe('narrative');
    if (s2.combat?.kind === 'narrative') {
      expect(s2.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
    }
    // A narrator log entry was pushed.
    const lastEntry = s2.log[s2.log.length - 1];
    expect(lastEntry?.systemLabel).toBe('NARRATOR');
  });

  it('chooseNarrativeOption with a terminating resolver clears combat', () => {
    let s = freshState();
    s = startNarrativeEncounter(s, callEncounter());
    // 'Accept Quest' = choice index 0 = terminates the encounter, advances stage.
    const s2 = chooseNarrativeOption(s, 0);
    expect(s2.combat).toBeNull();
    expect(s2.story.stage).toBe('act_ii');
  });

  it('chooseNarrativeOption with an out-of-range index is a no-op', () => {
    let s = freshState();
    s = startNarrativeEncounter(s, callEncounter());
    const s2 = chooseNarrativeOption(s, 99);
    // State should be unchanged (or at most equivalent to s).
    expect(s2.combat?.kind).toBe('narrative');
    if (s2.combat?.kind === 'narrative') {
      expect(s2.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
    }
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm run test -- narrative
```

Expected: "Cannot find module '../narrative'" plus possibly "Cannot find encounter the_call" — both expected before implementation.

- [ ] **Step 3: Implement `src/engine/narrative.ts`**

```ts
import { content } from '../content';
import type {
  GameState, LogEntry, NarrativeEncounter, NarrativeNodeId
} from './types';
import { MAX_LOG_ENTRIES } from './types';

function appendLogs(state: GameState, entries: Omit<LogEntry, 'id'>[]): GameState {
  let nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const withIds: LogEntry[] = entries.map((e) => ({ ...e, id: nextId++ }));
  const merged = [...state.log, ...withIds];
  return {
    ...state,
    log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged
  };
}

function pushNode(state: GameState, nodeId: NarrativeNodeId): GameState {
  const node = content.narrativeNodes[nodeId];
  if (!node) return state;
  const entries: Omit<LogEntry, 'id'>[] = [];
  if (node.speaker) {
    entries.push({ kind: 'dialogue', speaker: node.speaker, text: node.prose });
  } else {
    entries.push({ kind: 'narration', text: node.prose });
  }
  return appendLogs(state, entries);
}

export function startNarrativeEncounter(state: GameState, encounter: NarrativeEncounter): GameState {
  const node = content.narrativeNodes[encounter.rootNodeId];
  if (!node) return state;
  const s: GameState = {
    ...state,
    combat: {
      kind: 'narrative',
      encounterId: encounter.id,
      currentNodeId: encounter.rootNodeId
    }
  };
  return pushNode(s, encounter.rootNodeId);
}

export function chooseNarrativeOption(state: GameState, choiceIndex: number): GameState {
  if (!state.combat || state.combat.kind !== 'narrative') return state;
  const node = content.narrativeNodes[state.combat.currentNodeId];
  if (!node) return state;
  const choice = node.choices[choiceIndex];
  if (!choice) return state;
  const resolver = content.narrativeResolvers[choice.resolve];
  if (!resolver) return state;
  // Run the resolver: it returns updated state and a next node id (or null to end).
  const result = resolver(state);
  let s = result.state;
  if (result.next === null) {
    // Encounter ends — clear combat slot.
    s = { ...s, combat: null };
  } else {
    // Move to the new node and push its prose.
    s = {
      ...s,
      combat: {
        kind: 'narrative',
        encounterId: state.combat.encounterId,
        currentNodeId: result.next
      }
    };
    s = pushNode(s, result.next);
  }
  return s;
}

export function endNarrativeEncounter(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'narrative') return state;
  return { ...state, combat: null };
}
```

- [ ] **Step 4: Update `src/content/index.ts` to expose `narrativeNodes` and `narrativeResolvers`**

Add to imports:
```ts
import { narrativeNodes } from './narrative/nodes';
import { narrativeResolvers } from './narrative/resolvers';
import type { NarrativeNode, NarrativeNodeId, NarrativeResolverId } from '../engine/types';
```

Add to the `content` object:
```ts
narrativeNodes: narrativeNodes as Record<NarrativeNodeId, NarrativeNode>,
narrativeResolvers: narrativeResolvers as Record<NarrativeResolverId, NarrativeResolver>,
```

Add the `NarrativeResolver` import:
```ts
import type { /* existing */, NarrativeResolver } from '../engine/types';
```

You'll also need to add `NarrativeResolver` as an exported type in `src/engine/types.ts`. Append:
```ts
export type NarrativeResolver = (state: GameState) => { state: GameState; next: NarrativeNodeId | null };
```

Create stub files so the imports resolve (Task 7 fills them in):

`src/content/narrative/nodes.ts`:
```ts
import type { NarrativeNodeId, NarrativeNode } from '../../engine/types';
export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {} as Record<NarrativeNodeId, NarrativeNode>;
```

`src/content/narrative/resolvers.ts`:
```ts
import type { NarrativeResolverId, NarrativeResolver } from '../../engine/types';
export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {};
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- narrative
```

Expected: tests fail because `the_call` encounter, `call_root` node, and resolvers don't exist yet (Task 7 authors them). Mark this task DONE_WITH_CONCERNS for now; Task 7 closes the loop.

Alternatively, you can skip the narrative tests with `describe.todo` until Task 7. Either is fine — note the choice in your report.

- [ ] **Step 6: Commit**

```bash
git add src/engine/narrative.ts src/engine/types.ts src/engine/__tests__/narrative.test.ts src/content/index.ts src/content/narrative/nodes.ts src/content/narrative/resolvers.ts
git commit -m "Add narrative encounter sub-reducer and content slots"
```

---

## Task 4: Hook beats and narrative into the main reducer

**Files:**
- Modify: `src/engine/events.ts`

After every state-changing event, the reducer should call `checkBeats` to see if any new beats are eligible. Beat effects can then trigger encounters, set flags, advance stages, etc. Also add the `ChooseNarrativeOption` event and route it through the narrative sub-reducer.

- [ ] **Step 1: Modify `src/engine/events.ts`**

Add imports:
```ts
import { checkBeats } from './story';
import { startNarrativeEncounter, chooseNarrativeOption } from './narrative';
```

Add to the `GameEvent` union:
```ts
| { kind: 'ChooseNarrativeOption'; choiceIndex: number }
```

Add a new case in the `reduce` switch:
```ts
case 'ChooseNarrativeOption':
  return chooseNarrativeOption(state, event.choiceIndex);
```

Update the `TriggerEncounter` case to dispatch to narrative or combat based on encounter kind:
```ts
case 'TriggerEncounter': {
  const enc = content.encounters[event.encounterId];
  if (!enc) return state;
  if (enc.kind === 'narrative') return startNarrativeEncounter(state, enc);
  return startCombat(state, enc);
}
```

Hook `checkBeats` into the reducer. Wrap every `case` in a post-processing call. The simplest approach: wrap the entire `reduce` body in a function that calls `checkBeats` on the result. Replace:
```ts
export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.kind) {
    // ...
  }
}
```

With:
```ts
export function reduce(state: GameState, event: GameEvent): GameState {
  const next = reduceInner(state, event);
  return checkBeats(next);
}

function reduceInner(state: GameState, event: GameEvent): GameState {
  switch (event.kind) {
    // ...
  }
}
```

Move all the existing case logic into `reduceInner`. The final `case` in the switch should be exhaustive (TypeScript will complain if not). The new `ChooseNarrativeOption` case goes inside `reduceInner`.

Beat effects with `kind: 'trigger_encounter'` are handled by checkBeats applying the marker and the next reduce call's TriggerEncounter dispatching it. **For Plan 3, simplify:** when checkBeats fires a beat with a `trigger_encounter` effect, dispatch the encounter immediately as part of the effect. Update `applyEffect` in `src/engine/story.ts` to handle this case directly:

In `src/engine/story.ts`, find the `case 'trigger_encounter':` branch and replace with:
```ts
case 'trigger_encounter': {
  const enc = content.encounters[effect.encounterId];
  if (!enc) {
    return appendLog(state, {
      kind: 'system',
      systemLabel: 'BEAT',
      text: `(Unknown encounter ${effect.encounterId}.)`
    });
  }
  if (enc.kind === 'narrative') {
    // Lazy import to avoid circular dependency at module load.
    const { startNarrativeEncounter } = require('./narrative') as typeof import('./narrative');
    return startNarrativeEncounter(state, enc);
  }
  // Combat encounter triggered from a beat (Plan 5+).
  const { startCombat } = require('./combat') as typeof import('./combat');
  return startCombat(state, enc);
}
```

Note: `require` is used here intentionally to avoid circular import issues at module load time. story.ts → narrative.ts → content/* → story.ts is a real cycle in Plan 3. If TypeScript's strict mode rejects `require`, use a top-of-file dynamic import or refactor: have events.ts call `checkBeats` and then handle any newly-set `combat` slot afterward.

**Alternative simpler approach** (recommended if `require` doesn't work cleanly): have checkBeats NOT directly start encounters. Instead, beats with `trigger_encounter` effects set a flag like `pending_encounter:<id>`. The events.ts reducer detects pending-encounter flags after checkBeats and dispatches them via the existing TriggerEncounter path.

Pick whichever path produces working code. Document your choice in the commit message.

- [ ] **Step 2: Run all tests**

```bash
npm run test
```

Expected: All Plan 1, Plan 2, story, and narrative tests pass — the narrative tests still likely fail because content authoring isn't done. Note the failing tests in your report and proceed.

- [ ] **Step 3: Commit**

```bash
git add src/engine/events.ts src/engine/story.ts
git commit -m "Hook checkBeats into reduce; add ChooseNarrativeOption event; route TriggerEncounter by kind"
```

---

## Task 5: Author the Dusty Crossroads location

**Files:**
- Create: `src/content/locations/dusty_crossroads.ts`
- Modify: `src/content/locations/index.ts` — turn into an aggregate that imports from per-location files

Splitting the locations file makes future content authoring (Plan 5) easier.

- [ ] **Step 1: Create `src/content/locations/dusty_crossroads.ts`**

```ts
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const dusty_crossroads: Location = {
  id: LocationId('dusty_crossroads'),
  name: 'The Dusty Crossroads',
  act: 'act_i',
  description:
    'You stand at a crossroads, which, as crossroads go, is unusually literal. ' +
    'A signpost leans drunkenly, pointing in four directions, three of which no longer exist. ' +
    'Wind carries the faint smell of onions and minor prophecy.',
  reEntryDescription:
    'The crossroads remains crossed. The signpost remains drunken. Some things are forever.',
  exits: [
    { label: 'Back to the family farm', targetId: LocationId('family_farm') },
    // The next location ("Cross the threshold") is gated behind the
    // accepted-call flag and stays disabled in Plan 3 — Plan 5 will
    // add the destination location and unlock this exit.
    { label: 'Cross the threshold', targetId: LocationId('the_old_road'), visibleIfFlag: 'crossed_threshold' }
  ],
  encounterIds: []  // The Call is triggered by a beat, not a location encounter.
};
```

- [ ] **Step 2: Create `src/content/locations/family_farm.ts`**

Move the existing Family Farm definition from index.ts into its own file:

```ts
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const family_farm: Location = {
  id: LocationId('family_farm'),
  name: 'The Family Farm',
  act: 'act_i',
  description:
    'The farm sprawls in three directions, mostly downhill. Chickens are in the early stages of a labour dispute. ' +
    'The barn slumps companionably against a fence that has given up. From the eastern field, you hear the ' +
    'unmistakable sound of someone *filing*.',
  reEntryDescription:
    'The farm continues to be the farm. The chickens have moved on to a more polished list of grievances.',
  exits: [
    // Crossroads exit unlocks via the hermit_beckons beat.
    { label: 'Walk to the crossroads', targetId: LocationId('dusty_crossroads'), visibleIfFlag: 'unlocked_crossroads' }
  ],
  encounterIds: [EncounterId('first_tax_rat'), EncounterId('practice_dummy')]
};
```

Note the `visibleIfFlag` change: previously the village exit referenced `unlocked_village` and pointed to a non-existent `village` location. Replace that with the Crossroads exit gated on `unlocked_crossroads`. Drop the old village exit.

- [ ] **Step 3: Replace `src/content/locations/index.ts`**

```ts
import { LocationId, type Location } from '../../engine/types';
import { family_farm } from './family_farm';
import { dusty_crossroads } from './dusty_crossroads';

export const locations: Record<LocationId, Location> = {
  [family_farm.id]: family_farm,
  [dusty_crossroads.id]: dusty_crossroads
};
```

- [ ] **Step 4: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 5: Verify the existing validation test still passes**

```bash
npm run test -- validate
```

Expected: passes (registries are non-empty, references resolve — `the_old_road` exit is flag-gated so it's allowed to dangle).

- [ ] **Step 6: Commit**

```bash
git add src/content/locations/
git commit -m "Author Dusty Crossroads location; split locations/index into per-location files"
```

---

## Task 6: Author The Call narrative encounter

**Files:**
- Create: `src/content/encounters/the_call.ts`
- Create: `src/content/encounters/first_tax_rat.ts` (split from index.ts for consistency)
- Create: `src/content/encounters/practice_dummy.ts` (split from index.ts for consistency)
- Modify: `src/content/encounters/index.ts` — aggregate

The Call is a narrative encounter. Its single root node has four choice buttons. Resolvers are authored in Task 7.

- [ ] **Step 1: Create `src/content/encounters/the_call.ts`**

```ts
import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const the_call: NarrativeEncounter = {
  id: EncounterId('the_call'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('call_root'),
  noFlee: true
};
```

- [ ] **Step 2: Move first_tax_rat to its own file**

Create `src/content/encounters/first_tax_rat.ts`:
```ts
import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const first_tax_rat: CombatEncounter = {
  id: EncounterId('first_tax_rat'),
  kind: 'combat',
  monsterId: MonsterId('officious_tax_rat'),
  xpReward: 25
};
```

Create `src/content/encounters/practice_dummy.ts`:
```ts
import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const practice_dummy: CombatEncounter = {
  id: EncounterId('practice_dummy'),
  kind: 'combat',
  monsterId: MonsterId('practice_hay_bale'),
  xpReward: 0,
  repeatable: true
};
```

- [ ] **Step 3: Replace `src/content/encounters/index.ts`**

```ts
import { type Encounter, type EncounterId } from '../../engine/types';
import { first_tax_rat } from './first_tax_rat';
import { practice_dummy } from './practice_dummy';
import { the_call } from './the_call';

export const encounters: Record<EncounterId, Encounter> = {
  [first_tax_rat.id]: first_tax_rat,
  [practice_dummy.id]: practice_dummy,
  [the_call.id]: the_call
};
```

- [ ] **Step 4: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/encounters/
git commit -m "Author the_call narrative encounter; split encounters into per-file modules"
```

---

## Task 7: Author the Call narrative node + resolvers

**Files:**
- Modify: `src/content/narrative/nodes.ts` — author `call_root`
- Modify: `src/content/narrative/resolvers.ts` — author `call_accept`, `call_refuse`, `call_insult`, `call_cry`

The narrative node has 4 choices. Each choice's resolver is a function that updates state and returns the next node id (or null to terminate).

- [ ] **Step 1: Replace `src/content/narrative/nodes.ts`**

```ts
import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

const callRoot: NarrativeNode = {
  id: NarrativeNodeId('call_root'),
  speaker: 'Old Hermit',
  prose: '"You must be the Chosen One. Right on schedule for your Refusal of the Call."',
  choices: [
    { label: 'Accept Quest', resolve: 'call_accept' },
    { label: 'Refuse (traditional)', resolve: 'call_refuse' },
    { label: 'Insult Hat', resolve: 'call_insult' },
    { label: 'Cry, Briefly', resolve: 'call_cry' }
  ]
};

export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot
};
```

- [ ] **Step 2: Replace `src/content/narrative/resolvers.ts`**

```ts
import type {
  GameState, LogEntry,
  NarrativeNodeId, NarrativeResolver, NarrativeResolverId
} from '../../engine/types';
import { MAX_LOG_ENTRIES, NarrativeNodeId as NarrativeNodeIdCtor } from '../../engine/types';

function appendLogs(state: GameState, entries: Omit<LogEntry, 'id'>[]): GameState {
  let nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const withIds: LogEntry[] = entries.map((e) => ({ ...e, id: nextId++ }));
  const merged = [...state.log, ...withIds];
  return {
    ...state,
    log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged
  };
}

const ROOT = NarrativeNodeIdCtor('call_root');

const call_accept: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'narration', text: 'You accept. The hermit nods, satisfied. Somewhere far off, a destiny adjusts its tie.' },
    { kind: 'system', systemLabel: 'STAGE', text: 'Act II — Tests, Allies, and Enemies begins.' }
  ]);
  return {
    state: {
      ...s,
      story: { ...s.story, stage: 'act_ii' },
      world: { ...s.world, flags: { ...s.world.flags, accepted_call: true } }
    },
    next: null
  };
};

const call_refuse: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    {
      kind: 'system',
      systemLabel: 'NARRATOR',
      text: '(The narrator sighs heavily, retrieves the manuscript, smooths it, and we try this again.)'
    }
  ]);
  // Plan 6 will polish this into a full crumple-and-smooth animation.
  // For Plan 3, the rewind is logical-only: we loop back to the same prompt.
  return { state: s, next: ROOT };
};

const call_insult: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'That is not, strictly speaking, in the script.' }
  ]);
  return { state: s, next: ROOT };
};

const call_cry: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'There, there.' }
  ]);
  return { state: s, next: ROOT };
};

export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  call_accept,
  call_refuse,
  call_insult,
  call_cry
};
```

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: narrative tests should now pass. All ~55 tests pass overall (51 + 4 narrative).

- [ ] **Step 4: Commit**

```bash
git add src/content/narrative/
git commit -m "Author Call narrative node + four resolvers (accept/refuse/insult/cry)"
```

---

## Task 8: Author the three story beats

**Files:**
- Modify: `src/content/story/beats.ts`

Three beats: `ordinary_world_established` (first farm visit), `hermit_beckons` (after Tax Rat defeated), `call_received` (first Crossroads visit).

- [ ] **Step 1: Replace `src/content/story/beats.ts`**

```ts
import { BeatId, EncounterId, LocationId, type StoryBeat } from '../../engine/types';

const ordinary_world_established: StoryBeat = {
  id: BeatId('ordinary_world_established'),
  stage: 'act_i',
  preconditions: [
    { kind: 'visited', locationId: LocationId('family_farm') }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'system',
        systemLabel: 'ACT',
        text: 'Act I — The Ordinary World establishes itself, with mild fanfare.'
      }
    }
  ]
};

const hermit_beckons: StoryBeat = {
  id: BeatId('hermit_beckons'),
  stage: 'act_i',
  preconditions: [
    { kind: 'flag', flag: 'defeated:first_tax_rat' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text: 'A figure waves at you from the road. He looks important. Or, at least, he looks at you in a way that strongly implies he ought to be important.'
      }
    },
    { kind: 'set_flag', flag: 'unlocked_crossroads', value: true },
    {
      kind: 'log',
      entry: {
        kind: 'system',
        systemLabel: 'PATH',
        text: 'A new exit opens at the family farm: the Dusty Crossroads.'
      }
    }
  ]
};

const call_received: StoryBeat = {
  id: BeatId('call_received'),
  stage: 'act_i',
  preconditions: [
    { kind: 'visited', locationId: LocationId('dusty_crossroads') }
  ],
  onTrigger: [
    { kind: 'trigger_encounter', encounterId: EncounterId('the_call') }
  ],
  transitionAnim: 'actMarker'
};

export const beats: Record<BeatId, StoryBeat> = {
  [ordinary_world_established.id]: ordinary_world_established,
  [hermit_beckons.id]: hermit_beckons,
  [call_received.id]: call_received
};
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: all story tests now pass. Overall test count ~55 tests.

- [ ] **Step 3: Commit**

```bash
git add src/content/story/beats.ts
git commit -m "Author three Plan 3 beats (ordinary world, hermit beckons, call received)"
```

---

## Task 9: WorldPanel — narrative-combat button bar

**Files:**
- Modify: `src/ui/WorldPanel.svelte`

In narrative-combat mode, the button bar shows the current node's choices instead of Attack/Skill/Item/Flee. Each button dispatches `ChooseNarrativeOption` with its index.

- [ ] **Step 1: Update WorldPanel.svelte script**

Add an import:
```ts
// (NarrativeNodeId is already in types if needed)
```

Add new derivations near the existing combat ones:
```ts
let inNarrativeCombat = $derived(gameStore.state.combat?.kind === 'narrative');
let inTurnCombat = $derived(gameStore.state.combat?.kind === 'turn-based');

let currentNarrativeNode = $derived.by(() => {
  if (gameStore.state.combat?.kind !== 'narrative') return null;
  return content.narrativeNodes[gameStore.state.combat.currentNodeId] ?? null;
});

function chooseOption(index: number) {
  gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: index });
}
```

The existing `inCombat` derivation should be split. Find:
```ts
let inCombat = $derived(gameStore.state.combat !== null);
```
Keep it. The new `inTurnCombat` and `inNarrativeCombat` are more specific.

Update the Combat-mode branch in the button bar to gate on `inTurnCombat` rather than just `inCombat`. Find:
```svelte
{:else if inCombat}
  <button class="btn" type="button" onclick={attack}>Attack</button>
  ...
```
Replace with:
```svelte
{:else if inTurnCombat}
  <button class="btn" type="button" onclick={attack}>Attack</button>
  ...
{:else if inNarrativeCombat && currentNarrativeNode}
  {#each currentNarrativeNode.choices as choice, idx (idx)}
    <button class="btn" type="button" onclick={() => chooseOption(idx)}>{choice.label}</button>
  {/each}
{/if}
```

(The full button-bar block: keep the existing `{#if !inCombat && currentLocation}` exploration branch, add the `{:else if inTurnCombat}` branch with the existing combat buttons, then the new `{:else if inNarrativeCombat ...}` branch. Pay attention to brace matching.)

- [ ] **Step 2: Type-check + tests**

```bash
npm run check
npm run test
```

Expected: 0 type errors, all tests pass.

- [ ] **Step 3: Smoke test in dev** (optional — automated agents skip this)

For an interactive agent: run `npm run dev`, fight the Tax Rat, walk to the Crossroads, see the Call dialog, click each of the four buttons (Accept ends and advances to Act II; Refuse/Insult/Cry loop back). Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/ui/WorldPanel.svelte
git commit -m "WorldPanel: render narrative-encounter choices as buttons (in addition to turn-based combat)"
```

---

## Task 10: Hide encounter buttons during narrative combat

**Files:**
- Modify: `src/ui/WorldPanel.svelte`

During narrative combat, the exploration encounter buttons should also be hidden — only the narrative-choice buttons appear. The current logic already hides them when `inCombat` is true (covers both combat kinds). Verify this works as-expected after Task 9's branching change.

- [ ] **Step 1: Verify the existing behavior**

The existing button bar:
```svelte
{#if !inCombat && currentLocation}
  <!-- exploration -->
{:else if inTurnCombat}
  <!-- turn-based combat -->
{:else if inNarrativeCombat && currentNarrativeNode}
  <!-- narrative -->
{/if}
```

Check that `!inCombat` still correctly excludes both combat kinds. If `inCombat` is `gameStore.state.combat !== null`, both turn-based and narrative satisfy it. ✓

- [ ] **Step 2: Confirm with a manual review**

Read the current WorldPanel.svelte after Task 9 changes. Make sure the exploration branch's `!inCombat` predicate excludes narrative combat. If not, change it to `!inTurnCombat && !inNarrativeCombat`.

- [ ] **Step 3: No commit needed if verification passes.**

If a fix was needed:
```bash
git add src/ui/WorldPanel.svelte
git commit -m "WorldPanel: hide exploration buttons during narrative combat"
```

---

## Task 11: Visible-but-disabled "Cross the threshold" exit

**Files:**
- Modify: `src/ui/WorldPanel.svelte`

The Crossroads has an exit `{ targetId: 'the_old_road', visibleIfFlag: 'crossed_threshold' }`. After accepting the Call (which sets `accepted_call` but NOT `crossed_threshold`), this exit is still hidden. We want it to appear visible-but-disabled with a tooltip.

The cleanest way: extend the Exit type with an optional `disabledTooltip` field. In Plan 3, also add a way to render an exit as visible-but-disabled when a different condition holds (e.g., visible after `accepted_call` but disabled until `crossed_threshold`).

But this is over-engineering for Plan 3. Simpler: hardcode the disabled exit in WorldPanel for the Crossroads location specifically.

Actually, even simpler: extend `Exit` with an optional `enabledIfFlag` field. If `visibleIfFlag` matches but `enabledIfFlag` doesn't, the exit renders disabled.

- [ ] **Step 1: Extend the `Exit` type in `src/engine/types.ts`**

Find:
```ts
export type Exit = {
  label: string;
  targetId: LocationId;
  visibleIfFlag?: string;
};
```

Replace with:
```ts
export type Exit = {
  label: string;
  targetId: LocationId;
  visibleIfFlag?: string;
  enabledIfFlag?: string;       // if set and not satisfied, exit shows as disabled
  disabledTooltip?: string;     // tooltip text when disabled
};
```

- [ ] **Step 2: Update the Crossroads location**

In `src/content/locations/dusty_crossroads.ts`, update the threshold exit:

```ts
exits: [
  { label: 'Back to the family farm', targetId: LocationId('family_farm') },
  {
    label: 'Cross the threshold',
    targetId: LocationId('the_old_road'),
    visibleIfFlag: 'accepted_call',           // shows after accepting
    enabledIfFlag: 'crossed_threshold',       // never enabled in Plan 3
    disabledTooltip: 'The road is yet unwritten.'
  }
]
```

- [ ] **Step 3: Update WorldPanel.svelte to render disabled exits**

Find the existing exit-rendering block:
```svelte
{#each currentLocation.exits as exit (exit.targetId)}
  {#if isExitVisible(exit.visibleIfFlag)}
    <button class="btn" type="button" onclick={() => go(exit.targetId)}>{exit.label}</button>
  {/if}
{/each}
```

Add an `isExitEnabled` helper near `isExitVisible`:
```ts
function isExitEnabled(enabledIfFlag?: string): boolean {
  if (!enabledIfFlag) return true;
  return Boolean(gameStore.state.world.flags[enabledIfFlag]);
}
```

Replace the markup:
```svelte
{#each currentLocation.exits as exit (exit.targetId)}
  {#if isExitVisible(exit.visibleIfFlag)}
    {@const enabled = isExitEnabled(exit.enabledIfFlag)}
    <button
      class="btn"
      type="button"
      disabled={!enabled}
      title={enabled ? '' : (exit.disabledTooltip ?? '')}
      onclick={() => enabled && go(exit.targetId)}
    >
      {exit.label}
    </button>
  {/if}
{/each}
```

- [ ] **Step 4: Run tests + check**

```bash
npm run check
npm run test
```

Expected: 0 type errors, all tests pass. The validation test should still pass — the threshold exit IS visible-flag-gated (`visibleIfFlag: 'accepted_call'`), so it won't trigger the "unknown location" error.

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/content/locations/dusty_crossroads.ts src/ui/WorldPanel.svelte
git commit -m "Add enabledIfFlag to exits; render visible-but-disabled exits with tooltip"
```

---

## Task 12: Final integration smoke test

- [ ] **Step 1: Full test suite, type check, build**

```bash
npm run test
npm run check
npm run build
```

Expected:
- All tests pass (~55 total)
- 0 type errors
- Build succeeds

- [ ] **Step 2: Manual playthrough verification (interactive agents only — automated agents skip)**

```bash
npm run dev
```

Walk through:
1. Start a new game (Reluctant Farmhand, any name).
2. See the Family Farm description in the log + the "ACT — The Ordinary World establishes itself..." beat fires automatically.
3. Confront the Officious Tax Rat → win.
4. After victory log, the `hermit_beckons` beat fires: "A figure waves at you from the road..." log entry, plus "PATH — A new exit opens..."
5. Button bar at the Family Farm now shows "Walk to the crossroads" exit.
6. Click it → arrive at the Dusty Crossroads, see its description, then the `call_received` beat fires → narrative encounter starts.
7. Log shows "Old Hermit — 'You must be the Chosen One...'" as a dialogue entry.
8. Button bar swaps to four narrative buttons: Accept Quest / Refuse (traditional) / Insult Hat / Cry, Briefly.
9. Click Refuse → "(The narrator sighs heavily...)" appears, prompt loops back. Click Insult Hat → "That is not, strictly speaking, in the script." Click Cry, Briefly → "There, there."
10. Click Accept Quest → "You accept..." narration + "STAGE — Act II — Tests, Allies, and Enemies begins." → encounter ends, you're back at the Crossroads.
11. World panel header now shows "Act II · Tests, Allies, and Enemies".
12. Crossroads button bar shows two exits: "Back to the family farm" (enabled) + "Cross the threshold" (disabled, tooltip "The road is yet unwritten.").
13. Refresh → state restores correctly. Settings → Consign this tale to the flames → returns to Character Creation.

Stop the dev server.

- [ ] **Step 3: Spec coverage check**

| Spec section | Implemented in Plan 3 |
|---|---|
| §3.2 Hero's-journey backbone (Acts I → II) | Tasks 1, 2, 8 |
| §3.3 Narrative-choice combat | Tasks 1, 3, 7, 9 |
| §5 Story beat system | Tasks 2, 4, 8 |
| §5.4 v1 narrative encounter (the Call) | Tasks 6, 7 |
| §6.4 Button bar narrative mode | Task 9 |
| New location authoring | Task 5 |

Deferred to later plans:
- Refusal-of-the-Call full crumple animation — Plan 6 (Polish)
- Stage-advance gilt-unfurl banner animation — Plan 6
- Crossing the Threshold beat + The Old Road location — Plan 5
- Mentor Met beat and the Hermit's Hovel location — Plan 5
- Other narrative encounters (signature-move related, story interludes) — Plans 4, 5

---

## Done definition

This plan is complete when:

1. All 12 tasks above have all checkboxes marked done.
2. `npm run dev` boots; the game flow described in Task 12 Step 2 works end-to-end.
3. `npm run test`, `npm run check`, `npm run build` all succeed cleanly.
4. The git log shows ~12-13 atomic commits, one per task (or sub-task).
