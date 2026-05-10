# Chapter 4 — Meeting with the Mentor (Design Spec)

> **Date:** 2026-05-10
> **Scope:** The Ch 4 narrative beat for all four classes, plus the transit zone that paces the chapter (Old Road), plus the mechanics surrounding the class signatureMove being moved from a level threshold to the mentor encounter.
> **Spine references:** `docs/superpowers/narrative-spine.md` — Chapter 4 sketches, Anchor Items, Voice Principles.

---

## Premise

Chapter 4 of The Heroic Chronicle is the monomyth's "Meeting with the Mentor" beat. Each class meets a class-specific mentor who teaches them their class's signature combat skill. The mentor names the goal — **the Sacred MacGuffin** — plainly, deadpan, with no acknowledgement that the name sounds strange. Each mentor is canonically a *previous-cycle hero* who Accepted the wish and now serves the script as a recruiter. Their good faith is genuine; the seam is the small, uncanny gaps in their procedural origin.

The chapter is paced by a shared transit zone — **the Old Road** — through which all four classes pass. The player must win three combat encounters on the road before the mentor location becomes reachable. A skippable-mentor path is preserved for a hidden achievement: *An Unsigned Tale* (complete the game having never learned your class signatureMove).

---

## Architecture

### Skill re-route

- **Remove** the level-3 `signatureMove` auto-unlock from `src/engine/progression.ts`. The mentor is the only canonical source of the signature skill.
- The mentor encounter's Accept resolver grants the class's `signatureMove` by appending it to `character.knownSkills`. Mechanism: a new event or extension of an existing event (the writing-plans pass will choose the cleanest).
- **Refusal is reversible.** Refusing the mentor in scene does *not* permanently lock the skill. The player can re-enter the mentor location at any time before Chapter 9 and accept. The mentor is patient.
- **Farmhand comedic exception.** If the Farmhand chooses "Walk on" at the Neighbor's mentor scene, the encounter *still* grants Tempt Fate — the Neighbor calls out a parting remark on the way out, and the player catches themselves knowing the spell three steps down the lane. The Farmhand cannot deliberately refuse the skill *while visiting* the Neighbor; the only way to refuse is to never visit the Hedgerow Lane at all.

### Hidden achievement

- **`an_unsigned_tale`** — earned on game-end (any of the three Chapter 9 endings) if `character.knownSkills` has *never* contained the class signatureMove during the run. Tracked via a new flag `ever_learned_signature` (set to `true` the instant the skill enters `knownSkills`; once `true`, the achievement is locked out for the run).

### Encounter flow

1. `call_accept` (existing in `src/content/narrative/resolvers.ts`) — **modified**: in addition to its current side effects, it now sets `crossed_threshold` simultaneously with `accepted_call`. (Currently `crossed_threshold` is unset and gates the "Cross the threshold" exit at `dusty_crossroads`. Setting both at the Call's acceptance opens the road.)
2. `dusty_crossroads` exit *"Cross the threshold"* is **relabeled** to *"Onto the Old Road"* and now leads to `the_old_road`. The label change is the only visible difference; the gate logic is preserved (`visibleIfFlag: 'accepted_call'`, `enabledIfFlag: 'crossed_threshold'`), and both flags are now set together.
3. **The Old Road** (new location) — see §Transit Zone below. Three combat wins required to unlock the forward exits.
4. **Mentor location** (new × 4, class-specific) — see §Per-Class below. Reached from the Old Road via a class-flagged exit visible only to that class. The mentor encounter auto-plays on first arrival.
5. **Ch 5 stub** — a placeholder location (e.g. `the_threshold`) reached via the *"Onward, deeper down the road"* exit from Old Road. Single screen, single line of prose, no encounters. Authoring Ch 5 proper is out of scope for this spec. The exit banners Ch 5 and sets `story.stage` to `chapter_5`.

### Re-visiting the mentor

- **After refusal (Knight/Wizard/Bard):** Node 1 prose softens (*"You return. The kettle is still warm,"* or class equivalent). Node 2 drops the probe-seam and motivation options; only Accept and Walk-on remain. Player can return any number of times until they accept.
- **After acceptance:** Node 1 prose acknowledges the prior visit (*"The Veteran nods. The chapel is quieter today,"* etc.). Single choice "Leave." No further teaching.
- **Farmhand who refused (and was granted Tempt Fate anyway):** Lane is empty on re-visit. *"The kettle is cold. The bag is gone. The lane is just a lane."* Single choice "Leave."

---

## Scene structure (uniform across all four classes)

| Node | Job | Choices |
|-|-|-|
| **Node 1 — Arrival** | Establish mentor and setting in prose. | 1 choice: *"Step forward."* → Node 2 |
| **Node 2 — The teaching** | Mentor speaks; names the Sacred MacGuffin plainly; drops the form-clue. Narrator also uses *"the Sacred MacGuffin"* in the same beat. | Up to 4 choices: *"Yes — teach me."* (→ Accept), *"Why are you doing this?"* (→ Node 2c, then loop back with this option greyed), *"Why does your phrasing sound [seam]?"* (→ Node 2b, then loop back with this option greyed), *"I'll walk on."* (→ Refuse) |
| **Node 2b — Seam deflection** | Mentor gracefully deflects the probe-seam. Never admits anything. | Loops back to Node 2 with probe-seam greyed. |
| **Node 2c — Motivation** | Mentor explains why they're doing this — warmly, in good faith, with one uncanny detail they don't notice. | Loops back to Node 2 with motivation greyed. |
| **Accept resolver** | Grants signatureMove; sets `ever_learned_signature`; sets `learned_signature_<class>`. Brief warm exchange logged. Encounter ends; player remains in mentor location. | — |
| **Refuse resolver** | Knight/Wizard/Bard: no skill granted; sets `refused_mentor_<class>`. Encounter ends. **Farmhand override**: grants Tempt Fate anyway with the comedic parting-remark prose. | — |

If both probes have been used in a session, Node 2 collapses to two choices (Accept / Walk on) without re-rendering an unreachable menu.

### Voice rules for Ch 4 scenes

- **Mentors use "the Sacred MacGuffin" plainly.** Folk names (Wishing Stone, Author's Cup, Last Pen, Boon, World's End Token) are *not* used here. They're for ambient NPCs, signs, and side quests. Mentors are meta-aware-in-script; the deadpan is the joke.
- **Narrator uses "the Sacred MacGuffin" too** in mentor scenes, amplifying the deadpan. The narrator's folk-name variance lives in other chapters.
- **Form-clues are dropped, not explained.** Each mentor mentions what *their* MacGuffin looked like ("Mine looked like X — yours will too, I expect"), in one sentence. No follow-up. The Ch 8 payoff lands harder for the player who remembered the line.
- **Deflections never admit.** Probe responses graciously redirect; the mentor never says "yes, you're right, I'm in a script."
- **Motivations are kind.** No mentor is sinister. They believe in what they're teaching. The seam is the small detail they don't quite remember.

---

## Per-class scene specifics

### Disgraced Knight

- **Location:** *The Veteran's Chapel* — a wayside shrine, candle-lit, dust-free; a polished sword on the altar; a worn stone bench.
- **Mentor:** *The Veteran* — clean-shaven, posture immaculate, story too neat.
- **Probe-seam:** *"Your dishonor and rehabilitation rhyme with mine exactly — beat for beat."*
- **Form-clue (in Node 2 prose):** *"Mine looked like a folded notice. The dishonor struck through; a correction in another hand. Yours will too, I expect."*
- **Motivation beat (Node 2c):**
  > *The Veteran considers. "When I was where you are, an older knight sat in this chapel. He told me what I am telling you. I came back, and I sat in this chapel, and I waited. Eventually, you came. It is how the order endures."* He pauses. *"I don't ask whether it is a good order. I sit. I wait. I tell."*
- **Seam in motivation:** the quiet *"I don't ask."*
- **Accept narration:** *The Veteran takes your sword-hand in his. The grip is firm; the lesson lands like a stone settling into a wall. ***You learn Brute Force.****
- **Refuse narration:** *The Veteran nods, unsurprised. He gestures at the bench. "The chapel will be here. So will I."*

### Accidental Wizard

- **Location:** *The Quiet Tower* — a small stone study at the top of a single tower; tome open on the lectern with margins that agree; sunlight through narrow latticed windows; everything in its place.
- **Mentor:** *The Archmage* — robe unsmudged, staff bearing a monogram you've seen *somewhere* before but can't place (the Hermit's notebook? A binding on the man-in-tweed's book? The chapter heading on a milestone?).
- **Probe-seam:** *"'As it is written' — but where is it written?"*
- **Form-clue (in Node 2 prose):** *"Mine was a slim book. Plain spine. The margins agreed with themselves. Yours will look the same, I should think."*
- **Motivation beat (Node 2c):**
  > *The Archmage smiles, gently. "Knowledge wants passing. When the margins agreed, I felt the obligation at once — the next student would arrive, and would need the same guidance. No one taught me, exactly. But everyone told me what to expect. I do the same."*
- **Seam in motivation:** *no one taught me, but everyone told me what to expect* — passive voice on the teacher. There was no teacher; there was a script.
- **Accept narration:** *The Archmage rests two fingers on the lectern. The tome's three margins, for the first time in weeks, agree on something. ***You learn Out-Think It.****
- **Refuse narration:** *The Archmage inclines their head. "The tower endures. As does its kettle."*

### Bard Who Didn't Ask For This

- **Location:** *The Laureate's Salon* — a quieter upstairs room above the Wretched Pheasant; framed lyrics on the walls; a half-drunk glass on a low table; a battered chaise; the noise from below muffled by a velvet curtain.
- **Mentor:** *The Laureate* — speaks in iambs without noticing; hums a snatch of melody that you'd swear is the same melody the Hermit hummed under his breath at the crossroads.
- **Probe-seam:** *"Your masterpiece's scansion matches something I can't place."*
- **Form-clue (in Node 2 prose):** *"Mine was a single sheet of music. Already composed. It hummed when I held it. Yours, I expect, will hum back."*
- **Motivation beat (Node 2c):**
  > *The Laureate laughs, charmed by their own answer. "A first work is borrowed. A second, owed. A third, repaid. I am repaying. You will repay, too, when your song is in the air."* Then, more quietly: *"The salon is always full of glasses I don't remember pouring."*
- **Seam in motivation:** the unremembered glasses.
- **Accept narration:** *The Laureate hums one bar. You hum it back, slightly different. They smile as if they have heard this exact variation before. ***You learn Swagger.****
- **Refuse narration:** *The Laureate pours another glass without checking the level. "Come back when the air feels heavier than the song. I'll be here."*

### Reluctant Farmhand

- **Location:** *The Hedgerow Lane* — a quiet country lane between farms; a stile over a hedge; a packed canvas bag and a kettle on a flat stone; bees in the hedgerow; the Farmhand's own farm just visible down the road.
- **Mentor:** *The Neighbor* — older, weathered, Farmhand-shaped; gentle, never pushy; a kettle on a stone and a cup the right size in their hand.
- **Probe-seam:** *"You've been waiting since when, exactly?"*
- **Form-clue (in Node 2 prose):** *"Mine looked like a jar of soil. Dusty lid. Just-right size for a pocket. Yours will too, I expect."*
- **Motivation beat (Node 2c):**
  > *The Neighbor pours from the kettle. The cup is the right size. "I was where you are. I went, I did the thing, I came home. The chickens didn't recognise me, but the back field welcomed me. I sit on this stile some mornings. I knew you'd come today."* They glance at the bag. *"I don't remember packing this. But it is the right bag."*
- **Seam in motivation:** the bag they don't remember packing.
- **Accept narration:** *The Neighbor pours, and you drink. The tea is the right temperature. By the second sip, the spell is somewhere in you, settled. ***You learn Tempt Fate.****
- **Refuse narration (comedic Farmhand exception):**
  > *You step around the Neighbor's outstretched hand and walk on. Behind you, the Neighbor calls, mildly: "Mind the third hedgerow. The rabbit there knows." You don't know why that's useful. Three steps down the lane, you find that, somehow, you do.*
  > ****You learn Tempt Fate.****
  > *The Neighbor, when you glance back, is sipping tea. The kettle is empty.*

---

## Transit zone — The Old Road

### Purpose
- Pace the chapter so the mentor encounter is earned, not handed over.
- Plant the Ch 5-spine motif of "page-and-script imagery enters the prose" (footers on milestones, watermarks on signposts).
- Provide a low-risk grind zone for the player to level toward Chapter 5+.

### Location

- **`the_old_road`** — single shared location. All four classes use it.
- **Description:** *"The road climbs gently. A milestone bears a chapter heading you do not recognise. A footer is printed faintly along the base of a roadside sign. The wind smells of paper and minor weather."*
- **Re-entry description:** *"The road has not moved. You suspect, now, that it doesn't."*
- **Ambient lines:** four short lines along the page-imagery motif (a watermark, a stray page number, a milestone too neatly aligned with a story beat, a roadside shrine to authors).

### Exits

- *"Back to the crossroads"* → `dusty_crossroads`. Always available.
- *"Off the road, to the [Veteran's Chapel / Quiet Tower / Laureate's Salon / Hedgerow Lane]"* → class-specific mentor location. **Visible only to that class.** **Enabled when `old_road_wins >= 3`.**
- *"Onward, deeper down the road"* → Ch 5 stub location. **Available to all classes.** **Enabled when `old_road_wins >= 3`.** Banners Ch 5 and advances `story.stage`. This is the skip-mentor path.

### Encounter dispatcher

A new narrative encounter `old_road_dispatcher` is the sole entry in `the_old_road.encounterIds`. On every location entry, its resolver runs:

- **If `old_road_wins < 3`:** Queue a mandatory combat encounter via `__pending_encounter`. 50/50 random choice between `combat_wayfaring_footnote` and `combat_plot_convenience`. These encounters have `noFlee: true`.
- **If `old_road_wins >= 3`:** Roll d100 (seeded). On a roll ≤ 30, queue a voluntary combat (same 50/50). On a roll > 30, do nothing (peaceful re-entry). Voluntary combats have `noFlee: false`.

The counter `old_road_wins` increments in the combat-victory reducer branch for these two encounters specifically (not for every combat in the game — scoped). Increment happens once per win.

### Wayfaring Footnote (new monster)

- **Concept:** A bigger, chattier cousin of Feral Footnote — a paragraph with legs. Cites itself mid-fight.
- **Stats:** HP 18, attack damage 4-6, dodge 6, armor 1, XP reward 12, currency 0.
- **Actions:**
  - `attack` (weight 0.7): *"The Footnote takes a fresh swing, citing itself."*
  - `apply_status` `next_attack_misses` (one_shot) (weight 0.3):
    - applied: *"(see: previous note) — You misread the next line."*
    - expired: *"The page settles. You see the line clearly."*
- **Drops:** `page_of_errata` at 40% chance on victory.

### Plot Convenience (new monster)

- **Concept:** An obstacle so on-the-nose it's almost helpful. Squat, durable, ready-made for the moment.
- **Stats:** HP 24, attack damage 2-4, dodge 4, armor 2, XP reward 14, currency 0.
- **Actions:**
  - `attack` (weight 0.65): *"The Convenience swings with exactly the force the scene requires."*
  - `apply_status` self `plot_armor` (turns: 2) (weight 0.35):
    - applied: *"Plot armor engages. The next two blows will land, but barely."*
    - expired: *"The plot armor loosens. The convenience grows inconvenient."*
- **Drops:** `page_of_errata` at 60% chance on victory.

### New StatusKind: `plot_armor`

- Adds to the existing 8 StatusKind values (joins `weakness_revealed`, `intimidated`, `guaranteed_crit`, `next_attack_misses`, `skip_turn`, `weapon_suspended`, `armor_halved`, `free_retaliation`).
- **Effect:** While active on a combatant, incoming damage from any source is capped at **1** per hit (after armor reduction).
- **Hookup:** A new branch in the damage-application pipeline in `src/engine/combat.ts` that checks `findStatus(target, 'plot_armor')` before finalising damage.
- **Duration:** `turns: 2` when applied by Plot Convenience. Generic mechanic; could be reused by future monsters (e.g. major bosses) but no such use authored in this spec.
- **UI:** Status chip appears in the combat status pane (same surface as the other 8). Display name: *"Plot Armor"*. Description: *"Incoming damage capped at 1. The scene insists."*

### New consumable item: Page of Errata

- **id:** `page_of_errata`
- **Name:** *Page of Errata*
- **Description:** *"A torn page of corrections in a steady hand. Reading it carefully patches your assumptions, which patches you up a bit."*
- **Use effect:** Heals 15 HP (clamped to max). Consumed on use. Usable both in and out of combat.
- **Drop chance:** 40% from Wayfaring Footnote, 60% from Plot Convenience. A player who wins three Old Road fights typically ends with 1-2 Errata pages.

### Tuning notes

- The 15-HP heal is meaningful but not full restore for any class (Knight max 40, Bard 28, Wizard 22, Farmhand 30 — heal recovers ~38-68% depending on class). Encourages judicious use.
- 3-fight gate is tight enough to pace, loose enough not to grind. With the drop rates given, a player who is careless about HP can still survive without leaving the road.
- Voluntary re-grind chance of 30% post-gate gives a "feels random" experience without being either overwhelming or absent.

---

## File touch summary

(Detailed task decomposition lives in the writing-plans pass. This is the rough surface.)

- **`src/engine/types.ts`** — add `plot_armor` to `StatusKind` union; potentially add new event for granting a skill via mentor (or extend existing).
- **`src/engine/status.ts`** — register `plot_armor` if needed.
- **`src/engine/combat.ts`** — damage pipeline check for `plot_armor`; counter increment on victory for Old Road monsters.
- **`src/engine/progression.ts`** — remove level-3 `signatureMove` auto-unlock branch.
- **`src/engine/events.ts`** — handle skill-grant event from mentor.
- **`src/content/locations/dusty_crossroads.ts`** — relabel "Cross the threshold" → "Onto the Old Road"; target `the_old_road`.
- **`src/content/locations/the_old_road.ts`** (new) — single shared location.
- **`src/content/locations/veterans_chapel.ts`** (new) — Knight's mentor location.
- **`src/content/locations/quiet_tower.ts`** (new) — Wizard's mentor location.
- **`src/content/locations/laureates_salon.ts`** (new) — Bard's mentor location.
- **`src/content/locations/hedgerow_lane.ts`** (new) — Farmhand's mentor location.
- **`src/content/locations/the_threshold.ts`** (new, stub) — Ch 5 placeholder.
- **`src/content/monsters/index.ts`** — add Wayfaring Footnote, Plot Convenience.
- **`src/content/items/index.ts`** — add Page of Errata.
- **`src/content/encounters/`** — add `old_road_dispatcher.ts`, `combat_wayfaring_footnote.ts`, `combat_plot_convenience.ts`, `mentor_knight.ts`, `mentor_wizard.ts`, `mentor_bard.ts`, `mentor_farmhand.ts`.
- **`src/content/encounters/index.ts`** — wire them in.
- **`src/content/narrative/nodes.ts`** — add the 12-16 new narrative nodes (3-4 per class).
- **`src/content/narrative/resolvers.ts`** — add resolvers: `old_road_dispatcher`, `mentor_<class>_accept`, `mentor_<class>_refuse`, plus probe/motivation loop-back resolvers if needed. Modify `call_accept` to also set `crossed_threshold` and unlock the mentor exit at `dusty_crossroads`.
- **`src/content/achievements/index.ts`** — add `an_unsigned_tale`.
- **`src/content/__tests__/validate.test.ts`** — validate new encounter references, monster references, status references, achievement references.
- **Tests** — combat tests for `plot_armor`; resolver tests for mentor accept/refuse + Farmhand override; e2e tests covering: full mentor flow per class, refuse-then-return, Farmhand-refuse-still-grants, achievement-locked on skill learn, achievement-earned on game-end without skill (where game-end is testable).

---

## Voice principles (Ch 4-specific)

These extend the spine's general voice rules:

1. **Mentors are kind.** No mentor is angry, dismissive, or sinister. Their warmth is real.
2. **Mentors are recruiters.** They are previous-cycle heroes who Accepted. They believe in the wish. The seam is the gap between their kindness and the procedural origin they don't quite remember.
3. **The Sacred MacGuffin is named plainly.** Folk names belong to other chapters.
4. **Form-clues are dropped once.** No mentor repeats their form-clue or explains it further.
5. **Probes are deflected, never admitted.** No mentor confirms the script.
6. **Motivations include one uncanny detail the mentor doesn't notice.** That detail is the seam.

---

## Out of scope

- Chapter 5 content beyond a one-line placeholder location. Ch 5 proper is a future spec.
- Mentor scenes for non-starter classes (none exist; only four classes are in the game).
- Mentor-related side quests (e.g. "fetch X for your mentor") — not in this spec.
- Combat balance retuning for existing monsters; only new monsters get fresh numbers.
- Additional StatusKind beyond `plot_armor`.
- UI changes to the character/combat panes beyond rendering the new status chip (which falls out of existing infra).
- Refactoring the existing skill-unlock pipeline; we just remove the level-3 branch, we don't redesign.

---

## Open questions for the plan pass

- **Skill-grant event shape:** Reuse an existing `LearnSkill` event (if it exists; the grep earlier showed `event.skillId` references) or introduce a new `LearnSignatureFromMentor` event? Cheapest path likely the former.
- **`old_road_wins` flag scoping:** Lives on `world.flags` (number). No migration concern (new field, defaults to 0).
- **Achievement detection:** Game-end resolvers will need to check `!ever_learned_signature && story.stage === 'chapter_9'` and award. Mechanism depends on how the Ch 9 endings are wired (out of this spec's scope — they're stubbed).
- **Page of Errata drop integration:** Existing combat loot system — verify how drops are awarded (likely via `__pending_loot` flag or similar) and follow that pattern.
