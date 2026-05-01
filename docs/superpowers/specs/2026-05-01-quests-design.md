# Plan 4.6 — Quest Log

**Date:** 2026-05-01
**Game:** The Heroic Chronicle
**Predecessor specs:** [2026-04-24 Master Design](2026-04-24-text-rpg-design.md), [2026-04-30 Skills & Classes](2026-04-30-skills-and-classes-design.md), [2026-05-01 Achievements](2026-05-01-achievements-design.md)
**Related:** [Narrative Spine](../narrative-spine.md)

---

## 1. Goals

A user-facing journal of what the player needs to do next. Three goals:

1. **Onboard the player.** A new player who has not been told what to do should open the quest log and find a current objective in plain prose.
2. **Stay spoiler-safe.** Future objectives must not be visible. The "manuscript" voice of the game depends on the player not knowing what's coming. The log shows only what has happened (collapsible) and what is current.
3. **Reuse the existing predicate evaluator.** Quest state is observed, not driven. Beats remain the engine of progression; quests are a parallel display layer that reads the same flags beats already manage.

## 2. Non-goals

- **Side quests as content.** v1 ships infrastructure for `kind: 'side'` but authors zero side quests. Plan 5+ adds them.
- **Quest rewards.** Quests have no XP/loot/flag side-effects. They observe; they do not mutate.
- **Quest dependencies.** No "Quest X requires Quest Y to be completed first" beyond what their `activatePredicate`s naturally express.
- **Branching objectives within a quest.** Objectives are an ordered list. The four "Decide" outcomes (accept / refuse / insult / cry) all complete the same single objective via an `any_flag` predicate; the log does not branch.
- **Per-objective rewards or sub-rewards.** No.
- **Quest editor UI.** Authors edit `src/content/quests/index.ts` directly; same pattern as achievements.
- **Cross-run persistence.** Quests are per-run; "Consign this tale to the flames" wipes them along with the save.

---

## 3. Architecture overview

A new content registry (`content.quests`) lives alongside the existing `content.achievements`, `content.beats`, etc. Each `Quest` declares an `activatePredicate` and a list of ordered `QuestObjective`s, each with its own `completePredicate`.

A new pure function `checkQuests(state)` runs after every reduce (parallel to `checkBeats`), evaluating predicates and returning a state with updated `activeQuests` / `completedQuests` / `completedObjectives` fields. It is idempotent and does not mutate the input.

Quest state lives in `state.story` because it is per-run. Save-format version bumps from v2 to v3; migration backfills three new fields with empty defaults.

The UI gains one new icon (scroll, line-art) in the existing `.header-actions` group on the WorldPanel header, and a new `QuestLogModal.svelte` mirroring the `AchievementsModal.svelte` pattern (backdrop, dialog, escape/close, internal scroll). A small gilt badge dot on the icon signals new activation or objective completion since the modal was last opened.

---

## 4. Data model

### 4.1 Type extensions

In `src/engine/types.ts`:

```ts
// Already exists from Plan 1; unchanged.
export type QuestId = Brand<string, 'QuestId'>;
export const QuestId = (s: string) => s as QuestId;

export type QuestObjective = {
  id: string;                       // unique within the quest
  label: string;                    // imperative copy ("Travel to the Crossroads.")
  completePredicate: Predicate[];   // ALL must be true for objective to complete
};

export type Quest = {
  id: QuestId;
  title: string;
  description: string;              // short tagline shown under the title
  kind: 'main' | 'side';
  activatePredicate: Predicate[];   // ALL must be true for quest to activate
  objectives: QuestObjective[];     // ordered; objective N+1 is hidden until N is done
};
```

### 4.2 Predicate extension

The existing `Predicate` union (Plan 4.5 added `flag_at_least`, `level_at_least`, `currency_at_least`) gets one more variant:

```ts
| { kind: 'any_flag'; flags: string[] }   // returns true if ANY listed flag is truthy
```

`evalPredicate` in `src/engine/story.ts` gets a matching branch. Beats inherit it for free.

### 4.3 GameState extensions

`state.story` gains four new fields and uses one existing field:

```ts
story: {
  // ... existing ...
  activeQuests: QuestId[];                          // already exists; insertion order
  completedQuests: QuestId[];                       // NEW; insertion order (= completion order)
  completedObjectives: Record<QuestId, string[]>;   // NEW; per-quest done-objective ids in completion order
  questLogActivityCount: number;                    // NEW; incremented by checkQuests on activate or objective-complete
  questLogActivityAtLastOpen: number;               // NEW; snapshot of count when modal was last opened
}
```

The badge derivation is `questLogActivityCount > questLogActivityAtLastOpen`. See §9.1 for the rationale (counter snapshot vs timestamp).

### 4.4 Save migration v2 → v3

`SAVE_VERSION` bumps to 3. New migration in `src/engine/save.ts`:

```ts
2: (s: any) => ({
  ...s,
  version: 3,
  story: {
    ...s.story,
    completedQuests: s.story?.completedQuests ?? [],
    completedObjectives: s.story?.completedObjectives ?? {},
    questLogActivityCount: s.story?.questLogActivityCount ?? 0,
    questLogActivityAtLastOpen: s.story?.questLogActivityAtLastOpen ?? 0,
  }
})
```

Existing v2 saves load with empty quest state. On the first `dispatch` after load, `checkQuests` activates `answer_the_call` (its `activatePredicate` matches `act_i`) and immediately marks any objective whose predicate is already satisfied as complete. Mid-Act-I saves retroactively show the correct quest progress without special handling.

### 4.5 Content registry

New file `src/content/quests/index.ts` aggregates the quest definitions, mirroring per-type registries. Aggregated in `src/content/index.ts` as `content.quests`.

`validateContent` extends to verify each quest's predicates and objective predicates reference known flags / beats / locations / stages where statically determinable. Predicates referencing flags that no current code sets are intentionally allowed (Plan 5+ may set them).

---

## 5. Engine

### 5.1 `engine/quests.ts` module

New module. Exports:

```ts
export function checkQuests(state: GameState): GameState;
```

The function is pure-functional and idempotent. Pseudocode:

```ts
function checkQuests(state) {
  let s = state;
  let changed = true;
  let iters = 0;
  while (changed && iters < 8) {
    changed = false;
    iters++;
    for (const quest of Object.values(content.quests)) {
      const isActive = s.story.activeQuests.includes(quest.id);
      const isCompleted = s.story.completedQuests.includes(quest.id);

      // 1. Activate inactive quests whose activatePredicate is met.
      if (!isActive && !isCompleted) {
        if (quest.activatePredicate.every(p => evalPredicate(s, p))) {
          s = {
            ...s,
            story: {
              ...s.story,
              activeQuests: [...s.story.activeQuests, quest.id],
              questLogActivityCount: s.story.questLogActivityCount + 1,
            }
          };
          changed = true;
        }
      }

      // 2. Complete the next objective if its predicate is met.
      if (s.story.activeQuests.includes(quest.id)) {
        const done = s.story.completedObjectives[quest.id] ?? [];
        const next = quest.objectives.find(o => !done.includes(o.id));
        if (next && next.completePredicate.every(p => evalPredicate(s, p))) {
          s = {
            ...s,
            story: {
              ...s.story,
              completedObjectives: {
                ...s.story.completedObjectives,
                [quest.id]: [...done, next.id]
              },
              questLogActivityCount: s.story.questLogActivityCount + 1,
            }
          };
          changed = true;
        }
      }

      // 3. Complete the quest if all objectives are done.
      if (s.story.activeQuests.includes(quest.id)) {
        const done = s.story.completedObjectives[quest.id] ?? [];
        if (done.length === quest.objectives.length) {
          s = {
            ...s,
            story: {
              ...s.story,
              activeQuests: s.story.activeQuests.filter(id => id !== quest.id),
              completedQuests: [...s.story.completedQuests, quest.id]
            }
          };
          changed = true;
        }
      }
    }
  }
  return s;
}
```

The 8-iteration safety bound mirrors `checkBeats` and prevents pathological infinite loops if a content author makes a logical mistake.

### 5.2 Integration with `reduce`

`reduce(state, event)` already calls `checkBeats(next)` and `drainPendingEncounter(next)` after `reduceInner`. Add `checkQuests(next)` after `checkBeats` so beat-set flags trigger quest checks in the same dispatch:

```ts
export function reduce(state, event) {
  let next = reduceInner(state, event);
  next = checkBeats(next);
  next = checkQuests(next);    // NEW
  next = drainPendingEncounter(next);
  return next;
}
```

If `drainPendingEncounter` triggers an additional reduce that fires more beats / quest activations, those are picked up too because `drainPendingEncounter` itself ends with a `checkBeats(s)` call; we add `checkQuests(s)` there as well.

### 5.3 New engine-set flag: `started_call_encounter`

In `src/engine/narrative.ts`, the `startNarrativeEncounter` function sets `started_call_encounter: true` on `world.flags` when the encounter being started is `the_call`. This flag drives the "Hear the Hermit out" objective's `completePredicate`.

This keeps the same pattern as the achievement-trigger flags: a sticky boolean set at the precise transition the quest needs to observe.

### 5.4 Store integration

The store gains:

```ts
markQuestLogOpened(): void {
  const next = {
    ...this.state,
    story: {
      ...this.state.story,
      questLogActivityAtLastOpen: this.state.story.questLogActivityCount
    }
  };
  this.state = next;
  if (this.state.settings.autoSave) this.scheduleAutosave();
}
```

The `questLogBadge` derivation lives in the WorldPanel UI:

```ts
let questLogBadge = $derived(
  gameStore.state.story.questLogActivityCount > gameStore.state.story.questLogActivityAtLastOpen
);
```

`checkQuests` increments `questLogActivityCount` each time it activates a quest or marks an objective complete. The badge clears when `markQuestLogOpened` snapshots the current count.

### 5.5 What about Consign / Forget?

- **Consign this tale to the flames** wipes `state.story` with the rest of the save. Quests are per-run, so this is correct.
- **Forget thy deeds** does NOT touch `state.story`. Quests are not achievements; the achievement-only key clears, and quest state survives. (No code change needed; `forgetAchievements` already only touches the achievements localStorage key.)

---

## 6. UI

### 6.1 Scroll icon in WorldPanel header

Adds a button between the trophy and compass in the existing `.header-actions` flex group:

```svelte
<div class="header-actions">
  <button class="trophy">...</button>
  <button class="quest-log" aria-label="View quest log" title="Quest log" onclick={openQuestLog}>
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
      <!-- Scroll/parchment line-art -->
      <path d="M5 5 a2 2 0 0 1 2 -2 H17 a2 2 0 0 1 2 2 V19 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 Z" />
      <path d="M9 8 H15" />
      <path d="M9 12 H15" />
      <path d="M9 16 H13" />
    </svg>
    {#if questLogBadge}
      <span class="quest-log-badge" aria-label="new quest activity"></span>
    {/if}
  </button>
  <button class="compass">...</button>
</div>
```

Same opacity / hover-translate behavior as `.trophy` and `.compass`. Same gilt 8×8 badge CSS.

### 6.2 QuestLogModal

New `src/ui/QuestLogModal.svelte`. Same backdrop + dialog + escape pattern as `AchievementsModal.svelte`. Layout:

```
┌─ Quest Log ─────────────────────────────  × ┐
│                                              │
│  Active — Main                               │
│                                              │
│    ✦ Answer the Call to Adventure            │
│      Right on schedule, more or less.        │
│                                              │
│      [▾ Completed (2)]                       │
│        ☑ Survive your morning.               │
│        ☑ Travel to the Dusty Crossroads.     │
│      ☐ Hear the Hermit out.                  │
│                                              │
│  Active — Side                               │
│    (none yet)                                │
│                                              │
│  Completed                                   │
│    (none yet)                                │
│                                              │
└──────────────────────────────────────────────┘
```

**Sections:**
- **Active — Main**: active quests with `kind === 'main'`, in `activeQuests` insertion order.
- **Active — Side**: active quests with `kind === 'side'`, same order.
- **Completed**: completed quests in `completedQuests` insertion order; renders with the gilt ✦ glyph and a strikethrough title for visual closure.

**Per active quest:**
- Title (gilt ✦ glyph), description (italic muted)
- A `[▾ Completed (N)]` toggle button if any objectives are done. Default expanded; component-local `$state` per-quest tracks the collapsed flag. State resets on modal close (no persistence).
- The current objective (the first not-yet-done one) is always visible with `☐` glyph.
- Future objectives are NEVER rendered.
- A quest with all objectives done is in flight to the completed section in the same dispatch, so the modal will not display "all objectives done but quest still active."

**Per completed quest:**
- Title (gilt ✦ glyph, strikethrough), description (italic muted), no objective list.

**Empty section copy:** italic `(none yet)` in `--ink-faint`. Renders when the section's filtered list is empty.

### 6.3 Open side-effect

`$effect(() => { if (open) gameStore.markQuestLogOpened(); })` mirroring the achievements modal pattern (with `untrack()` if needed for the same Svelte 5 render-mutation guard).

### 6.4 Badge derivation

The badge appears when `state.story.questLogActivityCount > state.story.questLogActivityAtLastOpen`. `checkQuests` increments the count whenever it activates a quest or completes an objective. `markQuestLogOpened` snapshots the count when the modal opens; the badge clears in the same dispatch and stays cleared until new activity. Mirrors the achievement-badge "clear on open, stay cleared until new unlock" model.

---

## 7. v1 Quest content

### 7.1 The single quest

`src/content/quests/index.ts`:

```ts
import { QuestId, LocationId, type Quest } from '../../engine/types';

const answer_the_call: Quest = {
  id: QuestId('answer_the_call'),
  title: 'Answer the Call to Adventure',
  description: "Right on schedule, more or less. (You'll see.)",
  kind: 'main',
  activatePredicate: [{ kind: 'stage', stage: 'act_i' }],
  objectives: [
    {
      id: 'survive_your_morning',
      label: 'Survive your morning.',
      completePredicate: [
        // Any of the four class-specific unlock flags fires when the player
        // defeats their named foe. The hermit_beckons beat (farmboy) and the
        // _setting_out beats (knight/wizard/bard) all set the right flag.
        {
          kind: 'any_flag',
          flags: ['unlocked_crossroads', 'unlocked_kings_road', 'unlocked_cobbled_walk', 'unlocked_back_alley']
        }
      ]
    },
    {
      id: 'travel_to_crossroads',
      label: 'Travel to the Dusty Crossroads.',
      completePredicate: [{ kind: 'visited', locationId: LocationId('dusty_crossroads') }]
    },
    {
      id: 'hear_the_hermit',
      label: 'Hear the Hermit out.',
      completePredicate: [{ kind: 'flag', flag: 'started_call_encounter' }]
    },
    {
      id: 'decide',
      label: 'Decide.',
      completePredicate: [
        // The four resolutions: accept (advances stage), insult, cry, or
        // refuse 4 times. The first three set sticky boolean flags. Refusal
        // count is the only one needing flag_at_least; we OR everything via
        // any_flag for the booleans plus a separate predicate path is awkward.
        // Simplest: include the boolean flags in any_flag; the 4-strikes
        // refusal path completes via insult/cry on the hermit_lingering arc
        // (which the hermit triggers after the 4th refusal). If a player
        // somehow refuses 4 times without insulting/crying, the objective
        // does not complete; this is acceptable v1 behavior.
        {
          kind: 'any_flag',
          flags: ['accepted_call', 'insulted_hermit_hat', 'cried_at_hermit']
        }
      ]
    }
  ]
};

export const quests: Record<QuestId, Quest> = {
  [answer_the_call.id]: answer_the_call,
};
```

### 7.2 Objective coverage check

| Player path | Objective 1 (survive) | Objective 2 (travel) | Objective 3 (hear) | Objective 4 (decide) |
|---|---|---|---|---|
| Farmboy → defeats first_tax_rat → crossroads → accept | ✅ unlocked_crossroads | ✅ visited | ✅ started_call_encounter | ✅ accepted_call |
| Knight → defeats Bursar → King's Road → crossroads → insult | ✅ unlocked_kings_road | ✅ visited | ✅ started_call_encounter | ✅ insulted_hermit_hat |
| Wizard → defeats Examiner → Cobbled Walk → crossroads → cry | ✅ unlocked_cobbled_walk | ✅ visited | ✅ started_call_encounter | ✅ cried_at_hermit |
| Bard → defeats Critic → back-alley → crossroads → refuse 4× → hermit lingers → insult | ✅ unlocked_back_alley | ✅ visited | ✅ started_call_encounter | ✅ insulted_hermit_hat |

All four class paths complete the quest cleanly via current Act I flow.

### 7.3 No side quests

`Active — Side` renders empty in v1. Plan 5+ adds side quest entries (the spec for those plans owns specific authoring).

---

## 8. Tests + acceptance criteria

### 8.1 Engine tests

- **`evalPredicate` `any_flag`** — true on at-least-one-truthy; false on all-falsy or missing flags.
- **`checkQuests`** — activates a matching quest; doesn't re-activate an active quest; doesn't activate a completed quest; completes objectives in order; doesn't complete an objective whose predicate is unmet; finalizes a quest when all objectives done; doesn't mutate input.
- **Save migration v2 → v3** — backfills three new fields on legacy saves; existing v3 saves round-trip cleanly; corrupted `story` substructures default-empty without throwing.
- **The `answer_the_call` quest** — one test per objective verifying its trigger flag/visit; one full-flow test that the quest finalizes for at least one class path.

### 8.2 Store tests

- `markQuestLogOpened` snapshots `questLogActivityCount` into `questLogActivityAtLastOpen` and persists if autosave is on.
- After a quest activation or objective completion, `questLogActivityCount > questLogActivityAtLastOpen` (badge would render); after `markQuestLogOpened`, they are equal (badge cleared).
- `started_call_encounter` flag is set when the call narrative encounter starts (this is engine, but the store test exercises it through `reduce`).

### 8.3 UI tests

- `QuestLogModal` renders all three sections.
- Active quest with one objective done shows the collapse toggle; collapsing hides the done objective.
- Future objectives are not in the DOM (assert by absence of objective-3 label when only objective-1 is done).
- Empty side and completed sections render `(none yet)`.
- Scroll button on WorldPanel opens the modal; badge appears on quest activation; clears on open.
- `aria-modal="true"`, `role="dialog"`, `aria-labelledby` are present (parity with achievements modal).

### 8.4 Integration smoke (`src/__tests__/quests.e2e.test.ts`)

- Farmboy run from `StartNewGame` → wound first_tax_rat to 1 HP → AttackTarget → enter crossroads → trigger `the_call` encounter → choose Accept → assert quest is in `completedQuests` and all four objectives are in `completedObjectives.answer_the_call`.

### 8.5 Acceptance criteria

The plan is shippable when:

1. The single v1 quest exists in the registry; `validateContent` passes.
2. The quest activates at game start (after StartNewGame), all four objectives complete in order through normal Act I play, and the quest finalizes on Accept (or on any of the three sticky resolution flags).
3. Future objectives are never visible in the modal DOM.
4. Completed objectives are collapsible per quest (component-local state; resets on modal close).
5. Badge appears on new activation/completion; clears on open.
6. "Consign this tale to the flames" wipes quest state along with the save; "Forget thy deeds" leaves quest state alone.
7. Save v2 → v3 migration loads existing in-progress saves cleanly.
8. All tests pass; tsc clean; build clean.

---

## 9. Open questions resolved during spec self-review

### 9.1 Why a counter, not a timestamp

The badge needs to know "is there quest activity the player hasn't seen?" Two approaches were considered:

1. **Timestamp:** `questLogOpenedAt: number` (unix ms). Each quest activation / objective completion would need its own timestamp; the badge compares the latest event timestamp against the snapshot. Bloats the data structure with a timestamp on every activation and objective.
2. **Counter snapshot:** A single `questLogActivityCount` incremented by `checkQuests` whenever it activates a quest or completes an objective. The snapshot `questLogActivityAtLastOpen` is updated on modal open.

The counter is simpler — two integer fields on `state.story`, no per-event metadata, no clock dependency in tests. §4.3 reflects this choice.

### 9.2 Refusal-only path doesn't complete the "Decide" objective

Section 7.1's note acknowledges this: a player who refuses 4 times without ever insulting or crying does not complete the quest. After the 4th refusal, the hermit lingers and the player must engage with the lingering encounter (which routes through insult/cry/dismiss). This is acceptable v1 behavior — the quest visibly stays on "Decide" until the player engages.

If this proves frustrating in playtest, the fix is one extra flag on the hermit_dismiss resolver (e.g., `hermit_dismissed: true`) added to the `any_flag` list. Not blocking for v1.

### 9.3 Quests vs. achievements: deliberate divergence

Achievements are account-level (own localStorage key); quests are per-run (in `state.story`). Symmetry would suggest separate persistence, but quests are inherently tied to the in-progress narrative state and have no meaning across runs. The asymmetry is correct.

---

## 10. Summary of net-new code

### Engine
- `src/engine/types.ts`: add `QuestObjective`, `Quest` types; extend `Predicate` with `any_flag`; extend `GameState['story']` with three new fields.
- `src/engine/story.ts`: add `any_flag` branch to `evalPredicate`.
- `src/engine/quests.ts` (new): export `checkQuests(state)`.
- `src/engine/events.ts`: call `checkQuests` after `checkBeats` in `reduce` and in `drainPendingEncounter`.
- `src/engine/save.ts`: bump `SAVE_VERSION` to 3; add v2→v3 migration.
- `src/engine/narrative.ts`: set `started_call_encounter` flag when `the_call` narrative encounter starts.

### Content
- `src/content/quests/index.ts` (new): single quest definition.
- `src/content/index.ts`: aggregate `quests` into `content`; extend `validateContent` for quest predicates.

### Store
- `src/ui/store.svelte.ts`: add `markQuestLogOpened()` method.

### UI
- `src/ui/QuestLogModal.svelte` (new).
- `src/ui/WorldPanel.svelte`: add scroll button (third icon in `.header-actions`); mount modal; derive badge.

### Tests
- `src/engine/__tests__/quests.test.ts` (new).
- `src/engine/__tests__/save.test.ts`: extend for v3 migration.
- `src/engine/__tests__/story.test.ts`: extend for `any_flag` predicate.
- `src/ui/__tests__/QuestLogModal.test.ts` (new).
- `src/ui/__tests__/WorldPanel.questlog.test.ts` (new): scroll button + badge.
- `src/__tests__/quests.e2e.test.ts` (new): full Act I flow integration.
