# Chapter Expansion Framework + Ch 1 Farmhand Pilot

> **Date:** 2026-05-17
> **Scope:** (1) Establish the structural framework for expanded chapters in The Heroic Chronicle. (2) Pilot that framework by fully designing the expanded Chapter 1 arc for the **Reluctant Farmhand**.
> **Spine reference:** `docs/superpowers/narrative-spine.md`. This spec also produces *updates* to that document.

---

## 1. Premise

The current Ch 1–4 plays in ~25–30 minutes total. Each chapter is a thin connective tissue between narrative gates: a couple of mandatory combats, a single narrative beat, and a Fate-push to the next location. The narrative spine is rich, but the chapters as implemented don't have room to plant most of it.

This spec defines what an EXPANDED chapter looks like — target length 45-60 minutes per chapter, hub-and-spoke structure with a culminating beat — and pilots the framework by fully designing the Farmhand's Chapter 1. Other classes' Ch 1 arcs (Knight, Wizard, Bard) and subsequent chapters (2-4) follow the same pattern but are deferred to subsequent specs.

The pilot validates the framework with concrete content before committing to authoring 4× more.

---

## 2. Framework decisions

The five locked structural decisions for every expanded chapter:

| Dimension | Decision | Implication |
|-|-|-|
| **Target length** | 45-60 min per chapter on a focused playthrough | Each chapter is its own region with multiple locations to explore |
| **Shape** | Hub-and-spoke: one central location + 3-5 sub-locations (spokes), visitable in any order | Plays cleanly with the existing Location.exits engine; spokes hide foreshadowing; no new infrastructure needed |
| **Culmination type** | Per-chapter calibrated: boss fight OR puzzle OR forced-leave event, whichever fits the chapter's theme | The culmination gates the chapter's narrative climax (e.g., Ch 1 ends with the Fate-push; the culminating event is what triggers it) |
| **Content mix** | Exploration-rich: ~40% narrative/exploration, ~30% combat, ~20% NPC interaction, ~10% loot | Each spoke is primarily a place to investigate with light combat/dialogue, not a chain of fights |
| **Foreshadowing density** | Layered: Ch 1 sparse → Ch 4 dense | Ch 1 plants 4-6 motifs total; Ch 4 plants 8+. The escalation itself is a tell on replay |

---

## 3. Per-class authoring approach for Ch 1

Each of the four classes gets their OWN hub-and-spoke region in Ch 1 (Knight at the Quartermaster's Yard, Wizard at the burning library, Bard at the dressing room, Farmhand at the family farm). Four distinct regions, not one shared.

**This spec pilots only the Farmhand.** Other classes follow in subsequent specs that mirror this structural pattern:

- **Hub:** the existing opener location, expanded
- **Spokes:** 3-5 sub-locations connected to the hub
- **NPC anchor:** a person the class cares about (Farmhand → Mother; analogous figure per class to be designed)
- **Emotional-stake quest item:** something they're carrying that matters (Farmhand → Note from Mother; analogous per class)
- **External culminating event:** something that FORCES the class out, rather than the player choosing to leave (Farmhand → tornado destroys the barn)
- **Existing Fate-push beat:** preserved verbatim, layered over the worldly cause

---

## 4. Ch 1 Farmhand Pilot — Hub: The Family Farm

The existing `family_farm` location is the hub. Its description and rest-spot are preserved. New exits are added pointing at four spokes. The Mother NPC is established as a permanent household member; the Farmhand's relationship with the chickens (and Henwald specifically) is presumed established at game start.

**Updated description:** the existing prose stays. New ambient lines may be added that subtly seed the weather omens (e.g., "the air is unusually still" rotates in during the pre-tornado phase).

**New exits added to `family_farm`:**
- "Out to the back field" → `back_field` (new)
- "Over to the chicken coop" → `chicken_coop` (new)
- "Around to the old well" → `old_well` (new)
- "Inside, to the kitchen" → `family_kitchen` (new)

(The existing "Walk to the crossroads" exit remains, gated by `unlocked_crossroads` — set by the tornado beat.)

---

## 5. Ch 1 Farmhand Pilot — Spokes

### 5.1 Spoke — The Back Field (new location)

**Purpose:** Exploration spoke. Comedy beat (weeding accomplishes very little). Optional combat. Weather omen.

**Description:**
> *The back field, un-weeded for a week, opens before you. The weeds, which on closer inspection are mostly thistle and one ambitious dandelion, regard your pitchfork with what is either resignation or grim amusement. The cow, in the near pasture, watches the sky with the focused unease of a creature who knows something but cannot, in any meaningful sense, tell you about it.*

**Activities:**
- **"Weed for a while"** narrative choice — narration: *"You weed. For about twenty minutes, you make exactly the kind of progress that explains why the field has been un-weeded for a week. The thistle wins. The dandelion takes notes."* Comedic. No mechanical effect.
- **Optional combat: The Anxious Allium** — see §8 below. Encounter visible as a clickable encounter button. Once defeated (or fled), the encounter disappears for the rest of Ch 1.

**Weather omen (always-present ambient line):**
> *The cow has not, you note, been informed of why the wind is doing nothing.*

**Spoke completion flag:** `visited_back_field`.

---

### 5.2 Spoke — The Chicken Coop (new location)

**Purpose:** NPC encounter (Henwald). Optional combat (the Officious Tax Rat) — gated behind a player choice in Henwald's dialogue. Foreshadowing motif planting.

**Tax Rat availability:** the encounter is visible while the player is in Ch 1 AND `farmhand_tornado_fired` is false (`hiddenIfFlag: 'farmhand_tornado_fired'`). A player who skips the fight before the tornado misses the egg reward — the Tax Rat flees ahead of the storm and is gone post-tornado.

**Description:**
> *The chicken coop. Henwald is, as ever, in residence. Several of the girls have gathered in the kind of huddle that, in chickens, indicates either a debate about grain pricing or imminent egg-laying. Possibly both. Their spokesman struts toward you.*

**NPC dialogue: Henwald**

Henwald speaks in a Foghorn-Leghorn cadence — bombastic Southern, paternal, friendly. He's been waiting to vent. He's NOT antagonistic toward the player; he confides.

**Initial dialogue (the Farmhand approaches):**
> Henwald struts toward you, comb wobbling with conviction. *"Well I say, I say — there y'are. There y'are, son. I been settin' here waitin' on you like a hen on a glass egg — and you know what kinda hen sits on a glass egg? A* confused *hen, son. A* confused *hen."*
>
> He puffs his chest, surveys his coop with the disappointment of a man who has Standards.
>
> *"It's the rat. That vest-wearin', clipboard-totin', subsection-quotin' rat. He's been here three weeks runnin' — three! — auditin' the girls' egg production like he's the King of Eggs himself. Claims he's collectin' for 'an authority.' Won't say which authority. Authority of WHAT? Of WHOM? Boy, even Mother's older than that rat, and* she *remembers a time before the levies."*

**Choices:**
- **"I'll see to him."** (triggers the Tax Rat combat — see below)
- **"What does he claim the levy's for?"** — Henwald: *"That's the thing, son! He talks in subsections and paragraphs and 'as written in the documentation.' What documentation? WHAT documentation? Some days I think the rat's just makin' it up as he goes."* — returns to the choice menu (option greyed via `disabledIfFlag: 'asked_henwald_levy'`)
- **"Maybe later, Henwald."** — Henwald: *"Well I say, I say — fair enough. The eggs ain't goin' anywhere, and neither's the rat, more's the pity. You come back when you're ready."* — exits the encounter (player can return)

**Tax Rat combat (triggered by "I'll see to him"):**

The existing `officious_tax_rat` monster is reused, with updated flavor to surface the foreshadowing seeds (see §7).

**Henwald's reward dialogue (after Tax Rat victory):**
> Henwald struts back over, ruffling his feathers in a small victory parade. *"Well I say, I say — that was a* sight*, son. I haven't seen a rat run that fast since Mother chased one outta the pantry with a soup ladle in '47."*
>
> He scratches at the dirt, deliberately not looking at the chicken nearest him.
>
> *"Now look. Look here. The girls and me been savin' up for a thank-you, and the girls don't take 'no' for an answer. Take these. They're farm-fresh. Hot off the line, as the sayin' goes."*
>
> *(3× Farm-Fresh Egg added to inventory.)*
>
> *"You can eat 'em, in a pinch. You can throw 'em, in a real pinch. Just don't carry 'em in the same pocket as your good handkerchief. I learned that one the hard way."*

**Weather omen (always-present ambient line):**
> *The chickens have been quiet since dawn. Suspiciously so. Henwald himself notes it, in passing — "weather's wrong today, son. Wrong all day."*

**Spoke completion flag:** `visited_chicken_coop`. (Tax Rat defeat sets `defeated:officious_tax_rat` per existing mechanics.)

---

### 5.3 Spoke — The Old Well (new location)

**Purpose:** Atmospheric exploration. No combat. No NPC. A single piece of strangeness the player remembers without quite naming.

**Description:**
> *The well sits at the edge of the kitchen garden, where it has always sat. The wood of the lid has weathered to the color of nothing in particular. A bucket hangs from a rope that frays in three different directions, each fraying separately, as though each strand had its own opinion about what frayed wood should look like.*

**Activities:**
- **"Drop a stone down"** — narration: *"You drop a stone down. You count to three. The splash comes on two. The echo, after the splash, sounds like a 'no' — not yours, and not anybody's you recognise."*
- **"Look down into the well"** — narration: *"You lean over. The light at the bottom is brighter than it should be at this hour. The bucket is, you note, full. You did not draw it up."*
- **"Step back from the well"** — exits the spoke.

**Weather omen (always-present ambient line):**
> *No breeze. The line of the bucket-rope stays vertical, which it never quite does on ordinary days.*

**Spoke completion flag:** `visited_old_well`.

---

### 5.4 Spoke — The Family Kitchen (new location)

**Purpose:** NPC scene with Mother. Pre-tornado: introduce Mother, plant the animal-talk seam, set up the Note from Mother as significant. Post-tornado: the chapter's emotional culmination.

**Description (pre-tornado):**
> *The kitchen smells of kettle steam and last year's preserves. Mother sits in the chair by the window, knitting something that has been a sock for several weeks now. The kettle is on, despite no one having intended to make tea. The Note from Mother — folded twice, written, blank, depending on the angle — rests on the kitchen table.*

**Activities:**
- **"Sit with Mother"** — primary NPC interaction. Branching small-talk:

  > Mother looks up. *"There y'are, dear. Pull up the bench."*
  >
  > She returns to her knitting. A pause. Then —
  >
  > *"You been at the coop, dear? Henwald run his mouth about the rat again?"*

  *(IF `visited_chicken_coop` is set:)*
  > She smiles, returns to her work. *"You and your chickens. You've been talking to them since you could walk — your father always said you had an ear for it. I wonder, sometimes, what they say back to you."*
  >
  > She pauses, considers.
  >
  > *"They've never said anything to me. Not a word. A 'cluck-cluck,' yes. Words, no."* The smile is gentle, not contradicting. Just describing. *"Whatever you hear, dear — I believe you. I just wish I heard it too."*

  *(IF `defeated:officious_tax_rat` is set:)*
  > *"That rat won't be back. Henwald told me. ...well, Henwald clucked at me, and I assumed."* She pats your hand.

  *(IF neither Henwald-flag is set:)*
  > *"You been out and about. Good. The cow's been watching the sky. I don't like it when the cow watches the sky."*

- **"Look at the Note"** — narration: *"The Note from Mother sits where it always sits. The paper is older than the writing. You cannot quite remember what it says — only that it is for you, and that one day you will know what it is for. You leave it on the table."*

- **"Step outside"** — exits the spoke.

**Weather omen (always-present ambient line):**
> *Mother, between sips: "The weather's been holding its breath today. I don't trust it."*

**Spoke completion flag:** `visited_family_kitchen`.

---

## 6. Ch 1 Farmhand Pilot — Culmination: The Tornado and the List

**Trigger:** The tornado fires on the next `EnterLocation` event after the player has visited any 3 of the 4 spokes (`visited_back_field`, `visited_chicken_coop`, `visited_old_well`, `visited_family_kitchen` — count flags). Implemented as a story-beat (`farmhand_tornado_strikes`) with preconditions:
- `flag: stage chapter_1`
- `classId === reluctant_farmhand`
- Three of four spoke-visit flags set
- `flag_unset: farmhand_tornado_fired`

**Effect on trigger:** the beat pushes a narrative interrupt to the log, sets `farmhand_tornado_fired: true`, sets `farmhand_post_tornado: true` (used to switch kitchen and home descriptions), and queues an `EnterLocation` to `family_kitchen` (via `__pending_enter_location`).

**The interrupt prose:**

> *Outside, the wind has been holding its breath all morning. It exhales, suddenly, in the wrong direction.*
>
> *Then a column of air the wrong color drops between the silo and the cow's paddock. The cow, finally proved correct, runs. The chickens — Henwald loudest among them — make a sound no folk-tale prepared anyone for.*
>
> *The barn, which has stood since your grandfather built it, considers its options and decides to lie down.*
>
> *The farmhouse holds. The kettle does not even fall off the stove.*

**Family Kitchen — post-tornado state** (rendered when `farmhand_post_tornado` is true; replaces the pre-tornado kitchen description):

> *The kitchen smells of kettle steam and a faint draft from a window that has shifted half an inch in its frame. Mother stands at the window, looking out at where the barn used to be, the way someone looks at an old photograph they have been carrying for a while.*

**Mother's culmination dialogue (auto-plays on entering the kitchen post-tornado):**

> Mother does not turn around immediately.
>
> *"Barn's down, dear. Mostly. The big beam's a write-off. The roof's just kindling now."*
>
> She turns, finally, and her eyes find yours.
>
> *"I can't make the walk anymore. I haven't been able to for a year. Town's two days; the crossroads is closer — there's always something at the crossroads, on a Tuesday, the gods know why. You'll need beams, nails, hands. Three days, maybe four. The chickens will keep. Henwald will see to them."*
>
> She slides the Note across the kitchen table.
>
> *"I wrote this list a while ago. I was hoping I wouldn't need it."*

**Mechanical effects on the Mother scene:**
- The Note from Mother item's content becomes the supplies list (see §10).
- `unlocked_crossroads: true` is set (the existing Fate-push beat is preserved; this is the redundant guarantee).
- A new log entry surfaces: *"Mother's Note now reads as a list. Check inventory."*

**Exiting the farmhouse — preserved Fate-push beat:**

The existing prose at the gate is preserved verbatim:
> *You step out the kitchen door. The back field is there, where it has always been. But the gate, this morning, faces the wrong way. The cow has positioned herself against the latch with what you must concede is intent. Beyond her, the hedgerow ends at a stile that was, you would have sworn, on the OTHER side of the field. A small board nailed to its post reads, in a careful hand: **"DUSTY CROSSROADS — that way."** The man in tweed who passed earlier is leaning on the stile. He sees you, raises a polite hand, and walks on.*

The worldly cause (tornado/supplies) and the meta cause (Fate has rearranged the geometry) layer over each other. On first play, the worldly cause is what registers. On replay, the layering itself is the seam.

---

## 7. NPCs

### 7.1 Mother

**Role:** Farmhand's family. Hub-NPC for Ch 1. Source of the Note. Emotional anchor.

**Personality:** Mid-60s. Frail but sharp. Competent. Has lived through things. Loving but undemonstrative. Doesn't panic. Knits a sock that has been a sock for several weeks.

**Voice:** Warm, plainspoken, dry-funny in a quiet way. Talks like someone who has been correct about the weather for forty years.

**Foreshadowing role:**
- Plants the animal-talk seam (she hears clucks, not words)
- Plants the "on schedule / Tuesday" motif
- Plants the weather omen
- (Long-term) Mother is the emotional anchor that gives Ch 9's endings (Accept, Refuse, Rewrite) their per-class weight for the Farmhand

**Where she appears:** Always in the kitchen, sometimes glimpsed at the window from outside. Never leaves the farm.

### 7.2 Henwald

**Role:** Rooster / chicken-spokesman / NPC who reframes the Tax Rat conflict.

**Voice:** Foghorn-Leghorn cadence — bombastic Southern, paternal, friendly toward the player. Confiding, not antagonistic. Speaks in folksy similes ("about as sharp as a sack of wet mice"). Catchphrase rhythm: "I say, I say, son."

**Personality:** Big personality, kind heart. Has Standards. Takes the chickens' welfare seriously. Genuinely fond of the Farmhand. The Farmhand-talks-to-animals trope (which Mother doesn't share) lands here.

**Foreshadowing role:**
- "As the saying goes — though I don't recall who said it" (rehearsed-quotation seam — same energy as the Ch 4 mentors)
- "What documentation? WHAT documentation?" (script motif)
- "Today's Tuesday. Convenient, ain't it?" (on schedule)

**Where he appears:** The chicken coop. Could appear elsewhere on the farm in future content (Ch 7 callback possible).

### 7.3 The Officious Tax Rat (reframed)

The existing monster `officious_tax_rat` is reused. Its narrative role changes from "first generic combat" to "the Editor's bureaucratic apparatus, harassing Mother and the chickens for ambiguous back-taxes."

**Updated monster description / flavor:**
> *Wears a tiny vest, embroidered at the breast with a small monogram you do not recognise yet. Carries a clipboard, the bottom corner of which bears a footer reading "p. 47" — for what document is unclear. Collects an unspecified levy on behalf of an unspecified authority. Has been hounding Henwald for three weeks; the chickens have started leaving threatening notes in unbroken eggshells.*

**Updated `defeatedFlavor`:**
> *The Tax Rat collapses dramatically, citing burnout. He scurries off under a stack of important-looking papers stamped "On Schedule" — though for what schedule remains, as always, unspecified.*

**Stats:** unchanged from current implementation.

**Foreshadowing seeds:** (a) monogram on vest (matches Archmage's staff in Ch 4 — invisible Ch 1 callback), (b) clipboard footer "p. 47" (page-imagery motif), (c) "On Schedule" stamp on his retreat (recurring motif).

---

## 8. New monster: The Anxious Allium

**Location:** The Back Field. Optional combat encounter. Non-repeatable.

**Concept:** A small bulbous onion-creature that has become animate. Comedic, low-stakes. Plays into the dusty crossroads' onion-smell motif (foreshadowing only — no spine implication).

**Stats:** HP 10, damage 2-3, dodge 3, armor 0, XP 6.

**Flavor:**
> *A bulb with feelings. Has been growing in the back field for some time and has developed strong opinions about being weeded. Its layers compose what could charitably be called a face.*

**Defeated flavor:**
> *The Allium splits into three smaller, sadder Alliums, each of which decides, on reflection, to go quietly back to being onions.*

**Actions:**
- `attack` (weight 0.7): *"The Allium lunges forward, smelling extremely pungent."*
- `apply_status` (weight 0.3): applies a one-shot **next_attack_misses** with `appliedFlavor`: *"Your eyes water. Your next swing is going to go a little wide."* and `expirationFlavor`: *"Your eyes clear. The world un-blurs."*

**Drops:** none beyond a small currency drop (1-3 leaves).

---

## 9. New item: A Farm-Fresh Egg + engine context-flag

### 9.1 Engine change — `ItemEffect.context` field

The `ItemEffect` type schema gains an optional `context` field:

```ts
export type ItemEffect =
  | { kind: 'heal_hp'; amount: number; context?: 'in_combat' | 'out_of_combat' }
  | { kind: 'heal_mp'; amount: number; context?: 'in_combat' | 'out_of_combat' }
  | { kind: 'set_flag'; flag: string; value: boolean | number | string }
  | { kind: 'deal_damage'; amount: number };   // deal_damage is inherently in_combat
```

**Engine behavior:**
- `playerUseItem` (in turn-based combat): applies effects where `context !== 'out_of_combat'` (i.e., undefined or `'in_combat'`).
- `useItemOutOfCombat` (no combat OR narrative encounter): applies effects where `context !== 'in_combat'`, AND filters out `deal_damage` effects entirely (they require a target).
- **Refusal logic:** if the filtered effect list is empty AND the original effect list was non-empty, the engine pushes the existing diegetic refusal log (*"You consider throwing X. There is nothing here to throw it at."*) and does NOT consume the item.

**Existing items remain unaffected:**
- Hardtack (`[heal_hp]`, no context) — applies anywhere ✓
- Page of Errata (`[heal_hp]`, no context) — applies anywhere ✓
- Crooked Arrow (`[deal_damage]`) — applies in combat, refused out of combat (existing behavior preserved) ✓

### 9.2 New item: `farm_fresh_egg`

```ts
[ItemId('farm_fresh_egg')]: {
  id: ItemId('farm_fresh_egg'),
  name: 'a Farm-Fresh Egg',
  flavor: 'Still warm. Worth eating raw, in a pinch. Worth throwing harder, in a real pinch.',
  kind: 'consumable',
  effects: [
    { kind: 'heal_hp', amount: 8, context: 'out_of_combat' },
    { kind: 'deal_damage', amount: 4 }
  ]
}
```

**Behavior:**
- **Out of combat:** eaten → +8 HP → log: *"You eat the Farm-Fresh Egg. (+8 HP)"*. Item consumed.
- **In combat:** thrown → 4 damage (ignores monster armor) → log: *"You hurl the Farm-Fresh Egg. It splatters for 4."*. Item consumed.
- The player learns by doing — the log narration tells them what happened.

**Acquisition:** Henwald gives 3 eggs after the Tax Rat is defeated (see §5.2 reward dialogue).

---

## 10. The Note from Mother as a quest item / supplies list

The existing item `note_from_mother` is preserved as a starting inventory item for the Farmhand. Its **inspect-time content** becomes conditional on the `farmhand_post_tornado` flag.

### 10.1 Pre-tornado state

**Display name:** "a Note from Mother"
**Flavor:** *"Folded twice. The handwriting is firm and the advice is mostly about onions."* *(current flavor, preserved)*

### 10.2 Post-tornado state

The item's inspect modal surfaces the supplies list. Implementation: the item's flavor field is read with a flag-aware fallback (engine change OR a swap-on-trigger). The implementation plan picks the approach; either works.

**Display name (post-tornado):** "a Note from Mother (supplies list)"
**Flavor (post-tornado):**
> *Folded twice. The handwriting is firm and the advice is, in this list, about beams and nails. It reads:*
>
> *— A strong beam (the big one, ten-foot if you can manage it). Oak, if you can. Pine if you must.*
> *— A sack of nails. Iron. Not too rusty.*
> *— A strong-backed neighbor. We're short of hands and the roof can't wait.*
> *— My tea. I'm almost out.*
>
> *Come home when you can. The chickens will keep. — Mother*

### 10.3 Supplies-arc framework (multi-chapter)

Each item on the list becomes a **future-chapter quest reward**. The current spec PINS the framework; specific chapter assignments are refined in the relevant chapter specs.

| Supply | Likely chapter | Source idea |
|-|-|-|
| **A strong beam (timber)** | Ch 5 (Threshold) or Ch 6 (Tests) | Felled and carted from a logger NPC after a side-quest |
| **A sack of nails** | Ch 2 or Ch 4 | Acquired from a Crossroads trader, or as a side-reward from a mentor encounter |
| **A strong-backed neighbor (a helper)** | Ch 7 (Approach) | Callback to the spine's Ch 7 Neighbor reveal — the Farmhand is offered "a hand" by an NPC who turns out to be the previous-cycle Farmhand |
| **Mother's tea** | Ch 3 or Ch 6 | A small luxury — picked up casually from a friendly NPC. Emotional rather than mechanical |

Each supply is tracked via an inventory flag (or as a discrete inventory item). At Ch 9, the supplies-axis is checked against the MacGuffin-axis to shape the ending prose.

### 10.4 Ch 9 supplies-axis ending preview

**Accept ending (Farmhand):**
The Farmhand returns home with supplies. The barn is already rebuilt — by the Neighbor (previous-cycle Farmhand). The supplies are obsolete; the timber goes into a quiet pile in the corner of the new barn. Only the tea lands — Mother is alive but does not quite recognize them. Henwald no longer crows; the chickens have a new keeper. The MacGuffin granted the wish (they got home) but the home is no longer theirs to need.

**Refuse ending (Farmhand):**
The Farmhand turns back before Ch 8. They walk home with whatever supplies they gathered. If all four: the barn is rebuilt by them, with their own hands. Mother lives, gets her tea. The chickens recognize them. Henwald: *"Well I say, I say — there y'are, son. I knew you'd come back. I told the girls. I TOLD the girls."* Quiet, complete.

If partial gather (1-3 supplies): make-do version. The barn is patched, not perfect. Life resumes, smaller.

**Rewrite ending (Farmhand):**
The Farmhand picks up Campbell's pen and scratches out the Note. They write a new list, or rewrite what the items MEAN. The barn is whole because they decided it never needed to fall. Mother is hale. The Neighbor is just a neighbor.

**Full Ch 9 prose is deferred to the Ch 9 spec.** This pilot just commits to the framework: the supplies-axis exists, pairs with the MacGuffin-axis, and the Note from Mother is the player's anchor for it.

---

## 11. Foreshadowing seeds planted (summary)

Six motif placements across Ch 1 Farmhand — sparse per the layered density choice (Ch 1 lightest, escalating through Ch 4 dense):

| Motif | Placement | Visible-but-deniable on first play |
|-|-|-|
| **Tweed cameo** | Opener prose (preserved) + culmination prose (preserved) | "There was a guy. He waved." |
| **Note from Mother watermark** | Post-tornado Note inspect | "Old paper has watermarks." |
| **"On schedule" via Tuesday** | Henwald's "Today's Tuesday. Convenient, ain't it?" + Mother's "always something at the crossroads, on a Tuesday" | "Two characters had the same superstition." |
| **Tax Rat monogram** | Rat's vest description | "The rat had a fancy embroidery. Whatever." |
| **Animal-talk seam** | Mother's "I just wish I heard it too" | "Mother is being sweet about my imagination." |
| **"What documentation?"** | Henwald's escalating rant | "Henwald is a chicken with strong opinions." |

Each is calibrated to read as flavor on first play and as structural seeding on replay. None are explained.

Weather omens (cow watches sky, chickens quiet, no breeze, kettle steady) are atmospheric setup for the tornado — not strictly foreshadowing motifs.

---

## 12. Spine updates required (in narrative-spine.md)

The implementation plan modifies `docs/superpowers/narrative-spine.md` to add:

1. **Mother as a named Farmhand NPC.** A short paragraph under per-chapter Ch 1, describing her role, her position (frail, in the farmhouse), the animal-talk seam. Cross-referenced from the Anchor Items section.

2. **The supplies-list-as-multi-chapter-arc.** A new sub-section under "Anchor Items / Set Pieces" alongside the MacGuffin, describing the Note as a 4-item list, the supplies-axis ending framework, and a stub table of supplies → likely chapters.

3. **Tax Rat reframed.** A small note (could live in Recurring Motifs or as a per-character entry under "the Editor's apparatus") that the Tax Rat works for the Editor; his monogram matches the Archmage's staff in Ch 4; his stamps say "On Schedule."

4. **Animal-talk seam.** Under Voice Principles or as a new recurring motif: the Farmhand has the monomyth's "talking animal helper" trope; Mother does not. The script is talking to the protagonist specifically.

5. **Per-class Ch 1 framework.** Generalize the Farmhand pattern in the Ch 1 entry: every class Ch 1 has a hub + 3-5 spokes, an NPC anchor (family or comrade), a culminating external event that FORCES the class out (not a choice they make), and an emotional-stake quest item.

6. **Henwald** as a defined recurring NPC. Foghorn-Leghorn cadence rooster. Friendly. Lives at the chicken coop. Could recur in Ch 7's Farmhand callback (TBD).

These updates extend the spine without contradicting existing material.

---

## 13. Multi-class Ch 1 framework note (forward-looking)

For Knight, Wizard, Bard Ch 1 (future specs), each class needs:

- **Hub:** the existing opener location (quartermasters_yard, burning_library, tavern_dressing_room)
- **3-4 spokes:** sub-locations rooted in the class's world
- **NPC anchor:** the class's equivalent of Mother (a person they care about — could be a fellow knight, a junior librarian, a stage manager, etc.)
- **Henwald-equivalent:** a class-flavored confiding NPC (could be a comrade-in-arms for Knight, a bookish apprentice for Wizard, an audience-regular for Bard)
- **Tax-Rat-equivalent:** a mandatory combat that's narratively grounded in the spoke region (could be the Grievance Bursar relocated, or a new monster — TBD per class)
- **External culminating event:** something that FORCES the class out. Knight's might be a sealed writ from the Crown demanding their attendance at the crossroads. Wizard's might be the Tome producing an unambiguous directive. Bard's might be a venue closure or a contract that requires travel.
- **Emotional-stake quest item:** the class's equivalent of the Note. The Knight already has the Defaced Family Crest; the Wizard, the Questionable Tome; the Bard, the Audience Expectation. Each can carry a supplies-list-analog through the game.

These specs are deferred.

---

## 14. Out of scope (explicit)

- **Ch 1 for other classes (Knight, Wizard, Bard).** Each gets its own follow-up spec mirroring the Farmhand pattern.
- **Ch 2, Ch 3, Ch 4 expansion.** Each follows the framework but is a separate spec.
- **Ch 5+ content.** The threshold and beyond remain stubbed.
- **Time-of-day system.** A "Diary Day" structural approach was considered and rejected — adds engine work for a single thematic gain.
- **Full Ch 9 endings prose.** Only the supplies-axis framework is pinned here.
- **The four supplies' specific acquisition quests.** Each supply-as-reward is a deferred design item, linked to a future chapter spec.
- **Mobile UX pass.** The deploy is live but mobile-specific layout/touch work is its own task.
- **Multi-NPC dialogue branching** beyond what's drafted here. Henwald's dialogue tree is small (3 choices); future content may expand it.

---

## 15. Open questions for the writing-plans pass

- **Note from Mother content-swap mechanism.** Two viable options: (a) two distinct items with a swap event at tornado-trigger, (b) one item with flag-aware flavor rendering (engine change). Plan picks the cleaner approach.
- **Tornado as a narrative interrupt vs. a forced location transition.** The interrupt prose could be a scene-divider + multi-line narration push in the log; or a forced auto-trigger of a "tornado_aftermath" narrative encounter. Either works; plan picks.
- **Anxious Allium location-encounter visibility.** The encounter is "optional" — it appears as an encounter button on the Back Field. Should it disappear after defeat (per the existing `defeated:<id>` mechanism — yes, it's non-repeatable)? Or fled (player can return later)? Plan defaults to "defeated → gone; fled → still there."
- **Animal-talk dialogue rendering.** Henwald speaks in dialogue choices with a `speaker: 'Henwald'` attribution. Should it use a different visual treatment (e.g., italics, a small chicken icon)? Plan defaults to "standard speaker attribution, no special treatment."

---

## 16. Acceptance criteria

The Ch 1 Farmhand pilot ships when:

1. Four new locations exist: `back_field`, `chicken_coop`, `old_well`, `family_kitchen` (or whatever ID convention the plan chooses).
2. Henwald is a clickable NPC encounter at the chicken coop, with the three-option dialogue tree, the post-victory reward dialogue, and the Foghorn-Leghorn voice intact.
3. The Officious Tax Rat is reframed (description, defeatedFlavor, monogram/footer details).
4. The Anxious Allium is a new monster with the specified stats and an optional combat encounter at the Back Field.
5. The Mother NPC is in the family_kitchen with the branching dialogue + pre-/post-tornado states.
6. The tornado beat fires after 3-of-4 spokes visited and pushes the interrupt prose + post-tornado state.
7. The Note from Mother has a context-aware display (pre-tornado vs post-tornado supplies list).
8. The Farm-Fresh Egg item is implemented (with the new ItemEffect.context flag) and Henwald awards 3 of them.
9. All 6 foreshadowing motifs are placed at the listed locations.
10. `narrative-spine.md` is updated with the 6 spine additions listed in §12.
11. The Tax Rat encounter at the chicken coop is hidden after `farmhand_tornado_fired` is set.
12. The existing test suite remains green; new tests are added covering:
    - Tornado beat fires after 3-of-4 spokes
    - Note from Mother content swaps post-tornado
    - Farm-Fresh Egg heals out of combat, deals damage in combat
    - Mother's animal-talk dialogue appears after `talked_to_henwald`
    - Tax Rat's monogram detail is in its description
    - Tax Rat encounter is hidden post-tornado

This is a substantial single-chapter pilot. Total estimated authoring: ~6-10 new files (locations + encounters + monster + item) + ~150-300 lines of narrative prose + small engine extension + ~10-15 tests.
