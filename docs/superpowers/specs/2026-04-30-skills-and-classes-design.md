# Plan 4 — Skills, Status Effects, and the Remaining Three Classes

**Date:** 2026-04-30
**Game:** The Heroic Chronicle
**Predecessor specs:** [2026-04-24 Master Design](2026-04-24-text-rpg-design.md)
**Predecessor plans:** Plans 1, 2, 3 (foundation, first playable, story beats + narrative combat)

---

## 1. Goals

Plan 4 delivers the second of the four classes' worth of mechanical depth, and lays the substrate (status effects) that future content will rely on. Specifically:

1. **Make all four classes playable.** Disgraced Knight, Accidental Wizard, and Bard Who Didn't Ask For This join Reluctant Farmboy on the character-creation screen, each with starting stats, items, a tutorial location, and a placeholder ~30-second opener. Plan 5 will replace each placeholder with the full bespoke 5-minute opening scene.
2. **Ship the skills system.** Combat gains a "Skill" action; level 3 unlocks each class's signature move; MP gating works.
3. **Author all four signature moves.** Brute Force, Out-Think It, Swagger, Tempt Fate — each with full mechanics including their interactions with the new status system.
4. **Build a generic status-effect system.** Combat-scoped statuses (intimidated, weakness revealed, guaranteed crit, etc.) and world-scoped statuses (designed in, unused in Plan 4) share one mechanism, visible in both panels.
5. **Round out per-level progression.** Fixed per-class stat-bump rotations land the spec's "+1 to a stat per level" promise. Stage transitions grant a bonus level-up (mechanic only — banner animation deferred to Plan 6).

## 2. Non-goals

- **Bespoke 5-minute class openings.** Each new class gets a placeholder short opener (analogous to the existing `farmboy_opening_short`). Plan 5 owns the full scenes.
- **Gilt-unfurl banner animation.** The milestone level-up fires mechanically and emits a log line; the visual set piece ships with Plan 6's other animations.
- **World-scoped status content** (hermit blessings, tavern drunk, food buffs, etc.). The system supports them but no encounter populates them in Plan 4.
- **Skill submenu.** Each class has exactly one skill in Plan 4. The submenu can land when a class first gains a second skill.
- **Player-chosen stat bumps on level-up.** Fixed rotations only. Reconsider after playtest.
- **Status stacking.** Re-applying the same `StatusKind` replaces the existing entry. No compounding poison, no stacking buffs.
- **Multi-monster combat status interactions.** Combat is 1v1 in current scope.

---

## 3. Status-effect system

### 3.1 Data model

New types added to `engine/types.ts`:

```ts
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
  | { kind: 'turns'; remaining: number }      // ticks down at start of owner's turn
  | { kind: 'until_end_of_fight' }            // cleared when combat ends
  | { kind: 'one_shot' }                      // cleared at the moment the status fires
  | { kind: 'fights_remaining'; n: number }   // world-scoped, decrements on combat end
  | { kind: 'permanent' };                    // world-scoped, manual removal only

export type Status = {
  id: number;            // unique within a state, monotonically increasing
  kind: StatusKind;
  duration: StatusDuration;
  source: string;        // human label for tooltip/log ("Tempt Fate backfire")
  magnitude?: number;    // optional payload (e.g., damage multiplier, dot amount)
};
```

### 3.2 Where statuses live

- **`state.character.statuses: Status[]`** — persistent across combats; ONLY world-scoped durations (`fights_remaining`, `permanent`) live here.
- **`combatant.statuses: Status[]`** — each combatant in `CombatState['turn-based']` (player and monster) carries its own array. Both world-scoped and combat-scoped statuses live here during a fight.

On `startCombat`: world-scoped statuses on `state.character.statuses` are copied onto the player combatant's `statuses` array. Combat code reads from one source.

On `endCombat`: combat-scoped statuses are dropped. World-scoped statuses on the player combatant tick `fights_remaining` (decrement; if reaches 0, removed) then are written back to `state.character.statuses`.

### 3.3 Lifecycle and ticking

A new helper `tickStatuses(combatant): combatant'` runs at well-defined points:

- **Start of player turn** → tick the player combatant's `turns`-duration statuses; expired entries removed
- **Start of monster turn** → tick that monster's `turns`-duration statuses; expired entries removed
- **End of combat** → drop combat-scoped statuses, decrement `fights_remaining` on world-scoped, persist back to character

One-shot statuses (`guaranteed_crit`, `next_attack_misses`, `free_retaliation`) carry `duration: { kind: 'one_shot' }` and clear themselves at the moment they fire, not via the tick helper.

Re-applying the same `StatusKind` to the same combatant replaces the existing entry (no stacking).

### 3.4 Reducer wiring

No new player-dispatched events for status management itself. Statuses are applied internally by:
- Skill resolvers (e.g., Out-Think It applies `weakness_revealed`)
- Combat math (e.g., a monster's special could apply a status to the player in a future encounter)
- Narrative resolvers (Plan 5+)

Combat math reads statuses on the relevant actor:
- `weakness_revealed` on monster → player attacks deal `× 1.5` damage
- `guaranteed_crit` on player → forces hit, forces crit, then clears
- `next_attack_misses` on player → forces miss, then clears (checked **before** `guaranteed_crit`); when both are present, the missed attack also clears `guaranteed_crit` (the crit is wasted)
- `intimidated` / `skip_turn` on actor → turn skipped at the dispatch layer
- `weapon_suspended` on player → weapon damage treated as 0 in damage roll
- `armor_halved` on player → effective armor halved in incoming damage roll
- `free_retaliation` on monster → triggers an immediate free monster attack outside the normal turn cycle, then clears

### 3.5 UI

**CharacterPanel** ([CharacterPanel.svelte](../../src/ui/CharacterPanel.svelte)) gains a small "Afflictions & Boons" row, hidden when the player has no statuses. Each status renders as a subtle pill with a glyph + name; hover shows source + remaining duration.

**WorldPanel** ([WorldPanel.svelte](../../src/ui/WorldPanel.svelte)) during combat: the monster's name in the combat header gets a one-line tag row beneath it, e.g. *"· intimidated · weakness revealed"*. Statuses on the player combatant render in the CharacterPanel's "Afflictions & Boons" row, with combat-scoped statuses visually distinguished from world-scoped (subtle parchment-edge tint or dot).

**Log entries**: applying or expiring a notable status emits a `combat`-kind log entry. Wording examples:
- *"The Tax Rat looks rattled — **intimidated**."*
- *"You see exactly where its argument falls apart — **weakness revealed**."*
- *"You wink at the universe. **Tempt Fate**: a crit awaits your next swing."*

---

## 4. Skills system

### 4.1 Skill type extension

Existing `Skill` type ([types.ts:158-165](../../src/engine/types.ts#L158-L165)) gains one field:

```ts
export type Skill = {
  id: SkillId;
  name: string;
  description: string;
  mpCost: number;
  scalingStat: keyof StatBlock;
  unlockLevel: number;
  resolverId: SkillResolverId;   // NEW
};

export type SkillResolverId = string;
export type SkillResolver = (state: GameState) => GameState;
```

A new `content/skills/resolvers.ts` exposes `skillResolvers: Record<SkillResolverId, SkillResolver>` (mirrors the narrative-resolver registry pattern).

### 4.2 Combat UI

The combat action bar in [WorldPanel.svelte](../../src/ui/WorldPanel.svelte) gains a fourth button: **Skill**. Order: Attack / Skill / Item / Flee.

Visibility & state:
- **Always visible** during turn-based combat
- **Disabled** when `character.knownSkills.length === 0` — tooltip: *"Locked until Level 3"*
- **Disabled** when MP < skill's `mpCost` — tooltip: *"Not enough mana — need {N} MP"*
- **Enabled** when player has at least one known skill and sufficient MP

### 4.3 Reducer event

```ts
{ type: 'UseSkill'; skillId: SkillId }
```

Handled in `combat.ts`. Validates: combat is turn-based, it's the player's turn, the skill is in `character.knownSkills`, MP is sufficient. On success: deducts MP, looks up the skill's `resolverId`, runs the resolver. The resolver returns a new state (which may have applied statuses, dealt damage, etc.). Then the combat sub-reducer advances the turn (resolver does NOT advance turn itself — engine convention).

### 4.4 Level-3 unlock

The existing level-up code path (currently in `endCombat`'s loop in [combat.ts](../../src/engine/combat.ts)) extracts a helper `applyLevelUp(state): state` that:

1. Increments `character.level`
2. Adds HP (`floor(brawn × 1.5)`) and MP (`brains × 1`) to the maxes
3. Refills HP and MP to the new max (preserves existing behavior)
4. Applies the stat bump from `STAT_ROTATIONS[classId][newLevel - 2]`
5. If the new level matches `class.signatureMove`'s `unlockLevel` (3 in v1) and the skill isn't already in `knownSkills`, appends it and emits a `system`-kind log entry:
   *"You learn **{Skill Name}**. (Level 3 signature move.)"*

`applyLevelUp` is also called by the milestone-bump path on stage advance.

---

## 5. Four signature moves

### 5.1 Brute Force (Brawn) — `brute_force`

- **MP cost:** 6
- **Description:** *"A heaving overhead swing. Costs you composure."*
- **Resolver:** Single attack roll with `accuracyModifier = -0.15` and `damageMultiplier = 1.8 + brawn × 0.02`. On hit, apply damage normally (no status). Consumes the turn whether it hits or misses.
- **Log on hit:** *"The {weapon} comes down with all your weight behind it. Damage: {N}."*
- **Log on miss:** *"The {weapon} bites only the dust. (Tempt the swing, lose the moment.)"*

### 5.2 Out-Think It (Brains) — `out_think_it`

- **MP cost:** 8
- **Description:** *"You point out three logical inconsistencies in their stance."*
- **Resolver:** Apply `weakness_revealed` to the target monster with duration `until_end_of_fight`. While active, ALL player attacks (basic + skill) deal `× 1.5` damage. Re-applying replaces the existing entry. Deals no direct damage. Consumes the turn.
- **Encounter opt-in for "ends by reasoning":** `CombatEncounter` gains an optional field `endsByReasoning?: boolean`. When `true` and Out-Think It is cast, the fight resolves immediately as a victory (XP/loot/currency rolls all proceed normally). No encounter sets this flag in Plan 4 — it's an authored hook for Plan 5+.
- **Log on apply:** *"You expose the contradiction at the heart of its grievance. **{Monster} — weakness revealed.**"*

### 5.3 Swagger (Bravado) — `swagger`

- **MP cost:** 6
- **Description:** *"You roll your shoulders and let the silence do the work."*
- **Resolver:** Apply `intimidated` to the target monster with `{ kind: 'turns', remaining: 1 }`. Monster skips its next turn (the tick helper expires the status to 0 at start of monster's turn, but the dispatch-layer skip check fires first). Re-applying replaces (no compounding skip). Consumes the player's turn.
- **Log on apply:** *"You roll your shoulders. The {Monster} reconsiders its life choices. **Intimidated.**"*

### 5.4 Tempt Fate ((B)Luck) — `tempt_fate`

- **MP cost:** 6
- **Description:** *"You wink at the universe. The universe is, on average, unimpressed."*
- **Resolver:**
  1. Apply `guaranteed_crit` to the player as a one-shot status (no duration tick — fires + clears on next attack).
  2. Roll a single d100 through seeded RNG. If `roll < 15` (15% chance): pick uniformly from six self-effects (also seeded), apply that effect.
  3. Consumes the turn.
- **The six backfires** (each a separate log line):
  1. **Trip mid-swing** — apply `skip_turn` `{ turns: 1 }` to player. Log: *"You step on your own cloak. **Skip next turn.**"*
  2. **Crit yourself** — immediate `1d4` HP damage to player. Log: *"The universe accepts your wink. You crit yourself for {N}."*
  3. **Weapon goes mute** — apply `weapon_suspended` `{ turns: 3 }` to player. Log: *"Your weapon takes a vow of silence for the next three turns. **Weapon suspended.**"*
  4. **Drop your shield** — apply `armor_halved` `{ turns: 2 }` to player. Log: *"You catch a draft and forget how armor works. **Armor halved (2 turns).**"*
  5. **Nervous laugh** — apply `free_retaliation` to monster (one-shot). The monster takes a free attack immediately, status clears. Log: *"You laugh nervously. The {Monster} takes the cue."*
  6. **Wasted prophecy** — apply `next_attack_misses` to player (one-shot). On next player attack: miss-check fires first → miss + clear `next_attack_misses` AND clear `guaranteed_crit` together (the crit is wasted on the missed attack — intended joke). Log: *"A faint cosmic chuckle. **Your next strike is destined to miss.**"*
- **Log on cast (no backfire):** *"You wink at the universe. A crit awaits your next swing."*
- **Log on cast (with backfire):** *"You wink at the universe. The universe winks back. Awkwardly."* — followed by the specific backfire's log line.

### 5.5 Skill registry

`content/skills/index.ts` is updated to register all four skills with their resolvers wired:

```ts
brute_force        → resolverId: 'brute_force'
out_think_it       → resolverId: 'out_think_it'
swagger            → resolverId: 'swagger'
tempt_fate         → resolverId: 'tempt_fate'
```

`content/skills/resolvers.ts` (new file) implements the four resolvers.

---

## 6. Three new classes

All three classes follow the same authoring pattern as Reluctant Farmboy: stat block + baseHp/Mp + starting items + signature move + opening location + placeholder opener narrative node.

### 6.1 Disgraced Knight

- **ID:** `disgraced_knight`
- **Epithet:** *the Disgraced Knight*
- **Stats:** Brawn 9 / Brains 4 / Bravado 7 / (B)Luck 5
- **baseHp 40, baseMp 8** → Starting HP 67, MP 16
- **Signature move:** `brute_force`
- **Starting items:**
  - **Nicked Longsword** (weapon, damage 5) — *"Honored by three sieges and one drunken tavern altercation, the latter being the more recent."*
  - **Battered Half-Plate** (armor, armor 3) — *"Missing a pauldron. The other one is missing a smaller pauldron."*
  - **Defaced Family Crest** (quest) — *"Someone has scratched out the motto and replaced it with a single, very judgmental adjective."*
- **Opening location:** `quartermasters_yard`
- **Opening narrative node:** `knight_opening_short`
- **Stat rotation:** `['brawn', 'bravado', 'brawn', 'brains', 'brawn', 'bluck', 'brawn', 'bravado', 'brawn']`

### 6.2 Accidental Wizard

- **ID:** `accidental_wizard`
- **Epithet:** *the Accidental Wizard*
- **Stats:** Brawn 4 / Brains 10 / Bravado 5 / (B)Luck 6
- **baseHp 22, baseMp 20** → Starting HP 34, MP 40
- **Signature move:** `out_think_it`
- **Starting items:**
  - **Cracked Staff** (weapon, damage 3, statBonuses: `{ brains: 1 }`) — *"The crack hums faintly. Its rune is theoretically Wisdom; pronunciation may have intervened."*
  - **A Robe That Is Far Too Long** (armor, armor 1) — *"Trips you on stairs. Probably enchanted to do exactly that."*
  - **Tome of Questionable Translations** (quest) — *"Half a margin reads 'Beware the Lich-King'; the other half reads 'Beware the Itch-King.' Both are alarming."*
- **Opening location:** `burning_library`
- **Opening narrative node:** `wizard_opening_short`
- **Stat rotation:** `['brains', 'bluck', 'brains', 'bravado', 'brains', 'brawn', 'brains', 'bluck', 'brains']`

### 6.3 Bard Who Didn't Ask For This

- **ID:** `bard`
- **Epithet:** *the Bard Who Didn't Ask For This*
- **Stats:** Brawn 5 / Brains 7 / Bravado 9 / (B)Luck 4
- **baseHp 28, baseMp 14** → Starting HP 43, MP 28
- **Signature move:** `swagger`
- **Starting items:**
  - **Dented Lute** (weapon, damage 4) — *"Three of six strings. The fourth is, generously, implied."*
  - **Dramatic Cloak** (armor, armor 2) — *"Bills itself as 'theatrical-grade.' This is a category neither armor nor textile recognize."*
  - **Audience Expectation** (quest) — *"An invisible weight, surprisingly portable. Heaviest in the chest."*
- **Opening location:** `tavern_dressing_room`
- **Opening narrative node:** `bard_opening_short`
- **Stat rotation:** `['bravado', 'bluck', 'bravado', 'brains', 'bravado', 'brawn', 'bravado', 'bluck', 'bravado']`

### 6.4 Class teasers (creation screen)

Each class card on `CharacterCreation.svelte` shows a one-line teaser of the opening below the stat block:

- **Reluctant Farmboy:** *"You were going to weed the back field. Destiny had other plans."*
- **Disgraced Knight:** *"The yard at dawn. Your dismissal still pinned to the board."*
- **Accidental Wizard:** *"The library is on fire. The library is, however, only slightly on fire."*
- **Bard Who Didn't Ask For This:** *"Ten minutes to showtime. The audience is already heckling the curtain."*

The "(coming in a future plan)" tooltip and disabled state are removed from Knight/Wizard/Bard cards.

---

## 7. Three new starting locations and tutorial monsters

Each location has the same shape as the existing `family_farm`: a name, an opening description, one or more exits (in Plan 4 each has exactly one exit, leading to Dusty Crossroads), and a tutorial encounter accessible from the placeholder opening narrative node.

### 7.1 Quartermaster's Yard (`quartermasters_yard`)

**Description:** *"The army yard at first light, abandoned by everyone except a stack of unsigned timesheets and the lingering disappointment of recent superior officers. A pell stands in the middle of the dust, leaning slightly to starboard. Pinned to the duty board: a single sheet of vellum, addressed to you, beginning with the words 'Effective immediately.'"*

**Exits:**
- *the King's Road* → `dusty_crossroads`

**Tutorial encounter:** `combat_insolent_pell`

### 7.2 Slightly On Fire Library (`burning_library`)

**Description:** *"The reading room's vaulted ceiling carries an even, contemplative haze of smoke. The smoke is being polite. The fire — which is in only the third row of stacks and may yet be reasoned with — is also being polite, for now. Your robes drag. Your staff hums. Your tome insists, in three margins simultaneously, that the situation is fine."*

**Exits:**
- *the Cobbled Walk* → `dusty_crossroads`

**Tutorial encounter:** `combat_feral_footnote`

### 7.3 Tavern Dressing Room (`tavern_dressing_room`)

**Description:** *"The back room of the Wretched Pheasant smells like spilled mead, candlewax, and ambition. Ten minutes to curtain. Through the curtain, the audience is already exercising its vowels. One of those vowels is yours."*

**Exits:**
- *the back-alley* → `dusty_crossroads`

**Tutorial encounter:** `combat_pointed_heckler`

### 7.4 Tutorial monsters

All three follow the Practice Hay Bale pattern: modest HP, modest damage, **no currency drop**, no loot. Each gets a defeat-flavor line.

| Monster | HP | brawn | dodge | weaponDamage | Defeated flavor |
|---|---|---|---|---|---|
| **Insolent Training Pell** | 8 | 4 | 0 | 3 | *"The pell loses the argument and resumes leaning to starboard."* |
| **Feral Footnote** | 6 | 3 | 2 | 2 | *"The footnote sniffs, returns to its citation, and begins behaving like a footnote."* |
| **Pointed Heckler** | 7 | 4 | 1 | 3 | *"The heckler loses interest and starts heckling someone else."* |

### 7.5 Placeholder opening narrative nodes

Each new class gets a node mirroring `farmboy_opening_short`:

- `knight_opening_short` — two short paragraphs of yard-at-dawn prose, then a single button: *"Take it out on the pell."* → triggers `combat_insolent_pell`
- `wizard_opening_short` — two short paragraphs of library-on-fire prose, then a single button: *"Address the footnote."* → triggers `combat_feral_footnote`
- `bard_opening_short` — two short paragraphs of dressing-room prose, then a single button: *"Open with a dignity-restoration anthem."* → triggers `combat_pointed_heckler`

After the tutorial combat resolves, each class's location-exit to Dusty Crossroads is the path forward — same shape as Farmboy's flow today.

---

## 8. Per-level progression

### 8.1 Stat rotations

```ts
// Each entry is the stat key bumped at that level.
// Index 0 is the bump at level 2; index 1 at level 3; etc.
const STAT_ROTATIONS: Record<ClassId, (keyof StatBlock)[]> = {
  reluctant_farmboy: ['bluck', 'brains', 'bluck', 'brawn', 'bluck', 'bravado', 'bluck', 'brains', 'bluck'],
  disgraced_knight:  ['brawn', 'bravado', 'brawn', 'brains', 'brawn', 'bluck', 'brawn', 'bravado', 'brawn'],
  accidental_wizard: ['brains', 'bluck', 'brains', 'bravado', 'brains', 'brawn', 'brains', 'bluck', 'brains'],
  bard:              ['bravado', 'bluck', 'bravado', 'brains', 'bravado', 'brawn', 'bravado', 'bluck', 'bravado'],
};
```

If a player's level exceeds the array length, the rotation cycles (`array[(level - 2) % array.length]`). v1 max practical level is well under 10, so this is safety only.

### 8.2 Milestone bumps on stage advance

The `advance_stage` story effect ([story.ts:53-54](../../src/engine/story.ts#L53-L54)) is extended to also call `applyLevelUp(state)` after setting the new stage. Emits a `system`-kind log entry:

> *"You feel the chapter turn beneath your feet. **Level {N}.**"*

No banner animation in Plan 4 — Plan 6 set piece.

### 8.3 HP/MP scaling

Per spec: HP gain `floor(brawn × 1.5)` per level; MP gain `brains × 1` per level. HP and MP refill to new max on level-up (preserves existing behavior).

---

## 9. Validation, save migration, and tests

### 9.1 validate.ts additions

The existing dev-only content validator gets new assertions:

- Every class's `signatureMove` resolves to a real `Skill`.
- Every class's `openingLocationId` resolves to a real `Location`.
- Every class's `openingNarrativeNodeId` resolves to a real `NarrativeNode`.
- Every `Skill.resolverId` resolves to a real entry in `skillResolvers`.

### 9.2 Save migration v1 → v2

`SAVE_VERSION` bumps from 1 to 2. New fields backfilled by the migration:

- `state.character.statuses: []` (default empty)
- For any saved combat in progress: `state.combat.combatants[].statuses: []`

A migration entry is added to the existing `MIGRATIONS` registry in `engine/save.ts`. Round-trip test verifies a v1 save loads cleanly and re-serializes as v2.

### 9.3 Tests

**Engine layer (vitest):**
- `tickStatuses` — turns ticking, expiry on 0, fights_remaining decrement, end-of-fight cleanup
- Re-applying same `StatusKind` replaces (no stacking)
- World-scoped → player combatant copy on `startCombat`; combatant → character on `endCombat`
- Each of the four signature-move resolvers end-to-end (state in → state out, including status application and damage math)
- Tempt Fate's RNG sampling deterministic across known seeds (15% gate + uniform pick from 6)
- `applyLevelUp` — HP/MP scaling, stat-bump indexing per class, skill unlock at level 3
- Milestone bump on `advance_stage` triggers `applyLevelUp` and emits log
- Save migration v1 → v2 round-trip
- Combat math reads statuses correctly: weakness_revealed → +50% damage; guaranteed_crit forces crit; next_attack_misses pre-empts crit; weapon_suspended zeros weapon damage; armor_halved halves armor; intimidated/skip_turn skips turns; free_retaliation triggers free monster attack

**UI layer (svelte-testing-library):**
- All four class cards enabled on `CharacterCreation`
- Skill button always visible during combat
- Skill button disabled with correct tooltip pre-unlock
- Skill button disabled with correct tooltip pre-MP
- Skill button enabled when usable
- Status badges render in CharacterPanel "Afflictions & Boons" row
- Combat header shows monster status tags
- Combat-end clears combat-scoped statuses; world-scoped persist (smoke test through full combat)

---

## 10. Acceptance criteria

The plan is shippable when:

1. A player can pick any of the four classes on the creation screen, see their stats + epithet + teaser, and start their bespoke opening location.
2. Each class's tutorial combat is winnable; defeat returns to character creation cleanly (existing behavior).
3. A player who reaches level 3 sees the Skill button enable and can cast their class's signature move with the correct mechanical effect (verified by log + state).
4. All four signature moves work end-to-end with the status system: Brute Force does its multiplied damage; Out-Think It applies weakness_revealed and subsequent attacks deal +50%; Swagger skips the monster's turn; Tempt Fate guarantees a crit and rolls 15% on backfires.
5. Status badges appear in CharacterPanel and combat header with correct tooltips.
6. A stage advance grants a bonus level-up that fires the same `applyLevelUp` path as a normal level-up, including potential skill unlock and stat-bump.
7. A v1 save loads cleanly under v2 code and continues to function.
8. All new tests pass; existing tests still pass; type-check is clean.
9. No regressions on existing Farmboy → Crossroads → Call narrative flow.

---

## 11. Open questions deferred to implementation plan

The following are lower-level decisions that the implementation plan can resolve without further design input:

- Exact icon glyphs for status badges (parchment-friendly Unicode picks per `StatusKind`)
- Exact log wording variants for status apply / expire (small library of phrasings, randomized per fight via RNG to avoid repetition)
- Whether `applyLevelUp` lives in `combat.ts` or moves to a new `progression.ts` (boundary call — either works)
- How the placeholder opener nodes' prose reads — short enough to be replaced cleanly in Plan 5; flavorful enough to be playable now
- Whether to add a "you used Tempt Fate" cumulative counter to the player for a future "fortune favors the bold" achievement (out of scope; mention only)
