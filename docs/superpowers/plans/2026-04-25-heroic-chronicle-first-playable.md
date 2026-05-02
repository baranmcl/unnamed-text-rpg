# The Heroic Chronicle — First Playable (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Plan 1 shell into something playable. By the end, a fresh save shows character creation; the player picks a name, picks the Reluctant Farmhand (the other three classes are disabled), reads a short opening scene, lands on the Family Farm, can inspect items, equip/unequip, click "Confront the rat" to enter combat, fight the Officious Tax Rat with Attack/Item/Flee (Skill button visible but disabled), win or lose, and have the entire session resume from save on reload.

**Architecture:** Extends the Plan 1 engine. New content registries (`src/content/`) are loaded at startup. New events extend the existing reducer. Combat is a self-contained sub-reducer in `src/engine/combat.ts` operating on `state.combat`. UI gains a `CharacterCreation` route, an `InspectModal`, and contextual button bars in `WorldPanel` driven by `state.combat ? 'combat' : 'exploration'`.

**Tech Stack:** Same as Plan 1 (Svelte 5 Runes, TypeScript, Vite, vitest). No new runtime dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-24-text-rpg-design.md`. This plan implements §3.3 turn-based combat, §3.4–3.6 stats/classes (one class), §3.7 character progression (basic — XP gain on combat win), §5 content system (one location, one monster, one encounter, one class, four items), §6.4 button bar (full), §6.5 inventory click → InspectModal. Story beats, narrative-choice combat, signature moves, additional classes, additional locations, set-piece animations, and the map modal stay deferred.

**Confirmed scope decisions** (from brainstorm before this plan):
- Character creation: single screen, name input + 4 class cards (3 disabled with "Coming in Plan 4" tooltip).
- Farmhand opening scene: short — 3–5 log entries (~30 sec). The full ~5-min scene + other three openings authored together in Plan 5.
- First combat: triggered by an explicit "Confront the rat" button on the Family Farm location. No auto-trigger on entry.
- Skill button: visible but disabled in this plan, with tooltip "Skills unlock at Level 3" — sets player expectation.

---

## File map

**New engine modules:**
- `src/engine/combat.ts` — combat math + sub-reducer
- `src/engine/__tests__/combat.test.ts`

**New content modules:**
- `src/content/index.ts` — aggregate registries + validation pass
- `src/content/items/index.ts` — Rusty Pitchfork, Itchy Wool Tunic, Note from Mother, Hardtack
- `src/content/monsters/officious_tax_rat.ts`
- `src/content/encounters/tax_rat.ts`
- `src/content/locations/family_farm.ts`
- `src/content/classes/reluctant_farmhand.ts`
- `src/content/skills/index.ts` — SkillId constants + display metadata for the disabled Skill button
- `src/content/__tests__/validate.test.ts`

**Modified engine modules:**
- `src/engine/types.ts` — add `Skill` type, `Encounter` discriminated union, `CombatLogEntry` helper types
- `src/engine/state.ts` — replace `createDemoState` with `createInitialState`-based setup; remove demo character (it gets cleared when creation lands); add `applyClassToState` helper
- `src/engine/events.ts` — extend `GameEvent` union with new events; extend `reduce` switch
- `src/engine/__tests__/state.test.ts` — extend with new event tests

**New UI modules:**
- `src/ui/CharacterCreation.svelte` — name + class selection screen
- `src/ui/InspectModal.svelte` — item inspection + actions
- `src/ui/__tests__/CharacterCreation.test.ts`
- `src/ui/__tests__/InspectModal.test.ts`

**Modified UI modules:**
- `src/ui/App.svelte` — route between CharacterCreation and game shell based on `character.name`
- `src/ui/WorldPanel.svelte` — replace button-bar placeholder with contextual (exploration / combat) button bar
- `src/ui/CharacterPanel.svelte` — read epithet from class registry; wire inventory clicks to InspectModal
- `src/ui/store.svelte.ts` — store now exposes the InspectModal open/close state (or InspectModal is wired through PageTools-style local state)

---

## Task 1: Content type extensions and skill stubs

**Files:**
- Modify: `src/engine/types.ts`

Add types Plan 2 needs that aren't in Plan 1's vocabulary: `Skill`, `Encounter` as a discriminated union, helpers for combat output.

- [ ] **Step 1: Append to `src/engine/types.ts`**

After the existing `CharacterClass` definition, append:

```ts
// =====================================================================
// Skills
// =====================================================================

export type Skill = {
  id: SkillId;
  name: string;                  // "Tempt Fate"
  description: string;           // tooltip text
  mpCost: number;
  scalingStat: keyof StatBlock;  // 'bluck'
  unlockLevel: number;           // 3 in v1
};

// =====================================================================
// Encounters
// =====================================================================

export type CombatEncounter = {
  id: EncounterId;
  kind: 'combat';
  monsterId: MonsterId;
  noFlee?: boolean;
  xpReward: number;
};

// Narrative encounters land in Plan 3.
export type Encounter = CombatEncounter;

// =====================================================================
// Combat helpers
// =====================================================================

export type CombatActionResult = {
  hit: boolean;
  crit: boolean;
  damage: number;
};
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/types.ts
git commit -m "Extend engine types with Skill, Encounter, CombatActionResult"
```

---

## Task 2: Content registry skeleton + validation

**Files:**
- Create: `src/content/index.ts`
- Create: `src/content/__tests__/validate.test.ts`

The aggregate registry. Imports from per-content-type files (which we author in subsequent tasks). Validates references at app startup. v1 throws on validation failure in dev, warns in prod.

- [ ] **Step 1: Write the failing test**

Create `src/content/__tests__/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { content, validateContent } from '../index';

describe('content registry', () => {
  it('exports non-empty registries for items, monsters, encounters, locations, classes, skills', () => {
    expect(Object.keys(content.items).length).toBeGreaterThan(0);
    expect(Object.keys(content.monsters).length).toBeGreaterThan(0);
    expect(Object.keys(content.encounters).length).toBeGreaterThan(0);
    expect(Object.keys(content.locations).length).toBeGreaterThan(0);
    expect(Object.keys(content.classes).length).toBeGreaterThan(0);
    expect(Object.keys(content.skills).length).toBeGreaterThan(0);
  });

  it('passes validation', () => {
    expect(() => validateContent()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test (should fail with module not found)**

```bash
npm run test -- validate
```

Expected: fail.

- [ ] **Step 3: Implement `src/content/index.ts` (registry skeleton)**

```ts
import type {
  CharacterClass, ClassId,
  Encounter, EncounterId,
  Item, ItemId,
  Location, LocationId,
  Monster, MonsterId,
  Skill, SkillId
} from '../engine/types';

// Each per-type file exports a single object literal keyed by id.
// We re-export them aggregated here for the engine to consume.

import { items } from './items';
import { monsters } from './monsters';
import { encounters } from './encounters';
import { locations } from './locations';
import { classes } from './classes';
import { skills } from './skills';

export const content = {
  items: items as Record<ItemId, Item>,
  monsters: monsters as Record<MonsterId, Monster>,
  encounters: encounters as Record<EncounterId, Encounter>,
  locations: locations as Record<LocationId, Location>,
  classes: classes as Record<ClassId, CharacterClass>,
  skills: skills as Record<SkillId, Skill>
};

export class ContentValidationError extends Error {}

export function validateContent(): void {
  const errors: string[] = [];

  // Every monster's loot must reference real items.
  for (const monster of Object.values(content.monsters)) {
    for (const entry of monster.loot) {
      if (!(entry.itemId in content.items)) {
        errors.push(`Monster ${monster.id} loot references unknown item ${entry.itemId}.`);
      }
    }
  }

  // Every combat encounter must reference a real monster.
  for (const enc of Object.values(content.encounters)) {
    if (enc.kind === 'combat' && !(enc.monsterId in content.monsters)) {
      errors.push(`Encounter ${enc.id} references unknown monster ${enc.monsterId}.`);
    }
  }

  // Every location's exits and encounters must resolve.
  for (const loc of Object.values(content.locations)) {
    for (const exit of loc.exits) {
      if (!(exit.targetId in content.locations)) {
        // Exits to unimplemented locations are allowed if they are gated
        // off by a flag (Plan 5 will fill in the rest of the world).
        if (!exit.visibleIfFlag) {
          errors.push(`Location ${loc.id} exit "${exit.label}" → unknown ${exit.targetId} (and not flag-gated).`);
        }
      }
    }
    for (const encId of loc.encounterIds ?? []) {
      if (!(encId in content.encounters)) {
        errors.push(`Location ${loc.id} encounter list references unknown ${encId}.`);
      }
    }
  }

  // Every class must reference a real opening location and have valid starting items.
  for (const cls of Object.values(content.classes)) {
    if (!(cls.openingLocationId in content.locations)) {
      errors.push(`Class ${cls.id} openingLocationId references unknown ${cls.openingLocationId}.`);
    }
    if (!(cls.signatureMove in content.skills)) {
      errors.push(`Class ${cls.id} signatureMove references unknown skill ${cls.signatureMove}.`);
    }
    for (const startItem of cls.startingItems) {
      if (!(startItem.itemId in content.items)) {
        errors.push(`Class ${cls.id} startingItems references unknown ${startItem.itemId}.`);
      }
    }
  }

  if (errors.length > 0) {
    if (import.meta.env.MODE === 'development') {
      throw new ContentValidationError(`Content validation failed:\n  - ${errors.join('\n  - ')}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Content validation warnings:\n  - ${errors.join('\n  - ')}`);
    }
  }
}
```

- [ ] **Step 4: Create empty per-type registry files (so imports resolve)**

These will be filled in later tasks. For now, each exports an empty object to make the test pass minimally for "non-empty registries" — actually no, the test requires non-empty. So we need to author the content first OR have stub content.

Defer the test verification to Task 8 (after content is authored). For now, create the per-type files with empty exports so the imports resolve:

Create `src/content/items/index.ts`:
```ts
import type { ItemId, Item } from '../../engine/types';
export const items: Record<ItemId, Item> = {} as Record<ItemId, Item>;
```

Create `src/content/monsters/index.ts`:
```ts
import type { MonsterId, Monster } from '../../engine/types';
export const monsters: Record<MonsterId, Monster> = {} as Record<MonsterId, Monster>;
```

Create `src/content/encounters/index.ts`:
```ts
import type { EncounterId, Encounter } from '../../engine/types';
export const encounters: Record<EncounterId, Encounter> = {} as Record<EncounterId, Encounter>;
```

Create `src/content/locations/index.ts`:
```ts
import type { LocationId, Location } from '../../engine/types';
export const locations: Record<LocationId, Location> = {} as Record<LocationId, Location>;
```

Create `src/content/classes/index.ts`:
```ts
import type { ClassId, CharacterClass } from '../../engine/types';
export const classes: Record<ClassId, CharacterClass> = {} as Record<ClassId, CharacterClass>;
```

Create `src/content/skills/index.ts`:
```ts
import type { SkillId, Skill } from '../../engine/types';
export const skills: Record<SkillId, Skill> = {} as Record<SkillId, Skill>;
```

- [ ] **Step 5: Verify type-check passes (registries are empty so validation has nothing to validate, but imports must resolve)**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 6: Commit (test still fails — that's expected; we'll re-run it in Task 8)**

```bash
git add src/content/
git commit -m "Add content registry skeleton with empty per-type modules + validation"
```

---

## Task 3: Author the four items

**Files:**
- Modify (replace): `src/content/items/index.ts`

Author the four items: Rusty Pitchfork (weapon), Itchy Wool Tunic (armor), Note from Mother (trinket/quest), Hardtack (consumable).

- [ ] **Step 1: Replace `src/content/items/index.ts`**

```ts
import { ItemId, type Item } from '../../engine/types';

export const items: Record<ItemId, Item> = {
  [ItemId('rusty_pitchfork')]: {
    id: ItemId('rusty_pitchfork'),
    name: 'a Rusty Pitchfork',
    flavor: 'A perfectly functional implement for hay, increasingly indistinguishable from a perfectly functional implement for adventure.',
    kind: 'weapon',
    slot: 'weapon',
    damage: 4
  },
  [ItemId('itchy_wool_tunic')]: {
    id: ItemId('itchy_wool_tunic'),
    name: 'an Itchy Wool Tunic',
    flavor: 'Knitted by a relative who underestimated both your size and the abrasive properties of unwashed wool.',
    kind: 'armor',
    slot: 'armor',
    armor: 2
  },
  [ItemId('note_from_mother')]: {
    id: ItemId('note_from_mother'),
    name: 'a Note from Mother',
    flavor: 'Folded twice. The handwriting is firm and the advice is mostly about onions.',
    kind: 'quest'
  },
  [ItemId('hardtack')]: {
    id: ItemId('hardtack'),
    name: 'a Lump of Hardtack',
    flavor: 'Aggressively biscuit. Restores 12 HP and a sense of grim determination.',
    kind: 'consumable',
    effects: [{ kind: 'heal_hp', amount: 12 }]
  }
};
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/content/items/index.ts
git commit -m "Author item set: Rusty Pitchfork, Itchy Wool Tunic, Note from Mother, Hardtack"
```

---

## Task 4: Author the Officious Tax Rat monster + encounter

**Files:**
- Modify (replace): `src/content/monsters/index.ts`
- Modify (replace): `src/content/encounters/index.ts`

- [ ] **Step 1: Replace `src/content/monsters/index.ts`**

```ts
import { MonsterId, ItemId, type Monster } from '../../engine/types';

export const monsters: Record<MonsterId, Monster> = {
  [MonsterId('officious_tax_rat')]: {
    id: MonsterId('officious_tax_rat'),
    name: 'the Officious Tax Rat',
    flavor: 'Wears a tiny vest. Carries a clipboard. Collects an unspecified levy on behalf of an unspecified authority.',
    hp: 14,
    brawn: 4,
    bravado: 6,
    dodge: 8,
    armor: 1,
    weaponDamage: 3,
    actions: [
      { kind: 'attack', weight: 0.6, flavor: 'The rat strikes you with a clipboard, citing subsection 4.2(b).' },
      { kind: 'special', weight: 0.3, flavor: 'The rat invokes an obscure agricultural ordinance. You feel mildly fined.', damageBonus: 2 },
      { kind: 'flee_if_low_hp', weight: 0.1, flavor: 'The rat threatens to file a complaint and scurries off.' }
    ],
    loot: [
      { itemId: ItemId('hardtack'), chance: 0.5 }
    ]
  }
};
```

- [ ] **Step 2: Replace `src/content/encounters/index.ts`**

```ts
import { EncounterId, MonsterId, type Encounter } from '../../engine/types';

export const encounters: Record<EncounterId, Encounter> = {
  [EncounterId('first_tax_rat')]: {
    id: EncounterId('first_tax_rat'),
    kind: 'combat',
    monsterId: MonsterId('officious_tax_rat'),
    xpReward: 25
  }
};
```

- [ ] **Step 3: Type-check + commit**

```bash
npm run check
git add src/content/monsters/index.ts src/content/encounters/index.ts
git commit -m "Author Officious Tax Rat monster and first_tax_rat encounter"
```

Expected: 0 errors.

---

## Task 5: Author the Family Farm location

**Files:**
- Modify (replace): `src/content/locations/index.ts`

- [ ] **Step 1: Replace `src/content/locations/index.ts`**

```ts
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const locations: Record<LocationId, Location> = {
  [LocationId('family_farm')]: {
    id: LocationId('family_farm'),
    name: 'The Family Farm',
    act: 'act_i',
    description:
      'The farm sprawls in three directions, mostly downhill. Chickens are in the early stages of a labour dispute. ' +
      'The barn slumps companionably against a fence that has given up. From the eastern field, you hear the ' +
      'unmistakable sound of someone *filing*.',
    reEntryDescription:
      'The farm continues to be the farm. The chickens have moved on to a more polished list of grievances.',
    exits: [
      // The Village exit is gated behind a flag — it doesn't exist yet (Plan 5).
      { label: 'Walk into the village', targetId: LocationId('village'), visibleIfFlag: 'unlocked_village' }
    ],
    encounterIds: [EncounterId('first_tax_rat')]
  }
};
```

- [ ] **Step 2: Type-check + commit**

```bash
npm run check
git add src/content/locations/index.ts
git commit -m "Author Family Farm location"
```

Expected: 0 errors.

---

## Task 6: Author Tempt Fate skill stub + Reluctant Farmhand class

**Files:**
- Modify (replace): `src/content/skills/index.ts`
- Modify (replace): `src/content/classes/index.ts`

The Tempt Fate skill is the Farmhand's signature move. In Plan 2 it ships only as metadata so the disabled Skill button can show its name in a tooltip. Its combat resolver lands in Plan 4.

- [ ] **Step 1: Replace `src/content/skills/index.ts`**

```ts
import { SkillId, type Skill } from '../../engine/types';

export const skills: Record<SkillId, Skill> = {
  [SkillId('tempt_fate')]: {
    id: SkillId('tempt_fate'),
    name: 'Tempt Fate',
    description: 'A guaranteed crit on your next action — but with a 15% chance something absurd and bad also happens.',
    mpCost: 6,
    scalingStat: 'bluck',
    unlockLevel: 3
  }
};
```

- [ ] **Step 2: Replace `src/content/classes/index.ts`**

```ts
import { ClassId, ItemId, LocationId, NarrativeNodeId, SkillId, type CharacterClass } from '../../engine/types';

export const classes: Record<ClassId, CharacterClass> = {
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
      { itemId: ItemId('note_from_mother') }
    ],
    signatureMove: SkillId('tempt_fate'),
    openingLocationId: LocationId('family_farm'),
    // Plan 5 wires this to a real narrative node for the full opening scene.
    // For Plan 2 the StartNewGame reducer emits a short opener directly.
    openingNarrativeNodeId: NarrativeNodeId('farmhand_opening_short')
  }
};
```

- [ ] **Step 3: Type-check + commit**

```bash
npm run check
git add src/content/skills/index.ts src/content/classes/index.ts
git commit -m "Author Tempt Fate skill stub and Reluctant Farmhand class"
```

Expected: 0 errors.

---

## Task 7: Validation pass — verify content registry test now passes

**Files:** none modified

- [ ] **Step 1: Run the validate test**

```bash
npm run test -- validate
```

Expected: both tests pass.

- [ ] **Step 2: Run the full suite**

```bash
npm run test
```

Expected: 27 (Plan 1) + 2 (validation) = 29 tests pass.

- [ ] **Step 3: If all green, no commit. If anything fails, fix the underlying content file (not the test) and commit a fix.**

The expected behavior: a stable content registry that all later tasks can rely on.

---

## Task 8: Combat math primitives (TDD)

**Files:**
- Create: `src/engine/combat.ts`
- Create: `src/engine/__tests__/combat.test.ts`

Pure functions for the four combat rolls: hit check, damage, crit, flee. All take `(state, ...) → { state, value }` to thread the RNG through.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/__tests__/combat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rollHit, rollDamage, rollCrit, rollFlee } from '../combat';

const rng0 = { seed: 42, step: 0 };

describe('rollHit', () => {
  it('returns hit boolean and advances rng step', () => {
    const r = rollHit(rng0, /*bravado*/ 7, /*targetDodge*/ 8);
    expect(typeof r.value).toBe('boolean');
    expect(r.state.step).toBe(rng0.step + 1);
  });

  it('higher bravado relative to dodge improves hit rate', () => {
    let lowHits = 0, highHits = 0;
    let s = { seed: 1, step: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = rollHit(s, 2, 12);
      if (r.value) lowHits++;
      s = r.state;
    }
    s = { seed: 1, step: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = rollHit(s, 18, 4);
      if (r.value) highHits++;
      s = r.state;
    }
    expect(highHits).toBeGreaterThan(lowHits);
  });
});

describe('rollDamage', () => {
  it('applies brawn modifier and weapon damage', () => {
    const r = rollDamage(rng0, /*weapon*/ 6, /*brawn*/ 10, /*targetArmor*/ 0);
    // weapon 6 + floor(brawn/2) 5 + d6(1..6) - armor 0 = 12..17
    expect(r.value).toBeGreaterThanOrEqual(12);
    expect(r.value).toBeLessThanOrEqual(17);
  });

  it('subtracts target armor and clamps at 1 minimum', () => {
    let s = { seed: 9, step: 0 };
    let saw1Min = false;
    for (let i = 0; i < 100; i++) {
      const r = rollDamage(s, /*weapon*/ 1, /*brawn*/ 0, /*targetArmor*/ 99);
      if (r.value === 1) saw1Min = true;
      expect(r.value).toBeGreaterThanOrEqual(1);
      s = r.state;
    }
    expect(saw1Min).toBe(true);
  });
});

describe('rollCrit', () => {
  it('returns boolean and is more likely with higher bluck', () => {
    let lowCrits = 0, highCrits = 0;
    let s = { seed: 11, step: 0 };
    for (let i = 0; i < 5000; i++) {
      const r = rollCrit(s, 0);
      if (r.value) lowCrits++;
      s = r.state;
    }
    s = { seed: 11, step: 0 };
    for (let i = 0; i < 5000; i++) {
      const r = rollCrit(s, 20);
      if (r.value) highCrits++;
      s = r.state;
    }
    expect(highCrits).toBeGreaterThan(lowCrits);
  });
});

describe('rollFlee', () => {
  it('returns boolean and is more likely with higher bluck + bravado', () => {
    let lowFlee = 0, highFlee = 0;
    let s = { seed: 21, step: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = rollFlee(s, /*bluck*/ 0, /*bravado*/ 0);
      if (r.value) lowFlee++;
      s = r.state;
    }
    s = { seed: 21, step: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = rollFlee(s, /*bluck*/ 15, /*bravado*/ 15);
      if (r.value) highFlee++;
      s = r.state;
    }
    expect(highFlee).toBeGreaterThan(lowFlee);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm run test -- combat
```

Expected: "Cannot find module '../combat'".

- [ ] **Step 3: Implement `src/engine/combat.ts` (math only — combat sub-reducer in Task 9)**

```ts
import { rng, type RngState, type RngResult } from './rng';

// Spec §7 combat math.
// Hit: 1d20 + floor(bravado/2) ≥ targetDodge
export function rollHit(state: RngState, bravado: number, targetDodge: number): RngResult<boolean> {
  const r = rng.d20(state);
  const total = r.value + Math.floor(bravado / 2);
  return { state: r.state, value: total >= targetDodge };
}

// Damage: weapon + floor(brawn/2) + d6 - targetArmor, minimum 1.
export function rollDamage(
  state: RngState,
  weaponDamage: number,
  brawn: number,
  targetArmor: number
): RngResult<number> {
  const r = rng.d6(state);
  const raw = weaponDamage + Math.floor(brawn / 2) + r.value - targetArmor;
  return { state: r.state, value: Math.max(1, raw) };
}

// Crit: 1d100 ≤ 5 + (bluck * 2)
export function rollCrit(state: RngState, bluck: number): RngResult<boolean> {
  const r = rng.d100(state);
  return { state: r.state, value: r.value <= 5 + bluck * 2 };
}

// Flee: 1d20 + floor((bluck + bravado)/2) ≥ 15
export function rollFlee(state: RngState, bluck: number, bravado: number): RngResult<boolean> {
  const r = rng.d20(state);
  const total = r.value + Math.floor((bluck + bravado) / 2);
  return { state: r.state, value: total >= 15 };
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- combat
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/combat.ts src/engine/__tests__/combat.test.ts
git commit -m "Add combat math primitives (rollHit, rollDamage, rollCrit, rollFlee)"
```

---

## Task 9: Combat sub-reducer (TDD)

**Files:**
- Modify: `src/engine/combat.ts` — append sub-reducer functions
- Modify: `src/engine/__tests__/combat.test.ts` — append sub-reducer tests

The combat sub-reducer transitions `state.combat` through three lifecycles: starting an encounter (`startCombat`), resolving the player's action (`playerAttack`, `playerUseItem`, `playerFlee`), resolving the monster's turn (`monsterTurn`), and ending combat (`endCombat`). Each is a pure `(state) → state`. Log entries are appended to `state.log`. Combat ends when the player or the monster is at 0 HP, or when flee succeeds.

- [ ] **Step 1: Append failing tests to `src/engine/__tests__/combat.test.ts`**

```ts
import { startCombat, playerAttack, monsterTurn, endCombat } from '../combat';
import { createInitialState } from '../state';
import { content } from '../../content';
import { ClassId, ItemId, LocationId } from '../types';

function characterAtLocation() {
  let s = createInitialState(7);
  // Mock-set a character and current location by hand.
  s = {
    ...s,
    character: {
      ...s.character,
      name: 'Test',
      classId: ClassId('reluctant_farmhand'),
      level: 1,
      hp: { current: 50, max: 50 },
      mp: { current: 10, max: 10 },
      stats: { brawn: 8, brains: 6, bravado: 5, bluck: 7 },
      equipment: { weapon: ItemId('rusty_pitchfork') },
      inventory: [{ itemId: ItemId('hardtack'), qty: 1 }]
    },
    world: { ...s.world, currentLocation: LocationId('family_farm') }
  };
  return s;
}

describe('combat sub-reducer', () => {
  it('startCombat creates a combat state with the right combatants', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]!;
    const s1 = startCombat(s0, enc);
    expect(s1.combat).not.toBeNull();
    expect(s1.combat!.combatants).toHaveLength(2);
    expect(s1.combat!.combatants.find((c) => c.kind === 'player')!.hp).toBe(50);
    expect(s1.combat!.round).toBe(1);
  });

  it('playerAttack reduces monster hp on hit', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]!;
    let s = startCombat(s0, enc);
    const monBefore = s.combat!.combatants.find((c) => c.kind === 'monster')!.hp;

    // Iterate up to 20 rounds — at least one should land for these stats.
    let landed = false;
    for (let i = 0; i < 20; i++) {
      const after = playerAttack(s);
      const monAfter = after.combat?.combatants.find((c) => c.kind === 'monster')?.hp;
      if (monAfter !== undefined && monAfter < monBefore) {
        landed = true;
        break;
      }
      s = after;
      if (!s.combat) break;
    }
    expect(landed).toBe(true);
  });

  it('endCombat clears combat state and grants xp on victory', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]!;
    let s = startCombat(s0, enc);
    const xpBefore = s.character.xp;
    s = endCombat(s, 'victory', enc);
    expect(s.combat).toBeNull();
    expect(s.character.xp).toBeGreaterThan(xpBefore);
  });

  it('monsterTurn applies damage to the player', () => {
    const s0 = characterAtLocation();
    const enc = content.encounters[content.locations[s0.world.currentLocation]!.encounterIds![0]!]!;
    let s = startCombat(s0, enc);
    const playerHpBefore = s.combat!.combatants.find((c) => c.kind === 'player')!.hp;
    // Force several monster turns to overcome variance.
    let lostHp = false;
    for (let i = 0; i < 30; i++) {
      const after = monsterTurn(s);
      const after2 = after.combat?.combatants.find((c) => c.kind === 'player')?.hp;
      if (after2 !== undefined && after2 < playerHpBefore) { lostHp = true; break; }
      s = after;
      if (!s.combat) break;
    }
    expect(lostHp).toBe(true);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm run test -- combat
```

Expected: tests fail with "startCombat is not a function" (or similar).

- [ ] **Step 3: Append to `src/engine/combat.ts`**

```ts
import type { GameState, CombatState, Encounter, MonsterId, ItemId } from './types';
import type { CombatEncounter } from './types';
import { content } from '../content';

const MAX_LOG = 200;

function pushLog(state: GameState, entry: { kind: GameState['log'][number]['kind']; text: string; speaker?: string; systemLabel?: string }): GameState {
  const id = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const newLog = [...state.log, { id, ...entry }];
  return { ...state, log: newLog.length > MAX_LOG ? newLog.slice(-MAX_LOG) : newLog };
}

export function startCombat(state: GameState, encounter: CombatEncounter): GameState {
  const monster = content.monsters[encounter.monsterId];
  if (!monster) {
    return pushLog(state, { kind: 'system', systemLabel: 'ERROR', text: `Unknown monster ${encounter.monsterId}.` });
  }

  // Initiative: bravado + d6 for each.
  const playerInit = state.character.stats.bravado + 1 + Math.floor(Math.random() * 6); // simple here; combat sub-reducer can tighten later
  const monsterInit = monster.bravado + 1 + Math.floor(Math.random() * 6);

  const combat: CombatState = {
    encounterId: encounter.id,
    combatants: [
      { id: 'player', kind: 'player', hp: state.character.hp.current, initiative: playerInit },
      { id: encounter.monsterId, kind: 'monster', hp: monster.hp, initiative: monsterInit }
    ],
    turnIndex: 0,
    round: 1
  };

  let s: GameState = { ...state, combat };
  s = pushLog(s, { kind: 'combat', text: `${monster.name} appears.` });
  s = pushLog(s, { kind: 'combat', text: monster.flavor });
  return s;
}

export function playerAttack(state: GameState): GameState {
  if (!state.combat) return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;

  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  const weaponId = state.character.equipment.weapon;
  const weapon = weaponId ? content.items[weaponId] : undefined;
  const weaponDamage = weapon?.damage ?? 1;

  // Hit check
  const hitRoll = rollHit(state.rng, state.character.stats.bravado, monster.dodge);
  let s: GameState = { ...state, rng: hitRoll.state };
  if (!hitRoll.value) {
    s = pushLog(s, { kind: 'combat', text: `Your swing goes wide.` });
    return s;
  }

  // Damage
  const dmgRoll = rollDamage(s.rng, weaponDamage, s.character.stats.brawn, monster.armor);
  s = { ...s, rng: dmgRoll.state };

  // Crit
  const critRoll = rollCrit(s.rng, s.character.stats.bluck);
  s = { ...s, rng: critRoll.state };
  const finalDamage = critRoll.value ? Math.floor(dmgRoll.value * 2.2) : dmgRoll.value;

  // Apply damage to monster
  const newCombatants = s.combat!.combatants.map((c) =>
    c.kind === 'monster' ? { ...c, hp: Math.max(0, c.hp - finalDamage) } : c
  );
  s = { ...s, combat: { ...s.combat!, combatants: newCombatants } };
  s = pushLog(s, {
    kind: 'combat',
    text: critRoll.value
      ? `Critical hit! You strike for ${finalDamage}.`
      : `You hit for ${finalDamage}.`
  });

  return s;
}

export function playerUseItem(state: GameState, itemId: ItemId): GameState {
  if (!state.combat) return state;
  const item = content.items[itemId];
  if (!item || item.kind !== 'consumable') return state;

  // Apply each effect.
  let s = state;
  for (const effect of item.effects ?? []) {
    if (effect.kind === 'heal_hp') {
      const newHp = Math.min(s.character.hp.max, s.character.hp.current + effect.amount);
      s = {
        ...s,
        character: { ...s.character, hp: { ...s.character.hp, current: newHp } },
        combat: s.combat
          ? {
              ...s.combat,
              combatants: s.combat.combatants.map((c) =>
                c.kind === 'player' ? { ...c, hp: newHp } : c
              )
            }
          : s.combat
      };
      s = pushLog(s, { kind: 'combat', text: `You eat ${item.name}. (+${effect.amount} HP)` });
    } else if (effect.kind === 'heal_mp') {
      const newMp = Math.min(s.character.mp.max, s.character.mp.current + effect.amount);
      s = { ...s, character: { ...s.character, mp: { ...s.character.mp, current: newMp } } };
      s = pushLog(s, { kind: 'combat', text: `You feel mentally refreshed. (+${effect.amount} MP)` });
    }
  }

  // Decrement inventory qty
  const inv = s.character.inventory.map((entry) =>
    entry.itemId === itemId ? { ...entry, qty: entry.qty - 1 } : entry
  ).filter((entry) => entry.qty > 0);
  s = { ...s, character: { ...s.character, inventory: inv } };

  return s;
}

export function playerFlee(state: GameState): GameState {
  if (!state.combat) return state;
  const enc = content.encounters[state.combat.encounterId];
  if (enc?.kind === 'combat' && enc.noFlee) {
    return pushLog(state, { kind: 'combat', text: 'There is no fleeing this.' });
  }

  const r = rollFlee(state.rng, state.character.stats.bluck, state.character.stats.bravado);
  let s: GameState = { ...state, rng: r.state };
  if (r.value) {
    s = pushLog(s, { kind: 'combat', text: 'You flee, with what dignity remains.' });
    s = { ...s, combat: null };
  } else {
    s = pushLog(s, { kind: 'combat', text: 'You attempt to flee. The attempt is, charitably, ungraceful.' });
  }
  return s;
}

export function monsterTurn(state: GameState): GameState {
  if (!state.combat) return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  // Pick action by weight.
  const actionRoll = rng.weighted(state.rng, monster.actions.map((a) => ({ value: a, weight: a.weight })));
  let s: GameState = { ...state, rng: actionRoll.state };
  const action = actionRoll.value;

  if (action.kind === 'flee_if_low_hp' && monsterCombatant.hp <= Math.floor(monster.hp / 4)) {
    s = pushLog(s, { kind: 'combat', text: action.flavor });
    s = { ...s, combat: null };
    return s;
  }

  // Attack-style action (regular or special)
  const damageBonus = action.kind === 'special' ? action.damageBonus : 0;
  const hit = rollHit(s.rng, monster.bravado, /*player dodge*/ 10 + Math.floor(state.character.stats.bravado / 2));
  s = { ...s, rng: hit.state };
  if (!hit.value) {
    s = pushLog(s, { kind: 'combat', text: `${action.flavor} (You dodge.)` });
    return s;
  }
  const dmg = rollDamage(s.rng, monster.weaponDamage + damageBonus, monster.brawn, /*player armor*/ 0);
  s = { ...s, rng: dmg.state };
  // Apply to player
  const newHp = Math.max(0, state.character.hp.current - dmg.value);
  s = {
    ...s,
    character: { ...s.character, hp: { ...s.character.hp, current: newHp } },
    combat: {
      ...s.combat!,
      combatants: s.combat!.combatants.map((c) => (c.kind === 'player' ? { ...c, hp: newHp } : c))
    }
  };
  s = pushLog(s, { kind: 'combat', text: `${action.flavor} (-${dmg.value} HP)` });

  return s;
}

export function endCombat(state: GameState, result: 'victory' | 'defeat' | 'flee', encounter: CombatEncounter): GameState {
  let s: GameState = { ...state, combat: null };
  if (result === 'victory') {
    s = { ...s, character: { ...s.character, xp: s.character.xp + encounter.xpReward } };
    s = pushLog(s, { kind: 'system', systemLabel: 'EXP.', text: `+${encounter.xpReward} experience.` });
  } else if (result === 'defeat') {
    s = pushLog(s, { kind: 'narration', text: 'The world goes dim. You wake some time later, with a headache and your dignity rumpled.' });
    // Plan 4 will add proper defeat handling. For Plan 2, restore HP to 1.
    s = { ...s, character: { ...s.character, hp: { ...s.character.hp, current: 1 } } };
  }
  return s;
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all (combat additions + earlier) pass — about 33 total.

- [ ] **Step 5: Commit**

```bash
git add src/engine/combat.ts src/engine/__tests__/combat.test.ts
git commit -m "Add combat sub-reducer: startCombat, playerAttack, playerUseItem, playerFlee, monsterTurn, endCombat"
```

---

## Task 10: Game-flow events (TDD)

**Files:**
- Modify: `src/engine/events.ts`
- Modify: `src/engine/__tests__/state.test.ts` — append tests

Extend the `GameEvent` union and the `reduce` switch with the events Plan 2 needs.

- [ ] **Step 1: Append failing tests to `src/engine/__tests__/state.test.ts`**

Add these new imports to the TOP of the file (alongside the existing imports — do not duplicate any that are already present):

```ts
import { content } from '../../content';
import { ClassId, ItemId, LocationId, EncounterId } from '../types';
```

Then append this new `describe` block to the BOTTOM of the file:

```ts
describe('reduce — game-flow events', () => {
  it('StartNewGame populates character from class definition and emits opening log', () => {
    const s0 = createInitialState(1);
    const s1 = reduce(s0, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    expect(s1.character.name).toBe('Brendan');
    expect(s1.character.classId).toBe(ClassId('reluctant_farmhand'));
    expect(s1.character.level).toBe(1);
    expect(s1.character.stats.brawn).toBe(8);
    expect(s1.character.hp.max).toBeGreaterThan(0);
    expect(s1.character.inventory.length).toBeGreaterThan(0);
    expect(s1.character.equipment.weapon).toBe(ItemId('rusty_pitchfork'));
    expect(s1.world.currentLocation).toBe(LocationId('family_farm'));
    expect(s1.log.length).toBeGreaterThan(0);
  });

  it('EnterLocation updates currentLocation and adds to visited', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('family_farm') });
    expect(s.world.visited).toContain(LocationId('family_farm'));
  });

  it('EquipItem moves an inventory item into a slot', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    // Unequip first
    s = reduce(s, { kind: 'UnequipSlot', slot: 'weapon' });
    expect(s.character.equipment.weapon).toBeUndefined();
    // Re-equip
    s = reduce(s, { kind: 'EquipItem', itemId: ItemId('rusty_pitchfork') });
    expect(s.character.equipment.weapon).toBe(ItemId('rusty_pitchfork'));
  });

  it('TriggerEncounter starts combat with the encounter\'s monster', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: EncounterId('first_tax_rat') });
    expect(s.combat).not.toBeNull();
  });

  it('AttackTarget reduces enemy hp (sometimes — try several)', () => {
    let s = createInitialState(2);
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: EncounterId('first_tax_rat') });
    const monBefore = s.combat!.combatants.find((c) => c.kind === 'monster')!.hp;
    let dropped = false;
    for (let i = 0; i < 20 && s.combat; i++) {
      s = reduce(s, { kind: 'AttackTarget' });
      const monAfter = s.combat?.combatants.find((c) => c.kind === 'monster')?.hp ?? 0;
      if (monAfter < monBefore) { dropped = true; break; }
    }
    expect(dropped).toBe(true);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm run test -- state
```

Expected: failures because the new events aren't in the union.

- [ ] **Step 3: Replace `src/engine/events.ts`**

```ts
import type { GameState, ClassId, ItemId, LocationId, EncounterId, EquipSlot, LogEntry } from './types';
import { content } from '../content';
import { startCombat, playerAttack, playerFlee, playerUseItem, monsterTurn, endCombat } from './combat';

const MAX_LOG = 200;

// Append entries to the log, deriving sequential ids from the existing log
// tail. This MUST match the id-generation pattern in combat.ts so the two
// modules never produce a colliding id.
function appendLogs(state: GameState, entries: Omit<LogEntry, 'id'>[]): GameState {
  let nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const withIds: LogEntry[] = entries.map((e) => ({ ...e, id: nextId++ }));
  const merged = [...state.log, ...withIds];
  return { ...state, log: merged.length > MAX_LOG ? merged.slice(-MAX_LOG) : merged };
}

export type GameEvent =
  | { kind: 'SetTheme'; theme: 'parchment' | 'moonlit' }
  | { kind: 'SetTextSize'; size: 'small' | 'medium' | 'large' }
  | { kind: 'ToggleAutoSave' }
  | { kind: 'StartNewGame'; name: string; classId: ClassId }
  | { kind: 'EnterLocation'; locationId: LocationId }
  | { kind: 'TriggerEncounter'; encounterId: EncounterId }
  | { kind: 'AttackTarget' }
  | { kind: 'UseItem'; itemId: ItemId }
  | { kind: 'Flee' }
  | { kind: 'EquipItem'; itemId: ItemId }
  | { kind: 'UnequipSlot'; slot: EquipSlot }
  | { kind: 'DropItem'; itemId: ItemId };

const FARMBOY_OPENING_LINES: Array<{ kind: GameState['log'][number]['kind']; text: string; speaker?: string; systemLabel?: string }> = [
  { kind: 'narration', text: 'You wake on a Tuesday, which is, statistically, when most prophecies arrive.' },
  { kind: 'narration', text: 'The cow regards you with the unfocused malice of a creature who has, against all odds, become aware of fate.' },
  { kind: 'system', systemLabel: 'ACT', text: 'The Call to Adventure begins, more or less on schedule.' }
];

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.kind) {
    case 'SetTheme':
      return { ...state, settings: { ...state.settings, theme: event.theme } };
    case 'SetTextSize':
      return { ...state, settings: { ...state.settings, textSize: event.size } };
    case 'ToggleAutoSave':
      return { ...state, settings: { ...state.settings, autoSave: !state.settings.autoSave } };

    case 'StartNewGame': {
      const cls = content.classes[event.classId];
      if (!cls) return state;
      const hpMax = cls.baseHp + cls.startingStats.brawn * 3;
      const mpMax = cls.baseMp + cls.startingStats.brains * 2;
      const inventory = cls.startingItems.map((s) => ({ itemId: s.itemId, qty: s.qty ?? 1 }));
      const equipment: GameState['character']['equipment'] = {};
      for (const startItem of cls.startingItems) {
        if (!startItem.equipped) continue;
        const item = content.items[startItem.itemId];
        if (item?.slot) equipment[item.slot] = startItem.itemId;
      }
      return appendLogs(
        {
          ...state,
          character: {
            name: event.name,
            classId: event.classId,
            level: 1,
            xp: 0,
            hp: { current: hpMax, max: hpMax },
            mp: { current: mpMax, max: mpMax },
            stats: { ...cls.startingStats },
            equipment,
            inventory,
            knownSkills: []
          },
          world: { ...state.world, currentLocation: cls.openingLocationId, visited: [cls.openingLocationId] }
        },
        FARMBOY_OPENING_LINES
      );
    }

    case 'EnterLocation': {
      const loc = content.locations[event.locationId];
      if (!loc) return state;
      const isReentry = state.world.visited.includes(event.locationId);
      const text = isReentry ? loc.reEntryDescription ?? loc.description : loc.description;
      const visited = isReentry ? state.world.visited : [...state.world.visited, event.locationId].sort();
      return appendLogs(
        { ...state, world: { ...state.world, currentLocation: event.locationId, visited } },
        [{ kind: 'narration', text }]
      );
    }

    case 'TriggerEncounter': {
      const enc = content.encounters[event.encounterId];
      if (!enc || enc.kind !== 'combat') return state;
      return startCombat(state, enc);
    }

    case 'AttackTarget': {
      let s = playerAttack(state);
      // Resolve combat outcome.
      const monster = s.combat?.combatants.find((c) => c.kind === 'monster');
      if (monster && monster.hp <= 0) {
        const enc = content.encounters[s.combat!.encounterId];
        return enc?.kind === 'combat' ? endCombat(s, 'victory', enc) : { ...s, combat: null };
      }
      // Otherwise, monster turn.
      if (s.combat) {
        s = monsterTurn(s);
        if (s.character.hp.current <= 0) {
          const enc = content.encounters[s.combat!.encounterId];
          return enc?.kind === 'combat' ? endCombat(s, 'defeat', enc) : { ...s, combat: null };
        }
      }
      return s;
    }

    case 'UseItem': {
      let s = state.combat ? playerUseItem(state, event.itemId) : useItemOutOfCombat(state, event.itemId);
      if (state.combat && s.combat) {
        s = monsterTurn(s);
        if (s.character.hp.current <= 0) {
          const enc = content.encounters[s.combat!.encounterId];
          return enc?.kind === 'combat' ? endCombat(s, 'defeat', enc) : { ...s, combat: null };
        }
      }
      return s;
    }

    case 'Flee': {
      let s = playerFlee(state);
      if (state.combat && s.combat) {
        // Failed flee — monster gets a turn.
        s = monsterTurn(s);
        if (s.character.hp.current <= 0) {
          const enc = content.encounters[s.combat!.encounterId];
          return enc?.kind === 'combat' ? endCombat(s, 'defeat', enc) : { ...s, combat: null };
        }
      }
      return s;
    }

    case 'EquipItem': {
      const item = content.items[event.itemId];
      if (!item || !item.slot) return state;
      // Item must be in inventory.
      if (!state.character.inventory.some((e) => e.itemId === event.itemId)) return state;
      return {
        ...state,
        character: { ...state.character, equipment: { ...state.character.equipment, [item.slot]: event.itemId } }
      };
    }

    case 'UnequipSlot': {
      const next = { ...state.character.equipment };
      delete next[event.slot];
      return { ...state, character: { ...state.character, equipment: next } };
    }

    case 'DropItem': {
      const inv = state.character.inventory
        .map((e) => (e.itemId === event.itemId ? { ...e, qty: e.qty - 1 } : e))
        .filter((e) => e.qty > 0);
      const equipment = { ...state.character.equipment };
      // If the dropped item was equipped and qty hit 0, unequip.
      for (const slot of ['weapon', 'armor', 'trinket'] as const) {
        if (equipment[slot] === event.itemId && !inv.some((e) => e.itemId === event.itemId)) {
          delete equipment[slot];
        }
      }
      return { ...state, character: { ...state.character, inventory: inv, equipment } };
    }
  }
}

function useItemOutOfCombat(state: GameState, itemId: ItemId): GameState {
  const item = content.items[itemId];
  if (!item || item.kind !== 'consumable') return state;
  let s = state;
  for (const effect of item.effects ?? []) {
    if (effect.kind === 'heal_hp') {
      const newHp = Math.min(s.character.hp.max, s.character.hp.current + effect.amount);
      s = { ...s, character: { ...s.character, hp: { ...s.character.hp, current: newHp } } };
      s = appendLogs(s, [{ kind: 'system', text: `You eat ${item.name}. (+${effect.amount} HP)`, systemLabel: 'ITEM' }]);
    }
  }
  // Decrement
  const inv = s.character.inventory
    .map((e) => (e.itemId === itemId ? { ...e, qty: e.qty - 1 } : e))
    .filter((e) => e.qty > 0);
  return { ...s, character: { ...s.character, inventory: inv } };
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all pass — about 38 total (Plan 1's 27 + 2 validation + 6 combat math + 5 game-flow, with one test from Plan 1's settings tests carrying through).

If any test fails, fix the underlying reducer code.

- [ ] **Step 5: Commit**

```bash
git add src/engine/events.ts src/engine/__tests__/state.test.ts
git commit -m "Extend reducer with StartNewGame, EnterLocation, TriggerEncounter, combat events, equip/drop"
```

---

## Task 11: Update store and remove demo state

**Files:**
- Modify: `src/engine/state.ts` — keep `createDemoState` for tests but mark deprecated; export `isCharacterCreated(state)` helper
- Modify: `src/ui/store.svelte.ts` — call `createInitialState` (with a fresh seed) on first load; load the content registry on construction (triggering validation)

The store currently falls back to `createDemoState`. After Plan 2, fresh saves should land in character-creation mode (empty character name) and the UI should route to `CharacterCreation`. `createDemoState` stays in the codebase for unit tests but is no longer the production entry point.

- [ ] **Step 1: Add `isCharacterCreated` helper in `src/engine/state.ts`**

Append (do NOT delete `createDemoState`):

```ts
export function isCharacterCreated(state: GameState): boolean {
  return state.character.name.length > 0;
}
```

- [ ] **Step 2: Update `src/ui/store.svelte.ts`**

Change the `loadOrCreate` function to use `createInitialState(Date.now())` instead of `createDemoState()`:

Replace:
```ts
function loadOrCreate(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return deserialize(raw);
  } catch (e) {
    if (e instanceof SaveLoadError) {
      console.warn('Failed to load save:', e.message);
    }
  }
  return createDemoState();
}
```

With:
```ts
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
```

And update the import: change `import { createDemoState } from '../engine/state';` to `import { createInitialState } from '../engine/state';`.

Also update `resetSave` similarly:
```ts
resetSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  this.state = createInitialState(Date.now());
  applyTheme(this.state.settings.theme);
  applyTextSize(this.state.settings.textSize);
}
```

- [ ] **Step 3: Run validation at startup (call `validateContent` from `main.ts`)**

In `src/main.ts`, before `mount(App, ...)`, add:

```ts
import { validateContent } from './content';
validateContent();
```

The full updated `src/main.ts`:
```ts
import { mount } from 'svelte';
import App from './ui/App.svelte';
import './ui/global.css';
import { validateContent } from './content';

validateContent();

const target = document.getElementById('app');
if (!target) throw new Error('No #app element found');

mount(App, { target });
```

- [ ] **Step 4: Run tests + check + build**

```bash
npm run test
npm run check
npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.ts src/ui/store.svelte.ts src/main.ts
git commit -m "Use createInitialState for fresh saves; validate content at startup"
```

---

## Task 12: CharacterCreation component (TDD)

**Files:**
- Create: `src/ui/CharacterCreation.svelte`
- Create: `src/ui/__tests__/CharacterCreation.test.ts`

Single-screen form: name input + four class cards (only Reluctant Farmhand enabled). Submit dispatches `StartNewGame`. Submit disabled until name and class are both selected. Disabled class cards have a tooltip "Coming in Plan 4."

- [ ] **Step 1: Failing test**

Create `src/ui/__tests__/CharacterCreation.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CharacterCreation from '../CharacterCreation.svelte';
import { gameStore } from '../store.svelte';

describe('CharacterCreation', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
  });

  it('renders four class cards', () => {
    const { getAllByRole } = render(CharacterCreation);
    const cards = getAllByRole('radio', { name: /class/i });
    expect(cards).toHaveLength(4);
  });

  it('disables class cards other than Reluctant Farmhand', () => {
    const { getAllByRole } = render(CharacterCreation);
    const cards = getAllByRole('radio', { name: /class/i }) as HTMLInputElement[];
    const enabled = cards.filter((c) => !c.disabled);
    expect(enabled.length).toBe(1);
  });

  it('start button is disabled until name + Farmhand selected', async () => {
    const { getByLabelText, getByRole } = render(CharacterCreation);
    const startBtn = getByRole('button', { name: /begin/i }) as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);

    const nameInput = getByLabelText(/name/i) as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'Brendan' } });
    expect(startBtn.disabled).toBe(true);  // class still not selected

    const farmhand = getByLabelText(/reluctant farmhand/i) as HTMLInputElement;
    await fireEvent.click(farmhand);
    expect(startBtn.disabled).toBe(false);
  });

  it('clicking begin dispatches StartNewGame', async () => {
    const { getByLabelText, getByRole } = render(CharacterCreation);
    const nameInput = getByLabelText(/name/i) as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'Brendan' } });
    const farmhand = getByLabelText(/reluctant farmhand/i) as HTMLInputElement;
    await fireEvent.click(farmhand);
    const startBtn = getByRole('button', { name: /begin/i });
    await fireEvent.click(startBtn);
    expect(gameStore.state.character.name).toBe('Brendan');
    expect(gameStore.state.character.level).toBe(1);
  });
});
```

- [ ] **Step 2: Run, confirm failure (module not found).**

```bash
npm run test -- CharacterCreation
```

- [ ] **Step 3: Implement `src/ui/CharacterCreation.svelte`**

```svelte
<script lang="ts">
  import { gameStore } from './store.svelte';
  import { content } from '../content';
  import type { ClassId } from '../engine/types';

  let name = $state('');
  let selectedClass = $state<ClassId | null>(null);

  // For Plan 2: only Reluctant Farmhand is enabled.
  const ENABLED_CLASSES: ClassId[] = ['reluctant_farmhand' as ClassId];

  let allClasses = $derived(Object.values(content.classes));
  let canBegin = $derived(name.trim().length > 0 && selectedClass !== null);

  function begin() {
    if (!canBegin || !selectedClass) return;
    gameStore.dispatch({ kind: 'StartNewGame', name: name.trim(), classId: selectedClass });
  }
</script>

<div class="creation">
  <h1>The Heroic Chronicle</h1>
  <p class="subtitle">A new tale begins. Choose thy hero.</p>

  <form onsubmit={(e: Event) => { e.preventDefault(); begin(); }}>
    <label class="name-field">
      Name
      <input type="text" bind:value={name} placeholder="What art thou called?" maxlength="32" autocomplete="off" />
    </label>

    <fieldset class="classes" role="radiogroup">
      <legend>Class</legend>
      {#each allClasses as cls}
        {@const enabled = ENABLED_CLASSES.includes(cls.id)}
        <label class="class-card" class:disabled={!enabled} title={enabled ? '' : 'Coming in Plan 4'}>
          <input
            type="radio"
            name="class"
            value={cls.id}
            checked={selectedClass === cls.id}
            disabled={!enabled}
            onchange={() => { selectedClass = cls.id; }}
            aria-label="class {cls.name}"
          />
          <span class="card-body">
            <span class="card-name">{cls.name}</span>
            <span class="card-epithet">{cls.epithet}</span>
            {#if !enabled}<span class="card-locked">— Coming in Plan 4 —</span>{/if}
          </span>
        </label>
      {/each}
    </fieldset>

    <button type="submit" class="begin" disabled={!canBegin}>Begin the tale</button>
  </form>
</div>

<style>
  .creation {
    max-width: 700px;
    margin: 8vh auto;
    padding: 32px;
    font-family: var(--serif-body);
  }
  h1 {
    font-family: var(--serif-display);
    font-size: 42px;
    margin: 0;
    text-align: center;
    font-weight: normal;
  }
  .subtitle {
    text-align: center;
    font-style: italic;
    color: var(--ink-muted);
    margin: 4px 0 28px;
  }
  .name-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: var(--serif-display);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 12px;
    color: var(--ink-muted);
    margin-bottom: 24px;
  }
  .name-field input {
    font-family: var(--serif-body);
    font-size: 18px;
    padding: 8px 10px;
    border: 1px solid var(--ink);
    background: transparent;
    color: var(--ink);
    text-transform: none;
    letter-spacing: normal;
  }
  fieldset.classes {
    border: none;
    padding: 0;
    margin: 0 0 28px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  legend {
    font-family: var(--serif-display);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 12px;
    color: var(--ink-muted);
    margin-bottom: 10px;
  }
  .class-card {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--hairline);
    padding: 12px 14px;
    cursor: pointer;
  }
  .class-card.disabled { opacity: 0.45; cursor: not-allowed; }
  .class-card:has(input:checked) { border-color: var(--ink); background: rgba(166, 131, 56, 0.08); }
  .card-body { display: flex; flex-direction: column; }
  .card-name { font-family: var(--serif-display); font-size: 18px; }
  .card-epithet { font-style: italic; color: var(--ink-muted); font-size: 14px; }
  .card-locked { font-size: 11px; color: var(--ink-faint); margin-top: 4px; }
  .begin {
    border: 1px solid var(--ink);
    padding: 12px 24px;
    font-family: var(--serif-body);
    font-size: 16px;
    cursor: pointer;
  }
  .begin:disabled { opacity: 0.4; cursor: not-allowed; }
  .begin:not(:disabled):hover { background: var(--ink); color: var(--paper); }
</style>
```

- [ ] **Step 4: Run tests, confirm pass.**

```bash
npm run test -- CharacterCreation
```

Expected: all 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/CharacterCreation.svelte src/ui/__tests__/CharacterCreation.test.ts
git commit -m "Add CharacterCreation screen (Reluctant Farmhand only; other classes disabled)"
```

---

## Task 13: App.svelte routing — creation vs game

**Files:**
- Modify: `src/ui/App.svelte`
- Modify: `src/ui/__tests__/App.test.ts`

Replace the always-on game shell with a router that shows CharacterCreation when no character has been created, and the game shell otherwise.

- [ ] **Step 1: Update the App test**

Replace `src/ui/__tests__/App.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import App from '../App.svelte';
import { gameStore } from '../store.svelte';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
  });

  it('renders CharacterCreation on a fresh save', () => {
    const { getByText } = render(App);
    expect(getByText(/begin the tale/i)).toBeInTheDocument();
  });

  it('renders the game shell after character creation', async () => {
    const { getByLabelText, getByRole, getByText } = render(App);
    await fireEvent.input(getByLabelText(/name/i), { target: { value: 'Brendan' } });
    await fireEvent.click(getByLabelText(/reluctant farmhand/i));
    await fireEvent.click(getByRole('button', { name: /begin/i }));
    expect(getByText('Brendan')).toBeInTheDocument();
    expect(getByLabelText('World panel')).toBeInTheDocument();
    expect(getByLabelText('Character panel')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm run test -- App
```

Expected: failure on the "fresh save shows CharacterCreation" test.

- [ ] **Step 3: Replace `src/ui/App.svelte`**

```svelte
<script lang="ts">
  import WorldPanel from './WorldPanel.svelte';
  import CharacterPanel from './CharacterPanel.svelte';
  import Divider from './Divider.svelte';
  import PageTools from './PageTools.svelte';
  import CharacterCreation from './CharacterCreation.svelte';
  import { gameStore } from './store.svelte';
  import { isCharacterCreated } from '../engine/state';

  let created = $derived(isCharacterCreated(gameStore.state));
</script>

{#if created}
  <div class="chronicle">
    <WorldPanel />
    <Divider />
    <CharacterPanel />
  </div>
{:else}
  <CharacterCreation />
{/if}

<PageTools />

<style>
  .chronicle {
    display: grid;
    grid-template-columns:
      calc(var(--world-fraction, 0.62) * 100%)
      1px
      calc((1 - var(--world-fraction, 0.62)) * 100%);
    height: 100vh;
    max-width: var(--max-content-width);
    margin: 0 auto;
  }

  @media (max-width: 900px) {
    .chronicle {
      grid-template-columns: 1fr;
      grid-template-rows: 60vh 1px 40vh;
      height: auto;
      min-height: 100vh;
    }
  }
</style>
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/App.svelte src/ui/__tests__/App.test.ts
git commit -m "Route between CharacterCreation and game shell based on character.name"
```

---

## Task 14: InspectModal component (TDD)

**Files:**
- Create: `src/ui/InspectModal.svelte`
- Create: `src/ui/__tests__/InspectModal.test.ts`

Renders the item flavor and the available actions (Use / Equip / Unequip / Drop). Receives `itemId` and `onClose` as props. Reads the item from the content registry. Disables actions that don't apply (e.g., Equip on a quest item).

- [ ] **Step 1: Failing test**

Create `src/ui/__tests__/InspectModal.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import InspectModal from '../InspectModal.svelte';
import { gameStore } from '../store.svelte';
import { ClassId, ItemId } from '../../engine/types';

describe('InspectModal', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Test', classId: ClassId('reluctant_farmhand') });
  });

  it('renders the item flavor text', () => {
    const { getByText } = render(InspectModal, { props: { itemId: ItemId('rusty_pitchfork'), onClose: () => {} } });
    expect(getByText(/Rusty Pitchfork/i)).toBeInTheDocument();
    expect(getByText(/perfectly functional implement/i)).toBeInTheDocument();
  });

  it('shows Unequip action when item is equipped', () => {
    const { getByRole } = render(InspectModal, { props: { itemId: ItemId('rusty_pitchfork'), onClose: () => {} } });
    expect(getByRole('button', { name: /unequip/i })).toBeInTheDocument();
  });

  it('clicking Equip dispatches the event', async () => {
    // Unequip first so the equip button shows.
    gameStore.dispatch({ kind: 'UnequipSlot', slot: 'weapon' });
    const { getByRole } = render(InspectModal, { props: { itemId: ItemId('rusty_pitchfork'), onClose: () => {} } });
    await fireEvent.click(getByRole('button', { name: /equip/i }));
    expect(gameStore.state.character.equipment.weapon).toBe(ItemId('rusty_pitchfork'));
  });

  it('clicking Discard removes a quest item from inventory', async () => {
    // Quest items show a "Discard" button (not "Drop"). The starter Farmhand
    // inventory includes Note from Mother (a quest item).
    const { getByRole } = render(InspectModal, { props: { itemId: ItemId('note_from_mother'), onClose: () => {} } });
    await fireEvent.click(getByRole('button', { name: /discard/i }));
    const stillHas = gameStore.state.character.inventory.some((e) => e.itemId === ItemId('note_from_mother'));
    expect(stillHas).toBe(false);
  });
});
```

- [ ] **Step 2: Run, confirm failure.**

```bash
npm run test -- InspectModal
```

- [ ] **Step 3: Implement `src/ui/InspectModal.svelte`**

```svelte
<script lang="ts">
  import { gameStore } from './store.svelte';
  import { content } from '../content';
  import type { ItemId, EquipSlot } from '../engine/types';

  type Props = { itemId: ItemId; onClose: () => void };
  let { itemId, onClose }: Props = $props();

  let item = $derived(content.items[itemId]);
  let inInventory = $derived(gameStore.state.character.inventory.some((e) => e.itemId === itemId));
  let equippedSlot = $derived<EquipSlot | undefined>(
    item?.slot && gameStore.state.character.equipment[item.slot] === itemId ? item.slot : undefined
  );

  function equip() {
    gameStore.dispatch({ kind: 'EquipItem', itemId });
    onClose();
  }
  function unequip() {
    if (!equippedSlot) return;
    gameStore.dispatch({ kind: 'UnequipSlot', slot: equippedSlot });
    onClose();
  }
  function use() {
    gameStore.dispatch({ kind: 'UseItem', itemId });
    onClose();
  }
  function drop() {
    gameStore.dispatch({ kind: 'DropItem', itemId });
    onClose();
  }

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
</script>

{#if item}
  <div class="backdrop" role="presentation" onclick={onBackdrop}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="inspect-title">
      <header><h2 id="inspect-title">{item.name}</h2><button class="close" onclick={onClose} aria-label="Close">×</button></header>
      <p class="flavor">{item.flavor}</p>
      <div class="meta">
        <span class="kind">{item.kind}</span>
        {#if item.damage}<span class="stat">Damage {item.damage}</span>{/if}
        {#if item.armor}<span class="stat">Armor {item.armor}</span>{/if}
      </div>
      <div class="actions">
        {#if item.kind === 'consumable' && inInventory}
          <button onclick={use}>Use</button>
        {/if}
        {#if item.slot && inInventory && !equippedSlot}
          <button onclick={equip}>Equip</button>
        {/if}
        {#if equippedSlot}
          <button onclick={unequip}>Unequip</button>
        {/if}
        {#if inInventory && item.kind !== 'quest'}
          <button class="danger" onclick={drop}>Drop</button>
        {/if}
        {#if item.kind === 'quest' && inInventory}
          <button class="danger" onclick={drop}>Discard</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 80; }
  .dialog { background: var(--paper); padding: 24px 28px; min-width: 360px; max-width: 480px; border: 1px solid var(--hairline); }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  h2 { font-family: var(--serif-display); font-size: 22px; margin: 0; font-weight: normal; }
  .close { font-size: 26px; line-height: 1; color: var(--ink-muted); }
  .close:hover { color: var(--ink); }
  .flavor { font-style: italic; line-height: 1.6; }
  .meta { font-family: var(--mono); font-size: 12px; letter-spacing: 0.06em; color: var(--ink-muted); margin: 12px 0; display: flex; gap: 12px; }
  .meta .kind::before { content: '['; } .meta .kind::after { content: ']'; }
  .actions { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
  .actions button { border: 1px solid var(--ink); padding: 6px 14px; font-family: var(--serif-body); font-size: 14px; }
  .actions button:hover { background: var(--ink); color: var(--paper); }
  .actions button.danger { border-color: var(--crimson); color: var(--crimson); }
  .actions button.danger:hover { background: var(--crimson); color: var(--paper); }
</style>
```

- [ ] **Step 4: Run tests, confirm pass.**

```bash
npm run test -- InspectModal
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/InspectModal.svelte src/ui/__tests__/InspectModal.test.ts
git commit -m "Add InspectModal with Use/Equip/Unequip/Drop actions"
```

---

## Task 15: Wire CharacterPanel to InspectModal + dynamic epithet

**Files:**
- Modify: `src/ui/CharacterPanel.svelte`

Inventory slots become click-to-inspect. The hardcoded epithet is replaced by a lookup from `content.classes`. Click on an empty slot does nothing.

- [ ] **Step 1: Modify `src/ui/CharacterPanel.svelte`**

In the `<script>` section, after the existing `let c = $derived(gameStore.state.character);`, add:

```ts
import InspectModal from './InspectModal.svelte';
import { content } from '../content';
import type { ItemId } from '../engine/types';

let inspectingItem = $state<ItemId | null>(null);

function openInspect(itemId: ItemId) {
  inspectingItem = itemId;
}
function closeInspect() {
  inspectingItem = null;
}

let dynamicEpithet = $derived(content.classes[c.classId]?.epithet ?? 'the Untitled');
```

Then replace the hardcoded `epithet()` function call. Find:
```svelte
<p class="persona-epithet">{epithet()}</p>
```
Replace with:
```svelte
<p class="persona-epithet">{dynamicEpithet}</p>
```
And delete the now-unused `function epithet()` body.

In the inventory grid, update the slot rendering to make filled slots clickable:

Replace:
```svelte
{#each Array(12) as _, i (i)}
  <div class="effect-slot" class:filled={i < c.inventory.length}>
    {#if i < c.inventory.length}<span class="glyph">✦</span>{/if}
  </div>
{/each}
```

With:
```svelte
{#each Array(12) as _, i (i)}
  {#if i < c.inventory.length}
    {@const entry = c.inventory[i]!}
    <button class="effect-slot filled" type="button" onclick={() => openInspect(entry.itemId)} aria-label="Inspect item">
      <span class="glyph">✦</span>
    </button>
  {:else}
    <div class="effect-slot" aria-hidden="true"></div>
  {/if}
{/each}
```

At the end of the markup (after the `</aside>` closing tag), add the modal:

```svelte
{#if inspectingItem}
  <InspectModal itemId={inspectingItem} onClose={closeInspect} />
{/if}
```

In the `<style>`, update the `.effect-slot` rule to handle button elements (already styled via class names mostly — make sure `button.effect-slot` has `cursor: pointer`):

Add to the `.effect-slot.filled` rule:
```css
button.effect-slot { cursor: pointer; background: transparent; }
button.effect-slot:hover { background: rgba(166, 131, 56, 0.12); }
```

- [ ] **Step 2: Run all tests + check.**

```bash
npm run test
npm run check
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/ui/CharacterPanel.svelte
git commit -m "Wire inventory clicks to InspectModal; pull epithet from class registry"
```

---

## Task 16: WorldPanel — exploration button bar

**Files:**
- Modify: `src/ui/WorldPanel.svelte`

Replace the "Buttons appear here in Plan 2..." placeholder with the actual exploration button bar. Renders:

- One button per `Location.exits[i]` whose `visibleIfFlag` (if set) is true in `state.world.flags`.
- One button per encounter at the current location: `Confront the {monster.name}` (label derived from the encounter's monster).
- The button bar swaps to the combat button bar when `state.combat` is non-null (Task 17).

- [ ] **Step 1: In `src/ui/WorldPanel.svelte`, expand the imports**

Add:
```ts
import { content } from '../content';
import type { LocationId, EncounterId } from '../engine/types';
```

In the `<script>` section, after existing `$derived` declarations, add:

```ts
let currentLocation = $derived(content.locations[gameStore.state.world.currentLocation]);
let inCombat = $derived(gameStore.state.combat !== null);

function isExitVisible(visibleIfFlag?: string): boolean {
  if (!visibleIfFlag) return true;
  return Boolean(gameStore.state.world.flags[visibleIfFlag]);
}

function go(targetId: LocationId) {
  gameStore.dispatch({ kind: 'EnterLocation', locationId: targetId });
}

function confront(encounterId: EncounterId) {
  gameStore.dispatch({ kind: 'TriggerEncounter', encounterId });
}

function encounterLabel(encounterId: EncounterId): string {
  const enc = content.encounters[encounterId];
  if (!enc || enc.kind !== 'combat') return 'Investigate';
  const monster = content.monsters[enc.monsterId];
  return monster ? `Confront ${monster.name}` : 'Investigate';
}
```

- [ ] **Step 2: Replace the `.button-bar` markup**

Find:
```svelte
<div class="button-bar">
  <p class="placeholder">Buttons appear here in Plan 2 (exploration) and Plan 4 (combat).</p>
</div>
```

Replace with:
```svelte
<div class="button-bar">
  {#if !inCombat && currentLocation}
    {#each currentLocation.exits as exit (exit.targetId)}
      {#if isExitVisible(exit.visibleIfFlag)}
        <button class="btn" type="button" onclick={() => go(exit.targetId)}>{exit.label}</button>
      {/if}
    {/each}
    {#each currentLocation.encounterIds ?? [] as encId (encId)}
      <button class="btn" type="button" onclick={() => confront(encId)}>{encounterLabel(encId)}</button>
    {/each}
    {#if currentLocation.exits.length === 0 && (currentLocation.encounterIds ?? []).length === 0}
      <p class="placeholder">There seems nothing immediate to do here.</p>
    {/if}
  {/if}
</div>
```

In the `<style>` section, add (or extend) the `.btn` rule:

```css
.btn {
  font-family: var(--serif-body);
  font-size: 16px;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 8px 16px;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 180ms ease, color 180ms ease;
  margin-right: 12px;
}
.btn:hover {
  background: var(--ink);
  color: var(--paper);
}
.btn::before { content: '['; margin-right: 4px; color: var(--ink-muted); }
.btn::after { content: ']'; margin-left: 4px; color: var(--ink-muted); }
.btn:hover::before, .btn:hover::after { color: var(--paper-warm); }
```

- [ ] **Step 3: Run tests + check, smoke-test in dev**

```bash
npm run test
npm run check
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/WorldPanel.svelte
git commit -m "Render exploration buttons (exits + encounter triggers) in WorldPanel"
```

---

## Task 17: WorldPanel — combat button bar

**Files:**
- Modify: `src/ui/WorldPanel.svelte`

Add combat-mode buttons: Attack, Skill (disabled with tooltip), Item (opens an inventory picker for consumables), Flee. Inline the consumable picker as a small popover above the Item button.

- [ ] **Step 1: Update the script section**

Add to the `<script>`:

```ts
let showItemPicker = $state(false);

let consumables = $derived(
  gameStore.state.character.inventory
    .map((entry) => ({ entry, item: content.items[entry.itemId] }))
    .filter(({ item }) => item?.kind === 'consumable')
);

let signatureSkill = $derived(() => {
  const cls = content.classes[gameStore.state.character.classId];
  if (!cls) return null;
  return content.skills[cls.signatureMove] ?? null;
});

let signatureSkillTooltip = $derived(() => {
  const skill = signatureSkill();
  if (!skill) return 'No skills available.';
  return `${skill.name} — ${skill.description} (Unlocks at level ${skill.unlockLevel}.)`;
});

function attack() {
  gameStore.dispatch({ kind: 'AttackTarget' });
}
function flee() {
  gameStore.dispatch({ kind: 'Flee' });
}
function consume(itemId: ItemId) {
  gameStore.dispatch({ kind: 'UseItem', itemId });
  showItemPicker = false;
}

import type { ItemId } from '../engine/types';
```

(If `ItemId` is already imported, don't re-import.)

- [ ] **Step 2: Extend the button-bar markup**

Inside the existing `<div class="button-bar">`, after the `{#if !inCombat ...}` block, add an `{:else}` branch:

```svelte
<div class="button-bar">
  {#if !inCombat && currentLocation}
    <!-- exploration buttons (already present) -->
    ...existing exploration markup...
  {:else if inCombat}
    <button class="btn" type="button" onclick={attack}>Attack</button>

    <span class="skill-wrap">
      <button class="btn" type="button" disabled title={signatureSkillTooltip()}>Skill</button>
    </span>

    <span class="item-wrap">
      <button class="btn" type="button" onclick={() => { showItemPicker = !showItemPicker; }}>Item</button>
      {#if showItemPicker}
        <div class="item-picker" role="menu">
          {#if consumables.length === 0}
            <p>No consumables.</p>
          {:else}
            {#each consumables as { entry, item } (entry.itemId)}
              <button class="picker-row" type="button" onclick={() => consume(entry.itemId)}>
                {item!.name} <span class="qty">×{entry.qty}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </span>

    <button class="btn" type="button" onclick={flee}>Flee</button>
  {/if}
</div>
```

In the `<style>` section, add:

```css
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn:disabled:hover { background: transparent; color: var(--ink); }
.skill-wrap, .item-wrap { position: relative; display: inline-block; }
.item-picker {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  background: var(--paper);
  border: 1px solid var(--ink);
  padding: 8px 4px;
  min-width: 220px;
  box-shadow: 2px 3px 8px rgba(0,0,0,0.2);
  z-index: 30;
}
.item-picker p { margin: 6px 12px; font-style: italic; color: var(--ink-muted); }
.picker-row {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-family: var(--serif-body);
  font-size: 15px;
  cursor: pointer;
}
.picker-row:hover { background: rgba(166, 131, 56, 0.12); }
.picker-row .qty { color: var(--ink-muted); font-size: 12px; }
```

- [ ] **Step 3: Run tests + check.**

```bash
npm run test
npm run check
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/WorldPanel.svelte
git commit -m "Add combat button bar (Attack / Skill disabled / Item picker / Flee)"
```

---

## Task 18: First-entry exposition + final integration smoke

**Files:**
- Modify: `src/engine/events.ts` — `StartNewGame` should also append the location description for the opening location, so the player sees the farm as soon as they spawn.
- Smoke-test the full vertical-slice flow.

- [ ] **Step 1: Update `StartNewGame` to also push the location description**

In `src/engine/events.ts`, find the `case 'StartNewGame':` block. After the `appendLogs(...)` call, also reduce through `EnterLocation` so the location's `description` joins the log.

The simplest implementation: split the `StartNewGame` body into two phases — populate character + jump to location, then dispatch `EnterLocation` recursively.

Replace the `case 'StartNewGame':` block with:

```ts
case 'StartNewGame': {
  const cls = content.classes[event.classId];
  if (!cls) return state;
  const hpMax = cls.baseHp + cls.startingStats.brawn * 3;
  const mpMax = cls.baseMp + cls.startingStats.brains * 2;
  const inventory = cls.startingItems.map((s) => ({ itemId: s.itemId, qty: s.qty ?? 1 }));
  const equipment: GameState['character']['equipment'] = {};
  for (const startItem of cls.startingItems) {
    if (!startItem.equipped) continue;
    const item = content.items[startItem.itemId];
    if (item?.slot) equipment[item.slot] = startItem.itemId;
  }
  const populated: GameState = {
    ...state,
    character: {
      name: event.name,
      classId: event.classId,
      level: 1,
      xp: 0,
      hp: { current: hpMax, max: hpMax },
      mp: { current: mpMax, max: mpMax },
      stats: { ...cls.startingStats },
      equipment,
      inventory,
      knownSkills: []
    }
  };
  const withOpening = appendLogs(populated, FARMBOY_OPENING_LINES);
  // Recurse into EnterLocation for the description.
  return reduce(withOpening, { kind: 'EnterLocation', locationId: cls.openingLocationId });
}
```

- [ ] **Step 2: Manual dev smoke**

```bash
npm run dev
```

Walk through (in the browser at the printed URL):
1. Page loads to CharacterCreation. Three class cards are dimmed; only Reluctant Farmhand is selectable.
2. Type a name. Select Reluctant Farmhand. Click "Begin the tale."
3. Game shell appears. Log shows the 3 opening lines + the Family Farm description. Character panel shows the character with stats 8/6/5/7, HP `30 + 8*3 = 54`, MP `10 + 6*2 = 22`, equipped Rusty Pitchfork + Itchy Wool Tunic, inventory of 3 items (pitchfork, tunic, note).
4. The button bar shows just "Confront the Officious Tax Rat" (the Walk into the village exit is gated until later plans).
5. Click an inventory slot — InspectModal opens. Try Unequip on the pitchfork; equipment slot empties. Equip again — slot fills.
6. Click "Confront the Officious Tax Rat." Combat starts, log fills with combat narration, button bar swaps to Attack / Skill (disabled — hover for tooltip about Tempt Fate) / Item / Flee.
7. Click Attack repeatedly. You should win or lose within a few rounds. On victory, get +25 XP, log says so. On defeat, HP = 1.
8. Refresh the page. Save state restores. Same character, same location, same log tail.
9. Open Settings → Consign this tale to the flames. Confirm. Returns to CharacterCreation.

Stop the dev server.

If any step fails, fix the underlying code, re-run tests, commit a fix.

- [ ] **Step 3: Run full test suite + check + build**

```bash
npm run test
npm run check
npm run build
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/engine/events.ts
git commit -m "Push opening location description from StartNewGame"
```

---

## Final verification

- [ ] **Step 1: Full test suite, type check, build**

```bash
npm run test
npm run check
npm run build
```

Expected:
- ~40 tests passing
- 0 type errors
- Build produces `dist/` with no errors

- [ ] **Step 2: Spec coverage check**

| Spec section | Implemented in Plan 2 |
|---|---|
| §3.3 Turn-based combat (Attack/Item/Flee, no Skill yet) | Tasks 8, 9, 10, 17 |
| §3.4 Stats (the four Bs) — applied to a real character | Task 6, 10 (StartNewGame) |
| §3.5 Signature moves — declared, not yet executed | Task 6 (Tempt Fate stub) |
| §3.6 Character classes — Reluctant Farmhand fully wired | Task 6 |
| §3.7 XP gain on combat victory | Task 9 (endCombat) |
| §5 Content system — registries + validation | Tasks 2, 3, 4, 5, 6, 7 |
| §5.4 v1 content — 1 class, 1 location, 1 monster, 1 encounter, 4 items | Tasks 3–6 |
| §6.4 Button bar — exploration + combat | Tasks 16, 17 |
| §6.5 Inventory click → InspectModal | Tasks 14, 15 |
| Character creation flow | Tasks 12, 13 |
| Save format works through new state shape (already version 1) | implicit via Plan 1 save/load |

Deferred to later plans (no task in this plan):
- Story beats and stage transitions — Plan 3
- Narrative-choice combat (the Call) — Plan 3
- Other three classes + their opening scenes — Plans 4, 5
- Signature move resolvers — Plan 4
- Additional locations / monsters / items — Plan 5
- Map modal + compass — Plan 5
- Set-piece animations + a11y polish — Plan 6

---

## Done definition

This plan is complete when:

1. All 18 tasks above have all checkboxes marked done.
2. `npm run dev` boots; the game flow described in Task 18 Step 2 works end-to-end (character creation → opening → first combat → win/lose → save restored on reload).
3. `npm run test`, `npm run check`, `npm run build` all succeed cleanly.
4. The git log shows ~18 atomic commits, one per task.
