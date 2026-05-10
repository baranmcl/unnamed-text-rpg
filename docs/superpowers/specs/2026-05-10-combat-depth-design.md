# Combat Depth — Design Spec

## Goal

Give each of the four tutorial monsters (Insolent Pell, Feral Footnote, Pointed Heckler, Officious Tax Rat) a **signature status effect** they apply during combat. The player learns the status-effect system through *exposure* in their first fight: a status appears in the log and the character pane, persists for a turn or two, then expires. No new player-side counter mechanism is added in this pass — the player simply continues attacking while debuffed, and the status resolves itself ("wait it out"). Richer counter mechanisms (consumable cleanses, a Defend action, class-flavored parry/dispel) are deferred to future plans.

## Spec sources

- The status-effect engine already exists at [src/engine/status.ts](../../../src/engine/status.ts) with eight `StatusKind` values and helpers (`applyStatus`, `expireStatus`, `tickStatuses`, `hasStatus`, `findStatus`). Combat tests already exercise applying statuses to player and monster combatants.
- The CharacterPanel already renders the player combatant's statuses during combat with glyph + label + duration. All four statuses we apply (`weapon_suspended`, `next_attack_misses`, `skip_turn`, `armor_halved`) have UI mappings ready.

## Scope

**In scope:**
- New `MonsterAction` variant: `apply_status` (alongside existing `attack`, `special`, `flee_if_low_hp`)
- New `monsterTurn` dispatch case to handle the new action — calls `applyStatus()` on the player combatant, emits two log entries (action flavor + applied-status flavor)
- Update the four tutorial monsters' action rotations to include their signature `apply_status` action with weight 0.3
- Replace the Officious Tax Rat's existing `special` action (the "obscure agricultural ordinance" damage bonus) with the new `apply_status` — the bureaucratic-debuff flavor IS the signature trick
- Status expiration narration: emit a brief log entry when a player status expires via `tickStatuses` (so "wait it out" feels like a beat resolved, not a silent flag flip)
- Unit + e2e test coverage

**Out of scope:**
- Player-side counter mechanisms (consumable cleanses, Defend action, class-flavored counters) — these are options B/C/D from brainstorm, each their own future plan
- Status application by non-tutorial monsters (Grievance Bursar, Errant Examiner, Critic with Notes, and any future encounters) — scope creep; these can be themed later
- Damage / HP / armor re-balancing — only the rotation weights and the new action are added
- Skill-based counters at level 3+ — orthogonal feature
- Keyboard combat shortcuts (Q to attack, etc.) — deferred to a dedicated accessibility plan after Chapter 4 mentors
- New player buffs — engine already supports these for skills (e.g., Tempt Fate's `guaranteed_crit`); no change

## Architecture

### New `MonsterAction` variant

In [src/engine/types.ts](../../../src/engine/types.ts), extend `MonsterAction`:

```ts
export type MonsterAction =
  | { kind: 'attack'; weight: number; flavor: string }
  | { kind: 'special'; weight: number; flavor: string; damageBonus: number }
  | { kind: 'apply_status'; weight: number; flavor: string; status: StatusKind; duration: StatusDuration; appliedFlavor: string; expirationFlavor: string }
  | { kind: 'flee_if_low_hp'; weight: number; flavor: string };
```

Four new fields on the variant:
- `status: StatusKind` — which status to apply (must be a player-debuff type — see Per-monster section)
- `duration: StatusDuration` — how long the status lasts (e.g., `{ kind: 'turns', remaining: 1 }`, `{ kind: 'one_shot' }`, `{ kind: 'turns', remaining: 2 }`)
- `appliedFlavor: string` — short log entry that names the status to the player (e.g., "Your weapon is suspended.") — emitted separately from the action flavor so the player gets both a narrative beat AND a clear "what changed" signal
- `expirationFlavor: string` — short log entry that fires when the status ticks to zero and is removed (e.g., "You wrench your blade free.") — emitted by the expiration-narration path described below

### `monsterTurn` dispatch

In [src/engine/combat.ts](../../../src/engine/combat.ts), `monsterTurn()` currently has a switch over `action.kind` for `attack`, `special`, `flee_if_low_hp`. Add a fourth case for `apply_status`:

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

**Key property: no direct damage on this turn.** The monster spends its action applying the debuff. This creates the tutorial rhythm: status applied (no damage) → player has one turn debuffed → status expires → back to normal. The player learns the system through observation, not through having to do anything special.

### Status expiration narration

When `tickStatuses` removes a player status, no log entry currently fires — the status silently disappears. For tutorial purposes, the resolution beat needs to be visible. Add a narration log entry for each expired player status in the combat-turn tick path.

Location: `combat.ts` already calls `tickStatuses` at turn boundaries. Wrap the call (or add a post-tick comparison) to detect which statuses expired this turn and push a log entry per expired status. Each expired status emits its `expirationFlavor` (a per-monster string, since the same `StatusKind` could expire with different flavor depending on the source monster — Pell vs Footnote could both apply `weapon_suspended` in theory, but each has its own flavor).

**Implementation approach (v1):** the expiration narration path looks up the source-monster's `apply_status` action when a status ticks to zero and emits its `expirationFlavor`. The `applyStatus` helper sets `Status.source` to the monster name when the action fires; on expiration, look up the monster by source, find its `apply_status` action with matching kind, and pull `expirationFlavor`. If no matching source-monster can be found (e.g., a status from a skill, not a monster action), no narration fires — that's intentional and matches existing skill behavior.

## Per-monster signature statuses

| Monster | Status | Duration | Action weight |
|---|---|---|---|
| **Insolent Pell** | `weapon_suspended` | 1 turn | 0.3 |
| **Feral Footnote** | `next_attack_misses` | one_shot | 0.3 |
| **Pointed Heckler** | `skip_turn` | 1 turn | 0.3 |
| **Officious Tax Rat** | `armor_halved` | 2 turns | 0.3 (replaces existing `special`) |

### Rotation weights

- **Pell** (currently 1 × `attack`): becomes `attack` 0.7 + `apply_status` 0.3
- **Footnote** (currently 1 × `attack`): becomes `attack` 0.7 + `apply_status` 0.3
- **Heckler** (currently 1 × `attack`): becomes `attack` 0.7 + `apply_status` 0.3
- **Officious Tax Rat** (currently `attack` 0.6 + `special` 0.3 + `flee_if_low_hp` 0.1): becomes `attack` 0.6 + `apply_status` 0.3 + `flee_if_low_hp` 0.1 (the existing `special` is replaced; its "obscure agricultural ordinance" flavor IS the bureaucratic-debuff thematic, so the apply_status flavor inherits it directly)

### Flavor copy

| Monster | Action flavor | Applied flavor | Expiration flavor |
|---|---|---|---|
| Pell | "The pell tilts to catch your blade between its bracing-rails." | "Your weapon is suspended." | "You wrench your blade free." |
| Footnote | "The footnote zigzags into three positions simultaneously, then settles into none of them." | "You see triple. Your next attack is going to miss." | "Your vision settles." |
| Heckler | "The heckler delivers a precisely-timed shout. You lose your line." | "You can't recover this turn." | "You find your line again." |
| Tax Rat | "The Tax Rat slips a fee-notice between two scales of your armor. The paperwork lodges." | "Your armor is halved while the levy is in effect." | "The levy lapses. Your guard returns." |

### Thematic rationale

Each status mirrors the class's Chapter 1 motif:
- Pell catches the Knight's weapon (echoes the Knight's "dismissal-was-for-recklessness" arc — even an inanimate object can disarm you when you swing without care)
- The Footnote scrambles the Wizard's perception (matches the three-margin opener — the world isn't where you think it is)
- The Heckler robs the Bard of their next line (matches showtime anxiety — your audience can throw you off)
- The Tax Rat audits the Farmhand's armor (bureaucratic intrusion matches the back-field's mundane harassment)

## UI

**Zero new UI code.** The CharacterPanel already renders the player combatant's statuses during combat at [src/ui/CharacterPanel.svelte](../../../src/ui/CharacterPanel.svelte):
- `glyphFor` maps each StatusKind to a glyph (`✗`, `⌀`, `⊘`, `½` for the four we're using)
- `labelFor` produces a readable label (`weapon suspended`, `next attack misses`, etc.)
- `formatDuration` produces the duration string (`1 turn remaining`, `fires once`, `2 turns remaining`)
- An "Effects" section in the pane lists all current statuses with their glyph + label + duration

When a tutorial monster applies a status, the status appears in the Effects section the moment `applyStatus()` writes it to `combat.combatants[player].statuses`. It disappears when `tickStatuses` removes it. The player gets a persistent visual cue in the side pane in addition to the log narration.

## Files affected

**Modified:**
- `src/engine/types.ts` — extend `MonsterAction` with the `apply_status` variant
- `src/engine/combat.ts` — add `apply_status` dispatch case in `monsterTurn`; add expiration-narration emission when player statuses tick to zero
- `src/content/monsters/index.ts` — update Pell, Footnote, Heckler, Officious Tax Rat action lists
- `src/engine/__tests__/combat.test.ts` — extend with `apply_status` dispatch tests and expiration-narration tests
- `src/content/__tests__/validate.test.ts` — extend with `apply_status` action validation

**Created:**
- `src/__tests__/combatStatus.e2e.test.ts` — full-flow integration tests, one per tutorial monster

## Tests

### Engine unit tests (`src/engine/__tests__/combat.test.ts`)

Append a new `describe('apply_status monster action')` block with:
1. **dispatch:** when monster rolls `apply_status`, `combat.combatants[player].statuses` contains the new status with the configured kind/duration
2. **no damage:** when monster rolls `apply_status`, player HP does not change
3. **flavor logged:** both `action.flavor` and `action.appliedFlavor` appear as combat log entries
4. **expiration logged:** when the status duration reaches zero and `tickStatuses` removes it, a log entry with `action.expirationFlavor` fires
5. **weight-respected:** if the monster's only action is `apply_status` with weight 1.0, the status fires every monster turn; if mixed with `attack` 0.7, `apply_status` 0.3, it fires on ~30% of turns over many trials

### Content validation tests (`src/content/__tests__/validate.test.ts`)

Append:
1. Every `apply_status` action's `status` field is a valid `StatusKind` (compile-time helps, but a runtime assertion catches typos that bypass type narrowing)
2. The four tutorial monsters (Pell, Footnote, Heckler, Officious Tax Rat) each have exactly one `apply_status` action

### E2E integration tests (new `src/__tests__/combatStatus.e2e.test.ts`)

One test per tutorial monster (4 tests). Each:
1. Seeds the gameStore with a deterministic RNG so the `apply_status` action rolls on a known turn
2. Triggers the tutorial encounter (via the class's opener flow OR by directly dispatching `TriggerEncounter`)
3. Loops `AttackTarget` until the monster's `apply_status` turn fires
4. Asserts the status is on the player combatant with the right kind
5. Asserts the next player attack reflects the debuff (zero weapon damage for `weapon_suspended`, auto-miss for `next_attack_misses`, turn skipped for `skip_turn`, armor halved for `armor_halved`)
6. Continues attacks until the status expires
7. Asserts the expiration log entry fired

## Acceptance criteria

1. The `MonsterAction` type includes the new `apply_status` variant with `status`, `duration`, `appliedFlavor`, `expirationFlavor` fields
2. Each of the four tutorial monsters has an `apply_status` action in its rotation at weight 0.3 with the spec-defined status, duration, and flavor copy
3. When the action fires in combat: the action flavor and applied-status flavor both appear as combat log entries; the status is added to the player combatant's `statuses` array; no weapon damage is dealt on that turn
4. The status appears in the CharacterPanel's Effects section during combat with the right glyph, label, and duration
5. The status expires after its configured duration; an expiration log entry fires with the monster's `expirationFlavor`
6. The Officious Tax Rat no longer has the prior `special` (damage-bonus) action — replaced by `apply_status`
7. All 285 existing tests still pass; new tests pass
8. `npx tsc --noEmit` succeeds

## Open questions and future work

- **Option B — Cleanse consumables:** each class starts with a class-flavored cleansing consumable that removes one status. Knight's "tighten the grip" oil, Bard's courage-mead, Wizard's clarity-glyph, Farmhand's pocket-vinegar. Adds 4 consumables and a UseItem effect for status removal. Own plan.
- **Option C — Defend action:** a new fourth combat action (Attack / Defend / Item / Flee) that cleanses one status and/or grants brief armor. Requires UI button, combat action handler, and balance pass. Own plan.
- **Option D — Class-flavored counters:** Knight parries `weapon_suspended` via a Brawn check; Wizard dispels with a basic cantrip; Bard counters `skip_turn` with Bravado; Farmhand outlasts via Pluck. Most thematic, biggest scope; pairs naturally with Chapter 4 mentor teaching the counter. Own plan.
- **Non-tutorial monsters:** the Grievance Bursar, Errant Examiner, and Critic with Notes (currently the L1-class second-encounters) also have `special` damage-bonus actions. They could be retrofitted with `apply_status` in a follow-up — but they're not tutorials, so the urgency is lower.
- **Keyboard input:** Q to attack, E to use item, number keys for narrative choices, Escape to close modals. Deferred to a dedicated accessibility plan after Chapter 4 mentor content lands and the UI surface settles.
