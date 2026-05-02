# Class Openers — Design Spec

## Goal

Replace the placeholder/short opener narrative nodes with **bespoke, fully-authored Chapter 1 openers** for each of the four classes — Disgraced Knight, Accidental Wizard, Bard Who Didn't Ask For This, Reluctant Farmhand. Each opener establishes the class's *want* (per the spine), plants the Chapter 8 MacGuffin-form seed via a tactile scripted interaction, and seeds a discreet man-in-tweed cameo. This is the realisation of "Plan 5a" called out in code comments and in the spine doc; it is the smallest scope that gives the player a real Chapter 1 experience.

## Spine references

- [docs/superpowers/narrative-spine.md](../narrative-spine.md) — Chapter 1 (Status Quo), The Wants, Anchor Items (per-class MacGuffin forms), Voice Principles
- The four MacGuffin forms (knight: corrected dismissal-notice; wizard: unmarked grimoire; bard: perfect-song sheet; farmhand: jar of soil) each mirror a Ch 1 setup motif. The opener is where each motif gets planted.

## Scope

**In scope:**
- Replacing the 4 placeholder/short opener nodes (`*_opening_short`) with full bespoke openers (each as a two-node narrative encounter).
- Wiring `StartNewGame` to actually trigger the opener encounter (currently the `openingNarrativeNodeId` field is validated but unused).
- Cleaning up the orphan tutorial combats (Pell, Footnote, Heckler) by routing them through the opener flow.
- Updating `CLASS_OPENING_LINES` so the chapter-banner is correct post-rename (currently says "The Call to Adventure begins"; Chapter 1 is the Status Quo).
- Tests for each opener flow.

**Out of scope:**
- Chapter 8 MacGuffin-form callbacks (the *payoff* of the seeded flags). Plan 5a only plants; the payoff lands when Chapter 8 content is authored.
- Chapter 2 (the_call) revisions or chapter-redistribution of existing post-Ch-1 content.
- Class-specific mentors at Chapter 4 (per spine; a separate plan).
- New side-quest content (per spine; separate plan).

## Architecture

### Wiring

`StartNewGame` currently:
1. Builds character from class definition.
2. Appends `CLASS_OPENING_LINES` (3 lines per class) to the log.
3. Recurses into `EnterLocation` for the starting location's description.

Plan 5a adds a fourth step: queue a class-specific narrative encounter via `__pending_encounter`. The existing `drainPendingEncounter` mechanism in `events.ts` will pick it up and call `startNarrativeEncounter`, which takes over the combat slot until the encounter resolves.

The class definitions already carry `openingNarrativeNodeId`. We add a parallel field — `openingEncounterId: EncounterId` — pointing to a new `NarrativeEncounter` wrapper per class whose `rootNodeId` is the class's opener Node A. This avoids overloading the narrative-node field and keeps the encounter registry the single source of truth for narrative encounters.

### Each opener is two narrative nodes

A `NarrativeNode` carries a single `prose` field (one string) plus its `choices`. The atmospheric setup, scripted-interaction setup, and tweed cameo all live inside Node A's `prose` string as separate sentences, separated by spaces (matching the existing `knight_opening_short` style).

- **Node A — `*_opener_a`** (the Engagement node).
  - Prose: one string organised as ~4 short paragraph-units. Paragraph 1 establishes the scene; paragraph 2 introduces the future-MacGuffin object; paragraph 3 embeds the tweed cameo as a mid-paragraph aside (never paragraph 3's first or last sentence); paragraph 4 transitions to the choice prompt.
  - Choices: 1 (or 3 for Wizard). Each choice resolves to a `*_opener_engage` resolver that plants the class flag and advances to Node B.
- **Node B — `*_opener_b`** (the Commitment node).
  - Prose: one string of 1–2 sentences (transition).
  - Choices: 1. Resolves to `open_with_*` (Knight, Wizard, Bard) or `farmhand_to_back_field` (Farmhand). The first three queue the tutorial combat via `__pending_encounter`; the Farmhand's resolver simply terminates the encounter and lets the existing beat system handle the Tax Rat on first back-field visit.

Both `openingNarrativeNodeId` (existing, used by `validateContent`) and `openingEncounterId` (new, used by `StartNewGame`) coexist on each class. The encounter's `rootNodeId` and the class's `openingNarrativeNodeId` point at the same Node A, which keeps validation happy without requiring a refactor of the existing field.

This split gives the player two distinct beats — *touch the future-MacGuffin object, then commit to the chapter's first action* — without bloating into a long encounter.

### Single-flag policy

Each class plants exactly one canonical flag in Node A:
- `read_dismissal_notice` (Knight)
- `consulted_tome` (Wizard) — plus a flavor flag `wizard_first_margin = 'a'|'b'|'c'` for Ch 8 prose variation, but the Ch 8 callback only checks `consulted_tome`
- `tuned_lute` (Bard) — flavor variant left for in-Ch1 prose only; not Ch 8-load-bearing
- `corked_jar` (Farmhand)

The opener is *forced engagement* — there is no "skip" branch. The choice IS the engagement; the only variation is flavor. This avoids spec bloat at Ch 8 while preserving the player's tactile moment.

### Tutorial combats

The three existing tutorial combats — `combat_insolent_pell`, `combat_feral_footnote`, `combat_pointed_heckler` — are kept as-is. They become the resolution of Knight / Wizard / Bard openers (queued via `__pending_encounter` from Node B's resolver). The Farmhand opener does *not* queue a tutorial combat; the Farmhand's first fight (Tax Rat) is delayed and triggered via the existing beat system on first back-field encounter. This asymmetry is intentional: it reinforces the Farmhand's want (doesn't want a hero's journey) by denying them a triumphant first-fight reward.

## Per-class openers

Each section below specifies: starting location, atmospheric prose (sketched, content-author finalises in Plan 5a), the scripted interaction, the planted flag, and the tweed cameo placement.

**Prose format note:** the sketches below show each opener's prose as 4 numbered paragraph-units for readability; in the actual `NarrativeNode.prose` field these become a single string. Whether to keep them as one dense paragraph (existing rendering, simplest) or render them as four paragraphs (requires a small WorldPanel tweak to split prose at `\n\n`) is an implementation choice for Plan 5a — both are acceptable. The cameo sentence sits *inside* paragraph 3 of each opener, never as the paragraph's first or last sentence.

### Disgraced Knight — Quartermaster's Yard, dawn

**Location:** `quartermasters_yard`.

**Node A prose (sketch — 4 lines):**
1. *"Dawn over the empty yard. Dust hangs where it has been kicked, an hour ago, by boots that were not yours. The pell stands in the middle of it, leaning slightly to starboard."*
2. *"On the duty board, the dismissal-notice. Wind tugs at one corner. The other three pins still hold."*
3. *"The yard at this hour is empty, mostly. A figure in tweed crosses the parade ground at the far edge, unhurried, and is gone before the dust settles. The pell, an old friend with no memory of you, has improved at being a pell."* **← tweed cameo embedded mid-paragraph.**
4. *"Whatever you did — and you cannot quite remember the specifics, only the volume of voices — it was sufficient. The notice itemises."*

**Choice (Node A):**
- *"Read the notice."* → resolver: `knight_opener_engage_notice` → plants `read_dismissal_notice = true` → advance to Node B.

**Node B prose:**
- *"You read it. The notice is shorter than the noise it caused. You step away from the duty board. The pell waits."*

**Choice (Node B):**
- *"Take it out on the pell."* → resolver: `open_with_pell` (existing) → queues `__pending_encounter = combat_insolent_pell`.

### Accidental Wizard — Slightly On Fire Library

**Location:** `burning_library`.

**Node A prose (sketch — 4 lines):**
1. *"The reading room's vaulted ceiling carries an even, contemplative haze of smoke. The smoke is being polite. The fire — three rows over, may yet be reasoned with — is also being polite, for now."*
2. *"Your tome is open on the lectern. Three margins are arguing. The first cites a lich-king. The second cites an itch-king. The third cites something you do not recognise and would prefer not to."*
3. *"A junior librarian moves between stacks with a slim, unmarked volume; the spine does not match the catalog stamp. She does not look at you, or at the smoke. The cantrip-bell on her satchel does not ring."* **← tweed cameo (a librarian carrying an unmarked book).**
4. *"Something small and predatory has detached from a citation and is now eyeing you over the lectern's edge. The tome's three margins continue to argue, undeterred."*

**Choice (Node A):** three options, one per margin:
- *"Follow the lich-king margin."* → resolver `wizard_opener_engage_a` → plants `consulted_tome = true`, `wizard_first_margin = 'a'`. Advance to Node B.
- *"Follow the itch-king margin."* → resolver `wizard_opener_engage_b` → plants `consulted_tome = true`, `wizard_first_margin = 'b'`.
- *"Follow the third margin."* → resolver `wizard_opener_engage_c` → plants `consulted_tome = true`, `wizard_first_margin = 'c'`.

(All three plant the same canonical flag. The flavor flag affects only the Node B prose. Ch 8 callback ignores the flavor flag; Plan 5a is forward-compatible.)

**Node B prose (varies subtly by margin):**
- *"You follow the [chosen margin's] line. The tome falls quiet, briefly. The footnote remains."*

**Choice (Node B):**
- *"Address the footnote."* → resolver: `open_with_footnote` (existing) → queues `__pending_encounter = combat_feral_footnote`.

### Bard Who Didn't Ask For This — Tavern Dressing Room

**Location:** `tavern_dressing_room`.

**Node A prose (sketch — 4 lines):**
1. *"Five minutes to curtain. The back room of the Wretched Pheasant smells like spilled mead, candlewax, and ambition. One of those vowels is yours."*
2. *"Your lute is missing a string. Your cloak is being ironic again. The audience, audible through three layers of pine, is exercising its consonants."*
3. *"Through a thumbnail-sized gap in the curtain you can see the front row. A man in tweed sits there, taking notes in a book that is not yours, and does not look up. A heckler in the third row has been warming up since dawn and has, by now, achieved a kind of vowel-yoga that bodes badly for your opening number."* **← tweed cameo embedded mid-paragraph.**
4. *"You have ten minutes. You have two minutes. Time is doing what time does to a Bard."*

**Choice (Node A):**
- *"Tune the lute."* → resolver: `bard_opener_engage_lute` → plants `tuned_lute = true` → advance to Node B.

**Node B prose:**
- *"The lute holds. The cloak settles. The curtain twitches. You step toward the stage. The heckler is, you note, already standing."*

**Choice (Node B):**
- *"Open with a dignity-restoration anthem."* → resolver: `open_with_heckler` (existing) → queues `__pending_encounter = combat_pointed_heckler`.

### Reluctant Farmhand — Family Farm Kitchen → back field

**Location:** `family_farm`.

**Node A prose (sketch — 4 lines):**
1. *"You wake on a Tuesday, which is, statistically, when most prophecies arrive. The kettle is already on. The chickens are already disappointed."*
2. *"On the windowsill: a jar of last year's preserves, dust on the lid, a hand-written label peeling at one corner. The back field, un-weeded for a week, calls in the wordless way fields call."*
3. *"Down the lane, a figure in tweed passes the farm without slowing. He glances once at the kitchen window. He keeps walking. The cow, in the near pasture, regards you with the unfocused malice of a creature who has, against all odds, become aware of fate."* **← tweed cameo embedded mid-paragraph.**
4. *"Whatever the day intends, it has chosen not to ask. You stand at the kitchen window. The jar is small enough to fit in a pocket."*

**Choice (Node A):**
- *"Take the jar from the windowsill."* → resolver: `farmhand_opener_engage_jar` → plants `corked_jar = true` → advance to Node B.

**Node B prose:**
- *"The jar fits. The lid is firm. You step out the kitchen door and the back field opens before you. The cow does not turn. The chickens continue to be disappointed."*

**Choice (Node B):**
- *"Walk to the back field."* → resolver: `farmhand_to_back_field` (new; no `__pending_encounter`) → terminates the encounter. The existing beat system handles the Tax Rat on first back-field visit.

## Cameo subtlety rules

The tweed cameo in each opener MUST follow these rules. Implementation must respect them; tests assert them.

1. **Single sentence.** No multi-sentence elaboration. The cameo's whole length is one full stop to the next.
2. **Mid-paragraph only.** The cameo sits inside paragraph 3 of Node A's prose. Within paragraph 3, the cameo is never the first or last sentence — it must be *between* other narration sentences.
3. **No pause, no dialogue.** The cameo character speaks no line, prompts no response, requires no acknowledgement.
4. **Casual narrator voice.** Phrased as observation, not announcement. *"A figure in tweed crosses the parade ground"* is right. *"You see a figure in tweed!"* is wrong.
5. **Class-contextual disguise.** Knight: figure crossing the parade ground. Wizard: junior librarian with unmarked book. Bard: man in tweed in front-row audience. Farmhand: figure walking past the farm down the lane. The disguise fits the setting.

## Files affected

**Modified:**
- `src/content/narrative/openings.ts` — replace 4 short nodes with 8 nodes (`*_opener_a` and `*_opener_b` per class).
- `src/content/narrative/nodes.ts` — register the 8 new nodes; remove the 4 short nodes.
- `src/content/narrative/resolvers.ts` — add 6 engagement resolvers (1 per non-Wizard class + 3 for Wizard margins) and 1 farmhand-terminator resolver. Existing `open_with_pell`/`_footnote`/`_heckler` stay.
- `src/content/classes/index.ts` — point each class's `openingNarrativeNodeId` to the new Node A; add new `openingEncounterId` field.
- `src/engine/types.ts` — add `openingEncounterId: EncounterId` to `CharacterClass`.
- `src/engine/events.ts` — `StartNewGame` queues `__pending_encounter = cls.openingEncounterId` after `EnterLocation`. Drop the `ACT_LINE` from `CLASS_OPENING_LINES` (the bespoke opener takes over chapter-establishment); the 2 atmospheric "wake-up" lines may stay as a brief lead-in or be folded into the opener Node A — author's call during implementation.
- `src/content/index.ts` — register the 4 new opener encounters; update `validateContent` to validate `openingEncounterId` references.

**Created:**
- `src/content/encounters/openings.ts` (new) — 4 `NarrativeEncounter` wrappers, one per class:
  - `farmhand_opener_encounter` — `rootNodeId: farmhand_opener_a`
  - `knight_opener_encounter` — `rootNodeId: knight_opener_a`
  - `wizard_opener_encounter` — `rootNodeId: wizard_opener_a`
  - `bard_opener_encounter` — `rootNodeId: bard_opener_a`
- `src/engine/__tests__/openers.test.ts` (new) — per-class unit tests on the opener flow.
- `src/__tests__/openers.e2e.test.ts` (new) — per-class integration test covering full StartNewGame → opener engagement → tutorial combat (or back-field, for Farmhand).

## Tests

### Unit (`src/engine/__tests__/openers.test.ts`)

Per class, four tests:

1. **Wires correctly:** `StartNewGame` results in `combat?.kind === 'narrative'` with `currentNodeId === <class>_opener_a`.
2. **Engagement plants flag:** picking the engagement choice advances `currentNodeId` to `<class>_opener_b` and sets the canonical class-flag (`read_dismissal_notice`, `consulted_tome`, `tuned_lute`, `corked_jar`).
3. **Wizard flavor flag:** for the Wizard, picking margin A/B/C plants `wizard_first_margin = 'a'|'b'|'c'` accordingly.
4. **Commitment routes correctly:**
   - Knight Node B → `__pending_encounter` cleared (drained) → combat with `combat_insolent_pell` is active.
   - Wizard Node B → combat with `combat_feral_footnote` is active.
   - Bard Node B → combat with `combat_pointed_heckler` is active.
   - Farmhand Node B → encounter terminates (`combat === null`); player at `family_farm`; no pending encounter; engaging in normal play eventually triggers Tax Rat via existing beat (covered by e2e).

### E2E (`src/__tests__/openers.e2e.test.ts`)

Per class, one test that walks the full flow from `StartNewGame` through the tutorial combat (or for Farmhand, through to first Tax Rat).

### Cameo prose presence

In `openers.test.ts`, four assertions (one per class) that the Node A prose contains the cameo sentence — a regex match on a small distinctive phrase ("figure in tweed crosses", "unmarked volume", "man in tweed sits", "figure in tweed passes"). Cheap, brittle to prose edits but worth catching cameo-removal regressions.

### Updated existing tests

- `src/engine/__tests__/state.test.ts` — `StartNewGame` tests must update: the test `'StartNewGame populates character from class definition and emits opening log'` and similar will see `combat !== null` (narrative kind) immediately after StartNewGame, where they currently expect a clean state. Update assertions or split into pre-and-post-opener tests.
- `src/engine/__tests__/quests.test.ts` and `src/__tests__/quests.e2e.test.ts` — the existing Farmhand quest e2e walks past `StartNewGame` into combat with the Tax Rat. The opener now intervenes; the test needs to resolve the Farmhand opener (engage with jar, walk to back field) before triggering the Tax Rat encounter directly. Same for any other test that uses `StartNewGame` and expects immediate free play.

## Acceptance criteria

1. Picking any of the four classes at character creation results in a bespoke opener narrative encounter immediately after the starting location's description.
2. Each opener's Node A prose is organised as ~4 paragraph-units, with paragraph 3 embedding a single-sentence tweed cameo per the cameo subtlety rules.
3. Knight / Wizard / Bard openers resolve into their tutorial combat (Pell / Footnote / Heckler) on commitment.
4. Farmhand opener resolves to free play at `family_farm`; the Tax Rat continues to spawn via the existing beat system.
5. Each opener plants its canonical class-flag (`read_dismissal_notice`, `consulted_tome`, `tuned_lute`, `corked_jar`); Wizard additionally plants `wizard_first_margin`.
6. All 227 existing tests still pass; new opener tests pass.
7. `npm run build` succeeds; `npx tsc --noEmit` succeeds.

## Open questions and future work

- **Ch 8 callbacks** — Plan 5a plants the four canonical flags but does not consume them. A future plan (likely whatever authors Chapter 8) consumes the flags to vary the MacGuffin presentation. Each flag's payoff is sketched in the spine's *Anchor Items* section.
- **`CLASS_OPENING_LINES` future** — once the bespoke opener takes over chapter-establishment, the two atmospheric wake-up lines may feel redundant. Implementation may drop them entirely and rely on Node A's prose. Author's judgment during implementation; either is acceptable.
- **Farmhand symmetry** — if playtest shows the lack of a tutorial combat hurts the Farmhand's first-game experience, a future plan can introduce a "back field rat" tutorial. Plan 5a deliberately leaves this asymmetric to honour the want.
