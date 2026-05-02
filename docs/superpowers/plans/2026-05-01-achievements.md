# Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an account-level achievements system with 13 initial entries, a trophy modal, and unlock toasts, persisting independently of save data and reusing the predicate evaluator.

**Architecture:** Achievements live in their own `localStorage` key (`heroicchronicle.achievements.v1`), separate from the game save. Each achievement declares a `Predicate[]` precondition; the predicate evaluator gains three new variants (`flag_at_least`, `level_at_least`, `currency_at_least`). After every reduce, the store synthesizes account-level counters into `world.flags` under an `__account.*` namespace, calls `checkAchievements`, and emits log entries + toasts for newly-unlocked ids. Five small reducer/resolver patches set per-trigger flags; one transient flag (`__just_tempted_backfire`) is drained by the store, mirroring the existing `__pending_encounter` pattern.

**Tech Stack:** TypeScript (strict), Svelte 5 (runes mode: `$state`, `$state.raw`, `$derived`, `$effect`), Vitest, @testing-library/svelte, localStorage.

**Spec:** [docs/superpowers/specs/2026-05-01-achievements-design.md](../specs/2026-05-01-achievements-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/engine/types.ts` | Modify | Add `AchievementId` brand, `Achievement` type, three numeric `Predicate` variants |
| `src/engine/story.ts` | Modify | Extend `evalPredicate` with `flag_at_least`, `level_at_least`, `currency_at_least` |
| `src/engine/achievements.ts` | Create | `AchievementsRecord` type; `loadAchievements`/`saveAchievements`/`clearAchievements`/`isUnlocked`/`checkAchievements` |
| `src/engine/combat.ts` | Modify | `endCombat` victory branch sets `achievements.first_combat_won` |
| `src/engine/progression.ts` | Modify | `applyLevelUp` skill-unlock branch sets `achievements.signature_unlocked` |
| `src/engine/events.ts` | Modify | `SetTheme` case sets `achievements.theme_moonlit` when theme is `'moonlit'` |
| `src/content/skills/resolvers.ts` | Modify | Tempt Fate sets `achievements.tempted_fate` on entry; sets transient `__just_tempted_backfire` per backfire branch |
| `src/content/achievements/index.ts` | Create | Registry of 13 achievement definitions |
| `src/content/index.ts` | Modify | Aggregate `content.achievements`; extend `validateContent` |
| `src/ui/store.svelte.ts` | Modify | Load/save achievements record; `pendingToasts: $state<Achievement[]>`; dispatch hook drains backfire, runs `checkAchievements`, emits log + toast; `forgetAchievements`, `markAchievementsOpened` |
| `src/ui/AchievementToast.svelte` | Create | Top-center stacking toast with fly+fade transitions, 4s auto-dismiss, click-to-dismiss |
| `src/ui/AchievementsModal.svelte` | Create | Modal listing earned (gilt) and locked (muted) achievements; descriptionHidden gating; hidden-footer counter |
| `src/ui/WorldPanel.svelte` | Modify | Trophy button next to compass; mount `AchievementsModal` and `AchievementToast` |
| `src/ui/SettingsModal.svelte` | Modify | "Forget thy deeds" button + crimson confirmation modal |

Tests live alongside engine code in `src/engine/__tests__/` and alongside UI code in `src/ui/__tests__/`. Integration test in `src/__tests__/`.

---

## Task 1: Extend Predicate union with three numeric variants

**Files:**
- Modify: `src/engine/types.ts` (`Predicate` union near line 356)
- Modify: `src/engine/story.ts` (`evalPredicate` switch around line 13)
- Test: `src/engine/__tests__/story.test.ts`

- [ ] **Step 1: Write failing tests for three new predicate kinds**

Append to `src/engine/__tests__/story.test.ts` (inside the existing `describe('evalPredicate', ...)` block, before the closing `});`):

```ts
  it('flag_at_least returns true when numeric flag >= min', () => {
    const s = freshState();
    const base = { ...s, world: { ...s.world, flags: { count: 6 } } };
    expect(evalPredicate(base, { kind: 'flag_at_least', flag: 'count', min: 6 })).toBe(true);
    expect(evalPredicate(base, { kind: 'flag_at_least', flag: 'count', min: 7 })).toBe(false);
  });

  it('flag_at_least returns false when flag is missing or non-numeric', () => {
    const s = freshState();
    expect(evalPredicate(s, { kind: 'flag_at_least', flag: 'absent', min: 1 })).toBe(false);
    const sStr = { ...s, world: { ...s.world, flags: { count: 'three' } } };
    expect(evalPredicate(sStr, { kind: 'flag_at_least', flag: 'count', min: 1 })).toBe(false);
  });

  it('level_at_least returns true when character.level >= level', () => {
    const s = freshState();
    const at2 = { ...s, character: { ...s.character, level: 2 } };
    expect(evalPredicate(s, { kind: 'level_at_least', level: 2 })).toBe(false);
    expect(evalPredicate(at2, { kind: 'level_at_least', level: 2 })).toBe(true);
    expect(evalPredicate(at2, { kind: 'level_at_least', level: 3 })).toBe(false);
  });

  it('currency_at_least returns true when character.currency >= n', () => {
    const s = freshState();
    const rich = { ...s, character: { ...s.character, currency: 100 } };
    expect(evalPredicate(s, { kind: 'currency_at_least', n: 100 })).toBe(false);
    expect(evalPredicate(rich, { kind: 'currency_at_least', n: 100 })).toBe(true);
    expect(evalPredicate(rich, { kind: 'currency_at_least', n: 101 })).toBe(false);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/engine/__tests__/story.test.ts`
Expected: 4 new tests fail with TS errors / undefined predicate kinds.

- [ ] **Step 3: Extend the Predicate union**

In `src/engine/types.ts`, replace the existing `Predicate` union (around line 356) with:

```ts
export type Predicate =
  | { kind: 'flag'; flag: string; equals?: boolean | number | string }
  | { kind: 'visited'; locationId: LocationId }
  | { kind: 'beat_completed'; beatId: BeatId }
  | { kind: 'stage'; stage: ActId }
  | { kind: 'flag_at_least'; flag: string; min: number }
  | { kind: 'level_at_least'; level: number }
  | { kind: 'currency_at_least'; n: number };
```

- [ ] **Step 4: Implement the three new branches in evalPredicate**

In `src/engine/story.ts`, replace the existing `evalPredicate` body with:

```ts
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
    case 'flag_at_least': {
      const v = state.world.flags[p.flag];
      return typeof v === 'number' && v >= p.min;
    }
    case 'level_at_least':
      return state.character.level >= p.level;
    case 'currency_at_least':
      return state.character.currency >= p.n;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/engine/__tests__/story.test.ts`
Expected: all `evalPredicate` tests pass (existing 5 + new 4).

- [ ] **Step 6: Run typecheck to verify no shape regressions**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/story.ts src/engine/__tests__/story.test.ts
git commit -m "feat(engine): add flag_at_least/level_at_least/currency_at_least predicates"
```

---

## Task 2: Achievement types and persistence module

**Files:**
- Modify: `src/engine/types.ts` (append `Achievement` type and `AchievementId` brand)
- Create: `src/engine/achievements.ts`
- Test: `src/engine/__tests__/achievements.test.ts`

- [ ] **Step 1: Add Achievement types to types.ts**

Append to `src/engine/types.ts` (after the existing `Predicate` and `StoryBeat` types, end of file):

```ts
// =====================================================================
// Achievements (Plan 4.5)
// =====================================================================

export type AchievementId = Brand<string, 'AchievementId'>;
export const AchievementId = (s: string) => s as AchievementId;

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;          // gated for descriptionHidden until earned
  preconditions: Predicate[];   // ALL must be true
  hidden?: boolean;             // entry invisible in panel until earned
  descriptionHidden?: boolean;  // name visible but description = "?" until earned
};
```

- [ ] **Step 2: Write failing tests for persistence + isUnlocked**

Create `src/engine/__tests__/achievements.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadAchievements,
  saveAchievements,
  clearAchievements,
  isUnlocked,
  type AchievementsRecord
} from '../achievements';
import { AchievementId } from '../types';

const KEY = 'heroicchronicle.achievements.v1';

function fresh(): AchievementsRecord {
  return {
    unlocked: [],
    played_classes: [],
    tempt_fate_backfires_seen: [],
    unlockedCountAtLastOpen: 0
  };
}

describe('achievements persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadAchievements returns a default record when no key is set', () => {
    expect(loadAchievements()).toEqual(fresh());
  });

  it('saveAchievements + loadAchievements round-trip', () => {
    const r: AchievementsRecord = {
      unlocked: [AchievementId('first_blood')],
      played_classes: ['reluctant_farmhand'],
      tempt_fate_backfires_seen: ['trip', 'crit_yourself'],
      unlockedCountAtLastOpen: 1
    };
    saveAchievements(r);
    expect(loadAchievements()).toEqual(r);
  });

  it('loadAchievements returns default when stored value is corrupted', () => {
    localStorage.setItem(KEY, 'not-json{');
    expect(loadAchievements()).toEqual(fresh());
  });

  it('loadAchievements returns default when stored value is missing required fields', () => {
    localStorage.setItem(KEY, JSON.stringify({ unlocked: [] }));
    expect(loadAchievements()).toEqual(fresh());
  });

  it('clearAchievements removes the localStorage key', () => {
    saveAchievements({
      unlocked: [AchievementId('first_blood')],
      played_classes: [],
      tempt_fate_backfires_seen: [],
      unlockedCountAtLastOpen: 0
    });
    clearAchievements();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(loadAchievements()).toEqual(fresh());
  });

  it('isUnlocked returns true iff id is in unlocked list', () => {
    const r: AchievementsRecord = {
      unlocked: [AchievementId('a'), AchievementId('b')],
      played_classes: [],
      tempt_fate_backfires_seen: [],
      unlockedCountAtLastOpen: 0
    };
    expect(isUnlocked(r, AchievementId('a'))).toBe(true);
    expect(isUnlocked(r, AchievementId('c'))).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/engine/__tests__/achievements.test.ts`
Expected: module-not-found for `../achievements`.

- [ ] **Step 4: Implement the achievements module (persistence + isUnlocked stubs)**

Create `src/engine/achievements.ts`:

```ts
import type { AchievementId, GameState } from './types';

const STORAGE_KEY = 'heroicchronicle.achievements.v1';

export type AchievementsRecord = {
  unlocked: AchievementId[];
  played_classes: string[];
  tempt_fate_backfires_seen: string[];
  unlockedCountAtLastOpen: number;
};

export function defaultRecord(): AchievementsRecord {
  return {
    unlocked: [],
    played_classes: [],
    tempt_fate_backfires_seen: [],
    unlockedCountAtLastOpen: 0
  };
}

function isValidShape(v: unknown): v is AchievementsRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    Array.isArray(r['unlocked']) &&
    Array.isArray(r['played_classes']) &&
    Array.isArray(r['tempt_fate_backfires_seen']) &&
    typeof r['unlockedCountAtLastOpen'] === 'number'
  );
}

export function loadAchievements(): AchievementsRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRecord();
    const parsed = JSON.parse(raw);
    if (!isValidShape(parsed)) return defaultRecord();
    return parsed;
  } catch {
    return defaultRecord();
  }
}

export function saveAchievements(record: AchievementsRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* quota exceeded / private mode — ignore */
  }
}

export function clearAchievements(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isUnlocked(record: AchievementsRecord, id: AchievementId): boolean {
  return record.unlocked.includes(id);
}

// checkAchievements is added in Task 3.
export function checkAchievements(
  _state: GameState,
  record: AchievementsRecord
): { record: AchievementsRecord; newlyUnlocked: AchievementId[] } {
  return { record, newlyUnlocked: [] };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/engine/__tests__/achievements.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/achievements.ts src/engine/__tests__/achievements.test.ts
git commit -m "feat(engine): add Achievement types and persistence module"
```

---

## Task 3: checkAchievements with virtual flags

**Files:**
- Modify: `src/engine/achievements.ts` (replace stub `checkAchievements`)
- Test: `src/engine/__tests__/achievements.test.ts` (append)

- [ ] **Step 1: Write failing tests for checkAchievements**

Append to `src/engine/__tests__/achievements.test.ts`:

```ts
import { checkAchievements } from '../achievements';
import { createInitialState } from '../state';
import { content } from '../../content';
import { ClassId } from '../types';

describe('checkAchievements', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function withCharacter() {
    let s = createInitialState(1);
    s = { ...s, character: { ...s.character, name: 'T', classId: ClassId('reluctant_farmhand'), level: 1 } };
    return s;
  }

  it('returns no newlyUnlocked when no preconditions are met', () => {
    const s = withCharacter();
    const r = fresh();
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toEqual([]);
    expect(out.record).toEqual(r);
  });

  it('unlocks an achievement whose flag predicate is satisfied', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.first_combat_won': true } }
    };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('first_blood'));
    expect(out.record.unlocked).toContain(AchievementId('first_blood'));
  });

  it('does not re-unlock an already-unlocked achievement', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.first_combat_won': true } }
    };
    const r: AchievementsRecord = {
      ...fresh(),
      unlocked: [AchievementId('first_blood')]
    };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toEqual([]);
  });

  it('synthesizes __account.played_classes.count as a virtual flag', () => {
    const s = withCharacter();
    const r: AchievementsRecord = {
      ...fresh(),
      played_classes: ['reluctant_farmhand', 'disgraced_knight', 'accidental_wizard', 'bard']
    };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toContain(AchievementId('the_tetralogy'));
  });

  it('synthesizes __account.backfires_seen.count for six_cosmic_chuckles', () => {
    const s = withCharacter();
    const r: AchievementsRecord = {
      ...fresh(),
      tempt_fate_backfires_seen: ['trip', 'crit_yourself', 'weapon_mute', 'drop_shield', 'free_retaliation', 'wasted_prophecy']
    };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toContain(AchievementId('six_cosmic_chuckles'));
  });

  it('does not mutate the input record', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.first_combat_won': true } }
    };
    const r = fresh();
    const before = JSON.stringify(r);
    checkAchievements(s, r);
    expect(JSON.stringify(r)).toBe(before);
  });

  it('appends newly-unlocked ids in registry order, dedup-safe', () => {
    const s = {
      ...withCharacter(),
      character: { ...withCharacter().character, level: 2, currency: 100 }
    };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('degree_of_heroism'));
    expect(out.newlyUnlocked).toContain(AchievementId('worth_their_salt'));
  });

  it('integration smoke: content.achievements is populated and contains first_blood', () => {
    expect(content.achievements[AchievementId('first_blood')]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/__tests__/achievements.test.ts`
Expected: tests fail because `content.achievements` is empty (Task 4 fills it) AND because checkAchievements returns empty. The `content.achievements` reference will fail to compile until Task 4. **For now, comment out the final `integration smoke` test and delete the import-test, then run.** Re-enable in Task 4.

Actually — to keep tests shippable per task without forward dependencies, replace the final test in Step 1 above with this minimal substitute that does NOT depend on `content.achievements`:

```ts
  it('runs against an empty registry without throwing', () => {
    // (Once Task 4 ships content.achievements, this test gets richer.)
    const s = withCharacter();
    expect(() => checkAchievements(s, fresh())).not.toThrow();
  });
```

And remove the `import { content }` line. The other tests that reference specific achievement ids (e.g. `first_blood`, `the_tetralogy`) will fail until Task 4 — that's intentional. We make them pass at the end of Task 4.

For Task 3's red-green cycle, we will only ship a subset of tests now. **Replace Step 1's tests with the simpler set below, and add the others in Task 4 once the registry exists:**

```ts
describe('checkAchievements', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function withCharacter() {
    let s = createInitialState(1);
    s = { ...s, character: { ...s.character, name: 'T', classId: ClassId('reluctant_farmhand'), level: 1 } };
    return s;
  }

  it('returns no newlyUnlocked when registry is empty', () => {
    const s = withCharacter();
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toEqual([]);
  });

  it('does not mutate the input record', () => {
    const s = withCharacter();
    const r = fresh();
    const before = JSON.stringify(r);
    checkAchievements(s, r);
    expect(JSON.stringify(r)).toBe(before);
  });
});
```

(Also remove `import { content }` from the test file imports for Task 3. The richer tests come back in Task 4.)

- [ ] **Step 3: Implement checkAchievements with virtual flags**

In `src/engine/achievements.ts`, replace the stub `checkAchievements` and add an import for `content` and `evalPredicate`:

```ts
import { content } from '../content';
import { evalPredicate } from './story';
import type { AchievementId, GameState, Achievement } from './types';
```

Replace the `checkAchievements` function:

```ts
export function checkAchievements(
  state: GameState,
  record: AchievementsRecord
): { record: AchievementsRecord; newlyUnlocked: AchievementId[] } {
  // Synthesize account-level counters as virtual flags so the existing
  // predicate evaluator can reach them via flag_at_least.
  const virtualState: GameState = {
    ...state,
    world: {
      ...state.world,
      flags: {
        ...state.world.flags,
        '__account.played_classes.count': record.played_classes.length,
        '__account.backfires_seen.count': record.tempt_fate_backfires_seen.length
      }
    }
  };

  const newlyUnlocked: AchievementId[] = [];
  const already = new Set(record.unlocked);

  for (const ach of Object.values(content.achievements) as Achievement[]) {
    if (already.has(ach.id)) continue;
    const allMet = ach.preconditions.every((p) => evalPredicate(virtualState, p));
    if (allMet) newlyUnlocked.push(ach.id);
  }

  if (newlyUnlocked.length === 0) return { record, newlyUnlocked: [] };

  const nextRecord: AchievementsRecord = {
    ...record,
    unlocked: [...record.unlocked, ...newlyUnlocked]
  };
  return { record: nextRecord, newlyUnlocked };
}
```

Note: this references `content.achievements`, which is wired in Task 4. To keep this task green standalone, also add a temporary safety inside the loop:

```ts
  const registry = (content as { achievements?: Record<string, Achievement> }).achievements ?? {};
  for (const ach of Object.values(registry) as Achievement[]) {
```

(Once Task 4 lands `content.achievements`, this guard becomes a harmless no-op.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/__tests__/achievements.test.ts`
Expected: 8 tests pass (6 from Task 2 + 2 from this task).

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/engine/achievements.ts src/engine/__tests__/achievements.test.ts
git commit -m "feat(engine): checkAchievements with virtual __account.* flag synthesis"
```

---

## Task 4: Achievement content registry (13 entries)

**Files:**
- Create: `src/content/achievements/index.ts`
- Modify: `src/content/index.ts` (add `achievements` to `content`; extend `validateContent`)
- Test: `src/engine/__tests__/achievements.test.ts` (append the richer tests from Task 3 that depend on the registry)
- Test: `src/content/__tests__/validate.test.ts` (extend to verify registry is reachable)

- [ ] **Step 1: Create the achievements registry**

Create `src/content/achievements/index.ts`:

```ts
import { AchievementId, type Achievement } from '../../engine/types';

const first_blood: Achievement = {
  id: AchievementId('first_blood'),
  name: 'First Blood',
  description: 'Win your first combat. Whatever you struck, it had it coming.',
  preconditions: [{ kind: 'flag', flag: 'achievements.first_combat_won' }]
};

const degree_of_heroism: Achievement = {
  id: AchievementId('degree_of_heroism'),
  name: 'Degree of Heroism',
  description: 'Reach the Second Degree of Heroism.',
  preconditions: [{ kind: 'level_at_least', level: 2 }]
};

const signature_move: Achievement = {
  id: AchievementId('signature_move'),
  name: 'Signature Move',
  description: "Unlock your class's signature skill.",
  preconditions: [{ kind: 'flag', flag: 'achievements.signature_unlocked' }]
};

const worth_their_salt: Achievement = {
  id: AchievementId('worth_their_salt'),
  name: 'Worth Their Salt',
  description: 'Carry 100 leaves at once.',
  preconditions: [{ kind: 'currency_at_least', n: 100 }]
};

const tempt_fate: Achievement = {
  id: AchievementId('tempt_fate'),
  name: 'Tempt Fate',
  description: 'Wink at the universe at least once.',
  preconditions: [{ kind: 'flag', flag: 'achievements.tempted_fate' }]
};

const six_cosmic_chuckles: Achievement = {
  id: AchievementId('six_cosmic_chuckles'),
  name: 'Six Cosmic Chuckles',
  description: 'Witness all six Tempt Fate backfires across your runs.',
  preconditions: [{ kind: 'flag_at_least', flag: '__account.backfires_seen.count', min: 6 }]
};

const moonlit: Achievement = {
  id: AchievementId('moonlit'),
  name: 'Moonlit',
  description: 'Switch to the Moonlit theme.',
  preconditions: [{ kind: 'flag', flag: 'achievements.theme_moonlit' }]
};

const refused_sincerely: Achievement = {
  id: AchievementId('refused_sincerely'),
  name: 'Refused, Sincerely',
  description: 'You refused four times. The narrator has gone quiet.',
  preconditions: [{ kind: 'flag_at_least', flag: 'refusal_count', min: 4 }],
  descriptionHidden: true
};

const insulted_the_hat: Achievement = {
  id: AchievementId('insulted_the_hat'),
  name: 'Insulted the Hat',
  description: 'You expressed an opinion about the hat. It expressed one back.',
  preconditions: [{ kind: 'flag', flag: 'insulted_hermit_hat' }],
  descriptionHidden: true
};

const cried_briefly: Achievement = {
  id: AchievementId('cried_briefly'),
  name: 'Cried, Briefly',
  description: 'You wept your share. Briefly. Politely. Tunefully.',
  preconditions: [{ kind: 'flag', flag: 'cried_at_hermit' }],
  descriptionHidden: true
};

const the_tetralogy: Achievement = {
  id: AchievementId('the_tetralogy'),
  name: 'The Tetralogy',
  description: 'Have played all four classes.',
  preconditions: [{ kind: 'flag_at_least', flag: '__account.played_classes.count', min: 4 }]
};

const on_schedule: Achievement = {
  id: AchievementId('on_schedule'),
  name: 'On Schedule',
  description: 'On schedule, more or less.',
  preconditions: [{ kind: 'flag', flag: 'achievement_seed.on_schedule' }],
  hidden: true
};

const page_counted: Achievement = {
  id: AchievementId('page_counted'),
  name: 'Page Counted',
  description: "You noticed something the manuscript wasn't supposed to show.",
  preconditions: [{ kind: 'flag', flag: 'achievement_seed.page_counted' }],
  hidden: true
};

const glimpsed_the_editor: Achievement = {
  id: AchievementId('glimpsed_the_editor'),
  name: 'Glimpsed the Editor',
  description: 'Out of the corner of your eye, a man you have not been introduced to.',
  preconditions: [{ kind: 'flag', flag: 'achievement_seed.glimpsed_editor' }],
  hidden: true
};

// Registry order is the panel's "locked, in author order" sort. Earned
// achievements are sorted by earn order separately.
export const achievements: Record<AchievementId, Achievement> = {
  [first_blood.id]: first_blood,
  [degree_of_heroism.id]: degree_of_heroism,
  [signature_move.id]: signature_move,
  [worth_their_salt.id]: worth_their_salt,
  [tempt_fate.id]: tempt_fate,
  [six_cosmic_chuckles.id]: six_cosmic_chuckles,
  [moonlit.id]: moonlit,
  [refused_sincerely.id]: refused_sincerely,
  [insulted_the_hat.id]: insulted_the_hat,
  [cried_briefly.id]: cried_briefly,
  [the_tetralogy.id]: the_tetralogy,
  [on_schedule.id]: on_schedule,
  [page_counted.id]: page_counted,
  [glimpsed_the_editor.id]: glimpsed_the_editor
};
```

- [ ] **Step 2: Aggregate the registry into content + extend validateContent**

In `src/content/index.ts`, add the import and aggregation:

```ts
import type {
  // ...existing imports unchanged...
  Achievement, AchievementId
} from '../engine/types';

// ...existing imports unchanged...
import { achievements } from './achievements';

export const content = {
  // ...existing keys unchanged...
  narrativeResolvers: narrativeResolvers as Record<NarrativeResolverId, NarrativeResolver>,
  achievements: achievements as Record<AchievementId, Achievement>
};
```

In the same file, extend `validateContent` by adding (before the `if (errors.length > 0)` block):

```ts
  // Achievement preconditions reference known beats/stages where statically
  // determinable. Flag predicates are not validated (achievement_seed.* flags
  // are intentionally unset by current code; Plan 5+ owns them).
  for (const ach of Object.values(content.achievements)) {
    for (const p of ach.preconditions) {
      if (p.kind === 'beat_completed' && !(p.beatId in content.beats)) {
        errors.push(`Achievement ${ach.id} references unknown beat ${p.beatId}.`);
      }
    }
  }
```

- [ ] **Step 3: Append the richer registry-dependent tests to achievements.test.ts**

Append at the bottom of `src/engine/__tests__/achievements.test.ts`:

```ts
import { content } from '../../content';

describe('checkAchievements with the live registry', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function withCharacter() {
    let s = createInitialState(1);
    s = { ...s, character: { ...s.character, name: 'T', classId: ClassId('reluctant_farmhand'), level: 1 } };
    return s;
  }

  it('exposes 14 entries (13 spec achievements; future-safe assertion >= 13)', () => {
    expect(Object.keys(content.achievements).length).toBeGreaterThanOrEqual(13);
  });

  it('unlocks first_blood when achievements.first_combat_won is set', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.first_combat_won': true } }
    };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('first_blood'));
  });

  it('does not re-fire an already-unlocked achievement', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.first_combat_won': true } }
    };
    const r: AchievementsRecord = { ...fresh(), unlocked: [AchievementId('first_blood')] };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toEqual([]);
  });

  it('unlocks degree_of_heroism at level >= 2', () => {
    const s = { ...withCharacter(), character: { ...withCharacter().character, level: 2 } };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('degree_of_heroism'));
  });

  it('unlocks signature_move on the achievements.signature_unlocked flag', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.signature_unlocked': true } }
    };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('signature_move'));
  });

  it('unlocks worth_their_salt when currency >= 100', () => {
    const s = { ...withCharacter(), character: { ...withCharacter().character, currency: 100 } };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('worth_their_salt'));
  });

  it('unlocks tempt_fate on the achievements.tempted_fate flag', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.tempted_fate': true } }
    };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('tempt_fate'));
  });

  it('unlocks six_cosmic_chuckles when 6 distinct backfires are recorded', () => {
    const s = withCharacter();
    const r: AchievementsRecord = {
      ...fresh(),
      tempt_fate_backfires_seen: ['trip', 'crit_yourself', 'weapon_mute', 'drop_shield', 'free_retaliation', 'wasted_prophecy']
    };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toContain(AchievementId('six_cosmic_chuckles'));
  });

  it('unlocks moonlit on the achievements.theme_moonlit flag', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.theme_moonlit': true } }
    };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('moonlit'));
  });

  it('unlocks refused_sincerely when refusal_count >= 4', () => {
    const s = { ...withCharacter(), world: { ...withCharacter().world, flags: { refusal_count: 4 } } };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('refused_sincerely'));
  });

  it('unlocks insulted_the_hat on the insulted_hermit_hat flag', () => {
    const s = { ...withCharacter(), world: { ...withCharacter().world, flags: { insulted_hermit_hat: true } } };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('insulted_the_hat'));
  });

  it('unlocks cried_briefly on the cried_at_hermit flag', () => {
    const s = { ...withCharacter(), world: { ...withCharacter().world, flags: { cried_at_hermit: true } } };
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).toContain(AchievementId('cried_briefly'));
  });

  it('unlocks the_tetralogy when 4 classes have been played', () => {
    const s = withCharacter();
    const r: AchievementsRecord = {
      ...fresh(),
      played_classes: ['reluctant_farmhand', 'disgraced_knight', 'accidental_wizard', 'bard']
    };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toContain(AchievementId('the_tetralogy'));
  });

  it('unlocks each spine seed when its achievement_seed.* flag is manually set', () => {
    for (const [id, flag] of [
      ['on_schedule', 'achievement_seed.on_schedule'],
      ['page_counted', 'achievement_seed.page_counted'],
      ['glimpsed_the_editor', 'achievement_seed.glimpsed_editor']
    ] as const) {
      const s = { ...withCharacter(), world: { ...withCharacter().world, flags: { [flag]: true } } };
      const out = checkAchievements(s, fresh());
      expect(out.newlyUnlocked).toContain(AchievementId(id));
    }
  });

  it('does not fire spine seeds in default state', () => {
    const s = withCharacter();
    const out = checkAchievements(s, fresh());
    expect(out.newlyUnlocked).not.toContain(AchievementId('on_schedule'));
    expect(out.newlyUnlocked).not.toContain(AchievementId('page_counted'));
    expect(out.newlyUnlocked).not.toContain(AchievementId('glimpsed_the_editor'));
  });
});
```

- [ ] **Step 4: Run all engine tests**

Run: `npx vitest run src/engine/__tests__/`
Expected: all achievements tests pass (~22 total in this file); story tests still pass.

- [ ] **Step 5: Run validation test**

Run: `npx vitest run src/content/__tests__/validate.test.ts`
Expected: pass — no false positives from the new validation branch.

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/content/achievements/ src/content/index.ts src/engine/__tests__/achievements.test.ts
git commit -m "feat(content): add 13 initial achievements + registry validation"
```

---

## Task 5: Wire engine flags (first_blood, signature_move, moonlit)

**Files:**
- Modify: `src/engine/combat.ts` (`endCombat` victory branch)
- Modify: `src/engine/progression.ts` (`applyLevelUp` skill-unlock branch)
- Modify: `src/engine/events.ts` (`SetTheme` case)
- Test: `src/engine/__tests__/combat.test.ts` (append)
- Test: `src/engine/__tests__/progression.test.ts` (append)
- Test: `src/engine/__tests__/state.test.ts` or `events.test.ts` (locate the moonlit test)

- [ ] **Step 1: Write a failing test for the first_combat_won flag**

In `src/engine/__tests__/combat.test.ts` (or create the file if absent — see existing test for shape), add:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../events';
import { createInitialState } from '../state';
import { ClassId, EncounterId, type GameState } from '../types';

describe('endCombat victory side-effects (achievements)', () => {
  it('sets achievements.first_combat_won to true on first victory', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    // Force a one-shot KO via direct state manipulation, then run a player action that triggers endCombat.
    if (s.combat?.kind !== 'turn-based') throw new Error('expected turn-based combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;
    const wounded: GameState = {
      ...s,
      combat: {
        ...s.combat,
        combatants: s.combat.combatants.map((c) => (c.id === monsterId ? { ...c, hp: 1 } : c))
      }
    };
    const after = reduce(wounded, { kind: 'AttackTarget' });
    expect(after.world.flags['achievements.first_combat_won']).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/__tests__/combat.test.ts -t 'first_combat_won'`
Expected: fails — flag is undefined.

- [ ] **Step 3: Set the flag in endCombat's victory branch**

In `src/engine/combat.ts`, inside `endCombat`, locate the `if (result === 'victory')` block. After `s = { ...s, combat: null };` and before the `defeatedFlavor` push (or right before the `defeated:<id>` flag write near the end of the victory branch), add:

```ts
    // Achievement seed: first_blood fires off this flag.
    s = {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, 'achievements.first_combat_won': true }
      }
    };
```

The exact insertion point: just inside `if (result === 'victory') {`, immediately after the existing line `const monster = content.monsters[encounter.monsterId];` (so the flag is set before any logging or loot rolls — order does not matter, but earlier is cleaner).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/__tests__/combat.test.ts -t 'first_combat_won'`
Expected: pass.

- [ ] **Step 5: Write a failing test for the signature_unlocked flag**

In `src/engine/__tests__/progression.test.ts`, append:

```ts
describe('applyLevelUp signature_unlocked side-effect', () => {
  it('sets achievements.signature_unlocked when signature skill unlocks', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    // Drive level up to unlock-level (3) by injecting xp and triggering the threshold loop via a victory.
    // Simpler: call applyLevelUp directly twice (level 1 -> 2 -> 3) since unlockLevel is 3.
    s = applyLevelUp(s); // 1 -> 2
    s = applyLevelUp(s); // 2 -> 3 — signature unlocks
    expect(s.character.knownSkills.length).toBeGreaterThan(0);
    expect(s.world.flags['achievements.signature_unlocked']).toBe(true);
  });
});
```

(Add `import { applyLevelUp } from '../progression';` and `import { reduce } from '../events';` and `import { createInitialState } from '../state';` and `import { ClassId } from '../types';` if they aren't already imported.)

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/engine/__tests__/progression.test.ts -t 'signature_unlocked'`
Expected: fails — flag is undefined.

- [ ] **Step 7: Set the flag in applyLevelUp's skill-unlock branch**

In `src/engine/progression.ts`, inside `applyLevelUp`, the existing skill-unlock branch is the `if (cls)` block that pushes the skill onto `knownSkills` and logs the SKILL line. After the `s = appendLog(s, { ... })` line for the SKILL log entry and before the closing `}` of the `if (skill && skill.unlockLevel === newLevel ...)` block, add:

```ts
        s = {
          ...s,
          world: {
            ...s.world,
            flags: { ...s.world.flags, 'achievements.signature_unlocked': true }
          }
        };
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/engine/__tests__/progression.test.ts -t 'signature_unlocked'`
Expected: pass.

- [ ] **Step 9: Write a failing test for the theme_moonlit flag**

Create or extend `src/engine/__tests__/events.test.ts` (if the file doesn't exist, create it). Append:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../events';
import { createInitialState } from '../state';

describe('SetTheme moonlit achievement seed', () => {
  it('sets achievements.theme_moonlit when theme switches to moonlit', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'SetTheme', theme: 'moonlit' });
    expect(s.world.flags['achievements.theme_moonlit']).toBe(true);
  });

  it('does not set the flag when theme stays parchment', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'SetTheme', theme: 'parchment' });
    expect(s.world.flags['achievements.theme_moonlit']).toBeUndefined();
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/engine/__tests__/events.test.ts`
Expected: fails — flag is undefined on moonlit switch.

- [ ] **Step 11: Set the flag in the SetTheme case**

In `src/engine/events.ts`, replace the `SetTheme` case with:

```ts
    case 'SetTheme': {
      const next = { ...state, settings: { ...state.settings, theme: event.theme } };
      if (event.theme === 'moonlit') {
        return {
          ...next,
          world: {
            ...next.world,
            flags: { ...next.world.flags, 'achievements.theme_moonlit': true }
          }
        };
      }
      return next;
    }
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/engine/__tests__/events.test.ts`
Expected: pass.

- [ ] **Step 13: Run the full engine test suite to confirm nothing regressed**

Run: `npx vitest run src/engine/__tests__/`
Expected: all pass.

- [ ] **Step 14: Commit**

```bash
git add src/engine/combat.ts src/engine/progression.ts src/engine/events.ts src/engine/__tests__/
git commit -m "feat(engine): wire achievement flags for first_blood, signature_move, moonlit"
```

---

## Task 6: Wire Tempt Fate achievement flags

**Files:**
- Modify: `src/content/skills/resolvers.ts` (Tempt Fate resolver)
- Test: `src/content/skills/__tests__/resolvers.test.ts` (append)

- [ ] **Step 1: Write failing tests for tempted_fate and __just_tempted_backfire**

In `src/content/skills/__tests__/resolvers.test.ts`, append:

```ts
describe('Tempt Fate achievement seeds', () => {
  it('sets achievements.tempted_fate on use', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };
    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
    expect(s.world.flags['achievements.tempted_fate']).toBe(true);
  });

  it('sets __just_tempted_backfire to a known kind on backfire', () => {
    // Seed 7 produces a low d100 in this RNG — exact value depends on rng impl,
    // so we run many trials, asserting at least one fires the transient flag and
    // it is one of the known backfire kinds.
    const KNOWN = new Set(['trip', 'crit_yourself', 'weapon_mute', 'drop_shield', 'free_retaliation', 'wasted_prophecy']);
    let observed: string | null = null;
    for (let seed = 1; seed <= 200 && observed === null; seed++) {
      let s = createInitialState(seed);
      s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
      s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
      s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };
      s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
      const v = s.world.flags['__just_tempted_backfire'];
      if (typeof v === 'string') observed = v;
    }
    expect(observed).not.toBeNull();
    expect(KNOWN.has(observed!)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/content/skills/__tests__/resolvers.test.ts -t 'achievement seeds'`
Expected: both tests fail — flags are undefined.

- [ ] **Step 3: Set tempted_fate at the top of the Tempt Fate resolver**

In `src/content/skills/resolvers.ts`, inside the `registerSkillResolver('tempt_fate', (state) => { ... })` body, replace the first line (`if (state.combat?.kind !== 'turn-based') return state;`) with:

```ts
  if (state.combat?.kind !== 'turn-based') return state;

  // Achievement seed: any use of Tempt Fate sets this flag (sticky).
  state = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, 'achievements.tempted_fate': true }
    }
  };
```

- [ ] **Step 4: Set __just_tempted_backfire in each backfire branch**

In the same resolver, inside the `switch (pick.value)` block, add a `s = { ... }` line that sets `__just_tempted_backfire` at the start of EACH case before its existing logic. The cleanest way: replace the whole `switch (pick.value) { ... }` block with one that sets the flag once, before the switch:

```ts
  // Record the backfire kind so the store can drain it into the account-level
  // tempt_fate_backfires_seen counter (mirrors the __pending_encounter pattern).
  s = {
    ...s,
    world: {
      ...s.world,
      flags: { ...s.world.flags, __just_tempted_backfire: pick.value }
    }
  };

  switch (pick.value) {
    // ...existing cases unchanged...
  }
```

(Insert the new `s = { ... }` block immediately after `const pick = rng.pick(s.rng, BACKFIRES);` and `s = { ...s, rng: pick.state };` and before `switch (pick.value) {`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/content/skills/__tests__/resolvers.test.ts -t 'achievement seeds'`
Expected: both pass.

- [ ] **Step 6: Run the full skill resolver test suite**

Run: `npx vitest run src/content/skills/__tests__/resolvers.test.ts`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/content/skills/resolvers.ts src/content/skills/__tests__/resolvers.test.ts
git commit -m "feat(skills): Tempt Fate sets tempted_fate + transient backfire flag"
```

---

## Task 7: Store integration

**Files:**
- Modify: `src/ui/store.svelte.ts`
- Test: `src/ui/__tests__/store.test.ts` (create)

- [ ] **Step 1: Write failing tests for the store dispatch hook**

Create `src/ui/__tests__/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../store.svelte';
import { ClassId, EncounterId, AchievementId, type SkillId } from '../../engine/types';
import { loadAchievements } from '../../engine/achievements';

describe('store achievements integration', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('records the played class on StartNewGame', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    expect(gameStore.achievements.played_classes).toContain('reluctant_farmhand');
  });

  it('does not double-add the same played class', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    expect(gameStore.achievements.played_classes.filter((c) => c === 'reluctant_farmhand').length).toBe(1);
  });

  it('queues a toast and writes a system log entry when an achievement unlocks', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));
    expect(gameStore.pendingToasts.some((a) => a.id === AchievementId('moonlit'))).toBe(true);
    const sysEntry = gameStore.state.log.find(
      (e) => e.kind === 'system' && e.systemLabel === 'ACHIEVEMENT' && e.text.includes('Moonlit')
    );
    expect(sysEntry).toBeDefined();
  });

  it('persists the achievements record to localStorage', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    const persisted = loadAchievements();
    expect(persisted.unlocked).toContain(AchievementId('moonlit'));
  });

  it('drains __just_tempted_backfire into tempt_fate_backfires_seen and clears the flag', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    gameStore.state = { ...gameStore.state, character: { ...gameStore.state.character, knownSkills: ['tempt_fate' as SkillId] } };

    let firedKind: string | null = null;
    for (let i = 0; i < 200 && firedKind === null; i++) {
      gameStore.dispatch({ kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
      // After the dispatch, the transient flag must already be drained from state.
      expect(gameStore.state.world.flags['__just_tempted_backfire']).toBeUndefined();
      const seen = gameStore.achievements.tempt_fate_backfires_seen;
      if (seen.length > 0) firedKind = seen[seen.length - 1] ?? null;
      // Restart combat for repeated trials (the pell may have died).
      if (gameStore.state.combat === null) {
        gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
      }
    }
    expect(firedKind).not.toBeNull();
  });

  it('forgetAchievements clears the in-memory record and localStorage', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked.length).toBeGreaterThan(0);
    gameStore.forgetAchievements();
    expect(gameStore.achievements.unlocked.length).toBe(0);
    expect(localStorage.getItem('heroicchronicle.achievements.v1')).toBeNull();
  });

  it('markAchievementsOpened sets unlockedCountAtLastOpen to current length', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked.length).toBeGreaterThan(0);
    gameStore.markAchievementsOpened();
    expect(gameStore.achievements.unlockedCountAtLastOpen).toBe(gameStore.achievements.unlocked.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/__tests__/store.test.ts`
Expected: tests fail because `gameStore.achievements`, `gameStore.pendingToasts`, `gameStore.forgetAchievements`, `gameStore.markAchievementsOpened` do not exist.

- [ ] **Step 3: Replace `src/ui/store.svelte.ts` with the integrated version**

Replace the entire contents of `src/ui/store.svelte.ts` with:

```ts
import { reduce, type GameEvent } from '../engine/events';
import { createInitialState } from '../engine/state';
import { serialize, deserialize, SaveLoadError } from '../engine/save';
import { applyTheme, loadStoredTheme, storeTheme, applyTextSize } from './theme';
import {
  loadAchievements, saveAchievements, clearAchievements, checkAchievements,
  type AchievementsRecord
} from '../engine/achievements';
import { content } from '../content';
import type { GameState, Achievement } from '../engine/types';

const SAVE_KEY = 'heroicchronicle.save.v1';
const AUTOSAVE_DEBOUNCE_MS = 500;

function loadOrCreate(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return deserialize(raw);
  } catch (e) {
    if (e instanceof SaveLoadError) {
      console.warn('Failed to load save:', e.message);
    }
  }
  return createInitialState(Date.now());
}

function persist(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    /* quota exceeded / private mode */
  }
}

function dedupedAppend<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr : [...arr, v];
}

class GameStore {
  state = $state.raw<GameState>(loadOrCreate());
  achievements = $state.raw<AchievementsRecord>(loadAchievements());
  pendingToasts = $state<Achievement[]>([]);

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const stored = loadStoredTheme();
    if (stored && stored !== this.state.settings.theme) {
      this.state = reduce(this.state, { kind: 'SetTheme', theme: stored });
    }
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
  }

  dispatch(event: GameEvent): void {
    let next = reduce(this.state, event);
    let record = this.achievements;

    // 1. StartNewGame side-effect: track played class.
    if (event.kind === 'StartNewGame') {
      record = { ...record, played_classes: dedupedAppend(record.played_classes, event.classId as string) };
    }

    // 2. Drain transient backfire flag.
    const backfire = next.world.flags['__just_tempted_backfire'];
    if (typeof backfire === 'string') {
      record = {
        ...record,
        tempt_fate_backfires_seen: dedupedAppend(record.tempt_fate_backfires_seen, backfire)
      };
      const cleared = { ...next.world.flags };
      delete (cleared as Record<string, unknown>)['__just_tempted_backfire'];
      next = { ...next, world: { ...next.world, flags: cleared } };
    }

    // 3. Run the achievement check.
    const result = checkAchievements(next, record);
    record = result.record;

    // 4. For each newly-unlocked: log entry + toast queue.
    if (result.newlyUnlocked.length > 0) {
      const toAdd: Achievement[] = [];
      for (const id of result.newlyUnlocked) {
        const ach = content.achievements[id];
        if (!ach) continue;
        toAdd.push(ach);
        const lastId = next.log.length === 0 ? 0 : next.log[next.log.length - 1]!.id;
        next = {
          ...next,
          log: [
            ...next.log,
            {
              id: lastId + 1,
              kind: 'system',
              systemLabel: 'ACHIEVEMENT',
              text: `✦ ${ach.name} — ${ach.description}`
            }
          ]
        };
      }
      this.pendingToasts = [...this.pendingToasts, ...toAdd];
    }

    // 5. Persist achievements record.
    saveAchievements(record);

    // 6. Commit.
    this.state = next;
    this.achievements = record;

    // Theme/text-size CSS side-effects (unchanged).
    if (event.kind === 'SetTheme') {
      applyTheme(event.theme);
      storeTheme(event.theme);
    }
    if (event.kind === 'SetTextSize') {
      applyTextSize(event.size);
    }

    if (this.state.settings.autoSave) {
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

  saveNow(): void {
    persist(this.state);
  }

  resetSave(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    this.state = createInitialState(Date.now());
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
    // Achievements record is intentionally untouched here — Consign leaves it alone.
  }

  forgetAchievements(): void {
    clearAchievements();
    this.achievements = loadAchievements();
    this.pendingToasts = [];
  }

  markAchievementsOpened(): void {
    const next: AchievementsRecord = {
      ...this.achievements,
      unlockedCountAtLastOpen: this.achievements.unlocked.length
    };
    saveAchievements(next);
    this.achievements = next;
  }

  dismissToast(ach: Achievement): void {
    this.pendingToasts = this.pendingToasts.filter((a) => a.id !== ach.id);
  }
}

export const gameStore = new GameStore();
```

(Helpful note: the `✦` glyph is `✦`; `—` is `—`. Encoded as escapes to avoid editor surprises.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/__tests__/store.test.ts`
Expected: all 7 tests pass.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: clean — no regressions in other UI/engine tests.

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/ui/store.svelte.ts src/ui/__tests__/store.test.ts
git commit -m "feat(store): wire achievements record, dispatch hook, toasts, persistence"
```

---

## Task 8: AchievementToast component

**Files:**
- Create: `src/ui/AchievementToast.svelte`
- Test: `src/ui/__tests__/AchievementToast.test.ts`

- [ ] **Step 1: Write failing tests for the toast component**

Create `src/ui/__tests__/AchievementToast.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AchievementToast from '../AchievementToast.svelte';
import { gameStore } from '../store.svelte';
import { AchievementId } from '../../engine/types';
import { content } from '../../content';

describe('AchievementToast', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
    vi.useFakeTimers();
  });

  it('renders nothing when pendingToasts is empty', () => {
    const { container } = render(AchievementToast);
    expect(container.querySelector('.toast')).toBeNull();
  });

  it('renders one toast per pending entry with name and description', () => {
    gameStore.pendingToasts = [content.achievements[AchievementId('first_blood')]!];
    const { getByText } = render(AchievementToast);
    expect(getByText(/First Blood/)).toBeInTheDocument();
    expect(getByText(/it had it coming/)).toBeInTheDocument();
  });

  it('dismisses on click', async () => {
    gameStore.pendingToasts = [content.achievements[AchievementId('first_blood')]!];
    const { container } = render(AchievementToast);
    const toast = container.querySelector('.toast') as HTMLElement;
    expect(toast).toBeTruthy();
    await fireEvent.click(toast);
    expect(gameStore.pendingToasts).toEqual([]);
  });

  it('auto-dismisses after 4 seconds', () => {
    gameStore.pendingToasts = [content.achievements[AchievementId('first_blood')]!];
    render(AchievementToast);
    vi.advanceTimersByTime(4000);
    expect(gameStore.pendingToasts).toEqual([]);
  });

  it('renders multiple toasts simultaneously', () => {
    gameStore.pendingToasts = [
      content.achievements[AchievementId('first_blood')]!,
      content.achievements[AchievementId('moonlit')]!
    ];
    const { getByText } = render(AchievementToast);
    expect(getByText(/First Blood/)).toBeInTheDocument();
    expect(getByText(/Moonlit/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/__tests__/AchievementToast.test.ts`
Expected: module-not-found.

- [ ] **Step 3: Implement the toast component**

Create `src/ui/AchievementToast.svelte`:

```svelte
<script lang="ts">
  import { gameStore } from './store.svelte';
  import { fly, fade } from 'svelte/transition';
  import type { Achievement } from '../engine/types';

  const DISMISS_MS = 4000;

  function dismiss(ach: Achievement) {
    gameStore.dismissToast(ach);
  }

  $effect(() => {
    // For each pending toast, schedule a dismiss timer. Re-running this effect
    // when pendingToasts changes is safe because dismissToast removes by id.
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const ach of gameStore.pendingToasts) {
      timers.push(setTimeout(() => gameStore.dismissToast(ach), DISMISS_MS));
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  });
</script>

<div class="toast-stack" role="status" aria-live="polite">
  {#each gameStore.pendingToasts as ach, i (ach.id)}
    <button
      class="toast"
      type="button"
      style="margin-top: {i === 0 ? 0 : 12}px"
      in:fly={{ y: -16, duration: 400 }}
      out:fade={{ duration: 200 }}
      onclick={() => dismiss(ach)}
    >
      <span class="glyph">✦</span>
      <span class="copy">
        <span class="name">{ach.name}</span>
        <span class="description">{ach.description}</span>
      </span>
    </button>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--gilt);
    box-shadow: 2px 4px 14px rgba(0, 0, 0, 0.2);
    padding: 12px 18px;
    min-width: 280px;
    max-width: 420px;
    text-align: left;
    cursor: pointer;
    font-family: var(--serif-body);
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .toast:hover {
    background: rgba(166, 131, 56, 0.06);
  }
  .glyph {
    color: var(--gilt);
    font-size: 22px;
    line-height: 1;
    margin-top: 1px;
  }
  .copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .name {
    font-family: var(--serif-display);
    font-size: 16px;
    color: var(--gilt);
    letter-spacing: 0.04em;
  }
  .description {
    font-style: italic;
    font-size: 13px;
    color: var(--ink-muted);
  }
</style>
```

Important: in the template, the `✦` literal in the `<span class="glyph">` should be the actual character `✦`, not the escape sequence. Replace it with `✦` directly when implementing.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/__tests__/AchievementToast.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/AchievementToast.svelte src/ui/__tests__/AchievementToast.test.ts
git commit -m "feat(ui): AchievementToast component with auto-dismiss and stacking"
```

---

## Task 9: AchievementsModal component

**Files:**
- Create: `src/ui/AchievementsModal.svelte`
- Test: `src/ui/__tests__/AchievementsModal.test.ts`

- [ ] **Step 1: Write failing tests for the modal**

Create `src/ui/__tests__/AchievementsModal.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import AchievementsModal from '../AchievementsModal.svelte';
import { gameStore } from '../store.svelte';
import { AchievementId, type AchievementsRecord } from '../../engine/types';

function setRecord(r: AchievementsRecord) {
  gameStore.achievements = r;
}

describe('AchievementsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('renders nothing when closed', () => {
    const { queryByRole } = render(AchievementsModal, { props: { open: false, onClose: () => {} } });
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog when open with empty state header', () => {
    const { getByRole, getByText } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    expect(getByRole('dialog')).toBeInTheDocument();
    // 11 visible achievements (13 minus 3 hidden plus 1 — i.e. all 13 minus the 3 spine = 11 visible).
    expect(getByText(/Achievements\s*\(/)).toBeInTheDocument();
  });

  it('shows hidden footer counter "0 of 3 remaining"', () => {
    const { getByText } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    expect(getByText(/Hidden\s+—\s+0 of 3 remaining/)).toBeInTheDocument();
  });

  it('renders earned achievements with gilt glyph at the top, in earn order', () => {
    setRecord({
      unlocked: [AchievementId('first_blood'), AchievementId('moonlit')],
      played_classes: [],
      tempt_fate_backfires_seen: [],
      unlockedCountAtLastOpen: 0
    });
    const { container } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    const rows = container.querySelectorAll('.row');
    expect(rows[0]?.textContent).toMatch(/First Blood/);
    expect(rows[1]?.textContent).toMatch(/Moonlit/);
  });

  it('renders descriptionHidden achievements with "?" until earned', () => {
    const { getByText, queryByText } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    expect(getByText(/Refused, Sincerely/)).toBeInTheDocument();
    expect(queryByText(/narrator has gone quiet/)).toBeNull();
  });

  it('does not render hidden achievements in the list', () => {
    const { queryByText } = render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    expect(queryByText(/On Schedule/)).toBeNull();
    expect(queryByText(/Page Counted/)).toBeNull();
    expect(queryByText(/Glimpsed the Editor/)).toBeNull();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { getByRole } = render(AchievementsModal, { props: { open: true, onClose } });
    await fireEvent.click(getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls markAchievementsOpened when modal opens', async () => {
    setRecord({
      unlocked: [AchievementId('first_blood')],
      played_classes: [],
      tempt_fate_backfires_seen: [],
      unlockedCountAtLastOpen: 0
    });
    render(AchievementsModal, { props: { open: true, onClose: () => {} } });
    await tick();
    expect(gameStore.achievements.unlockedCountAtLastOpen).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/__tests__/AchievementsModal.test.ts`
Expected: module-not-found.

- [ ] **Step 3: Implement the modal**

Create `src/ui/AchievementsModal.svelte`:

```svelte
<script lang="ts">
  import { gameStore } from './store.svelte';
  import { content } from '../content';
  import type { Achievement, AchievementId } from '../engine/types';

  type Props = { open: boolean; onClose: () => void };
  let { open, onClose }: Props = $props();

  // Mark-as-opened side effect when the modal becomes visible.
  $effect(() => {
    if (open) gameStore.markAchievementsOpened();
  });

  let allAchievements = $derived(Object.values(content.achievements) as Achievement[]);
  let visible = $derived(allAchievements.filter((a) => !a.hidden));
  let hiddenAll = $derived(allAchievements.filter((a) => a.hidden));

  let unlockedSet = $derived(new Set(gameStore.achievements.unlocked));
  let earned = $derived(visible.filter((a) => unlockedSet.has(a.id)));
  let locked = $derived(visible.filter((a) => !unlockedSet.has(a.id)));

  // Earned sorted by earn order (insertion order in record.unlocked).
  let earnedSorted = $derived.by(() => {
    const idx = new Map<AchievementId, number>();
    gameStore.achievements.unlocked.forEach((id, i) => idx.set(id, i));
    return [...earned].sort((a, b) => (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0));
  });

  let earnedCount = $derived(earned.length);
  let visibleTotal = $derived(visible.length);
  let hiddenEarnedCount = $derived(hiddenAll.filter((a) => unlockedSet.has(a.id)).length);
  let hiddenTotal = $derived(hiddenAll.length);

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function isEarned(id: AchievementId): boolean {
    return unlockedSet.has(id);
  }
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={onBackdropClick} onkeydown={onKey}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ach-title">
      <header class="dialog-header">
        <h2 id="ach-title">Achievements ({earnedCount} / {visibleTotal} earned)</h2>
        <button class="close" type="button" onclick={onClose} aria-label="Close">×</button>
      </header>

      <ul class="list">
        {#each earnedSorted as ach (ach.id)}
          <li class="row earned">
            <span class="glyph">✦</span>
            <span class="body">
              <span class="name">{ach.name}</span>
              <span class="description">{ach.description}</span>
            </span>
          </li>
        {/each}
        {#each locked as ach (ach.id)}
          <li class="row locked">
            <span class="glyph">◇</span>
            <span class="body">
              <span class="name">{ach.name}</span>
              <span class="description">{ach.descriptionHidden ? '?' : ach.description}</span>
            </span>
          </li>
        {/each}
      </ul>

      <footer class="footer">
        <p>Hidden — {hiddenEarnedCount} of {hiddenTotal} remaining</p>
        <p class="aside">— keep playing —</p>
      </footer>
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
    min-width: 420px;
    max-width: 560px;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid var(--hairline);
    box-shadow: 4px 6px 20px rgba(0, 0, 0, 0.25);
    font-family: var(--serif-body);
  }
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 16px;
  }
  .dialog-header h2 {
    font-family: var(--serif-display);
    font-size: 22px;
    margin: 0;
    font-weight: normal;
  }
  .close {
    font-size: 28px;
    line-height: 1;
    color: var(--ink-muted);
    background: none;
    border: none;
    cursor: pointer;
  }
  .close:hover { color: var(--ink); }
  .list {
    list-style: none;
    padding: 0;
    margin: 0 0 18px;
  }
  .row {
    display: flex;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px dashed var(--hairline);
    align-items: flex-start;
  }
  .row:last-child { border-bottom: none; }
  .glyph {
    font-size: 18px;
    line-height: 1.4;
    flex-shrink: 0;
  }
  .row.earned .glyph { color: var(--gilt); }
  .row.locked .glyph { color: var(--ink-faint); }
  .body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .name {
    font-family: var(--serif-display);
    font-size: 15px;
  }
  .row.earned .name { color: var(--gilt); }
  .description {
    font-size: 13px;
    font-style: italic;
    color: var(--ink-muted);
  }
  .footer {
    border-top: 1px solid var(--hairline);
    padding-top: 12px;
    color: var(--ink-faint);
    font-size: 13px;
    font-style: italic;
  }
  .footer p { margin: 0; }
  .footer .aside { margin-top: 4px; letter-spacing: 0.18em; }
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/__tests__/AchievementsModal.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/AchievementsModal.svelte src/ui/__tests__/AchievementsModal.test.ts
git commit -m "feat(ui): AchievementsModal with earned-first sort and hidden footer"
```

---

## Task 10: WorldPanel trophy icon + mount toast/modal

**Files:**
- Modify: `src/ui/WorldPanel.svelte`
- Test: `src/ui/__tests__/WorldPanel.trophy.test.ts` (create)

- [ ] **Step 1: Write failing tests for the trophy chrome**

Create `src/ui/__tests__/WorldPanel.trophy.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WorldPanel from '../WorldPanel.svelte';
import { gameStore } from '../store.svelte';
import { ClassId, AchievementId } from '../../engine/types';

describe('WorldPanel trophy chrome', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
  });

  it('renders the trophy button', () => {
    const { getByLabelText } = render(WorldPanel);
    expect(getByLabelText(/view achievements/i)).toBeInTheDocument();
  });

  it('does not show the new-badge when unlockedCountAtLastOpen equals unlocked length', () => {
    gameStore.markAchievementsOpened();
    const { container } = render(WorldPanel);
    expect(container.querySelector('.trophy-badge')).toBeNull();
  });

  it('shows the new-badge when there are unlocked achievements not yet opened', () => {
    // Trigger a moonlit unlock.
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));
    expect(gameStore.achievements.unlockedCountAtLastOpen).toBe(0);
    const { container } = render(WorldPanel);
    expect(container.querySelector('.trophy-badge')).not.toBeNull();
  });

  it('opens the achievements modal when trophy is clicked', async () => {
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    const { getByLabelText, queryByRole } = render(WorldPanel);
    expect(queryByRole('dialog')).toBeNull();
    await fireEvent.click(getByLabelText(/view achievements/i));
    expect(queryByRole('dialog')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/__tests__/WorldPanel.trophy.test.ts`
Expected: tests fail — trophy button does not exist yet.

- [ ] **Step 3: Add the trophy button + mounts**

In `src/ui/WorldPanel.svelte`:

a. Extend the script section (top of file). Add these imports next to the existing ones:

```ts
  import AchievementsModal from './AchievementsModal.svelte';
  import AchievementToast from './AchievementToast.svelte';
```

Then add state + derived for the modal and badge:

```ts
  let achievementsOpen = $state(false);
  let newSinceLastOpen = $derived(
    Math.max(0, gameStore.achievements.unlocked.length - gameStore.achievements.unlockedCountAtLastOpen)
  );

  function openAchievements() {
    achievementsOpen = true;
  }
  function closeAchievements() {
    achievementsOpen = false;
  }
```

b. In the template, locate the existing `<button class="compass" ...>` and add a sibling button BEFORE it (so the trophy sits to the left of the compass — matches "next to" wording in the spec):

```svelte
        <button
          class="trophy"
          aria-label="View achievements"
          title="Achievements"
          type="button"
          onclick={openAchievements}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
            <!-- Goblet/trophy line-art: cup + base -->
            <path d="M7 3 H17 V8 a5 5 0 0 1 -10 0 Z" />
            <path d="M7 5 H4 a3 3 0 0 0 3 4" />
            <path d="M17 5 H20 a3 3 0 0 1 -3 4" />
            <path d="M12 13 V17" />
            <path d="M9 17 H15 V20 H9 Z" />
          </svg>
          {#if newSinceLastOpen > 0}
            <span class="trophy-badge" aria-label="{newSinceLastOpen} new">●</span>
          {/if}
        </button>
```

c. At the end of the template, AFTER the closing `</section>`, add the modal mount and the toast mount:

```svelte
<AchievementsModal open={achievementsOpen} onClose={closeAchievements} />
<AchievementToast />
```

d. In the `<style>` block, append:

```css
  .trophy {
    color: var(--ink);
    opacity: 0.7;
    transition: opacity 160ms ease, transform 400ms ease;
    flex-shrink: 0;
    margin-bottom: 6px;
    margin-right: 12px;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
  }
  .trophy:hover {
    opacity: 1;
    transform: translateY(-1px);
  }
  .trophy-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    color: var(--gilt);
    font-size: 14px;
    line-height: 1;
    pointer-events: none;
  }
```

- [ ] **Step 4: Run trophy tests to verify they pass**

Run: `npx vitest run src/ui/__tests__/WorldPanel.trophy.test.ts`
Expected: all 4 pass.

- [ ] **Step 5: Run the full UI suite to confirm no regressions**

Run: `npx vitest run src/ui/`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ui/WorldPanel.svelte src/ui/__tests__/WorldPanel.trophy.test.ts
git commit -m "feat(ui): WorldPanel trophy button, badge, and modal/toast mounts"
```

---

## Task 11: SettingsModal "Forget thy deeds"

**Files:**
- Modify: `src/ui/SettingsModal.svelte`
- Test: `src/ui/__tests__/SettingsModal.test.ts` (append)

- [ ] **Step 1: Write failing tests for the new button + confirm**

Append to `src/ui/__tests__/SettingsModal.test.ts`:

```ts
  it('renders a "Forget thy deeds" button', () => {
    const { getByText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(getByText(/forget thy deeds/i)).toBeInTheDocument();
  });

  it('opens the crimson confirm overlay when "Forget thy deeds" is clicked', async () => {
    const { getByText, queryByText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    expect(queryByText(/Forget thy deeds\?/)).toBeNull();
    await fireEvent.click(getByText(/forget thy deeds/i));
    expect(getByText(/Forget thy deeds\?/)).toBeInTheDocument();
  });

  it('forgetAchievements is called on confirm', async () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked.length).toBeGreaterThan(0);

    const { getByText, getAllByText } = render(SettingsModal, { props: { open: true, onClose: () => {} } });
    await fireEvent.click(getByText(/forget thy deeds/i));
    // The crimson confirmation has a "To the flames" button. Use getAllByText
    // because Consign also has one — the second one (in the Forget overlay) is correct.
    const flamesButtons = getAllByText(/to the flames/i);
    await fireEvent.click(flamesButtons[flamesButtons.length - 1]!);
    expect(gameStore.achievements.unlocked.length).toBe(0);
  });
```

(Add `import { ClassId } from '../../engine/types';` to the import list at the top of the test file if not already present.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/__tests__/SettingsModal.test.ts`
Expected: 3 new tests fail.

- [ ] **Step 3: Add the button + confirmation overlay**

In `src/ui/SettingsModal.svelte`:

a. In the `<script>` block, add another `$state` for the second confirmation, and the handlers:

```ts
  let confirmingForget = $state(false);

  function forgetDeeds() {
    confirmingForget = true;
  }
  function confirmForget() {
    gameStore.forgetAchievements();
    confirmingForget = false;
  }
  function cancelForget() {
    confirmingForget = false;
  }
```

b. In the existing `onKey` function, extend the handler so Escape also closes the new confirm:

```ts
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (confirmingConsign) confirmingConsign = false;
      else if (confirmingForget) confirmingForget = false;
      else onClose();
    }
  }
```

c. In the template, inside the existing `<div class="actions">`, append a new button after the Consign button:

```svelte
        <button type="button" class="danger" onclick={forgetDeeds}>
          Forget thy deeds
        </button>
```

d. Below the existing Consign confirm overlay, add a parallel Forget confirm overlay (still inside the outer `<div class="backdrop">`):

```svelte
    {#if confirmingForget}
      <div class="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="forget-title">
        <div class="confirm-dialog">
          <h3 id="forget-title">Forget thy deeds?</h3>
          <p>This will erase your achievements record across all your tales. Achievements cannot be earned again from a previous record.</p>
          <div class="confirm-actions">
            <button type="button" onclick={cancelForget}>Never mind</button>
            <button type="button" class="danger" onclick={confirmForget}>
              To the flames
            </button>
          </div>
        </div>
      </div>
    {/if}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/__tests__/SettingsModal.test.ts`
Expected: all pass (existing 4 + new 3).

- [ ] **Step 5: Run the full UI suite**

Run: `npx vitest run src/ui/`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ui/SettingsModal.svelte src/ui/__tests__/SettingsModal.test.ts
git commit -m "feat(ui): SettingsModal Forget thy deeds button + crimson confirmation"
```

---

## Task 12: Integration smoke test

**Files:**
- Test: `src/__tests__/achievements.e2e.test.ts` (create)

- [ ] **Step 1: Write the integration smoke test**

Create `src/__tests__/achievements.e2e.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../ui/store.svelte';
import { ClassId, EncounterId, AchievementId, type GameState } from '../engine/types';
import { loadAchievements } from '../engine/achievements';

describe('achievements e2e', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('farmhand first-victory unlocks first_blood and persists', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    if (gameStore.state.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = gameStore.state.combat.combatants.find((c) => c.kind === 'monster')!.id;
    // Cheat: drop the monster to 1 HP so the next attack resolves.
    const woundedState: GameState = {
      ...gameStore.state,
      combat: {
        ...gameStore.state.combat,
        combatants: gameStore.state.combat.combatants.map((c) => (c.id === monsterId ? { ...c, hp: 1 } : c))
      }
    };
    gameStore.state = woundedState;
    gameStore.dispatch({ kind: 'AttackTarget' });

    expect(gameStore.achievements.unlocked).toContain(AchievementId('first_blood'));
    const sysEntry = gameStore.state.log.find(
      (e) => e.kind === 'system' && e.systemLabel === 'ACHIEVEMENT' && e.text.includes('First Blood')
    );
    expect(sysEntry).toBeDefined();
    expect(loadAchievements().unlocked).toContain(AchievementId('first_blood'));
  });

  it('Consign this tale to the flames leaves achievements intact', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));
    gameStore.resetSave();
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));
    expect(loadAchievements().unlocked).toContain(AchievementId('moonlit'));
  });

  it('Forget thy deeds wipes achievements but leaves the save intact', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    gameStore.saveNow();
    const beforeName = gameStore.state.character.name;
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));

    gameStore.forgetAchievements();
    expect(gameStore.achievements.unlocked).toEqual([]);
    expect(localStorage.getItem('heroicchronicle.achievements.v1')).toBeNull();
    expect(gameStore.state.character.name).toBe(beforeName);
    expect(localStorage.getItem('heroicchronicle.save.v1')).not.toBeNull();
  });

  it('moonlit toast is queued and a system log entry appears in the same tick', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.pendingToasts.some((a) => a.id === AchievementId('moonlit'))).toBe(true);
    expect(
      gameStore.state.log.some(
        (e) => e.kind === 'system' && e.systemLabel === 'ACHIEVEMENT' && e.text.includes('Moonlit')
      )
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/__tests__/achievements.e2e.test.ts`
Expected: all 4 pass.

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run`
Expected: clean across all tests.

- [ ] **Step 4: Run the full typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/achievements.e2e.test.ts
git commit -m "test(achievements): e2e smoke covering unlock, persist, consign, forget"
```

---

## Acceptance Verification

After Task 12 commits, verify against the spec's acceptance criteria (§8.5):

1. ✅ All 13 achievements exist in the registry (Task 4); `validateContent` passes (Task 4 + existing test).
2. ✅ The 10 currently-triggerable achievements unlock through normal gameplay (Tasks 5, 6, e2e).
3. ✅ The 3 spine seeds appear in the hidden footer counter and DO NOT fire (Task 4 test "does not fire spine seeds in default state"; Task 9 test "Hidden — 0 of 3 remaining").
4. ✅ Toasts appear top-center; auto-dismiss after 4s; click-to-dismiss; multiple stack (Task 8).
5. ✅ Trophy icon shows badge when achievements unlocked since last open; clears on open (Task 10).
6. ✅ Achievements panel shows earned/locked/descriptionHidden states (Task 9).
7. ✅ Consign leaves achievements intact (Task 7 + e2e).
8. ✅ Forget thy deeds wipes achievements; leaves save intact (Task 7 + e2e).
9. ✅ Achievements persist across browser reload (Task 7 + e2e via `loadAchievements()`).
10. ✅ All tests pass; typecheck clean; build succeeds (Task 12 final steps).
