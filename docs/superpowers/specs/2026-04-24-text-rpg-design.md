# The Heroic Chronicle — Design Spec

A single-player, web-based, text-based, comedic role-playing game structured around Campbell's hero's journey, with meta-comedic self-awareness about the monomyth. Tonally inspired by Kingdom of Loathing. Built as a pure client-side Svelte app with localStorage saves.

**Codename:** The Heroic Chronicle (working title; the game's framing device is that the UI itself is a dignified illuminated chronicle of the player's heroic deeds).

**Version:** v1 spec (vertical slice).

**Date:** 2026-04-24.

---

## 1. Goals and non-goals

### Goals

- Ship a complete, playable vertical slice (~45–90 min) covering Acts I–early II of a hero's-journey arc.
- Prove that the core systems (free-form exploration, turn-based combat, narrative-choice combat, hero's-journey beat progression, class-based character creation) are integrated and fun.
- Establish a distinct tonal and visual identity — a dignified illuminated chronicle of *comedically ordinary* heroism — that no other text RPG has.
- Validate the content-authoring workflow before committing to the full-game content load.

### Non-goals for v1

- Full-length game (Acts II–VI content deferred).
- Companion party members (architecture ready, content deferred).
- Status effects, multi-enemy combat, elemental types.
- Moonlit theme polish (mechanism shipped; art pass post-v1).
- Mobile UX polish beyond "responsive and functional."
- Accessibility audit beyond basic keyboard nav + semantic HTML.
- Sound, music, analytics, achievements.

---

## 2. Tone and aesthetic

### The comedic register

**Kingdom of Loathing-adjacent, but distinct.** Light-hearted, self-aware, observational comedy. The game knows it is a hero's journey; so does the reader; the NPCs also know, and treat it like a scheduled civic event. Humor is in specificity (an "Officious Tax Rat" is funnier than a generic rat) and in the mismatch between dignified presentation and undignified content.

### Aesthetic: *The Heroic Chronicle*

The UI presents itself as an illuminated manuscript chronicling the player's heroic deeds — drop caps, ornate dividers, wax-seal commitments, a cast list headed *Dramatis Persona*. **The form is the joke.** A dignified chronicle of a reluctant farmhand whose (B)Luck stat is 4 is funnier than a dark terminal displaying the same information.

### The big bit

The hero's-journey structure itself is part of the comedy. NPCs reference their role in the monomyth out loud. ("You must be the Chosen One. Right on schedule for your Refusal of the Call.") The game's UI has a *Refusal-of-the-Call easter egg* — if the player tries to refuse the call, the log crumples and rewinds with a marginalia note: *"(The narrator sighs heavily, retrieves the manuscript, smooths it, and we try this again.)"*

---

## 3. Core gameplay design

### 3.1 Core loop

**Free-form exploration** with no turn/adventure economy. Player explores locations, triggers encounters, advances story beats at their own pace. Session length is whatever the player wants — autosave means they can leave and return mid-scene.

### 3.2 Hero's journey structure

**Thematic backbone with meta-comedic winking.** The player moves through named story stages (mapped to Campbell's monomyth) as they trigger specific beats. The stage is visible in the world-panel header as an Act marker. The middle stages (Tests, Allies, Enemies, Approach) are merged into freer exploration zones with optional side-beats; major beats (Call, Threshold, Ordeal, Return) are gated.

The 12-stage monomyth collapses to six player-visible Acts:

| Act | Monomyth stages |
|---|---|
| I · The Call to Adventure | Ordinary World, Call to Adventure, Refusal of the Call |
| II · Tests, Allies, and Enemies | Meeting the Mentor, Crossing the Threshold, Tests/Allies/Enemies |
| III · The Approach | Approach to the Inmost Cave |
| IV · The Ordeal | The Ordeal |
| V · The Return | Reward, The Road Back, Resurrection |
| VI · Return with the Elixir | Return with the Elixir |

v1 ships Acts I and early II (through Crossing the Threshold).

### 3.3 Combat

#### Turn-based (default)

- Modal sub-state (`state.combat` is non-null during a fight).
- Initiative: each combatant rolls `Bravado + d6` at combat start. Highest goes first, round-robin after.
- Four player actions:
  - **Attack** — basic strike with equipped weapon. Damage: `weapon.damage + brawn_mod + d6`, reduced by enemy armor. Hit: `Bravado + d20 ≥ enemy.dodge`.
  - **Skill** — MP-costing class/learned abilities. Opens a nested menu if more than one is available.
  - **Item** — filtered inventory modal (consumables only). Uses a turn.
  - **Flee** — escape check. Success scales with `(B)Luck + Bravado`. Costs a turn regardless of outcome. **Disable-able per-encounter via `noFlee: true`** on the encounter definition; used for Ordeal encounters and narrative-choice combat.
- Low damage variance (±20%); meaningful crits (~2.2× damage) scale with (B)Luck.
- Enemy AI: weighted action table (`{ attack: 0.6, special: 0.3, flee_if_low_hp: 0.1 }`). No tactical depth; comedy comes from enemy flavor.
- Solo-player assumption for v1, but architecture uses an initiative-ordered list of combatants so companions can slot in post-v1 without a rewrite.

#### Narrative-choice (story-flagged encounters)

- Same `state.combat` slot, same resolution plumbing, but **action buttons are custom-authored per encounter**.
- Example (Call encounter): *Accept Quest* / *Refuse (traditional)* / *Insult Hat* / *Cry, Briefly*.
- Each custom action is a resolver function (`(state) → { state, logEntries, combatResult }`) that can apply damage/heal, set flags, grant/remove items, or end combat with a specific outcome.
- Always ends with a state change (flag, item, scar, stage advancement) so the encounter feels load-bearing.

### 3.4 Stats (the four Bs)

Displayed on the character sheet as `[ Brawn ] [ Brains ] [ Bravado ] [ (B)Luck ]`. **The parenthetical B on Luck is a deliberate running gag** — the UI quietly admits it forced a fourth B. In code, the stat identifier is `bluck` (the display string is formatted at render time).

| Stat | Combat role | Exploration role |
|---|---|---|
| **Brawn** | Melee damage, max HP | Break obstacles, lift things, intimidate |
| **Brains** | Max MP, skill/spell damage | Solve puzzles, detect lies, identify items |
| **Bravado** | Accuracy, dodge, initiative | Social shortcuts, lies, dramatic flourishes |
| **(B)Luck** | Crit chance, loot quality, flee success | Find hidden items, avoid traps, "narrative luck" rolls |

### 3.5 Signature moves

Each stat has exactly one **signature move** — a distinct ability tied to that stat. Unlocked at level 3. Costs MP.

| Stat | Signature move | Combat effect | Exploration effect |
|---|---|---|---|
| Brawn | **Brute Force** | ~1.8× damage hit, reduced accuracy | Break certain obstacles |
| Brains | **Out-Think It** | Reveals enemy weakness; ends some fights via reasoning | Solves a subset of puzzles |
| Bravado | **Swagger** | Enemy loses next turn (intimidated) | Unlocks social shortcuts |
| (B)Luck | **Tempt Fate** | Guaranteed crit on next action + ~15% chance something absurdly bad also happens | Rolls for hidden-item finds |

### 3.6 Character classes

Four classes in v1, one per primary stat. All share the game's systems; flavor and signature-move emphasis differ.

| Class | Primary stat | Br/Bn/Bv/(B)L | Starting items | Hook |
|---|---|---|---|---|
| **Reluctant Farmhand** | (B)Luck | 8/6/5/7 | Rusty Pitchfork, Itchy Wool Tunic, Note from Mother | Stumbled into destiny. Things just keep *working out*. |
| **Disgraced Knight** | Brawn | 9/4/7/5 | Nicked Longsword, Battered Half-Plate (missing one pauldron), Defaced Family Crest | Exiled for a scandal nobody remembers clearly. |
| **Accidental Wizard** | Brains | 4/10/5/6 | Cracked Staff, A Robe That Is Far Too Long, Tome of Questionable Translations | Attended the wrong magical academy. Learned everything *slightly wrong*. |
| **Bard Who Didn't Ask For This** | Bravado | 5/7/9/4 | Dented Lute, Dramatic Cloak, Audience Expectation *(quest item)* | Wanted to write sad songs in a tavern. Got roped into a prophecy instead. |

Each class has a **bespoke Ordinary World opening scene** — ~5 minutes of class-specific prose, setting the tone and giving the player their first combat / first choice. These four openings are the game's handshake and must be authored with extra care.

### 3.7 Character progression

- **Classic XP/levels.** XP is earned from combat and beat completion. Each level grants a small HP/MP/stat increase based on class.
- **Milestone bumps.** Stage transitions (Act I → II, etc.) grant a bonus level-up that plays the gilt-unfurl banner animation. Ties mechanical growth to narrative growth.
- **No classless respec.** Class is chosen at creation and fixed. Player can rename themselves; class is locked.

---

## 4. Architecture

### 4.1 Tech stack

- **Svelte 5** (with Runes) + **TypeScript**
- **Vite** for dev server and build
- **localStorage** for saves
- **GitHub Pages** for hosting (static build)
- **No backend, no accounts, no external runtime dependencies at runtime.**

### 4.2 Repo structure

```
src/
  engine/
    types.ts              # all content type definitions
    state.ts              # GameState shape, initial state, save/load serialization
    events.ts             # event definitions and reducer(state, event) -> state
    combat.ts             # combat sub-reducer: turn resolution, damage, AI
    rng.ts                # seeded, step-counted RNG (reproducible)
    story.ts              # beat preconditions/triggers, stage advancement
    validate.ts           # dev-only content reference checker
    save.ts               # serialize/deserialize with version migrations
  ui/
    App.svelte            # top-level shell
    WorldPanel.svelte     # log + button bar + act marker + compass
    CharacterPanel.svelte # Dramatis Persona card with collapsible sections
    Divider.svelte        # draggable vertical divider
    InspectModal.svelte   # item-inspect popup
    MapModal.svelte       # compass-triggered parchment map
    SettingsModal.svelte  # theme toggle, text size, save mgmt
    CharacterCreation.svelte
    LevelUpBanner.svelte  # gilt unfurl set piece
    RefusalRewind.svelte  # the meta-comedic rewind set piece
    store.ts              # single Svelte store wrapping engine state
    theme.ts              # Parchment + Moonlit CSS variable sets
  content/
    locations/            # one .ts file per location
    monsters/             # one .ts file per monster
    items/                # one .ts file per item (or grouped small ones)
    classes/              # four .ts files (one per class)
    skills/               # signature moves + class skills
    story/beats.ts        # the monomyth backbone
    encounters/           # narrative-choice encounters
    index.ts              # aggregates + validates
  main.ts                 # mount app
```

### 4.3 State model

The entire game is a single serializable `GameState` object:

```ts
type GameState = {
  version: number                    // save-format version
  rng: { seed: number, step: number }
  character: {
    name: string
    classId: ClassId
    level: number
    xp: number
    hp: { current: number, max: number }
    mp: { current: number, max: number }
    stats: { brawn: number, brains: number, bravado: number, bluck: number }
    equipment: {
      weapon?: ItemId
      armor?: ItemId
      trinket?: ItemId
    }
    inventory: Array<{ itemId: ItemId, qty: number }>
    knownSkills: SkillId[]
  }
  world: {
    currentLocation: LocationId
    visited: Set<LocationId>           // serialized as array
    flags: Record<string, boolean | number | string>
  }
  story: {
    stage: ActId                       // "act_i" | "act_ii" | ...
    currentBeat: BeatId | null
    completedBeats: BeatId[]
    activeQuests: QuestId[]
  }
  combat: CombatState | null
  log: LogEntry[]                      // rolling buffer, capped at ~200
  settings: {
    theme: "parchment" | "moonlit"
    textSize: "small" | "medium" | "large"
    autoSave: boolean                  // default true
  }
}
```

### 4.4 Event-sourced state machine

All player actions are named events. The engine exposes:

```ts
function reduce(state: GameState, event: GameEvent): GameState
```

Events include:
- `ExitAction { exitId }` — move to another location
- `AttackTarget { targetId }` / `UseSkill { skillId, targetId }` / `UseItem { itemId }` / `Flee`
- `ChooseNarrativeOption { optionId }` — narrative-choice resolution
- `TalkToNPC { npcId, topicId }` — dialogue
- `EquipItem { itemId }` / `UnequipSlot { slot }` / `DropItem { itemId }`
- `AdvanceStage { newStageId }` — story beat transition (triggered by engine, not player directly)
- `SetFlag { flagId, value }` (engine-internal)
- `LevelUp` (engine-internal)

Each reducer is a pure function. The engine emits log entries as a side-effect of reduction (gathered and appended to `state.log`).

#### Properties this gives us for free

1. **Trivial save/load** — `JSON.stringify(state)` (with Set→Array serialization for `visited`).
2. **Reproducibility** — seeded RNG + event log means any bug can be replayed deterministically.
3. **Undo / time-travel** — keep the last N events; replay from prior state.
4. **The Refusal-of-the-Call rewind easter egg** is literally a UI treatment on a state rewind — the plumbing comes for free.
5. **Clean engine/content separation** — content imports `types.ts`; engine imports from content via the aggregate `content/index.ts`.

### 4.5 Random number generation

Seeded, step-counted, reproducible. Every call advances the step counter; seed is set at character creation. Exposed as pure functions:

```ts
rng.d6(state) → { state, value }
rng.d20(state) → { state, value }
rng.pick<T>(state, array) → { state, value }
rng.weighted<T>(state, table) → { state, value }
```

### 4.6 Save format and migrations

- Saves are JSON blobs in localStorage under `heroicchronicle.save.v<n>` and `heroicchronicle.save.manual`.
- Autosave fires after every reducer call (debounced to ~500ms).
- Manual save slot available via settings modal.
- `version` field in `GameState` drives a migration chain. v1 ships with a single version; future migrations are pure state-transform functions.
- On load, if version is unknown or migration fails, show a "This tale is from a future edition" error with a fresh-start option rather than silently eating the save.

---

## 5. Content system

### 5.1 Content types

Each content file is a typed data object. Illustrative shapes:

```ts
type Location = {
  id: LocationId
  name: string               // "The Dusty Crossroads"
  act: ActId
  description: string        // long-form prose for the log on entry
  reEntryDescription?: string // shorter prose for subsequent visits
  exits: Array<{ label: string, targetId: LocationId, visible?: boolean | FlagPredicate }>
  encounters?: Array<EncounterRef>
  npcs?: Array<NpcRef>
  onEnter?: Array<BeatTrigger>
}

type Monster = {
  id: MonsterId
  name: string
  flavor: string
  stats: { hp: number, brawn: number, bravado: number, dodge: number, armor: number }
  actions: Array<MonsterAction>      // attack, special, flee-if-low-hp
  lootTable: LootTable
  noFlee?: boolean
}

type Item = {
  id: ItemId
  name: string               // "a Rusty Pitchfork"
  flavor: string             // long-form inspect text
  kind: "weapon" | "armor" | "trinket" | "consumable" | "quest"
  slot?: EquipSlot
  stats?: Partial<ItemStats>
  effects?: ItemEffect[]     // for consumables
  dropRate?: number          // for templated loot
}

type CharacterClass = {
  id: ClassId
  name: string                      // "Reluctant Farmhand"
  epithet: string                   // "the Reluctant Farmhand"
  startingStats: StatBlock
  startingHp: number
  startingMp: number
  startingItems: Array<{ itemId: ItemId, equipped?: boolean }>
  signatureMove: SkillId
  openingLocationId: LocationId     // first location after creation
  openingNarrative: NarrativeNodeId // bespoke opening scene
}

type StoryBeat = {
  id: BeatId
  stage: ActId                      // which act this belongs to
  preconditions: Precondition[]
  onTrigger: BeatEffect[]           // setFlag, grantItem, advanceStage, playAnim, etc.
  transitionAnim?: "actMarker" | "giltUnfurl" | "refusalRewind"
}

type Encounter = {
  id: EncounterId
  kind: "combat" | "narrative"
  // for combat:
  monsterId?: MonsterId
  // for narrative:
  rootNodeId?: NarrativeNodeId
  noFlee?: boolean
  onVictory?: BeatEffect[]
  onDefeat?: BeatEffect[]
}

type NarrativeNode = {
  id: NarrativeNodeId
  prose: string
  choices: Array<{
    label: string                   // "Insult Its Hat"
    visible?: FlagPredicate | StatPredicate
    resolve: ResolverId             // references a resolver function
  }>
}
```

### 5.2 Content loading and validation

- `src/content/index.ts` re-exports all content as typed registries: `locations: Record<LocationId, Location>`, etc.
- A dev-only `validateContent()` pass at app startup checks:
  - All referenced `LocationId`, `ItemId`, `MonsterId`, `SkillId`, `BeatId`, `NarrativeNodeId` resolve.
  - Every `Class.openingLocationId` points to a real location.
  - Every `Monster.lootTable` references real items.
  - Every `NarrativeNode.choices.resolve` matches a registered resolver.
  - Every story beat's `preconditions` reference defined flags (or primitive predicates).
- Validation failures throw in dev, log warnings in prod (prod still runs — we'd rather a broken reference shows as "unknown" text than a crashed app).

### 5.3 Authoring workflow

The authoring guide is a **separate document** drafted during early implementation (not part of this spec). It will cover:

- The game's voice and tone rules (do/don't lists with examples from authored content).
- LLM-assisted drafting prompts (recipes for monster concepts, item flavor, encounter dialogue) — all LLM use is at authoring time, not runtime.
- A tone anti-pattern linter (avoids generic fantasy adjectives: "ancient," "mystical," "forgotten," "legendary," etc.).
- How to add a new location / monster / item / encounter / beat (step-by-step).

### 5.4 What v1 authors

- **1 major area** — the Ordinary World + Village + Crossroads + Threshold zone (~7 locations).
- **~6 monsters** — templated comedic enemies (Embarrassed Goblin, Officious Tax Rat, A Cow That's Seen Things, etc.).
- **~12 items** — 3 weapons, 3 armors, 3 consumables, 3 trinkets/quest items, plus class starting inventories.
- **5 story beats** — Ordinary World Established, Call Received, Refusal (optional), Mentor Met, Crossing the Threshold.
- **4 opening scenes** — one per class, ~5 min each.
- **1 narrative-choice encounter** — the Call itself.
- **3–4 turn-based combat encounters**, at least one with `noFlee: true`.

---

## 6. UI

### 6.1 Layout

**Two-panel side-by-side, desktop-first.**

- **World panel (left, default 62% width).** Scrollable log + contextual button bar + world-panel header (act marker, location title, compass rose for map).
- **Character panel (right, default 38% width).** Dramatis Persona card with four collapsible sections: Vitals, Qualities, Accoutrements, Effects on his Person.
- **Vertical divider between them** — draggable, widths persist to localStorage, minimum widths prevent pinning a panel to zero.
- **Page margins** hold two ambient icons: settings gear (top-right of viewport), folio page number (bottom-center).

### 6.2 Typography

All three font families load from Google Fonts:

- **Display** (section headers, chapter markers, drop caps): `IM Fell DW Pica` — 17th-century revival, inked irregularity, old-book feel.
- **Body** (all prose, dialogue, narrative): `EB Garamond` — warm, readable, classic.
- **Mono** (stats, numbers, system text, the "mechanical readout" register): `Courier Prime` — typewriter-flavored, period-appropriate.

Rule: **serif for *narration*, typewriter for *mechanical readouts*.** The two fonts tell the player which text is world and which is system.

### 6.3 Color palette

**Parchment (default light theme):**

```
--paper:        #f4ecd8   warm cream with slight foxing
--paper-warm:   #efe4c8   alt paper tone
--ink:          #1f1a12   warm near-black (not pure black)
--ink-muted:    #6b5f47   aged ink for secondary text
--ink-faint:    #9c8c6f   dim ink for tertiary
--hairline:     #c5b48f   thin rules and borders
--crimson:      #8b1a1a   danger, HP, primary story-consequential accent
--crimson-deep: #5d1010   wax-seal depth
--gilt:         #a68338   loot, level-ups, reward moments
--gilt-bright:  #c89b3e   gilt hover/emphasis
--moss:         #4a6b3a   MP, healing
```

**Moonlit (alt dark theme, user-selectable):** inverted luminance, same hues — sepia ink on deep indigo vellum. Mechanism ships in v1; art pass deferred.

Color-use rule: crimson and gilt are used *sparingly*. A primary-action wax seal is one point of red on the screen, not five.

### 6.4 World panel details

- **Header** — act marker (small-caps uncial) above location title (large display serif), with a **28px compass rose** right-aligned. Compass opacity 0.7 at rest, 1.0 + gentle rotate on hover. Click opens the map modal. Horizontal hairline below the header.
- **Log** — bounded scrollable area. Entry types distinguished by styling, not by prefix labels:
  - `narration` — default body prose
  - `dialogue` — speaker attribution (small-caps, muted) above indented italic line
  - `system` — small italic muted-ink block, indented, with a hairline left-border and a small-caps label prefix (`EXP. — +3 experience for listening politely.`)
  - `combat` — tighter spacing, slightly smaller; crimson for damage taken, gilt for damage dealt, moss for heals; round numbers as small folio labels (`— round iii —`)
  - `loot` — gilt accent
  - `scene-divider` — centered ornate glyph row (`· · ·` or `❧ ❦ ❧`)
- **Drop cap** — first letter of every scene-opening paragraph renders as a large display-serif capital in crimson-deep, floated left.
- **Dialogue** — Penguin-Classics play-edition style, not chat-log style.
- **Button bar** — appears at the bottom of the world panel, flex-wrap row with 14px gaps. Pinned below the log with a top hairline.
  - **Standard buttons** — bracketed text buttons `[ Go North ]`, subtle border, hover inverts. Bracketing is rendered in pseudo-elements (not literal text).
  - **Wax seal button** — crimson radial gradient with inset shadows, 78px circle, bearing a display-serif initial (Q, R, L, etc.) and a small label below (Accept, Refuse, Level, etc.). **Reserved for story-consequential moments only:** quest acceptance, major narrative choices, level-up confirmations, end-of-act transitions. Never used for routine actions like "Go North."
  - A small italic annotation appears next to the seal the first two times a wax seal is shown to the player ("*The seal appears only on story-consequential choices.*"), then disappears on subsequent appearances. Educates the pattern without becoming clutter.

### 6.5 Character panel details

- **Header** — `DRAMATIS PERSONA` (small-caps uncial, centered) above a horizontal rule.
- **Identity block** — character name (large display serif), epithet (`the Reluctant Farmhand`, italic, muted), level line (`Third-Degree Hero`, small-caps).
- **Four collapsible sections** (each with a section-head row: small-caps label, flanking hairlines, chevron). Collapsed state persists per-section to localStorage.
  1. **Vitals** — HP / MP / XP bars, each a hand-inked rectangle (1px border, contrasting fill with its own 1px darker border) plus a mono numeric readout. HP crimson, MP moss, XP gilt. Low-HP (≤25%) triggers a subtle stroke-wobble animation.
  2. **Qualities** — the four B-stats in a 2×2 grid. Each is italic bracketed `[ Brawn ]` with a right-aligned mono bold number. Dotted hairline underlines.
  3. **Accoutrements** — three equipment slots (`Wpn` / `Arm` / `Trk`) as label+item rows. Empty slots show `— unchosen —` in faint italic.
  4. **Effects on his Person** — 4×3 grid (12 slots). Empty slots are hairline-bordered squares. Filled slots show a small display-serif glyph placeholder (or a tiny engraving in later iterations), bordered in ink with ornate corner marks. Below: `3 / 12` mono count.
- **Footer** — tiny italic faint-ink line: `(dram. pers.: our hero)`.
- **Click an inventory item** → opens the `InspectModal` with flavor text and actions (Use / Equip / Unequip / Drop / Compare).

### 6.6 Divider

- 1px vertical hairline bleeding into paper at top and bottom (alpha gradient).
- Mid-point grabber: 14×42px paper rectangle with `❦` display-serif glyph centered in it. Cursor becomes a drag-indicator on hover. Drag updates CSS `grid-template-columns` and persists to localStorage.
- Min panel widths: ~300px each. Below the minimum the app falls back to mobile stacked layout.

### 6.7 Mobile / narrow-viewport

Below ~900px viewport width:

- Panels stack vertically. World panel on top, character panel below.
- Divider disappears; character panel becomes a "loose leaf" — pull-up drawer with a deckled top edge and ribbon handle (deferred polish; v1 ships a functional accordion).
- Collapsible sections in the character panel become tappable accordions, all collapsed by default on mobile.
- Font sizes scale down one step; typography hierarchy stays intact.
- Marginalia-style system messages already render inline (marginalia as a feature was dropped in design; this just confirms).

### 6.8 Motion and set pieces

Motion is reserved for **moments**, not ambient polish. Set pieces:

- **Page load** — staggered ink-in reveal. Drop caps bleed up first, surrounding prose fades in behind. ~600ms total.
- **New log entry** — entry appears with a subtle left-to-right ink-draw animation and then settles.
- **Wax seal click** — seal depresses, splits, and breaks (SVG masks) with a micro-spring. Crimson ink splatter fades. Accompanies any story-consequential commitment.
- **Level up** — the world panel dims slightly, a gilt banner unfurls across the full width of the world panel reading (e.g.) `THOU HAST ACHIEVED THE THIRD DEGREE OF HEROISM`. Sits 2s, then folds down into a tiny illuminated letter at the top of the character panel. Blocks input during the banner.
- **Stage advancement** — larger version of level-up; gilt banner spans entire viewport with the new act title, lingers 3s, and transitions with a subtle page-turn visual effect.
- **Refusal of the Call** — the log crumples upward as if the page is being screwed into a ball (CSS transform + mask), then smooths flat. A marginalia line appears: `(The narrator sighs heavily, retrieves the manuscript, smooths it, and we try this again.)` then the state rewinds to the prior turn. One of the game's signature moments and must be authored as a set piece.
- **Low HP** — HP bar stroke trembles with a subtle CSS filter-based wobble. Reduced-motion media query disables this.
- **Compass hover** — 8° rotate on the compass rose. Click → map modal fades in with a brief ink-bleed on the parchment.

All motion respects `prefers-reduced-motion: reduce` — swap animations for simple opacity fades or instant transitions.

### 6.9 Settings modal

Triggered by the page-margin gear icon (top-right). Contains:

- **Theme** — Parchment / Moonlit radio
- **Text size** — Small / Medium / Large
- **Autosave** — on / off toggle (default on)
- **Manual save** — button: "Preserve thy tale"
- **Reset save** — button: "Consign this tale to the flames?" (with confirmation)
- **Credits** — short credits card

Uses the game's chronicle voice for labels.

---

## 7. Data-driven detail summary

These tables lock in exact numbers v1 needs to ship.

### Starting character

Derived from the class definition. Every class starts at **level 1** with **HP = baseHp + brawn × 3** and **MP = baseMp + brains × 2**.

| Class | baseHp | baseMp | Starting HP | Starting MP |
|---|---|---|---|---|
| Farmhand | 30 | 10 | 54 | 22 |
| Knight | 40 | 8 | 67 | 16 |
| Wizard | 22 | 20 | 34 | 40 |
| Bard | 28 | 14 | 43 | 28 |

### Level-up formula

On level-up: `+brawn×1.5 HP`, `+brains×1 MP`, and one of (class-defined rotation) `+1 to primary stat` or `+1 to a minor stat`. Specifics per-class during content authoring.

### Combat math

- Base damage: `weapon.damage + floor(brawn / 2) + d6`
- Hit: `1d20 + floor(bravado / 2) ≥ target.dodge`
- Crit: `1d100 ≤ 5 + (bluck × 2)`, deals `damage × 2.2`
- Flee success: `1d20 + floor((bluck + bravado) / 2) ≥ 15`, modified by encounter tags

---

## 8. Save format details

Top-level shape (v1):

```json
{
  "version": 1,
  "rng": { "seed": 1234567890, "step": 0 },
  "character": { ... },
  "world": { "currentLocation": "...", "visited": ["...","..."], "flags": { ... } },
  "story": { "stage": "act_i", "currentBeat": "...", "completedBeats": [...], "activeQuests": [...] },
  "combat": null,
  "log": [ ... ],
  "settings": { "theme": "parchment", "textSize": "medium", "autoSave": true }
}
```

Autosave key: `heroicchronicle.save.v1`.
Manual save key: `heroicchronicle.save.manual`.
Settings persisted separately (survive save deletion): `heroicchronicle.settings.v1`.
Divider width persisted separately: `heroicchronicle.ui.dividerWidth`.

Serialization: `Set` (visited locations) → sorted `Array`; `null` → `null`; otherwise standard JSON.

---

## 9. MVP success criteria

v1 ships when a playtester can:

1. Pick any of the four classes, complete character creation, and begin their bespoke opening scene.
2. Reach the "To be continued…" card at the end of the vertical slice.
3. Experience at least one combat victory, one narrative-choice outcome, and one Act transition.
4. Close the browser mid-scene, reopen, and find their save restored in the correct state.
5. Toggle between Parchment and Moonlit themes without losing state.
6. Describe the game's tone in a sentence *without using the word "generic"*. (Subjective, but this is the actual point.)

---

## 10. Post-v1 roadmap (non-binding)

Rough ordering, subject to change based on v1 playtest:

- Act II–VI content (full-length arc)
- Companion system (two-character party, turn-order UI)
- Status effects (poison, blessed, flustered, etc.)
- Multi-enemy encounters
- Moonlit theme art pass
- Mobile UX polish (loose-leaf drawer, touch-optimized button bar)
- Additional classes
- Accessibility audit
- Achievements / tales-completed meta-tracking

---

## 11. Open items handed to implementation plan

These are decisions the writing-plans phase will work through:

- Exact dev dependencies and scripts (Vite config, Svelte 5 setup, tsconfig, lint config).
- Exact list of author-ready location / monster / item / beat data — this spec names them; the plan will sequence authoring.
- The four class opening scenes — ~5 minutes of prose each — the plan will scope authoring time and identify voice-review checkpoints.
- The Refusal-of-the-Call rewind animation — plan will identify whether it ships in v1 or is a v1.1 stretch.
- Accessibility baseline (semantic HTML, keyboard nav, aria labels) — plan to include as first-class tasks, not afterthoughts.
