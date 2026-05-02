# Plan 4.5 — Achievements

**Date:** 2026-05-01
**Game:** The Heroic Chronicle
**Predecessor specs:** [2026-04-24 Master Design](2026-04-24-text-rpg-design.md), [2026-04-30 Skills & Classes](2026-04-30-skills-and-classes-design.md)
**Related:** [Narrative Spine](../narrative-spine.md)

---

## 1. Goals

Add a recognition system that:

1. **Rewards play with structural meta-commentary.** When a notification pops to recognize "you refused the call four times," the system itself is breaking the fourth wall in the same gentle way the narrator already does. Achievements pair tonally with the spine: recognition coming from outside the story is the same outside that the spine eventually unmasks as Joseph Campbell.
2. **Surfaces foreshadowing seeds.** Three achievements (`on_schedule`, `page_counted`, `glimpsed_the_editor`) exist as locked entries from day one. Their flags are deliberately unset; Plan 5 will plant the matching content. The presence of an `Hidden — 0 of 3 remaining` counter teases that something more is there without spoiling what.
3. **Adds replayability.** "The Tetralogy" rewards trying all four classes; "Six Cosmic Chuckles" rewards completionists chasing every Tempt Fate backfire across runs. Both are account-level: progress compounds.
4. **Stays in voice.** No "Mechanical / Replayability / Spine" labels in the UI; no Steam-style progress bars; no dev-facing taxonomy leaking through. Just earned + locked, sorted earn-first, with a hidden footer counter.

## 2. Non-goals

- **Sound effects.** No audio system exists; deferred indefinitely.
- **Actual page-number / man-in-tweed content placement.** Plan 5+ owns that authoring; achievement entries point at flags Plan 5 will set.
- **Multi-profile per browser.** "One browser = one player" — each device has its own localStorage, which is granular enough.
- **Custom achievement icons.** Just the ✦ glyph for earned and ◇ for locked. Custom illustrations are Plan 6 polish if ever.
- **Steam-like progress bars** ("3 / 6 backfires seen") on locked achievements. Just a binary checkbox state in v1.
- **Time/date metadata** on earned achievements. Possible later; not v1.
- **Sharing / exporting achievements.** No backend.
- **User-facing category labels.** The achievement registry has no `category` field. Sorted earn-first, then locked, then hidden footer.

---

## 3. Architecture overview

Achievements are an account-level recognition layer that lives **separately from `GameState`**. They live in their own `localStorage` key (`heroicchronicle.achievements.v1`), survive both save deletion ("Consign this tale to the flames") and any future save-format migrations, and persist across all character runs on the same browser.

The trigger architecture **reuses the predicate evaluator** from story beats. Each achievement declares a `Predicate[]` precondition; after every reduce, `checkAchievements(state, record)` runs and returns any newly-unlocked ids. This mirrors the existing `checkBeats(state)` pattern.

The reducer remains pure and unchanged in shape. All achievement bookkeeping happens in the **store's `dispatch`** method as a side effect after `reduce`:
- Account-level mutation (e.g., `played_classes`, `tempt_fate_backfires_seen`)
- Predicate evaluation against a *virtual* state with account-level counters synthesized into `world.flags`
- Toast queueing and log entry emission for newly-unlocked achievements
- Persistence via `saveAchievements`

---

## 4. Data model

### 4.1 Type extensions

In `src/engine/types.ts`:

```ts
export type AchievementId = Brand<string, 'AchievementId'>;
export const AchievementId = (s: string) => s as AchievementId;

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;          // gated for descriptionHidden until earned; full reveal on unlock
  preconditions: Predicate[];   // ALL must be true; reuses existing Predicate union
  hidden?: boolean;             // if true, entry is invisible in panel until earned
  descriptionHidden?: boolean;  // if true, name visible but description = "?" until earned
};
```

`hidden` and `descriptionHidden` are independent. Most achievements use neither (fully visible). Refusal-branch achievements use `descriptionHidden`. Spine achievements use `hidden`.

### 4.2 Predicate extension

The existing `Predicate` union covers `flag` / `visited` / `beat_completed` / `stage`. Three new variants are added:

```ts
| { kind: 'flag_at_least'; flag: string; min: number }   // numeric flag values >= min
| { kind: 'level_at_least'; level: number }              // character.level >= level
| { kind: 'currency_at_least'; n: number }               // character.currency >= n
```

`evalPredicate` in `src/engine/story.ts` gets three matching branches. Story beats inherit them for free.

### 4.3 Account-level record

```ts
// In src/engine/achievements.ts
export type AchievementsRecord = {
  unlocked: AchievementId[];                    // earned ids in insertion order (earliest → latest); deduped
  played_classes: string[];                     // for The Tetralogy; classIds played to date; deduped
  tempt_fate_backfires_seen: string[];          // for Six Cosmic Chuckles; backfire kinds seen; deduped
  unlockedCountAtLastOpen: number;              // snapshot of unlocked.length the last time the modal was opened; drives the trophy "new" badge
};
```

Stored under `localStorage` key `heroicchronicle.achievements.v1`. JSON-serialized. Default if missing or corrupted: `{ unlocked: [], played_classes: [], tempt_fate_backfires_seen: [], unlockedCountAtLastOpen: 0 }`.

The `unlocked` array is **insertion-ordered**: when an achievement unlocks, its id is appended. The panel uses this order for the "earned-first, in earn order" sort.

### 4.4 Content registry

New file `src/content/achievements/index.ts` aggregates the achievement definitions, mirroring the existing per-type content registries. Aggregated in `src/content/index.ts` as `content.achievements`.

`validateContent` extends to verify each achievement's predicates reference known flags, beats, or stages where statically determinable. Predicates referencing `achievement_seed.*` flags are intentionally allowed even though no current code sets them (Plan 5+ does).

---

## 5. Engine

### 5.1 `engine/achievements.ts` module

New module. Exports:

```ts
export function loadAchievements(): AchievementsRecord;
export function saveAchievements(record: AchievementsRecord): void;
export function clearAchievements(): void;       // wipes localStorage + returns to default
export function isUnlocked(record: AchievementsRecord, id: AchievementId): boolean;

export function checkAchievements(
  state: GameState,
  record: AchievementsRecord
): { record: AchievementsRecord; newlyUnlocked: AchievementId[] };
```

### 5.2 The "virtual flags" trick

`checkAchievements` exposes account-level counters as numeric flags so the predicate evaluator (which only reads `GameState`) can check them via the existing `flag_at_least` predicate. Specifically:

```ts
function checkAchievements(state, record) {
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
  // iterate Object.values(content.achievements); skip already-unlocked ids;
  // evalPredicate(virtualState, p) for every precondition; ALL true => unlock.
}
```

The `__account.` namespace prefix is a convention. Real game code never sets these flags directly; they're synthesized only at check time.

### 5.3 Engine-set flags

Five small additions to existing reducers and resolvers, each setting a single flag the first time a condition occurs:

| Where | Flag set | Achievement it triggers |
|---|---|---|
| `engine/combat.ts` `endCombat` victory branch | `achievements.first_combat_won: true` | `first_blood` |
| `engine/progression.ts` `applyLevelUp` skill-unlock branch | `achievements.signature_unlocked: true` | `signature_move` |
| `engine/events.ts` `SetTheme` case (when theme === 'moonlit') | `achievements.theme_moonlit: true` | `moonlit` |
| `content/skills/resolvers.ts` Tempt Fate resolver entry | `achievements.tempted_fate: true` | `tempt_fate` |
| `content/skills/resolvers.ts` Tempt Fate resolver, each backfire branch | `__just_tempted_backfire: '<kind>'` (transient) | drained by store, feeds `six_cosmic_chuckles` |

The transient `__just_tempted_backfire` flag mirrors the existing `__pending_encounter` pattern: set in the reducer, drained by the store after reduce, then cleared. Beats also benefit from `flag_at_least` etc. for free.

### 5.4 Store integration

After every `reduce(state, event)`, the store's `dispatch` does:

1. **StartNewGame side-effect:** if event was `StartNewGame`, push `event.classId` into `record.played_classes` (deduped via `Set`).
2. **Backfire drain:** if `state.world.flags['__just_tempted_backfire']` is set, push the value into `record.tempt_fate_backfires_seen` (deduped) and clear the flag from state.
3. **Run `checkAchievements(state, record)`** → `{newRecord, newlyUnlocked}`.
4. **For each newly-unlocked id:**
   - Append a `system` log entry with `systemLabel: 'ACHIEVEMENT'` and text `"✦ <name> — <description>"`.
   - Push the achievement onto a transient `pendingToasts: $state<Achievement[]>` array on the store.
5. **Persist:** call `saveAchievements(newRecord)`.
6. **Commit** the new state to the store.

### 5.5 forgetAchievements

The store exposes `forgetAchievements()` which calls `clearAchievements()`, resets the in-memory `$state.raw<AchievementsRecord>` to default, and triggers a re-render.

---

## 6. UI

### 6.1 Trophy icon in WorldPanel header

Adds a button next to the existing compass icon. SVG line-art trophy/goblet, same stroke style as the compass:

```svelte
<button class="trophy" aria-label="View achievements" title="Achievements" onclick={openAchievements}>
  <!-- trophy SVG -->
  {#if newSinceLastOpen > 0}
    <span class="trophy-badge" aria-label="{newSinceLastOpen} new">●</span>
  {/if}
</button>
```

A small gilt dot appears on the trophy when `record.unlocked.length > record.unlockedCountAtLastOpen`. When the panel is opened, the count snapshot is updated to current `unlocked.length` and the record persisted; the dot disappears.

### 6.2 Achievements modal

New `AchievementsModal.svelte`. Same backdrop + dialog pattern as `SettingsModal.svelte`. Layout:

- **Header:** `Achievements (N / M earned)` where M is the count of all *visible* (non-`hidden`) achievements.
- **List body:** flat list, no category sections.
  - Sort order: earned first (in the order they were earned), then locked (in author order from the registry).
  - Each row:
    - Earned: `✦ <name>` (gilt glyph) + full description.
    - Locked, descriptionHidden: `◇ <name>` (muted glyph) + `?` for description.
    - Locked, normal: `◇ <name>` + full description.
    - `hidden: true` achievements: not in the list at all.
- **Footer:** `Hidden — N of K remaining` where K is the total count of `hidden` achievements and N is how many of those have been earned. Followed by `— keep playing —`.
- Close button; Escape dismisses; backdrop click dismisses.

### 6.3 AchievementToast component

New `AchievementToast.svelte`. Renders a queue of toasts at fixed top-center position above WorldPanel:

- Gilt-bordered, parchment-bg, display-serif name, italic description.
- ✦ glyph in front of the name.
- 4-second auto-dismiss; clicking dismisses early.
- Multiple unlocks in one tick stack vertically with small offsets (so a flurry of unlocks doesn't pile on top of each other).
- `pendingToasts` is `$state<Achievement[]>` on the store; the component subscribes and renders one DOM node per entry. On dismiss/timeout the toast removes itself from the array.
- Uses Svelte's existing `fly` + `fade` transitions.
- A11y: `role="status"`, `aria-live="polite"`. Plus the simultaneous log entry means screen readers also see the achievement via the existing log live-region.

### 6.4 Settings modal "Forget thy deeds"

Adds a third action button alongside "Preserve thy tale" / "Consign this tale to the flames":

```
[ Preserve thy tale ]  [ Consign this tale... ]  [ Forget thy deeds ]
                                                          ↑ crimson-bordered danger
```

Clicking opens a second crimson confirmation modal (parallel pattern to the existing Consign confirmation):

> **Forget thy deeds?**
>
> *This will erase your achievements record across all your tales. Achievements cannot be earned again from a previous record.*
>
> [ Never mind ]   [ To the flames ]

Confirm calls `gameStore.forgetAchievements()`. Independent of "Consign this tale to the flames" — they wipe different buckets.

---

## 7. Initial achievement set (13)

### 7.1 Mechanical (7) — fully visible

| id | name | description | predicate |
|---|---|---|---|
| `first_blood` | First Blood | Win your first combat. Whatever you struck, it had it coming. | `flag: 'achievements.first_combat_won'` |
| `degree_of_heroism` | Degree of Heroism | Reach the Second Degree of Heroism. | `level_at_least: 2` |
| `signature_move` | Signature Move | Unlock your class's signature skill. | `flag: 'achievements.signature_unlocked'` |
| `worth_their_salt` | Worth Their Salt | Carry 100 leaves at once. | `currency_at_least: 100` |
| `tempt_fate` | Tempt Fate | Wink at the universe at least once. | `flag: 'achievements.tempted_fate'` |
| `six_cosmic_chuckles` | Six Cosmic Chuckles | Witness all six Tempt Fate backfires across your runs. | `flag_at_least: '__account.backfires_seen.count', min: 6` |
| `moonlit` | Moonlit | Switch to the Moonlit theme. | `flag: 'achievements.theme_moonlit'` |

### 7.2 Refusal Branches (3) — `descriptionHidden: true`

| id | name | description (revealed on unlock) | predicate |
|---|---|---|---|
| `refused_sincerely` | Refused, Sincerely | You refused four times. The narrator has gone quiet. | `flag_at_least: 'refusal_count', min: 4` |
| `insulted_the_hat` | Insulted the Hat | You expressed an opinion about the hat. It expressed one back. | `flag: 'insulted_hermit_hat'` |
| `cried_briefly` | Cried, Briefly | You wept your share. Briefly. Politely. Tunefully. | `flag: 'cried_at_hermit'` |

### 7.3 Replayability (1) — fully visible

| id | name | description | predicate |
|---|---|---|---|
| `the_tetralogy` | The Tetralogy | Have played all four classes. | `flag_at_least: '__account.played_classes.count', min: 4` |

### 7.4 Spine (3) — `hidden: true`, predicates point at flags Plan 5+ will set

| id | name | description (revealed on unlock) | predicate |
|---|---|---|---|
| `on_schedule` | On Schedule | On schedule, more or less. | `flag: 'achievement_seed.on_schedule'` |
| `page_counted` | Page Counted | You noticed something the manuscript wasn't supposed to show. | `flag: 'achievement_seed.page_counted'` |
| `glimpsed_the_editor` | Glimpsed the Editor | Out of the corner of your eye, a man you have not been introduced to. | `flag: 'achievement_seed.glimpsed_editor'` |

The spine achievements deliberately have unset flag triggers in current code. They appear *only* in the hidden footer counter. Plan 5+ owns when and where the matching content plants those flags.

---

## 8. Tests and acceptance criteria

### 8.1 Engine tests

- **Predicate extensions** — `flag_at_least`, `level_at_least`, `currency_at_least`: happy path + missing-flag-returns-false + at-min-returns-true + below-min-returns-false.
- **`checkAchievements`** — returns newly-unlocked subset; doesn't re-fire already-unlocked; builds virtual flags correctly; doesn't mutate input record; handles empty state safely.
- **Persistence** — `saveAchievements` / `loadAchievements` round-trip; `clearAchievements` empties storage; missing-key returns default; corrupted JSON returns default without throwing.
- **Each of the 13 achievements** — unit test that simulates the trigger condition and asserts the achievement fires (or for the 3 spine seeds: assert the achievement fires when its `achievement_seed.*` flag is manually set).

### 8.2 Store tests

- Dispatch flow: an event that sets `achievements.first_combat_won` results in `pendingToasts` containing `first_blood`, log gets a system entry, record persisted to localStorage.
- `__just_tempted_backfire` drain: resolver sets the flag; store dispatch reads it, adds to `tempt_fate_backfires_seen`, clears it from state.
- StartNewGame side-effect: classId added to `played_classes` (deduped — replaying same class doesn't double-add).
- `forgetAchievements`: empties record + clears localStorage.
- Persistence resilience: corrupted localStorage value returns default record without throwing.

### 8.3 UI tests

- Trophy icon renders in WorldPanel header.
- Trophy badge shows when `newSinceLastOpen > 0`; clears on open.
- Achievements modal: empty state ("0 / 10 earned"); one earned (sorted to top); all `hidden` achievements suppressed from list but counted in footer.
- Toast component: renders on `pendingToasts` push; dismisses after 4s; click-to-dismiss-early works; multiple toasts stack with offsets.
- Settings modal: "Forget thy deeds" button triggers crimson confirmation; Confirm fires `gameStore.forgetAchievements()`.

### 8.4 Integration smoke test

A new e2e test in `src/__tests__/`:
- Farmhand plays through to first combat victory → assert `first_blood` toast appeared; log has the system entry; localStorage has the achievement persisted.
- Reload simulation: `loadAchievements` returns the achievement.
- After `gameStore.resetSave()`: achievements still there.
- After `gameStore.forgetAchievements()`: achievements gone; save still intact.

### 8.5 Acceptance criteria

The plan is shippable when:

1. All 13 achievements exist in the registry; `validateContent` passes.
2. The 10 currently-triggerable achievements (everything except the 3 spine seeds) can be unlocked through normal gameplay.
3. The 3 spine seeds appear in the hidden footer counter and DO NOT fire (their flags are unset by current code).
4. Toasts appear top-center on unlock; auto-dismiss after 4s; click-to-dismiss works; multiple stack.
5. Trophy icon shows badge when achievements unlocked since last open; clears on open.
6. Achievements panel shows earned (gilt glyph + full description) and locked (muted glyph + name visible; description = `?` for `descriptionHidden`).
7. "Consign this tale to the flames" leaves achievements record intact.
8. "Forget thy deeds" wipes achievements record but leaves the save intact.
9. Achievements persist across browser reload.
10. All tests pass; typecheck clean; build succeeds.

---

## 9. Open questions deferred to implementation plan

These are lower-level decisions the implementation plan can resolve without further design input:

- Exact SVG path for the trophy icon (a goblet, a laurel, a small crest — pick one that reads clearly at 28×28 next to the existing compass).
- Toast stacking offset (probably 12–16 px between stacked toasts).
- Whether the panel scrolls internally or grows the modal (depends on how many achievements ship; v1 has 13 visible max, fits without scroll on most viewports).
- Exact timing curve for the toast `fly` transition (use the existing 400ms / 200ms pattern from WorldPanel for consistency).
- Whether the trophy badge animates (subtle pulse?) or just appears static. Defaulting to static; revisit if it doesn't feel celebratory enough.
