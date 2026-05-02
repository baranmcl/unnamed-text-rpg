# Class Openers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four placeholder/short opener narrative nodes with bespoke two-node Chapter 1 openers per class, each planting a class-specific flag and a discreet man-in-tweed cameo, then committing into the existing tutorial combat (or — for the Farmhand — into free play).

**Architecture:** Each opener becomes a two-node `NarrativeEncounter` (Engagement → Commitment). `StartNewGame` queues the class-specific encounter via `__pending_encounter` after `EnterLocation`; the existing `drainPendingEncounter` mechanism in `events.ts` picks it up. Per-class engagement resolvers plant a single canonical flag (`read_dismissal_notice`, `consulted_tome`, `tuned_lute`, `corked_jar`) and advance to Node B; commitment resolvers reuse the existing `open_with_pell` / `open_with_footnote` / `open_with_heckler` (Knight/Wizard/Bard) or a new `farmhand_to_back_field` terminator.

**Tech Stack:** TypeScript (strict), Svelte 5 runes, Vitest, jsdom.

## Spec Reference

[docs/superpowers/specs/2026-05-02-class-openers-design.md](../specs/2026-05-02-class-openers-design.md)

## File Structure

**Modified:**
- `src/engine/types.ts` — adds optional `openingEncounterId?: EncounterId` field to `CharacterClass`.
- `src/engine/events.ts` — `StartNewGame` queues opener encounter when set; `CLASS_OPENING_LINES` `ACT_LINE` removed.
- `src/content/classes/index.ts` — each class points `openingNarrativeNodeId` at the new Node A and sets `openingEncounterId` to its new encounter id.
- `src/content/narrative/openings.ts` — replaces the 4 `*_opening_short` placeholder/short nodes with 8 new nodes (`*_opener_a` and `*_opener_b` per class).
- `src/content/narrative/nodes.ts` — registers the 8 new nodes; drops the 4 short ones.
- `src/content/narrative/resolvers.ts` — adds 6 engagement resolvers (1 per non-Wizard class + 3 Wizard margins) and 1 farmhand-terminator resolver. Existing `open_with_pell` / `open_with_footnote` / `open_with_heckler` stay.
- `src/content/index.ts` — `validateContent` adds a check for `openingEncounterId` references.
- `src/engine/__tests__/state.test.ts` — `StartNewGame` assertions updated for the new opener flow.
- `src/engine/__tests__/quests.test.ts` — Farmhand quest tests walk past the opener.
- `src/__tests__/quests.e2e.test.ts` — Farmhand quest e2e walks past the opener.

**Created:**
- `src/content/encounters/openings.ts` — 4 `NarrativeEncounter` wrappers (one per class).
- `src/content/encounters/index.ts` — registers the 4 new encounters (this file already exists; we add to it).
- `src/engine/__tests__/openers.test.ts` — per-class unit tests on the opener flow.
- `src/__tests__/openers.e2e.test.ts` — per-class integration tests covering full flow.

---

## Task 1: Add `openingEncounterId` field; wire StartNewGame; drop ACT_LINE

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/events.ts`
- Modify: `src/engine/__tests__/state.test.ts`

This task introduces the type field, wires `StartNewGame` to queue an opener encounter conditionally, and cleans up the post-rename `ACT_LINE` text. After this task, no openers exist yet, so the wiring is a no-op for all four classes (their `openingEncounterId` is `undefined`). Existing `StartNewGame` behavior is preserved.

- [ ] **Step 1: Add the optional `openingEncounterId` field to `CharacterClass`**

In [src/engine/types.ts](src/engine/types.ts), find the `CharacterClass` type (around line 172-186) and add the new optional field:

```ts
export type CharacterClass = {
  id: ClassId;
  name: string;
  epithet: string;
  startingStats: StatBlock;
  baseHp: number;
  baseMp: number;
  startingItems: Array<{ itemId: ItemId; equipped?: boolean; qty?: number }>;
  signatureMove: SkillId;
  openingLocationId: LocationId;
  openingNarrativeNodeId: NarrativeNodeId;
  openingEncounterId?: EncounterId;  // NEW: triggers a NarrativeEncounter on StartNewGame when set
  hpLabel?: string;
  mpLabel?: string;
};
```

- [ ] **Step 2: Run the typecheck to confirm the type addition compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Update `StartNewGame` to queue the opener encounter conditionally; drop `ACT_LINE`**

In [src/engine/events.ts](src/engine/events.ts), make two changes:

a) Drop `ACT_LINE` from `CLASS_OPENING_LINES`. Around lines 42-65 the file currently looks like:

```ts
const ACT_LINE: OpeningLine = { kind: 'system', systemLabel: 'ACT', text: 'The Call to Adventure begins, more or less on schedule.' };

const CLASS_OPENING_LINES: Record<string, OpeningLine[]> = {
  reluctant_farmhand: [
    { kind: 'narration', text: 'You wake on a Tuesday, which is, statistically, when most prophecies arrive.' },
    { kind: 'narration', text: 'The cow regards you with the unfocused malice of a creature who has, against all odds, become aware of fate.' },
    ACT_LINE
  ],
  disgraced_knight: [
    { kind: 'narration', text: 'You wake at the wrong hour, which is, statistically, when most dismissals are pinned to boards.' },
    { kind: 'narration', text: 'The pell regards you with the unfocused disapproval of a post that has, against all odds, become aware of your specific failures.' },
    ACT_LINE
  ],
  accidental_wizard: [
    { kind: 'narration', text: 'You wake to a polite haze of smoke, which is, statistically, when most cantrips of warding go subtly wrong.' },
    { kind: 'narration', text: 'The tome regards you with the unfocused indignation of a book that has, against all odds, become aware of fire.' },
    ACT_LINE
  ],
  bard: [
    { kind: 'narration', text: 'You wake five minutes before curtain, which is, statistically, when most prophecies arrive.' },
    { kind: 'narration', text: 'The audience regards you, audibly, with the unfocused malice of a crowd that has, against all odds, become aware of vowels.' },
    ACT_LINE
  ]
};
```

Replace with:

```ts
const CLASS_OPENING_LINES: Record<string, OpeningLine[]> = {
  reluctant_farmhand: [
    { kind: 'narration', text: 'You wake on a Tuesday, which is, statistically, when most prophecies arrive.' },
    { kind: 'narration', text: 'The cow regards you with the unfocused malice of a creature who has, against all odds, become aware of fate.' }
  ],
  disgraced_knight: [
    { kind: 'narration', text: 'You wake at the wrong hour, which is, statistically, when most dismissals are pinned to boards.' },
    { kind: 'narration', text: 'The pell regards you with the unfocused disapproval of a post that has, against all odds, become aware of your specific failures.' }
  ],
  accidental_wizard: [
    { kind: 'narration', text: 'You wake to a polite haze of smoke, which is, statistically, when most cantrips of warding go subtly wrong.' },
    { kind: 'narration', text: 'The tome regards you with the unfocused indignation of a book that has, against all odds, become aware of fire.' }
  ],
  bard: [
    { kind: 'narration', text: 'You wake five minutes before curtain, which is, statistically, when most prophecies arrive.' },
    { kind: 'narration', text: 'The audience regards you, audibly, with the unfocused malice of a crowd that has, against all odds, become aware of vowels.' }
  ]
};
```

(The `ACT_LINE` constant declaration above is also removed since it's no longer referenced.)

b) Wire the opener encounter into `StartNewGame`. Find the `case 'StartNewGame':` block (around lines 111-162). The current return statement at line 161 looks like:

```ts
      return reduceInner(withOpening, { kind: 'EnterLocation', locationId: cls.openingLocationId, preserveLog: true });
```

Replace with:

```ts
      const afterEnter = reduceInner(withOpening, { kind: 'EnterLocation', locationId: cls.openingLocationId, preserveLog: true });
      // Queue the class's opener narrative encounter if one is registered; the
      // outer reduce()'s drainPendingEncounter will pick it up.
      if (cls.openingEncounterId && content.encounters[cls.openingEncounterId]) {
        return {
          ...afterEnter,
          world: {
            ...afterEnter.world,
            flags: { ...afterEnter.world.flags, __pending_encounter: cls.openingEncounterId }
          }
        };
      }
      return afterEnter;
    }
```

(Note: the closing brace on the last line is the existing `case 'StartNewGame':` block's closing brace; preserve the surrounding structure.)

- [ ] **Step 4: Update `state.test.ts` `'StartNewGame populates...'` assertion to allow the (currently empty) opener flow**

The test as it stands expects `combat === null` only implicitly (it doesn't assert combat null). Confirm the test in [src/engine/__tests__/state.test.ts](src/engine/__tests__/state.test.ts) lines 76-88 still passes by running the test:

Run: `npx vitest run src/engine/__tests__/state.test.ts`
Expected: PASS (all 11 tests).

If any test fails because combat is now non-null after `StartNewGame`, that's a sign the wiring is firing when it shouldn't (no class has `openingEncounterId` set yet). Inspect and fix.

- [ ] **Step 5: Run full test suite and typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 227 tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/events.ts
git commit -m "feat(openers): add openingEncounterId field and StartNewGame wiring (no-op until class-specific openers land)"
```

---

## Task 2: Knight opener — nodes, resolver, encounter, class wiring, tests

**Files:**
- Modify: `src/content/narrative/openings.ts`
- Modify: `src/content/narrative/nodes.ts`
- Modify: `src/content/narrative/resolvers.ts`
- Modify: `src/content/classes/index.ts`
- Modify: `src/content/encounters/index.ts`
- Create: `src/content/encounters/openings.ts`
- Create: `src/engine/__tests__/openers.test.ts`
- Create: `src/__tests__/openers.e2e.test.ts`

This task brings the Knight's bespoke opener fully online: two narrative nodes (`knight_opener_a`, `knight_opener_b`), an engagement resolver that plants `read_dismissal_notice`, a `NarrativeEncounter` wrapper, class-definition wiring, and unit + e2e tests.

- [ ] **Step 1: Write the unit test for the Knight opener flow**

Create [src/engine/__tests__/openers.test.ts](src/engine/__tests__/openers.test.ts) with:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../events';
import { createInitialState } from '../state';
import { ClassId, EncounterId, NarrativeNodeId } from '../types';

describe('Knight opener', () => {
  function startKnight() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'K', classId: ClassId('disgraced_knight') });
    return s;
  }

  it('starts in the Knight engagement node after StartNewGame', () => {
    const s = startKnight();
    expect(s.combat).not.toBeNull();
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('knight_opener_a'));
    }
  });

  it('engagement choice plants read_dismissal_notice and advances to Node B', () => {
    let s = startKnight();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.world.flags['read_dismissal_notice']).toBe(true);
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('knight_opener_b'));
    }
  });

  it('commitment choice triggers the Pell tutorial combat', () => {
    let s = startKnight();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // Engagement
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // Commitment
    expect(s.combat?.kind).toBe('turn-based');
    if (s.combat?.kind === 'turn-based') {
      expect(s.combat.encounterId).toBe(EncounterId('combat_insolent_pell'));
    }
  });

  it('Node A prose contains the tweed cameo phrase', () => {
    const s = startKnight();
    const lastEntry = s.log[s.log.length - 1];
    expect(lastEntry?.text).toMatch(/figure in tweed crosses the parade ground/);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run: `npx vitest run src/engine/__tests__/openers.test.ts`
Expected: FAIL — `knight_opener_a` does not exist; encounter wiring not in place.

- [ ] **Step 3: Author the Knight nodes in `openings.ts`**

In [src/content/narrative/openings.ts](src/content/narrative/openings.ts), replace the file's contents with (this is a full-file rewrite to drop the old `knight_opening_short` and add the new nodes; the other classes' nodes stay temporarily as `*_opening_short` and are replaced in later tasks):

```ts
import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

export const knight_opener_a: NarrativeNode = {
  id: NarrativeNodeId('knight_opener_a'),
  prose:
    'Dawn over the empty yard. Dust hangs where it has been kicked, an hour ago, by boots that were not yours. ' +
    'The pell stands in the middle of it, leaning slightly to starboard. On the duty board, the dismissal-notice. ' +
    'Wind tugs at one corner. The other three pins still hold. The yard at this hour is empty, mostly. ' +
    'A figure in tweed crosses the parade ground at the far edge, unhurried, and is gone before the dust settles. ' +
    'The pell, an old friend with no memory of you, has improved at being a pell. ' +
    'Whatever you did — and you cannot quite remember the specifics, only the volume of voices — it was sufficient. ' +
    'The notice itemises.',
  choices: [
    { label: 'Read the notice.', resolve: 'knight_opener_engage_notice' }
  ]
};

export const knight_opener_b: NarrativeNode = {
  id: NarrativeNodeId('knight_opener_b'),
  prose:
    'You read it. The notice is shorter than the noise it caused. ' +
    'You step away from the duty board. The pell waits.',
  choices: [
    { label: 'Take it out on the pell.', resolve: 'open_with_pell' }
  ]
};

// Wizard / Bard / Farmhand short nodes (placeholders) — replaced in Tasks 3-5.
export const wizard_opening_short: NarrativeNode = {
  id: NarrativeNodeId('wizard_opening_short'),
  prose:
    'Smoke describes lazy circles around the chandelier. Your tome is offering, in increasingly aggressive marginalia, ' +
    'three contradictory pieces of advice about lich-kings, itch-kings, and a third option you do not recognize. ' +
    'Something small and predatory has just detached from a citation and is now eyeing you.',
  choices: [
    { label: 'Address the footnote.', resolve: 'open_with_footnote' }
  ]
};

export const bard_opening_short: NarrativeNode = {
  id: NarrativeNodeId('bard_opening_short'),
  prose:
    'Five minutes to the curtain. Your lute is missing strings; your cloak is being ironic again. ' +
    'A heckler in the third row has been warming up since dawn and has, by now, achieved a kind of vowel-yoga ' +
    'that bodes badly for your opening number.',
  choices: [
    { label: 'Open with a dignity-restoration anthem.', resolve: 'open_with_heckler' }
  ]
};

export const farmhand_opening_short: NarrativeNode = {
  id: NarrativeNodeId('farmhand_opening_short'),
  prose: 'PLACEHOLDER — wired by Plan 5.',
  choices: []
};
```

- [ ] **Step 4: Add the Knight engagement resolver in `resolvers.ts`**

In [src/content/narrative/resolvers.ts](src/content/narrative/resolvers.ts), find the `narrativeResolvers` export (around lines 136-145). Add the new resolver between the existing resolver definitions and the export:

After the existing `hermit_dismiss` definition and before the `export const narrativeResolvers`, add:

```ts
const knight_opener_engage_notice: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, read_dismissal_notice: true } }
  },
  next: NarrativeNodeId('knight_opener_b')
});
```

Then update the `narrativeResolvers` export to include it:

```ts
export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  call_accept,
  call_refuse,
  call_insult,
  call_cry,
  open_with_pell,
  open_with_footnote,
  open_with_heckler,
  hermit_dismiss,
  knight_opener_engage_notice
};
```

- [ ] **Step 5: Update `nodes.ts` to register the new Knight nodes and drop the old short one**

In [src/content/narrative/nodes.ts](src/content/narrative/nodes.ts), update the import line (currently `import { knight_opening_short, wizard_opening_short, bard_opening_short, farmhand_opening_short } from './openings';`) and the registration to:

```ts
import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';
import { knight_opener_a, knight_opener_b, wizard_opening_short, bard_opening_short, farmhand_opening_short } from './openings';

const callRoot: NarrativeNode = {
  id: NarrativeNodeId('call_root'),
  speaker: 'Old Hermit',
  prose: '"You must be the Chosen One. Right on schedule for your Refusal of the Call."',
  choices: [
    { label: 'Accept Quest', resolve: 'call_accept' },
    { label: 'Refuse (traditional)', resolve: 'call_refuse' },
    {
      label: 'Insult Hat',
      resolve: 'call_insult',
      disabledIfFlag: 'insulted_hermit_hat',
      disabledTooltip: 'You have already insulted the hat.'
    },
    {
      label: 'Cry, Briefly',
      resolve: 'call_cry',
      disabledIfFlag: 'cried_at_hermit',
      disabledTooltip: 'You have already wept your share for now.'
    }
  ]
};

const hermitLingering: NarrativeNode = {
  id: NarrativeNodeId('hermit_lingering'),
  speaker: 'Old Hermit',
  prose:
    '"Still here? I would have thought heroes ran toward their fates, not paced about. ' +
    "Off you go, then. The road won't cross itself.\"",
  choices: [
    { label: '("Off I go, then.")', resolve: 'hermit_dismiss' }
  ]
};

export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot,
  [hermitLingering.id]: hermitLingering,
  [knight_opener_a.id]: knight_opener_a,
  [knight_opener_b.id]: knight_opener_b,
  [farmhand_opening_short.id]: farmhand_opening_short,
  [wizard_opening_short.id]: wizard_opening_short,
  [bard_opening_short.id]: bard_opening_short
};
```

- [ ] **Step 6: Create the Knight `NarrativeEncounter` wrapper**

Create [src/content/encounters/openings.ts](src/content/encounters/openings.ts):

```ts
import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const knight_opener_encounter: NarrativeEncounter = {
  id: EncounterId('knight_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('knight_opener_a'),
  noFlee: true
};

// Wizard / Bard / Farmhand opener encounters — added in Tasks 3-5.
```

- [ ] **Step 7: Register the new encounter in the encounters registry**

In [src/content/encounters/index.ts](src/content/encounters/index.ts), update the file to import and register `knight_opener_encounter`. The full updated file content:

```ts
import { type Encounter, type EncounterId } from '../../engine/types';
import { first_tax_rat } from './first_tax_rat';
import { practice_dummy } from './practice_dummy';
import { the_call } from './the_call';
import { insolent_pell } from './insolent_pell';
import { feral_footnote } from './feral_footnote';
import { pointed_heckler } from './pointed_heckler';
import { grievance_bursar } from './grievance_bursar';
import { errant_examiner } from './errant_examiner';
import { critic_with_notes } from './critic_with_notes';
import { hermit_lingering } from './hermit_lingering';
import { knight_opener_encounter } from './openings';

export const encounters: Record<EncounterId, Encounter> = {
  [first_tax_rat.id]: first_tax_rat,
  [practice_dummy.id]: practice_dummy,
  [the_call.id]: the_call,
  [insolent_pell.id]: insolent_pell,
  [feral_footnote.id]: feral_footnote,
  [pointed_heckler.id]: pointed_heckler,
  [grievance_bursar.id]: grievance_bursar,
  [errant_examiner.id]: errant_examiner,
  [critic_with_notes.id]: critic_with_notes,
  [hermit_lingering.id]: hermit_lingering,
  [knight_opener_encounter.id]: knight_opener_encounter
};
```

- [ ] **Step 8: Update the Knight class definition**

In [src/content/classes/index.ts](src/content/classes/index.ts), update the `disgraced_knight` block (lines 25-43). Change `openingNarrativeNodeId` to point at `knight_opener_a` and add `openingEncounterId`:

```ts
  [ClassId('disgraced_knight')]: {
    id: ClassId('disgraced_knight'),
    name: 'Disgraced Knight',
    epithet: 'the Disgraced Knight',
    startingStats: { brawn: 9, brains: 4, bravado: 7, bluck: 5 },
    baseHp: 40,
    baseMp: 8,
    startingItems: [
      { itemId: ItemId('nicked_longsword'), equipped: true },
      { itemId: ItemId('battered_half_plate'), equipped: true },
      { itemId: ItemId('defaced_family_crest') },
      { itemId: ItemId('hardtack') }
    ],
    signatureMove: SkillId('brute_force'),
    openingLocationId: LocationId('quartermasters_yard'),
    openingNarrativeNodeId: NarrativeNodeId('knight_opener_a'),
    openingEncounterId: EncounterId('knight_opener_encounter'),
    hpLabel: 'Honor',
    mpLabel: 'Discipline'
  },
```

You may need to add `EncounterId` to the imports at the top of `classes/index.ts`. The existing import line is:
```ts
import { ClassId, ItemId, LocationId, NarrativeNodeId, SkillId, type CharacterClass } from '../../engine/types';
```
Change to:
```ts
import { ClassId, EncounterId, ItemId, LocationId, NarrativeNodeId, SkillId, type CharacterClass } from '../../engine/types';
```

- [ ] **Step 9: Run the unit test — confirm it passes**

Run: `npx vitest run src/engine/__tests__/openers.test.ts`
Expected: 4 tests PASS for the Knight opener.

- [ ] **Step 10: Write the e2e test for the Knight flow**

Create [src/__tests__/openers.e2e.test.ts](src/__tests__/openers.e2e.test.ts):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../ui/store.svelte';
import { ClassId, EncounterId } from '../engine/types';

describe('openers e2e', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('Knight: full opener flow ends in Pell combat', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'K', classId: ClassId('disgraced_knight') });
    expect(gameStore.state.combat?.kind).toBe('narrative');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // engagement
    expect(gameStore.state.world.flags['read_dismissal_notice']).toBe(true);
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // commitment
    expect(gameStore.state.combat?.kind).toBe('turn-based');
    if (gameStore.state.combat?.kind === 'turn-based') {
      expect(gameStore.state.combat.encounterId).toBe(EncounterId('combat_insolent_pell'));
    }
  });
});
```

- [ ] **Step 11: Run the e2e test — confirm it passes**

Run: `npx vitest run src/__tests__/openers.e2e.test.ts`
Expected: 1 test PASS.

- [ ] **Step 12: Run full test suite and typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass (228 → 232 with the 4 new Knight tests + 1 e2e).

- [ ] **Step 13: Commit**

```bash
git add src/content/narrative/openings.ts src/content/narrative/nodes.ts src/content/narrative/resolvers.ts src/content/classes/index.ts src/content/encounters/openings.ts src/content/encounters/index.ts src/engine/__tests__/openers.test.ts src/__tests__/openers.e2e.test.ts
git commit -m "feat(openers): bespoke Knight opener with notice-engagement and Pell commitment"
```

---

## Task 3: Wizard opener — three-margin engagement

**Files:**
- Modify: `src/content/narrative/openings.ts`
- Modify: `src/content/narrative/nodes.ts`
- Modify: `src/content/narrative/resolvers.ts`
- Modify: `src/content/classes/index.ts`
- Modify: `src/content/encounters/openings.ts`
- Modify: `src/content/encounters/index.ts`
- Modify: `src/engine/__tests__/openers.test.ts`
- Modify: `src/__tests__/openers.e2e.test.ts`

The Wizard opener has three engagement choices (one per Tome margin); all three plant `consulted_tome = true` and a flavor flag `wizard_first_margin = 'a'|'b'|'c'`. Commitment reuses the existing `open_with_footnote` resolver.

- [ ] **Step 1: Add Wizard tests to `openers.test.ts`**

In [src/engine/__tests__/openers.test.ts](src/engine/__tests__/openers.test.ts), append after the existing `Knight opener` describe:

```ts
describe('Wizard opener', () => {
  function startWizard() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'W', classId: ClassId('accidental_wizard') });
    return s;
  }

  it('starts in the Wizard engagement node after StartNewGame', () => {
    const s = startWizard();
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('wizard_opener_a'));
    }
  });

  it.each([
    [0, 'a'],
    [1, 'b'],
    [2, 'c']
  ])('margin choice index %i plants wizard_first_margin = %s and consulted_tome', (idx, margin) => {
    let s = startWizard();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: idx });
    expect(s.world.flags['consulted_tome']).toBe(true);
    expect(s.world.flags['wizard_first_margin']).toBe(margin);
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('wizard_opener_b'));
    }
  });

  it('commitment choice triggers the Footnote tutorial combat', () => {
    let s = startWizard();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // Engagement (margin a)
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // Commitment
    expect(s.combat?.kind).toBe('turn-based');
    if (s.combat?.kind === 'turn-based') {
      expect(s.combat.encounterId).toBe(EncounterId('combat_feral_footnote'));
    }
  });

  it('Node A prose contains the librarian-with-unmarked-volume cameo', () => {
    const s = startWizard();
    const lastEntry = s.log[s.log.length - 1];
    expect(lastEntry?.text).toMatch(/junior librarian moves between stacks with a slim, unmarked volume/);
  });
});
```

- [ ] **Step 2: Run the new tests — confirm they fail**

Run: `npx vitest run src/engine/__tests__/openers.test.ts`
Expected: FAIL on the Wizard tests (`wizard_opener_a` does not exist yet).

- [ ] **Step 3: Author the Wizard nodes in `openings.ts`**

In [src/content/narrative/openings.ts](src/content/narrative/openings.ts), replace the `wizard_opening_short` export with:

```ts
export const wizard_opener_a: NarrativeNode = {
  id: NarrativeNodeId('wizard_opener_a'),
  prose:
    "The reading room's vaulted ceiling carries an even, contemplative haze of smoke. The smoke is being polite. " +
    'The fire — three rows over, may yet be reasoned with — is also being polite, for now. ' +
    'Your tome is open on the lectern. Three margins are arguing. The first cites a lich-king. ' +
    'The second cites an itch-king. The third cites something you do not recognise and would prefer not to. ' +
    'A junior librarian moves between stacks with a slim, unmarked volume; the spine does not match the catalog stamp. ' +
    'She does not look at you, or at the smoke. The cantrip-bell on her satchel does not ring. ' +
    'Something small and predatory has detached from a citation and is now eyeing you over the lectern\'s edge. ' +
    "The tome's three margins continue to argue, undeterred.",
  choices: [
    { label: 'Follow the lich-king margin.', resolve: 'wizard_opener_engage_a' },
    { label: 'Follow the itch-king margin.', resolve: 'wizard_opener_engage_b' },
    { label: 'Follow the third margin.', resolve: 'wizard_opener_engage_c' }
  ]
};

export const wizard_opener_b: NarrativeNode = {
  id: NarrativeNodeId('wizard_opener_b'),
  prose:
    'You follow the chosen line. The tome falls quiet, briefly. The footnote remains.',
  choices: [
    { label: 'Address the footnote.', resolve: 'open_with_footnote' }
  ]
};
```

- [ ] **Step 4: Add the three Wizard engagement resolvers in `resolvers.ts`**

In [src/content/narrative/resolvers.ts](src/content/narrative/resolvers.ts), after `knight_opener_engage_notice` and before the `narrativeResolvers` export, add:

```ts
const wizard_opener_engage_a: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, consulted_tome: true, wizard_first_margin: 'a' } }
  },
  next: NarrativeNodeId('wizard_opener_b')
});

const wizard_opener_engage_b: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, consulted_tome: true, wizard_first_margin: 'b' } }
  },
  next: NarrativeNodeId('wizard_opener_b')
});

const wizard_opener_engage_c: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, consulted_tome: true, wizard_first_margin: 'c' } }
  },
  next: NarrativeNodeId('wizard_opener_b')
});
```

Update the `narrativeResolvers` export:

```ts
export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  call_accept,
  call_refuse,
  call_insult,
  call_cry,
  open_with_pell,
  open_with_footnote,
  open_with_heckler,
  hermit_dismiss,
  knight_opener_engage_notice,
  wizard_opener_engage_a,
  wizard_opener_engage_b,
  wizard_opener_engage_c
};
```

- [ ] **Step 5: Update `nodes.ts` to swap `wizard_opening_short` for the new nodes**

In [src/content/narrative/nodes.ts](src/content/narrative/nodes.ts), update the import to swap `wizard_opening_short` for `wizard_opener_a, wizard_opener_b`:

```ts
import { knight_opener_a, knight_opener_b, wizard_opener_a, wizard_opener_b, bard_opening_short, farmhand_opening_short } from './openings';
```

Update the `narrativeNodes` registration:

```ts
export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot,
  [hermitLingering.id]: hermitLingering,
  [knight_opener_a.id]: knight_opener_a,
  [knight_opener_b.id]: knight_opener_b,
  [wizard_opener_a.id]: wizard_opener_a,
  [wizard_opener_b.id]: wizard_opener_b,
  [farmhand_opening_short.id]: farmhand_opening_short,
  [bard_opening_short.id]: bard_opening_short
};
```

- [ ] **Step 6: Add the Wizard encounter to `openings.ts`**

In [src/content/encounters/openings.ts](src/content/encounters/openings.ts), append:

```ts
export const wizard_opener_encounter: NarrativeEncounter = {
  id: EncounterId('wizard_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('wizard_opener_a'),
  noFlee: true
};
```

- [ ] **Step 7: Register the Wizard encounter in `encounters/index.ts`**

In [src/content/encounters/index.ts](src/content/encounters/index.ts), update the import line for openings to include `wizard_opener_encounter` and add it to the export:

Change the existing line:
```ts
import { knight_opener_encounter } from './openings';
```
to:
```ts
import { knight_opener_encounter, wizard_opener_encounter } from './openings';
```

And in the export object, add the new entry:
```ts
  [knight_opener_encounter.id]: knight_opener_encounter,
  [wizard_opener_encounter.id]: wizard_opener_encounter
```

- [ ] **Step 8: Update the Wizard class definition**

In [src/content/classes/index.ts](src/content/classes/index.ts), update the `accidental_wizard` block:

```ts
  [ClassId('accidental_wizard')]: {
    id: ClassId('accidental_wizard'),
    name: 'Accidental Wizard',
    epithet: 'the Accidental Wizard',
    startingStats: { brawn: 4, brains: 10, bravado: 5, bluck: 6 },
    baseHp: 22,
    baseMp: 20,
    startingItems: [
      { itemId: ItemId('cracked_staff'), equipped: true },
      { itemId: ItemId('long_robe'), equipped: true },
      { itemId: ItemId('questionable_tome') },
      { itemId: ItemId('hardtack') }
    ],
    signatureMove: SkillId('out_think_it'),
    openingLocationId: LocationId('burning_library'),
    openingNarrativeNodeId: NarrativeNodeId('wizard_opener_a'),
    openingEncounterId: EncounterId('wizard_opener_encounter'),
    hpLabel: 'Composure',
    mpLabel: 'Mana'
  },
```

- [ ] **Step 9: Run the unit tests — confirm they pass**

Run: `npx vitest run src/engine/__tests__/openers.test.ts`
Expected: all Knight + Wizard tests PASS (8 tests + the 3 it.each margin variants).

- [ ] **Step 10: Add a Wizard e2e test**

In [src/__tests__/openers.e2e.test.ts](src/__tests__/openers.e2e.test.ts), append:

```ts
  it('Wizard: full opener flow ends in Footnote combat', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'W', classId: ClassId('accidental_wizard') });
    expect(gameStore.state.combat?.kind).toBe('narrative');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 1 });  // margin b
    expect(gameStore.state.world.flags['consulted_tome']).toBe(true);
    expect(gameStore.state.world.flags['wizard_first_margin']).toBe('b');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // commitment
    expect(gameStore.state.combat?.kind).toBe('turn-based');
    if (gameStore.state.combat?.kind === 'turn-based') {
      expect(gameStore.state.combat.encounterId).toBe(EncounterId('combat_feral_footnote'));
    }
  });
```

- [ ] **Step 11: Run e2e tests — confirm pass**

Run: `npx vitest run src/__tests__/openers.e2e.test.ts`
Expected: 2 tests PASS (Knight + Wizard).

- [ ] **Step 12: Run full test suite and typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass.

- [ ] **Step 13: Commit**

```bash
git add src/content/narrative/openings.ts src/content/narrative/nodes.ts src/content/narrative/resolvers.ts src/content/classes/index.ts src/content/encounters/openings.ts src/content/encounters/index.ts src/engine/__tests__/openers.test.ts src/__tests__/openers.e2e.test.ts
git commit -m "feat(openers): bespoke Wizard opener with three-margin engagement and Footnote commitment"
```

---

## Task 4: Bard opener — single engagement, Heckler commitment

**Files:**
- Modify: `src/content/narrative/openings.ts`
- Modify: `src/content/narrative/nodes.ts`
- Modify: `src/content/narrative/resolvers.ts`
- Modify: `src/content/classes/index.ts`
- Modify: `src/content/encounters/openings.ts`
- Modify: `src/content/encounters/index.ts`
- Modify: `src/engine/__tests__/openers.test.ts`
- Modify: `src/__tests__/openers.e2e.test.ts`

- [ ] **Step 1: Add Bard tests to `openers.test.ts`**

Append:

```ts
describe('Bard opener', () => {
  function startBard() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'B', classId: ClassId('bard') });
    return s;
  }

  it('starts in the Bard engagement node after StartNewGame', () => {
    const s = startBard();
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('bard_opener_a'));
    }
  });

  it('engagement choice plants tuned_lute and advances to Node B', () => {
    let s = startBard();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.world.flags['tuned_lute']).toBe(true);
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('bard_opener_b'));
    }
  });

  it('commitment choice triggers the Heckler tutorial combat', () => {
    let s = startBard();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.combat?.kind).toBe('turn-based');
    if (s.combat?.kind === 'turn-based') {
      expect(s.combat.encounterId).toBe(EncounterId('combat_pointed_heckler'));
    }
  });

  it('Node A prose contains the man-in-tweed-front-row cameo', () => {
    const s = startBard();
    const lastEntry = s.log[s.log.length - 1];
    expect(lastEntry?.text).toMatch(/A man in tweed sits there, taking notes/);
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npx vitest run src/engine/__tests__/openers.test.ts`
Expected: FAIL on Bard tests.

- [ ] **Step 3: Author the Bard nodes in `openings.ts`**

In [src/content/narrative/openings.ts](src/content/narrative/openings.ts), replace the `bard_opening_short` export with:

```ts
export const bard_opener_a: NarrativeNode = {
  id: NarrativeNodeId('bard_opener_a'),
  prose:
    'Five minutes to curtain. The back room of the Wretched Pheasant smells like spilled mead, candlewax, and ambition. ' +
    'One of those vowels is yours. Your lute is missing a string. Your cloak is being ironic again. ' +
    'The audience, audible through three layers of pine, is exercising its consonants. ' +
    'Through a thumbnail-sized gap in the curtain you can see the front row. ' +
    'A man in tweed sits there, taking notes in a book that is not yours, and does not look up. ' +
    'A heckler in the third row has been warming up since dawn and has, by now, achieved a kind of vowel-yoga ' +
    'that bodes badly for your opening number. You have ten minutes. You have two minutes. ' +
    'Time is doing what time does to a Bard.',
  choices: [
    { label: 'Tune the lute.', resolve: 'bard_opener_engage_lute' }
  ]
};

export const bard_opener_b: NarrativeNode = {
  id: NarrativeNodeId('bard_opener_b'),
  prose:
    'The lute holds. The cloak settles. The curtain twitches. ' +
    'You step toward the stage. The heckler is, you note, already standing.',
  choices: [
    { label: 'Open with a dignity-restoration anthem.', resolve: 'open_with_heckler' }
  ]
};
```

- [ ] **Step 4: Add the Bard engagement resolver**

In [src/content/narrative/resolvers.ts](src/content/narrative/resolvers.ts), after the Wizard resolvers, add:

```ts
const bard_opener_engage_lute: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, tuned_lute: true } }
  },
  next: NarrativeNodeId('bard_opener_b')
});
```

Update the `narrativeResolvers` export to include the new resolver:

```ts
export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  call_accept,
  call_refuse,
  call_insult,
  call_cry,
  open_with_pell,
  open_with_footnote,
  open_with_heckler,
  hermit_dismiss,
  knight_opener_engage_notice,
  wizard_opener_engage_a,
  wizard_opener_engage_b,
  wizard_opener_engage_c,
  bard_opener_engage_lute
};
```

- [ ] **Step 5: Update `nodes.ts` to swap `bard_opening_short` for the new nodes**

In [src/content/narrative/nodes.ts](src/content/narrative/nodes.ts), update the import:

```ts
import { knight_opener_a, knight_opener_b, wizard_opener_a, wizard_opener_b, bard_opener_a, bard_opener_b, farmhand_opening_short } from './openings';
```

Update `narrativeNodes`:

```ts
export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot,
  [hermitLingering.id]: hermitLingering,
  [knight_opener_a.id]: knight_opener_a,
  [knight_opener_b.id]: knight_opener_b,
  [wizard_opener_a.id]: wizard_opener_a,
  [wizard_opener_b.id]: wizard_opener_b,
  [bard_opener_a.id]: bard_opener_a,
  [bard_opener_b.id]: bard_opener_b,
  [farmhand_opening_short.id]: farmhand_opening_short
};
```

- [ ] **Step 6: Add the Bard encounter to `openings.ts`**

In [src/content/encounters/openings.ts](src/content/encounters/openings.ts), append:

```ts
export const bard_opener_encounter: NarrativeEncounter = {
  id: EncounterId('bard_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('bard_opener_a'),
  noFlee: true
};
```

- [ ] **Step 7: Register Bard encounter in `encounters/index.ts`**

Change the existing imports line:
```ts
import { knight_opener_encounter, wizard_opener_encounter } from './openings';
```
to:
```ts
import { knight_opener_encounter, wizard_opener_encounter, bard_opener_encounter } from './openings';
```

And add to the export object:
```ts
  [bard_opener_encounter.id]: bard_opener_encounter
```

- [ ] **Step 8: Update the Bard class definition**

In [src/content/classes/index.ts](src/content/classes/index.ts), update the `bard` block:

```ts
  [ClassId('bard')]: {
    id: ClassId('bard'),
    name: "Bard Who Didn't Ask For This",
    epithet: "the Bard Who Didn't Ask For This",
    startingStats: { brawn: 5, brains: 7, bravado: 9, bluck: 4 },
    baseHp: 28,
    baseMp: 14,
    startingItems: [
      { itemId: ItemId('dented_lute'), equipped: true },
      { itemId: ItemId('dramatic_cloak'), equipped: true },
      { itemId: ItemId('audience_expectation') },
      { itemId: ItemId('hardtack') }
    ],
    signatureMove: SkillId('swagger'),
    openingLocationId: LocationId('tavern_dressing_room'),
    openingNarrativeNodeId: NarrativeNodeId('bard_opener_a'),
    openingEncounterId: EncounterId('bard_opener_encounter'),
    hpLabel: 'Confidence',
    mpLabel: 'Vibes'
  }
```

- [ ] **Step 9: Run unit tests — confirm pass**

Run: `npx vitest run src/engine/__tests__/openers.test.ts`
Expected: all Knight + Wizard + Bard tests PASS.

- [ ] **Step 10: Add a Bard e2e test**

Append to [src/__tests__/openers.e2e.test.ts](src/__tests__/openers.e2e.test.ts):

```ts
  it('Bard: full opener flow ends in Heckler combat', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'B', classId: ClassId('bard') });
    expect(gameStore.state.combat?.kind).toBe('narrative');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.world.flags['tuned_lute']).toBe(true);
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.combat?.kind).toBe('turn-based');
    if (gameStore.state.combat?.kind === 'turn-based') {
      expect(gameStore.state.combat.encounterId).toBe(EncounterId('combat_pointed_heckler'));
    }
  });
```

- [ ] **Step 11: Run e2e tests — confirm pass**

Run: `npx vitest run src/__tests__/openers.e2e.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 12: Run full test suite and typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass.

- [ ] **Step 13: Commit**

```bash
git add src/content/narrative/openings.ts src/content/narrative/nodes.ts src/content/narrative/resolvers.ts src/content/classes/index.ts src/content/encounters/openings.ts src/content/encounters/index.ts src/engine/__tests__/openers.test.ts src/__tests__/openers.e2e.test.ts
git commit -m "feat(openers): bespoke Bard opener with lute-tuning engagement and Heckler commitment"
```

---

## Task 5: Farmhand opener — terminator pattern; fix existing tests

**Files:**
- Modify: `src/content/narrative/openings.ts`
- Modify: `src/content/narrative/nodes.ts`
- Modify: `src/content/narrative/resolvers.ts`
- Modify: `src/content/classes/index.ts`
- Modify: `src/content/encounters/openings.ts`
- Modify: `src/content/encounters/index.ts`
- Modify: `src/engine/__tests__/openers.test.ts`
- Modify: `src/__tests__/openers.e2e.test.ts`
- Modify: `src/engine/__tests__/state.test.ts`
- Modify: `src/engine/__tests__/quests.test.ts`
- Modify: `src/__tests__/quests.e2e.test.ts`

The Farmhand opener differs from the others: its commitment terminates the encounter (no `__pending_encounter`), allowing the existing beat system to spawn the Tax Rat on first back-field encounter. Most existing Farmhand-using tests will break in this task — they need a helper to walk past the opener.

- [ ] **Step 1: Add Farmhand tests to `openers.test.ts`**

Append:

```ts
describe('Farmhand opener', () => {
  function startFarmhand() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'F', classId: ClassId('reluctant_farmhand') });
    return s;
  }

  it('starts in the Farmhand engagement node after StartNewGame', () => {
    const s = startFarmhand();
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('farmhand_opener_a'));
    }
  });

  it('engagement choice plants corked_jar and advances to Node B', () => {
    let s = startFarmhand();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.world.flags['corked_jar']).toBe(true);
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('farmhand_opener_b'));
    }
  });

  it('commitment choice terminates the encounter (no combat queued)', () => {
    let s = startFarmhand();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.combat).toBeNull();
    expect(s.world.flags['__pending_encounter']).toBeUndefined();
  });

  it('Node A prose contains the figure-in-tweed-down-the-lane cameo', () => {
    const s = startFarmhand();
    const lastEntry = s.log[s.log.length - 1];
    expect(lastEntry?.text).toMatch(/figure in tweed passes the farm/);
  });
});
```

- [ ] **Step 2: Confirm Farmhand tests fail**

Run: `npx vitest run src/engine/__tests__/openers.test.ts`
Expected: FAIL on Farmhand tests.

- [ ] **Step 3: Author the Farmhand nodes in `openings.ts`**

In [src/content/narrative/openings.ts](src/content/narrative/openings.ts), replace the `farmhand_opening_short` export with:

```ts
export const farmhand_opener_a: NarrativeNode = {
  id: NarrativeNodeId('farmhand_opener_a'),
  prose:
    'You wake on a Tuesday, which is, statistically, when most prophecies arrive. ' +
    'The kettle is already on. The chickens are already disappointed. ' +
    "On the windowsill: a jar of last year's preserves, dust on the lid, a hand-written label peeling at one corner. " +
    'The back field, un-weeded for a week, calls in the wordless way fields call. ' +
    'Down the lane, a figure in tweed passes the farm without slowing. He glances once at the kitchen window. He keeps walking. ' +
    'The cow, in the near pasture, regards you with the unfocused malice of a creature who has, against all odds, become aware of fate. ' +
    'Whatever the day intends, it has chosen not to ask. You stand at the kitchen window. ' +
    'The jar is small enough to fit in a pocket.',
  choices: [
    { label: 'Take the jar from the windowsill.', resolve: 'farmhand_opener_engage_jar' }
  ]
};

export const farmhand_opener_b: NarrativeNode = {
  id: NarrativeNodeId('farmhand_opener_b'),
  prose:
    'The jar fits. The lid is firm. You step out the kitchen door and the back field opens before you. ' +
    'The cow does not turn. The chickens continue to be disappointed.',
  choices: [
    { label: 'Walk to the back field.', resolve: 'farmhand_to_back_field' }
  ]
};
```

- [ ] **Step 4: Add Farmhand engagement and terminator resolvers**

In [src/content/narrative/resolvers.ts](src/content/narrative/resolvers.ts), after the Bard resolver, add:

```ts
const farmhand_opener_engage_jar: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, corked_jar: true } }
  },
  next: NarrativeNodeId('farmhand_opener_b')
});

const farmhand_to_back_field: NarrativeResolver = (state) => ({
  state,
  next: null
});
```

Update the `narrativeResolvers` export to include both new resolvers:

```ts
export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  call_accept,
  call_refuse,
  call_insult,
  call_cry,
  open_with_pell,
  open_with_footnote,
  open_with_heckler,
  hermit_dismiss,
  knight_opener_engage_notice,
  wizard_opener_engage_a,
  wizard_opener_engage_b,
  wizard_opener_engage_c,
  bard_opener_engage_lute,
  farmhand_opener_engage_jar,
  farmhand_to_back_field
};
```

- [ ] **Step 5: Update `nodes.ts` to swap `farmhand_opening_short` for the new nodes**

In [src/content/narrative/nodes.ts](src/content/narrative/nodes.ts), update the import:

```ts
import { knight_opener_a, knight_opener_b, wizard_opener_a, wizard_opener_b, bard_opener_a, bard_opener_b, farmhand_opener_a, farmhand_opener_b } from './openings';
```

Update `narrativeNodes`:

```ts
export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot,
  [hermitLingering.id]: hermitLingering,
  [knight_opener_a.id]: knight_opener_a,
  [knight_opener_b.id]: knight_opener_b,
  [wizard_opener_a.id]: wizard_opener_a,
  [wizard_opener_b.id]: wizard_opener_b,
  [bard_opener_a.id]: bard_opener_a,
  [bard_opener_b.id]: bard_opener_b,
  [farmhand_opener_a.id]: farmhand_opener_a,
  [farmhand_opener_b.id]: farmhand_opener_b
};
```

- [ ] **Step 6: Add Farmhand encounter to `openings.ts`**

In [src/content/encounters/openings.ts](src/content/encounters/openings.ts), append:

```ts
export const farmhand_opener_encounter: NarrativeEncounter = {
  id: EncounterId('farmhand_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('farmhand_opener_a'),
  noFlee: true
};
```

- [ ] **Step 7: Register Farmhand encounter in `encounters/index.ts`**

Change the existing imports line:
```ts
import { knight_opener_encounter, wizard_opener_encounter, bard_opener_encounter } from './openings';
```
to:
```ts
import { knight_opener_encounter, wizard_opener_encounter, bard_opener_encounter, farmhand_opener_encounter } from './openings';
```

And add to the export object:
```ts
  [farmhand_opener_encounter.id]: farmhand_opener_encounter
```

- [ ] **Step 8: Update the Farmhand class definition**

In [src/content/classes/index.ts](src/content/classes/index.ts), update the `reluctant_farmhand` block:

```ts
  [ClassId('reluctant_farmhand')]: {
    id: ClassId('reluctant_farmhand'),
    name: 'Reluctant Farmhand',
    epithet: 'the Reluctant Farmhand',
    startingStats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
    baseHp: 30,
    baseMp: 10,
    startingItems: [
      { itemId: ItemId('rusty_pitchfork'), equipped: true },
      { itemId: ItemId('itchy_wool_tunic'), equipped: true },
      { itemId: ItemId('note_from_mother') },
      { itemId: ItemId('hardtack') }
    ],
    signatureMove: SkillId('tempt_fate'),
    openingLocationId: LocationId('family_farm'),
    openingNarrativeNodeId: NarrativeNodeId('farmhand_opener_a'),
    openingEncounterId: EncounterId('farmhand_opener_encounter'),
    hpLabel: 'Pluck',
    mpLabel: 'Wits'
  },
```

- [ ] **Step 9: Run the openers unit tests — confirm pass**

Run: `npx vitest run src/engine/__tests__/openers.test.ts`
Expected: all opener tests PASS.

- [ ] **Step 10: Run the full test suite — confirm Farmhand-using tests fail**

Run: `npx vitest run`
Expected: FAIL — tests in `state.test.ts`, `quests.test.ts`, `quests.e2e.test.ts` that use `reluctant_farmhand` and expect immediate free play after `StartNewGame` will fail because the opener is now active.

- [ ] **Step 11: Add a helper to skip the Farmhand opener in `state.test.ts`**

Most failing tests in `state.test.ts` use `reluctant_farmhand` and expect post-StartNewGame state to be ready for combat triggers. The fix is a small helper that walks the opener: engagement → commitment.

In [src/engine/__tests__/state.test.ts](src/engine/__tests__/state.test.ts), at the top of the file (after the imports), add:

```ts
function skipFarmhandOpener(s: GameState): GameState {
  let next = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // engagement
  next = reduce(next, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // commitment
  return next;
}
```

You'll need to import `GameState`. Update the existing import:

```ts
import { ClassId, ItemId, LocationId, EncounterId, type GameState } from '../types';
import type { TurnBasedCombatState } from '../types';
```

(Combine the two type imports if convenient.)

Now update the failing tests to call `skipFarmhandOpener` after `StartNewGame`. The four affected tests in `state.test.ts` that use `disgraced_knight` are unchanged (Knight has its own opener now too, but those tests don't trigger combat). The five failing tests likely use `reluctant_farmhand`. Walk through them:

- `'StartNewGame populates character from class definition and emits opening log'` — currently uses `reluctant_farmhand`. The test asserts character data; combat being non-null after `StartNewGame` doesn't break those assertions. **Should still pass without changes.** Verify.
- `'EnterLocation updates currentLocation and adds to visited'` — uses `reluctant_farmhand`, then calls `EnterLocation`. With the opener active (combat is narrative), the `EnterLocation` call may behave differently. Add `s = skipFarmhandOpener(s);` immediately after the `StartNewGame` line, before `EnterLocation`.
- `'EquipItem moves an inventory item into a slot'` — same. Add the helper call.
- `'TriggerEncounter starts combat with the encounter\'s monster'` — uses `reluctant_farmhand`, then `TriggerEncounter`. Add the helper call.
- `'AttackTarget reduces enemy hp (sometimes — try several)'` — same. Add the helper call.

Apply the helper in each test where appropriate. After:

```ts
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
```

add:

```ts
    s = skipFarmhandOpener(s);
```

- [ ] **Step 12: Run state.test.ts — confirm pass**

Run: `npx vitest run src/engine/__tests__/state.test.ts`
Expected: 11 tests PASS.

- [ ] **Step 13: Add the same helper to `quests.test.ts`**

In [src/engine/__tests__/quests.test.ts](src/engine/__tests__/quests.test.ts), add the helper:

```ts
function skipFarmhandOpener(s: GameState): GameState {
  let next = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
  next = reduce(next, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
  return next;
}
```

(Add `type GameState` to the imports if not already present.)

The `withCharacter` helper currently looks like:
```ts
function withCharacter() {
  let s = createInitialState(1);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
  return s;
}
```

Update to:
```ts
function withCharacter() {
  let s = createInitialState(1);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
  s = skipFarmhandOpener(s);
  return s;
}
```

The other `withCharacter` definition lower in the file (in the `'checkQuests integration via reduce'` describe block) needs the same update.

- [ ] **Step 14: Run quests.test.ts — confirm pass**

Run: `npx vitest run src/engine/__tests__/quests.test.ts`
Expected: 13 tests PASS.

- [ ] **Step 15: Update `quests.e2e.test.ts` to skip the opener**

The store-level test does `gameStore.dispatch({ kind: 'StartNewGame', ... })` then expects the quest is active. We need to walk the opener after StartNewGame.

In [src/__tests__/quests.e2e.test.ts](src/__tests__/quests.e2e.test.ts), within the `'farmhand full Chapter 1 run completes answer_the_call with rewards'` test, after the `StartNewGame` dispatch, add two `ChooseNarrativeOption` dispatches:

Find:
```ts
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });

    // Quest activated immediately on game start.
    expect(gameStore.state.story.activeQuests).toContain('answer_the_call');
```

Replace with:
```ts
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    // Walk past the bespoke opener (engagement → commitment terminates).
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });

    // Quest activated immediately on game start.
    expect(gameStore.state.story.activeQuests).toContain('answer_the_call');
```

Apply the same pattern to the other two tests in the file (`'Consign this tale to the flames wipes...'` and `'Forget thy deeds leaves quest state intact'`):

For `'Consign this tale...'`, after `StartNewGame`:
```ts
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.story.activeQuests).toContain('answer_the_call');
```

For `'Forget thy deeds...'`, same pattern.

- [ ] **Step 16: Run quests.e2e.test.ts — confirm pass**

Run: `npx vitest run src/__tests__/quests.e2e.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 17: Add a Farmhand e2e test for the opener flow itself**

In [src/__tests__/openers.e2e.test.ts](src/__tests__/openers.e2e.test.ts), append:

```ts
  it('Farmhand: full opener flow ends in free play (no tutorial combat)', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'F', classId: ClassId('reluctant_farmhand') });
    expect(gameStore.state.combat?.kind).toBe('narrative');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.world.flags['corked_jar']).toBe(true);
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.combat).toBeNull();
  });
```

- [ ] **Step 18: Run all opener tests — confirm pass**

Run: `npx vitest run src/engine/__tests__/openers.test.ts src/__tests__/openers.e2e.test.ts`
Expected: all opener tests PASS.

- [ ] **Step 19: Run the full test suite and typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass.

- [ ] **Step 20: Commit**

```bash
git add src/content/narrative/openings.ts src/content/narrative/nodes.ts src/content/narrative/resolvers.ts src/content/classes/index.ts src/content/encounters/openings.ts src/content/encounters/index.ts src/engine/__tests__/openers.test.ts src/__tests__/openers.e2e.test.ts src/engine/__tests__/state.test.ts src/engine/__tests__/quests.test.ts src/__tests__/quests.e2e.test.ts
git commit -m "feat(openers): bespoke Farmhand opener (terminator pattern); update existing tests"
```

---

## Task 6: validateContent check for `openingEncounterId`

**Files:**
- Modify: `src/content/index.ts`

Adds the validation that `openingEncounterId`, when set on a class, references a real entry in `content.encounters`. After Tasks 2-5 all four classes have valid encounter ids, so the check passes.

- [ ] **Step 1: Add the validation**

In [src/content/index.ts](src/content/index.ts), find the class validation block (around lines 84-100). Update it to also validate `openingEncounterId`:

```ts
  // Every class must reference a real opening location and have valid starting items.
  for (const cls of Object.values(content.classes)) {
    if (!(cls.openingLocationId in content.locations)) {
      errors.push(`Class ${cls.id} openingLocationId references unknown ${cls.openingLocationId}.`);
    }
    if (!(cls.signatureMove in content.skills)) {
      errors.push(`Class ${cls.id} signatureMove references unknown skill ${cls.signatureMove}.`);
    }
    if (!(cls.openingNarrativeNodeId in content.narrativeNodes)) {
      errors.push(`Class ${cls.id} openingNarrativeNodeId references unknown ${cls.openingNarrativeNodeId}.`);
    }
    if (cls.openingEncounterId && !(cls.openingEncounterId in content.encounters)) {
      errors.push(`Class ${cls.id} openingEncounterId references unknown ${cls.openingEncounterId}.`);
    }
    for (const startItem of cls.startingItems) {
      if (!(startItem.itemId in content.items)) {
        errors.push(`Class ${cls.id} startingItems references unknown ${startItem.itemId}.`);
      }
    }
  }
```

- [ ] **Step 2: Run the content validation test — confirm it passes**

Run: `npx vitest run src/content/__tests__/validate.test.ts`
Expected: 2 tests PASS (no validation errors).

- [ ] **Step 3: Run the full test suite and typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass.

- [ ] **Step 4: Sanity-check the dev server**

Run: `npm run dev` (in a separate terminal). Open the game, pick each class one at a time, walk through the opener, and confirm no console errors. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/content/index.ts
git commit -m "feat(openers): validateContent checks openingEncounterId references"
```

---

## Self-Review

After writing this plan, the following spec coverage check applies:

| Spec section | Plan task |
|---|---|
| Replace `*_opening_short` placeholders | Tasks 2-5 |
| Wire `StartNewGame` to trigger opener | Task 1 |
| Drop `ACT_LINE` from `CLASS_OPENING_LINES` | Task 1 |
| Two-node openers (Engagement + Commitment) | Tasks 2-5 |
| Single-flag policy + Wizard flavor flags | Tasks 2 (Knight), 3 (Wizard), 4 (Bard), 5 (Farmhand) |
| Tutorial combats reused (Pell/Footnote/Heckler) | Tasks 2, 3, 4 |
| Farmhand asymmetry (no tutorial combat) | Task 5 |
| Tweed cameo per opener (subtlety rules) | Tasks 2-5 (cameo regex assertion in unit tests) |
| `openingEncounterId` field added to type | Task 1 |
| `validateContent` for `openingEncounterId` | Task 6 |
| Update existing failing tests | Task 5 (Farmhand causes the breakage) |
| Per-class unit + e2e tests | Tasks 2-5 |

All spec sections covered. No placeholders. Type names consistent across tasks (`openingEncounterId`, `*_opener_a`, `*_opener_b`, `read_dismissal_notice`, `consulted_tome`, `wizard_first_margin`, `tuned_lute`, `corked_jar`, `farmhand_to_back_field`).
