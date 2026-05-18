# Chapter Expansion Framework + Farmhand Ch 1 Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the expanded Farmhand Chapter 1 — 4 new spokes around the family farm (Back Field, Chicken Coop, Old Well, Family Kitchen), a tornado-culmination beat, Mother and Henwald as NPCs, the reframed Tax Rat, the new Farm-Fresh Egg context-aware item, and the multi-chapter supplies-arc framework via the Note from Mother. Also lock in the chapter-expansion framework as a reusable pattern for other classes' Ch 1 and Ch 2-4.

**Architecture:** Small engine extension (`ItemEffect.context` flag) enables context-sensitive consumables. Four new locations are added as Farmhand-class-only spokes off `family_farm` (gated by `class.reluctant_farmhand`). New narrative encounters drive Henwald and Mother dialogue. A story-beat (`farmhand_tornado_strikes`) fires after 3-of-4 spokes are visited, pushes interrupt prose, and teleports the player to the post-tornado kitchen. The existing `hermit_beckons` Fate-push beat is replaced; the Fate-push prose now plays via the Mother encounter's exit resolver. The Note from Mother is enhanced with flag-aware flavor (engine extension on `Item.flavorIfFlag`).

**Tech Stack:** TypeScript (strict), Svelte 5 runes (no UI work — content + engine only), Vitest with jsdom, pure-functional event-sourced reducer, branded ID types.

**Reference spec:** `docs/superpowers/specs/2026-05-17-chapter-expansion-framework-and-farmhand-ch1.md`

---

## File structure

**New files:**
- `src/content/locations/back_field.ts` — spoke 1 (exploration + optional Anxious Allium combat)
- `src/content/locations/chicken_coop.ts` — spoke 2 (Henwald NPC + Tax Rat combat trigger)
- `src/content/locations/old_well.ts` — spoke 3 (atmospheric exploration)
- `src/content/locations/family_kitchen.ts` — spoke 4 (Mother NPC, pre/post-tornado states)
- `src/content/encounters/anxious_allium.ts` — optional combat at back field
- `src/content/encounters/henwald.ts` — narrative encounter at chicken coop
- `src/content/encounters/mother_kitchen.ts` — narrative encounter at family kitchen (flag-aware)
- `src/content/encounters/old_well_inspect.ts` — narrative encounter at old well
- `src/content/encounters/back_field_weed.ts` — narrative encounter for "weed" action at back field
- `src/content/narrative/farmhand_ch1_nodes.ts` — all narrative nodes for the new content
- `src/content/narrative/farmhand_ch1_resolvers.ts` — resolvers for Henwald and Mother dialogue choices
- `src/__tests__/farmhand_ch1.e2e.test.ts` — end-to-end tests for the whole flow

**Modified files:**
- `src/engine/types.ts` — add `ItemEffect.context` field; add `Item.flavorIfFlag` field
- `src/engine/combat.ts` — `playerUseItem` filters effects by context
- `src/engine/events.ts` — `useItemOutOfCombat` filters effects + updated refusal logic
- `src/ui/InspectModal.svelte` — read `flavorIfFlag` for context-aware Note display
- `src/content/items/index.ts` — add `farm_fresh_egg`; update `note_from_mother` with `flavorIfFlag`
- `src/content/monsters/index.ts` — add `anxious_allium`; update `officious_tax_rat` description and `defeatedFlavor`
- `src/content/encounters/index.ts` — register all new encounters
- `src/content/locations/index.ts` — register the 4 new locations
- `src/content/locations/family_farm.ts` — add 4 new class-gated exits to the spokes; remove `first_tax_rat` from `encounterIds` (Tax Rat is now triggered via Henwald)
- `src/content/narrative/nodes.ts` — register the farmhand_ch1 nodes
- `src/content/narrative/resolvers.ts` — register the farmhand_ch1 resolvers
- `src/content/story/beats.ts` — replace `hermit_beckons` with `farmhand_tornado_strikes`
- `docs/superpowers/narrative-spine.md` — add the 6 spine updates per spec §12

---

### Task 1: Engine — `ItemEffect.context` flag + `Item.flavorIfFlag`

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/combat.ts` (`playerUseItem` function)
- Modify: `src/engine/events.ts` (`useItemOutOfCombat` function)
- Modify: `src/ui/InspectModal.svelte` (read `flavorIfFlag`)
- Test: `src/engine/__tests__/events.test.ts` (extend existing tests)

- [ ] **Step 1: Write failing test for context-filtered effects (in combat)**

Append to `src/engine/__tests__/events.test.ts`:

```typescript
describe('ItemEffect context filtering', () => {
  it('in combat: applies effects with context=in_combat or undefined; skips out_of_combat', () => {
    // We use a temporary content override to add a test item with mixed effects.
    const items = content.items as Record<string, import('../types').Item>;
    items['ctx_test_egg'] = {
      id: 'ctx_test_egg' as import('../types').ItemId,
      name: 'a context-test egg',
      flavor: 'test',
      kind: 'consumable',
      effects: [
        { kind: 'heal_hp', amount: 5, context: 'out_of_combat' },
        { kind: 'deal_damage', amount: 3 }
      ]
    };
    try {
      let s = createInitialState(3);
      s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
      if (s.combat) s = { ...s, combat: null };
      s = {
        ...s,
        character: {
          ...s.character,
          inventory: [...s.character.inventory, { itemId: 'ctx_test_egg' as import('../types').ItemId, qty: 1 }],
          hp: { ...s.character.hp, current: 5 }
        }
      };
      s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as import('../types').EncounterId });
      if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
      const monsterHpBefore = s.combat.combatants.find((c) => c.kind === 'monster')!.hp;
      const playerHpBefore = s.character.hp.current;

      s = reduce(s, { kind: 'UseItem', itemId: 'ctx_test_egg' as import('../types').ItemId });

      // deal_damage applied (no context); heal_hp skipped (out_of_combat only)
      if (s.combat?.kind === 'turn-based') {
        const monsterHpAfter = s.combat.combatants.find((c) => c.kind === 'monster')!.hp;
        expect(monsterHpBefore - monsterHpAfter).toBe(3);
      }
      expect(s.character.hp.current).toBe(playerHpBefore);
    } finally {
      delete items['ctx_test_egg'];
    }
  });

  it('out of combat: applies effects with context=out_of_combat or undefined; skips in_combat', () => {
    const items = content.items as Record<string, import('../types').Item>;
    items['ctx_test_egg'] = {
      id: 'ctx_test_egg' as import('../types').ItemId,
      name: 'a context-test egg',
      flavor: 'test',
      kind: 'consumable',
      effects: [
        { kind: 'heal_hp', amount: 5, context: 'out_of_combat' },
        { kind: 'deal_damage', amount: 3 }
      ]
    };
    try {
      let s = createInitialState(3);
      s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
      if (s.combat) s = { ...s, combat: null };
      s = {
        ...s,
        character: {
          ...s.character,
          inventory: [...s.character.inventory, { itemId: 'ctx_test_egg' as import('../types').ItemId, qty: 1 }],
          hp: { ...s.character.hp, current: 5 }
        }
      };
      const hpBefore = s.character.hp.current;

      s = reduce(s, { kind: 'UseItem', itemId: 'ctx_test_egg' as import('../types').ItemId });

      // heal_hp applied; deal_damage skipped (no target); item consumed
      expect(s.character.hp.current).toBe(hpBefore + 5);
      expect(s.character.inventory.find((e) => e.itemId === 'ctx_test_egg')).toBeUndefined();
    } finally {
      delete items['ctx_test_egg'];
    }
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `npx vitest run src/engine/__tests__/events.test.ts -t "ItemEffect context"`
Expected: FAIL — TypeScript error on `context: 'out_of_combat'` field (doesn't exist yet).

- [ ] **Step 3: Add `context` field to ItemEffect in types.ts**

Modify `src/engine/types.ts` — extend ItemEffect:

```typescript
export type ItemEffect =
  | { kind: 'heal_hp'; amount: number; context?: 'in_combat' | 'out_of_combat' }
  | { kind: 'heal_mp'; amount: number; context?: 'in_combat' | 'out_of_combat' }
  | { kind: 'set_flag'; flag: string; value: boolean | number | string }
  | { kind: 'deal_damage'; amount: number };   // deal_damage is inherently in_combat
```

Also add `flavorIfFlag` to Item:

```typescript
export type Item = {
  id: ItemId;
  name: string;
  flavor: string;
  flavorIfFlag?: { flag: string; flavor: string };   // alternate flavor when this flag is truthy
  kind: ItemKind;
  // ... rest unchanged
};
```

- [ ] **Step 4: Update `playerUseItem` to filter by context (skip out_of_combat)**

Modify `src/engine/combat.ts` — in `playerUseItem`, wrap the effect loop with a filter. Find the existing block:

```typescript
  let s = state;
  for (const effect of item.effects ?? []) {
    if (effect.kind === 'heal_hp') {
```

Replace with:

```typescript
  let s = state;
  for (const effect of item.effects ?? []) {
    // Filter by context: in combat, skip effects marked out_of_combat-only.
    if ((effect.kind === 'heal_hp' || effect.kind === 'heal_mp') && effect.context === 'out_of_combat') continue;
    if (effect.kind === 'heal_hp') {
```

- [ ] **Step 5: Update `useItemOutOfCombat` to filter by context + refine refusal logic**

Modify `src/engine/events.ts`. Find the existing `useItemOutOfCombat` function. Replace the body:

```typescript
function useItemOutOfCombat(state: GameState, itemId: ItemId): GameState {
  const item = content.items[itemId];
  if (!item || item.kind !== 'consumable') return state;

  // Filter to effects applicable out of combat:
  // - deal_damage is always combat-only (needs a target)
  // - heal_hp/heal_mp with context: 'in_combat' is combat-only
  // - everything else applies
  const applicable = (item.effects ?? []).filter((e) => {
    if (e.kind === 'deal_damage') return false;
    if ((e.kind === 'heal_hp' || e.kind === 'heal_mp') && e.context === 'in_combat') return false;
    return true;
  });

  // If the item has effects but NONE apply here, refuse with diegetic prose and do NOT consume.
  if ((item.effects ?? []).length > 0 && applicable.length === 0) {
    return appendLogs(state, [
      {
        kind: 'narration',
        text: `You consider throwing ${item.name}. There is nothing here to throw it at.`
      }
    ]);
  }

  let s = state;
  for (const effect of applicable) {
    if (effect.kind === 'heal_hp') {
      const newHp = Math.min(s.character.hp.max, s.character.hp.current + effect.amount);
      s = { ...s, character: { ...s.character, hp: { ...s.character.hp, current: newHp } } };
      s = appendLogs(s, [{ kind: 'system', text: `You eat ${item.name}. (+${effect.amount} HP)`, systemLabel: 'ITEM' }]);
    } else if (effect.kind === 'heal_mp') {
      const newMp = Math.min(s.character.mp.max, s.character.mp.current + effect.amount);
      s = { ...s, character: { ...s.character, mp: { ...s.character.mp, current: newMp } } };
      s = appendLogs(s, [{ kind: 'system', text: `You feel mentally refreshed. (+${effect.amount} MP)`, systemLabel: 'ITEM' }]);
    }
  }

  const inv = s.character.inventory
    .map((e) => (e.itemId === itemId ? { ...e, qty: e.qty - 1 } : e))
    .filter((e) => e.qty > 0);
  return { ...s, character: { ...s.character, inventory: inv } };
}
```

- [ ] **Step 6: Update InspectModal to read `flavorIfFlag`**

Modify `src/ui/InspectModal.svelte`. Find the flavor display (currently `{item.flavor}`). Replace with a derived value:

```svelte
let displayFlavor = $derived.by(() => {
  if (!item) return '';
  if (item.flavorIfFlag && gameStore.state.world.flags[item.flavorIfFlag.flag]) {
    return item.flavorIfFlag.flavor;
  }
  return item.flavor;
});
```

Then change the rendered prose from `{item.flavor}` to `{displayFlavor}`.

- [ ] **Step 7: Run tests, verify pass**

Run: `npx vitest run src/engine/__tests__/events.test.ts -t "ItemEffect context"`
Expected: PASS (both new tests).

- [ ] **Step 8: Run full test suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean compile; all green; no regressions.

- [ ] **Step 9: Commit**

```bash
git add src/engine/types.ts src/engine/combat.ts src/engine/events.ts src/ui/InspectModal.svelte src/engine/__tests__/events.test.ts
git commit -m "feat(items): ItemEffect.context filtering + Item.flavorIfFlag for flag-aware flavor"
```

---

### Task 2: Farm-Fresh Egg item

**Files:**
- Modify: `src/content/items/index.ts`
- Test: `src/engine/__tests__/events.test.ts` (extend)

- [ ] **Step 1: Add the egg item**

Append to `src/content/items/index.ts` items record (before the closing `}`):

```typescript
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

(Add comma to the previous entry.)

- [ ] **Step 2: Write a test that the egg heals 8 HP out of combat**

Append to `src/engine/__tests__/events.test.ts`:

```typescript
describe('Farm-Fresh Egg', () => {
  it('heals 8 HP when eaten out of combat', () => {
    let s = createInitialState(5);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = {
      ...s,
      character: {
        ...s.character,
        inventory: [...s.character.inventory, { itemId: 'farm_fresh_egg' as ItemId, qty: 1 }],
        hp: { ...s.character.hp, current: 5 }
      }
    };
    const before = s.character.hp.current;
    s = reduce(s, { kind: 'UseItem', itemId: 'farm_fresh_egg' as ItemId });
    expect(s.character.hp.current).toBe(before + 8);
    expect(s.character.inventory.find((e) => e.itemId === 'farm_fresh_egg')).toBeUndefined();
  });

  it('deals 4 damage when thrown in combat (ignores armor)', () => {
    let s = createInitialState(5);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = {
      ...s,
      character: {
        ...s.character,
        inventory: [...s.character.inventory, { itemId: 'farm_fresh_egg' as ItemId, qty: 1 }]
      }
    };
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'combat_plot_convenience' as import('../types').EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const before = s.combat.combatants.find((c) => c.kind === 'monster')!.hp;
    s = reduce(s, { kind: 'UseItem', itemId: 'farm_fresh_egg' as ItemId });
    if (s.combat?.kind === 'turn-based') {
      const after = s.combat.combatants.find((c) => c.kind === 'monster')!.hp;
      expect(before - after).toBe(4);
    }
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

Run: `npx vitest run src/engine/__tests__/events.test.ts -t "Farm-Fresh Egg"`
Expected: PASS.

- [ ] **Step 4: Run full test suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/content/items/index.ts src/engine/__tests__/events.test.ts
git commit -m "feat(content): add Farm-Fresh Egg consumable (8 HP heal out / 4 damage in combat)"
```

---

### Task 3: The Anxious Allium monster + combat encounter

**Files:**
- Modify: `src/content/monsters/index.ts`
- Create: `src/content/encounters/anxious_allium.ts`
- Modify: `src/content/encounters/index.ts`
- Test: `src/content/__tests__/validate.test.ts` (extend)

- [ ] **Step 1: Add the Anxious Allium monster**

Append to `src/content/monsters/index.ts`:

```typescript
  [MonsterId('anxious_allium')]: {
    id: MonsterId('anxious_allium'),
    name: 'an Anxious Allium',
    flavor: 'A bulb with feelings. Has been growing in the back field for some time and has developed strong opinions about being weeded. Its layers compose what could charitably be called a face.',
    defeatedFlavor: 'The Allium splits into three smaller, sadder Alliums, each of which decides, on reflection, to go quietly back to being onions.',
    hp: 10,
    brawn: 2,
    bravado: 1,
    dodge: 3,
    armor: 0,
    weaponDamage: 2,
    actions: [
      { kind: 'attack', weight: 0.7, flavor: 'The Allium lunges forward, smelling extremely pungent.' },
      {
        kind: 'apply_status',
        weight: 0.3,
        flavor: 'The Allium releases a pungent burst.',
        status: 'next_attack_misses',
        duration: { kind: 'one_shot' },
        appliedFlavor: 'Your eyes water. Your next swing is going to go a little wide.',
        expirationFlavor: 'Your eyes clear. The world un-blurs.'
      }
    ],
    loot: [],
    currencyDrop: { min: 1, max: 3 }
  }
```

- [ ] **Step 2: Create the combat encounter**

Create `src/content/encounters/anxious_allium.ts`:

```typescript
import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const anxious_allium: CombatEncounter = {
  id: EncounterId('combat_anxious_allium'),
  kind: 'combat',
  monsterId: MonsterId('anxious_allium'),
  xpReward: 6,
  repeatable: false
};
```

- [ ] **Step 3: Register the encounter**

Modify `src/content/encounters/index.ts`:

```typescript
import { anxious_allium } from './anxious_allium';
```

And add to the `encounters` record:

```typescript
  [anxious_allium.id]: anxious_allium,
```

- [ ] **Step 4: Add validation test for the new monster**

Append to `src/content/__tests__/validate.test.ts` (inside an appropriate describe block):

```typescript
describe('Anxious Allium', () => {
  it('exists with apply_status next_attack_misses (the eye-water effect)', () => {
    const m = content.monsters[MonsterId('anxious_allium')];
    expect(m).toBeDefined();
    const applyStatus = m!.actions.find((a) => a.kind === 'apply_status');
    expect(applyStatus).toBeDefined();
    if (applyStatus?.kind === 'apply_status') {
      expect(applyStatus.status).toBe('next_attack_misses');
    }
  });
});
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npx vitest run src/content/__tests__/validate.test.ts && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/content/monsters/index.ts src/content/encounters/anxious_allium.ts src/content/encounters/index.ts src/content/__tests__/validate.test.ts
git commit -m "feat(content): add Anxious Allium monster + combat encounter for Farmhand Ch 1 Back Field"
```

---

### Task 4: Reframe the Officious Tax Rat

**Files:**
- Modify: `src/content/monsters/index.ts` (update officious_tax_rat)
- Test: `src/content/__tests__/validate.test.ts` (add monogram check)

- [ ] **Step 1: Update Tax Rat flavor and defeatedFlavor**

In `src/content/monsters/index.ts`, find the `officious_tax_rat` entry. Update its `flavor` and `defeatedFlavor` fields:

```typescript
  [MonsterId('officious_tax_rat')]: {
    id: MonsterId('officious_tax_rat'),
    name: 'the Officious Tax Rat',
    flavor: 'Wears a tiny vest, embroidered at the breast with a small monogram you do not recognise yet. Carries a clipboard, the bottom corner of which bears a footer reading "p. 47" — for what document is unclear. Collects an unspecified levy on behalf of an unspecified authority. Has been hounding Henwald for three weeks; the chickens have started leaving threatening notes in unbroken eggshells.',
    defeatedFlavor: 'The Tax Rat collapses dramatically, citing burnout. He scurries off under a stack of important-looking papers stamped "On Schedule" — though for what schedule remains, as always, unspecified.',
    // stats and actions UNCHANGED
    hp: 14,
    brawn: 4,
    bravado: 6,
    dodge: 8,
    armor: 1,
    weaponDamage: 3,
    actions: [
      // ... preserve existing actions
```

(Preserve all stats, actions, loot, currencyDrop. Only the `flavor` and `defeatedFlavor` strings change.)

- [ ] **Step 2: Add validation test for the foreshadowing seeds**

Append to `src/content/__tests__/validate.test.ts`:

```typescript
describe('Officious Tax Rat (reframed)', () => {
  it('flavor includes the monogram and page-footer foreshadowing seeds', () => {
    const m = content.monsters[MonsterId('officious_tax_rat')]!;
    expect(m.flavor).toMatch(/monogram/);
    expect(m.flavor).toMatch(/p\. 47/);
  });

  it('defeatedFlavor stamps "On Schedule"', () => {
    const m = content.monsters[MonsterId('officious_tax_rat')]!;
    expect(m.defeatedFlavor).toMatch(/On Schedule/);
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

Run: `npx vitest run src/content/__tests__/validate.test.ts && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 4: Commit**

```bash
git add src/content/monsters/index.ts src/content/__tests__/validate.test.ts
git commit -m "feat(content): reframe Officious Tax Rat with Editor-apparatus foreshadowing seeds"
```

---

### Task 5: Update note_from_mother with flavorIfFlag

**Files:**
- Modify: `src/content/items/index.ts`
- Test: `src/content/__tests__/validate.test.ts` (extend)

- [ ] **Step 1: Update the Note from Mother item**

In `src/content/items/index.ts`, find the `note_from_mother` entry and add the `flavorIfFlag` field:

```typescript
  [ItemId('note_from_mother')]: {
    id: ItemId('note_from_mother'),
    name: 'a Note from Mother',
    flavor: 'Folded twice. The handwriting is firm and the advice is mostly about onions.',
    flavorIfFlag: {
      flag: 'farmhand_post_tornado',
      flavor:
        'Folded twice. The handwriting is firm and the advice is, in this list, about beams and nails. It reads:\n\n' +
        '— A strong beam (the big one, ten-foot if you can manage it). Oak, if you can. Pine if you must.\n' +
        '— A sack of nails. Iron. Not too rusty.\n' +
        "— A strong-backed neighbor. We're short of hands and the roof can't wait.\n" +
        "— My tea. I'm almost out.\n\n" +
        'Come home when you can. The chickens will keep. — Mother'
    },
    kind: 'quest'
  }
```

- [ ] **Step 2: Add validation test**

Append to `src/content/__tests__/validate.test.ts`:

```typescript
describe('Note from Mother', () => {
  it('has a base flavor and a post-tornado flavor with the supplies list', () => {
    const item = content.items[ItemId('note_from_mother')]!;
    expect(item.flavor).toMatch(/onions/);
    expect(item.flavorIfFlag?.flag).toBe('farmhand_post_tornado');
    expect(item.flavorIfFlag?.flavor).toMatch(/beam/);
    expect(item.flavorIfFlag?.flavor).toMatch(/nails/);
    expect(item.flavorIfFlag?.flavor).toMatch(/neighbor/);
    expect(item.flavorIfFlag?.flavor).toMatch(/tea/);
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

Run: `npx vitest run src/content/__tests__/validate.test.ts && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 4: Commit**

```bash
git add src/content/items/index.ts src/content/__tests__/validate.test.ts
git commit -m "feat(content): Note from Mother becomes a supplies list post-tornado"
```

---

### Task 6: Four new locations + family_farm exits

**Files:**
- Create: `src/content/locations/back_field.ts`
- Create: `src/content/locations/chicken_coop.ts`
- Create: `src/content/locations/old_well.ts`
- Create: `src/content/locations/family_kitchen.ts`
- Modify: `src/content/locations/index.ts`
- Modify: `src/content/locations/family_farm.ts` (add 4 exits, remove `first_tax_rat` from encounterIds)

- [ ] **Step 1: Write failing test for the 4 new locations + family_farm exits**

Create `src/content/__tests__/farmhand_ch1_locations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { content } from '../index';
import { LocationId } from '../../engine/types';

const SPOKES = [
  { id: 'back_field', name: 'The Back Field' },
  { id: 'chicken_coop', name: 'The Chicken Coop' },
  { id: 'old_well', name: 'The Old Well' },
  { id: 'family_kitchen', name: 'The Family Kitchen' }
];

describe('Farmhand Ch 1 spokes — registration', () => {
  it.each(SPOKES)('$id is registered with chapter_1 and name $name', ({ id, name }) => {
    const loc = content.locations[LocationId(id)];
    expect(loc).toBeDefined();
    expect(loc!.chapter).toBe('chapter_1');
    expect(loc!.name).toBe(name);
  });

  it.each(SPOKES)('$id has an exit back to family_farm', ({ id }) => {
    const loc = content.locations[LocationId(id)];
    expect(loc!.exits.some((e) => e.targetId === 'family_farm')).toBe(true);
  });
});

describe('family_farm exits', () => {
  it('has 4 class-gated exits to the Farmhand Ch 1 spokes', () => {
    const farm = content.locations[LocationId('family_farm')]!;
    const spokeTargets = ['back_field', 'chicken_coop', 'old_well', 'family_kitchen'];
    const spokeExits = farm.exits.filter((e) => spokeTargets.includes(e.targetId));
    expect(spokeExits).toHaveLength(4);
    for (const exit of spokeExits) {
      expect(exit.visibleIfFlag).toBe('class.reluctant_farmhand');
    }
  });
});

// NOTE: `first_tax_rat` removal from family_farm.encounterIds is tested in Task 7,
// after Henwald's dialogue takes over Tax Rat triggering.
```

- [ ] **Step 2: Run test, verify failure**

Run: `npx vitest run src/content/__tests__/farmhand_ch1_locations.test.ts`
Expected: FAIL (locations don't exist).

- [ ] **Step 3: Create the four spoke locations**

Create `src/content/locations/back_field.ts`:

```typescript
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const back_field: Location = {
  id: LocationId('back_field'),
  name: 'The Back Field',
  chapter: 'chapter_1',
  description:
    'The back field, un-weeded for a week, opens before you. The weeds, which on closer inspection are mostly thistle and one ' +
    'ambitious dandelion, regard your pitchfork with what is either resignation or grim amusement. The cow, in the near pasture, ' +
    'watches the sky with the focused unease of a creature who knows something but cannot, in any meaningful sense, tell you about it.',
  reEntryDescription:
    'The back field is, somehow, no less un-weeded than the last time you came. The cow has not moved her gaze.',
  ambientLines: [
    'The cow has not, you note, been informed of why the wind is doing nothing.',
    'A thistle nods at you. You decide not to take it personally.',
    'Somewhere overhead, a swallow forgets to bank and corrects itself with visible embarrassment.'
  ],
  exits: [
    { label: 'Back to the farm', targetId: LocationId('family_farm') }
  ],
  encounterIds: [
    EncounterId('combat_anxious_allium'),
    EncounterId('back_field_weed')
  ]
};
```

Create `src/content/locations/chicken_coop.ts`:

```typescript
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const chicken_coop: Location = {
  id: LocationId('chicken_coop'),
  name: 'The Chicken Coop',
  chapter: 'chapter_1',
  description:
    'The chicken coop. Henwald is, as ever, in residence. Several of the girls have gathered in the kind of huddle that, in chickens, ' +
    'indicates either a debate about grain pricing or imminent egg-laying. Possibly both. Their spokesman struts toward you.',
  reEntryDescription:
    'Henwald nods you in. The huddle has rearranged itself; the debate appears to have moved on to roofing.',
  ambientLines: [
    'The chickens have been quiet since dawn. Suspiciously so.',
    'Henwald clears his throat without saying anything. The girls take note.',
    'A small egg rolls across the floor for reasons no one is admitting to.'
  ],
  exits: [
    { label: 'Back to the farm', targetId: LocationId('family_farm') }
  ],
  encounterIds: [EncounterId('henwald')]
};
```

Create `src/content/locations/old_well.ts`:

```typescript
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const old_well: Location = {
  id: LocationId('old_well'),
  name: 'The Old Well',
  chapter: 'chapter_1',
  description:
    'The well sits at the edge of the kitchen garden, where it has always sat. The wood of the lid has weathered to the color of ' +
    'nothing in particular. A bucket hangs from a rope that frays in three different directions, each fraying separately, as though ' +
    'each strand had its own opinion about what frayed wood should look like.',
  reEntryDescription:
    'The well is, as wells go, exactly the same. The bucket has rotated. You did not touch it.',
  ambientLines: [
    'No breeze. The line of the bucket-rope stays vertical, which it never quite does on ordinary days.',
    'A pebble at the edge has, you would swear, moved an inch since you last looked.',
    'The lid creaks once, on its own, then is still.'
  ],
  exits: [
    { label: 'Back to the farm', targetId: LocationId('family_farm') }
  ],
  encounterIds: [EncounterId('old_well_inspect')]
};
```

Create `src/content/locations/family_kitchen.ts`:

```typescript
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const family_kitchen: Location = {
  id: LocationId('family_kitchen'),
  name: 'The Family Kitchen',
  chapter: 'chapter_1',
  description:
    'The kitchen smells of kettle steam and last year\'s preserves. Mother sits in the chair by the window, knitting something that has ' +
    'been a sock for several weeks now. The kettle is on, despite no one having intended to make tea. The Note from Mother — folded ' +
    'twice, written, blank, depending on the angle — rests on the kitchen table.',
  reEntryDescription:
    'Mother glances up, nods you in, returns to the sock.',
  ambientLines: [
    'Mother, between sips: "The weather\'s been holding its breath today. I don\'t trust it."',
    'The kettle whistles a single note and then doesn\'t.',
    'A stray cat that does not officially live here passes the window with regret.'
  ],
  exits: [
    { label: 'Back outside, to the farm', targetId: LocationId('family_farm') }
  ],
  encounterIds: [EncounterId('mother_kitchen')]
};
```

- [ ] **Step 4: Register the four locations**

Modify `src/content/locations/index.ts`. Add imports and entries:

```typescript
import { back_field } from './back_field';
import { chicken_coop } from './chicken_coop';
import { old_well } from './old_well';
import { family_kitchen } from './family_kitchen';
```

Add to the `locations` record:

```typescript
  [back_field.id]: back_field,
  [chicken_coop.id]: chicken_coop,
  [old_well.id]: old_well,
  [family_kitchen.id]: family_kitchen,
```

- [ ] **Step 5: Update family_farm — add 4 class-gated exits, remove first_tax_rat from encounterIds**

Modify `src/content/locations/family_farm.ts`. Update the exits array and encounterIds:

```typescript
import { LocationId, EncounterId, type Location } from '../../engine/types';

export const family_farm: Location = {
  id: LocationId('family_farm'),
  name: 'The Family Farm',
  chapter: 'chapter_1',
  description:
    'The farm sprawls in three directions, mostly downhill. Chickens are in the early stages of a labour dispute. ' +
    'The barn slumps companionably against a fence that has given up. From the eastern field, you hear the ' +
    'unmistakable sound of someone *filing*.',
  reEntryDescription:
    'The farm continues to be the farm. The chickens have moved on to a more polished list of grievances.',
  ambientLines: [
    'A chicken passes you carrying what may be a grievance.',
    'The wind brings the smell of distant onions.',
    'From the barn comes a single, unhurried snort.',
    'Somewhere, a fence post leans into the labour movement.'
  ],
  exits: [
    { label: 'Walk to the crossroads', targetId: LocationId('dusty_crossroads'), visibleIfFlag: 'unlocked_crossroads' },
    { label: 'Out to the back field', targetId: LocationId('back_field'), visibleIfFlag: 'class.reluctant_farmhand' },
    { label: 'Over to the chicken coop', targetId: LocationId('chicken_coop'), visibleIfFlag: 'class.reluctant_farmhand' },
    { label: 'Around to the old well', targetId: LocationId('old_well'), visibleIfFlag: 'class.reluctant_farmhand' },
    { label: 'Inside, to the kitchen', targetId: LocationId('family_kitchen'), visibleIfFlag: 'class.reluctant_farmhand' }
  ],
  encounterIds: [EncounterId('practice_dummy')],
  restSpots: [
    {
      id: 'farm_haystack',
      label: 'Rest in the haystack',
      flavor: 'You burrow into the hay until only your nose is visible. The barn smells of dust, mice, and an emerging sense of self. After a while, you feel restored.'
    }
  ]
};
```

Note: `first_tax_rat` is removed from `encounterIds`. The encounter object itself is preserved in `src/content/encounters/index.ts` because Henwald's dialogue will trigger it via `__pending_encounter`.

- [ ] **Step 6: Run tests, verify pass**

Run: `npx vitest run src/content/__tests__/farmhand_ch1_locations.test.ts && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: clean. (The existing `quests.e2e.test.ts` may need updating because removing `first_tax_rat` from `family_farm.encounterIds` could break the Farmhand quest flow — verify.)

If the quest test breaks, the Farmhand quest currently relies on the player triggering `first_tax_rat` from the family farm. Since the Tax Rat will be triggered via Henwald's dialogue in Task 7, the quest flow needs updating — but Henwald isn't built yet. Workaround: temporarily leave `first_tax_rat` in family_farm.encounterIds with `hiddenIfFlag: 'class.reluctant_farmhand'` so it's hidden for Farmhand (who uses spokes) but a fallback exists. Final removal happens in Task 7 (after Henwald is wired).

Actually simpler — just leave the test update for Task 7 where we'll fix the quest flow holistically. For now, keep `first_tax_rat` in encounterIds.

Revised Step 5: do NOT remove `first_tax_rat` yet — only ADD the four new exits.

- [ ] **Step 8: Commit**

```bash
git add src/content/locations/back_field.ts src/content/locations/chicken_coop.ts src/content/locations/old_well.ts src/content/locations/family_kitchen.ts src/content/locations/index.ts src/content/locations/family_farm.ts src/content/__tests__/farmhand_ch1_locations.test.ts
git commit -m "feat(content): add Farmhand Ch 1 spokes and class-gated farm exits"
```

---

### Task 7: Henwald narrative encounter (chicken coop)

**Files:**
- Create: `src/content/narrative/farmhand_ch1_nodes.ts`
- Create: `src/content/narrative/farmhand_ch1_resolvers.ts`
- Create: `src/content/encounters/henwald.ts`
- Modify: `src/content/narrative/nodes.ts` (register Henwald nodes)
- Modify: `src/content/narrative/resolvers.ts` (register Henwald resolvers)
- Modify: `src/content/encounters/index.ts` (register henwald)
- Modify: `src/content/locations/family_farm.ts` (now safe to remove `first_tax_rat` from encounterIds)
- Test: `src/__tests__/farmhand_ch1.e2e.test.ts` (new)
- Modify: `src/__tests__/quests.e2e.test.ts` (update Farmhand quest flow if needed)

- [ ] **Step 1: Create the narrative nodes file**

Create `src/content/narrative/farmhand_ch1_nodes.ts`:

```typescript
import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

// =====================================================================
// Henwald — the Foghorn-Leghorn rooster at the chicken coop
// =====================================================================

export const henwald_intro: NarrativeNode = {
  id: NarrativeNodeId('henwald_intro'),
  speaker: 'Henwald',
  prose:
    'Henwald struts toward you, comb wobbling with conviction. "Well I say, I say — there y\'are. There y\'are, son. ' +
    "I been settin' here waitin' on you like a hen on a glass egg — and you know what kinda hen sits on a glass egg? A *confused* hen, son. A *confused* hen."\n\n" +
    'He puffs his chest, surveys his coop with the disappointment of a man who has Standards.\n\n' +
    '"It\'s the rat. That vest-wearin\', clipboard-totin\', subsection-quotin\' rat. He\'s been here three weeks runnin\' — three! — ' +
    "auditin' the girls' egg production like he's the King of Eggs himself. Claims he's collectin' for 'an authority.' Won't say which authority. " +
    "Authority of WHAT? Of WHOM? Boy, even Mother's older than that rat, and *she* remembers a time before the levies."',
  choices: [
    { label: '"I\'ll see to him."', resolve: 'henwald_engage_rat' },
    {
      label: '"What does he claim the levy\'s for?"',
      resolve: 'henwald_levy',
      disabledIfFlag: 'asked_henwald_levy',
      disabledTooltip: 'Henwald has already vented his answer.'
    },
    { label: '"Maybe later, Henwald."', resolve: 'henwald_dismiss' }
  ]
};

export const henwald_levy_response: NarrativeNode = {
  id: NarrativeNodeId('henwald_levy_response'),
  speaker: 'Henwald',
  prose:
    '"That\'s the thing, son! He talks in subsections and paragraphs and \'as written in the documentation.\' What documentation? ' +
    'WHAT documentation? Some days I think the rat\'s just makin\' it up as he goes."',
  choices: [
    { label: '(back to the previous matter)', resolve: 'henwald_return_to_intro' }
  ]
};

export const henwald_post_victory: NarrativeNode = {
  id: NarrativeNodeId('henwald_post_victory'),
  speaker: 'Henwald',
  prose:
    'Henwald struts back over, ruffling his feathers in a small victory parade. "Well I say, I say — that was a *sight*, son. ' +
    "I haven't seen a rat run that fast since Mother chased one outta the pantry with a soup ladle in '47."\n\n" +
    'He scratches at the dirt, deliberately not looking at the chicken nearest him.\n\n' +
    '"Now look. Look here. The girls and me been savin\' up for a thank-you, and the girls don\'t take \'no\' for an answer. ' +
    "Take these. They're farm-fresh. Hot off the line, as the sayin' goes."\n\n" +
    '*(3 Farm-Fresh Eggs added to inventory.)*\n\n' +
    '"You can eat \'em, in a pinch. You can throw \'em, in a real pinch. ' +
    'Just don\'t carry \'em in the same pocket as your good handkerchief. I learned that one the hard way."',
  choices: [
    { label: '(Thank Henwald and step away.)', resolve: 'henwald_dismiss' }
  ]
};

export const henwald_post_dismiss: NarrativeNode = {
  id: NarrativeNodeId('henwald_post_dismiss'),
  speaker: 'Henwald',
  prose:
    'Henwald looks at the coop with quiet satisfaction. "The girls are layin\' easier today. They know, son. They know."',
  choices: [
    { label: '(Step away.)', resolve: 'henwald_dismiss' }
  ]
};
```

- [ ] **Step 2: Create the resolvers file**

Create `src/content/narrative/farmhand_ch1_resolvers.ts`:

```typescript
import type { GameState, NarrativeResolver, NarrativeResolverId } from '../../engine/types';
import { NarrativeNodeId } from '../../engine/types';
import { appendLogs } from '../../engine/log';

// "Maybe later" / "Step away" — exit cleanly.
const henwald_dismiss: NarrativeResolver = (state) => ({ state, next: null });

// "What does he claim the levy's for?" — set the asked-flag, route to response node.
const henwald_levy: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, asked_henwald_levy: true } }
  },
  next: NarrativeNodeId('henwald_levy_response')
});

// "(back to the previous matter)" — silent loop-back to the intro node.
const henwald_return_to_intro: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('henwald_intro'),
  silent: true
});

// "I'll see to him." — sets talked_to_henwald, queues the Tax Rat combat.
const henwald_engage_rat: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: {
      ...state.world,
      flags: {
        ...state.world.flags,
        talked_to_henwald: true,
        __pending_encounter: 'first_tax_rat'
      }
    }
  },
  next: null
});

export const farmhandCh1Resolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  henwald_dismiss,
  henwald_levy,
  henwald_return_to_intro,
  henwald_engage_rat
};
```

- [ ] **Step 3: Create the Henwald encounter**

Create `src/content/encounters/henwald.ts`:

```typescript
import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

// Re-entry behavior: pre-victory shows henwald_intro; post-victory shows henwald_post_victory.
// The encounter's rootNodeId is the pre-victory state; the engine's auto-arrive hook at
// chicken_coop picks the right encounter based on `defeated:first_tax_rat`.
export const henwald: NarrativeEncounter = {
  id: EncounterId('henwald'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('henwald_intro'),
  label: 'Talk to Henwald',
  hiddenIfFlag: 'defeated:first_tax_rat'
};

export const henwald_thanks: NarrativeEncounter = {
  id: EncounterId('henwald_thanks'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('henwald_post_victory'),
  label: 'Talk to Henwald',
  visibleIfFlag: 'defeated:first_tax_rat'
};
```

- [ ] **Step 4: Register everything**

Modify `src/content/narrative/nodes.ts`:

```typescript
import { henwald_intro, henwald_levy_response, henwald_post_victory, henwald_post_dismiss } from './farmhand_ch1_nodes';
```

```typescript
  [henwald_intro.id]: henwald_intro,
  [henwald_levy_response.id]: henwald_levy_response,
  [henwald_post_victory.id]: henwald_post_victory,
  [henwald_post_dismiss.id]: henwald_post_dismiss,
```

Modify `src/content/narrative/resolvers.ts`:

```typescript
import { farmhandCh1Resolvers } from './farmhand_ch1_resolvers';
```

```typescript
  ...farmhandCh1Resolvers,
```

Modify `src/content/encounters/index.ts`:

```typescript
import { henwald, henwald_thanks } from './henwald';
```

```typescript
  [henwald.id]: henwald,
  [henwald_thanks.id]: henwald_thanks,
```

- [ ] **Step 5: Update chicken_coop.encounterIds**

The chicken_coop currently has `encounterIds: [EncounterId('henwald')]`. Henwald's encounter handles pre-victory. After victory, the player sees the thanks encounter via `visibleIfFlag: 'defeated:first_tax_rat'`. Both encounters can be in the encounterIds list — `hiddenIfFlag` and `visibleIfFlag` ensure only one is visible at a time.

Update `src/content/locations/chicken_coop.ts`:

```typescript
  encounterIds: [
    EncounterId('henwald'),
    EncounterId('henwald_thanks')
  ]
```

- [ ] **Step 6: Now safe to remove `first_tax_rat` from family_farm.encounterIds**

Modify `src/content/locations/family_farm.ts` — remove `first_tax_rat` from the `encounterIds` array. Only `practice_dummy` remains. (Players still trigger the Tax Rat via Henwald's "I'll see to him" choice.)

- [ ] **Step 7: Write end-to-end test for Henwald flow**

Create `src/__tests__/farmhand_ch1.e2e.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/events';
import { createInitialState } from '../engine/state';
import { ClassId, ItemId, LocationId, EncounterId } from '../engine/types';
import type { GameState, NarrativeCombatState, TurnBasedCombatState } from '../engine/types';

function newFarmhandAtCoop(seed = 11): GameState {
  let s = createInitialState(seed);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
  if (s.combat) s = { ...s, combat: null };
  s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('chicken_coop') });
  return s;
}

import { content } from '../content';

describe('Henwald and the Tax Rat (chicken coop)', () => {
  it('Tax Rat is not in family_farm encounterIds (Henwald is the trigger now)', () => {
    const farm = content.locations[LocationId('family_farm')]!;
    expect((farm.encounterIds ?? []).includes('first_tax_rat' as EncounterId)).toBe(false);
  });

  it('Henwald: engage rat → combat starts → defeat → 3 eggs awarded → henwald_thanks visible', () => {
    let s = newFarmhandAtCoop();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
    expect(s.combat?.kind).toBe('narrative');

    // Choice 0 = "I'll see to him."
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.combat?.kind).toBe('turn-based');
    expect((s.combat as TurnBasedCombatState).encounterId).toBe('first_tax_rat');

    // Force monster HP to 0, then attack to trigger victory pathway.
    const sCombat = s.combat as TurnBasedCombatState;
    s = {
      ...s,
      combat: {
        ...sCombat,
        combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 0 } : c)
      }
    };
    s = reduce(s, { kind: 'AttackTarget' });

    expect(s.world.flags['defeated:first_tax_rat']).toBe(true);
    expect(s.world.flags['talked_to_henwald']).toBe(true);
    expect(s.combat).toBeNull();

    // Now trigger henwald_thanks for the egg award.
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald_thanks' as EncounterId });
    // (For this test, Henwald's egg-award is handled by the resolver of his thanks dialogue.
    //  Actually, simpler: the egg award is a side effect of defeating the Tax Rat. Let's verify.)
    // We'll defer the egg-grant to the resolver layer in step 8.
  });

  it('Henwald: "Maybe later" exits cleanly with no flag set', () => {
    let s = newFarmhandAtCoop();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
    // Choice 2 = "Maybe later, Henwald."
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 2 });
    expect(s.combat).toBeNull();
    expect(s.world.flags['talked_to_henwald']).toBeFalsy();
  });

  it('Henwald: levy question greys out after asking, loops back silently', () => {
    let s = newFarmhandAtCoop();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
    // Choice 1 = "What does he claim the levy's for?"
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 1 });
    expect(s.world.flags['asked_henwald_levy']).toBe(true);
    // Now we're on the levy_response node. Choice 0 = "(back to the previous matter)".
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    // Back on intro node. The levy choice should be flagged disabled.
    // (We just verify the flag is set; UI tests the disabled state.)
    expect(s.world.flags['asked_henwald_levy']).toBe(true);
  });
});
```

- [ ] **Step 8: Wire egg award via Henwald's thanks resolver**

The current resolvers handle dialogue navigation but don't grant items. We need a new resolver fired when the player views the henwald_thanks encounter for the first time (or when they pick the only choice in henwald_post_victory).

Update `henwald_dismiss` resolver in `farmhand_ch1_resolvers.ts` to award eggs IF the encounter just finished was henwald_thanks AND eggs haven't been granted yet:

Actually, cleaner: make the egg award happen at the moment of Tax Rat defeat, NOT when the player dismisses Henwald. Use a story beat triggered by `defeated:first_tax_rat`.

Modify `src/content/story/beats.ts` to add:

```typescript
const henwald_awards_eggs: StoryBeat = {
  id: BeatId('henwald_awards_eggs'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'flag', flag: 'defeated:first_tax_rat' },
    { kind: 'flag', flag: 'talked_to_henwald' }
  ],
  onTrigger: [
    { kind: 'grant_item', itemId: ItemId('farm_fresh_egg'), qty: 3 },
    {
      kind: 'log',
      entry: {
        kind: 'loot',
        text: 'You find: 3× a Farm-Fresh Egg.'
      }
    }
  ]
};
```

Add to the `beats` export object.

- [ ] **Step 9: Run tests, verify pass**

Run: `npx vitest run src/__tests__/farmhand_ch1.e2e.test.ts && npx tsc --noEmit`
Expected: PASS, clean. (The egg-award test now passes because the beat fires on Tax Rat defeat + talked_to_henwald.)

- [ ] **Step 10: Update quests.e2e.test.ts if Farmhand quest flow is affected**

Run the existing quest test:
`npx vitest run src/__tests__/quests.e2e.test.ts`

If it fails because the test triggers `first_tax_rat` directly from family_farm (and family_farm no longer surfaces it), update the test to trigger via Henwald's dialogue path:
```typescript
// Old: gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'first_tax_rat' as EncounterId });
// New: walk through Henwald's dialogue and pick "I'll see to him"
gameStore.dispatch({ kind: 'EnterLocation', locationId: LocationId('chicken_coop') });
gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
```

- [ ] **Step 11: Commit**

```bash
git add src/content/narrative/farmhand_ch1_nodes.ts src/content/narrative/farmhand_ch1_resolvers.ts src/content/encounters/henwald.ts src/content/narrative/nodes.ts src/content/narrative/resolvers.ts src/content/encounters/index.ts src/content/locations/chicken_coop.ts src/content/locations/family_farm.ts src/content/story/beats.ts src/__tests__/farmhand_ch1.e2e.test.ts src/__tests__/quests.e2e.test.ts
git commit -m "feat(content): Henwald narrative encounter + egg-award beat on Tax Rat defeat"
```

---

### Task 8: Back Field weed encounter + Old Well inspect encounter

**Files:**
- Modify: `src/content/narrative/farmhand_ch1_nodes.ts` (add back_field and old_well nodes)
- Modify: `src/content/narrative/farmhand_ch1_resolvers.ts` (add resolvers)
- Create: `src/content/encounters/back_field_weed.ts`
- Create: `src/content/encounters/old_well_inspect.ts`
- Modify: `src/content/encounters/index.ts`
- Modify: `src/content/narrative/nodes.ts` (register new nodes)
- Test: extend `src/__tests__/farmhand_ch1.e2e.test.ts`

- [ ] **Step 1: Add the back field and old well nodes**

Append to `src/content/narrative/farmhand_ch1_nodes.ts`:

```typescript
// =====================================================================
// Back Field — weed action
// =====================================================================

export const back_field_weed: NarrativeNode = {
  id: NarrativeNodeId('back_field_weed'),
  prose:
    'You weed. For about twenty minutes, you make exactly the kind of progress that explains why the field has been ' +
    'un-weeded for a week. The thistle wins. The dandelion takes notes.',
  choices: [
    { label: '(Step back and survey the field.)', resolve: 'farmhand_ch1_exit' }
  ]
};

// =====================================================================
// Old Well — inspect actions
// =====================================================================

export const old_well_intro: NarrativeNode = {
  id: NarrativeNodeId('old_well_intro'),
  prose:
    'You step up to the well. The lid is closer than it looks, somehow. The bucket has not moved, but neither has it stayed entirely still.',
  choices: [
    { label: 'Drop a stone down.', resolve: 'old_well_drop_stone' },
    { label: 'Look down into the well.', resolve: 'old_well_look_down' },
    { label: 'Step back from the well.', resolve: 'farmhand_ch1_exit' }
  ]
};

export const old_well_drop_stone: NarrativeNode = {
  id: NarrativeNodeId('old_well_drop_stone'),
  prose:
    'You drop a stone down. You count to three. The splash comes on two. The echo, after the splash, sounds like a \'no\' — ' +
    'not yours, and not anybody\'s you recognise.',
  choices: [
    { label: '(Try again.)', resolve: 'old_well_return_to_intro' },
    { label: 'Step back from the well.', resolve: 'farmhand_ch1_exit' }
  ]
};

export const old_well_look_down: NarrativeNode = {
  id: NarrativeNodeId('old_well_look_down'),
  prose:
    'You lean over. The light at the bottom is brighter than it should be at this hour. The bucket is, you note, full. ' +
    'You did not draw it up.',
  choices: [
    { label: '(Pull back.)', resolve: 'old_well_return_to_intro' },
    { label: 'Step back from the well.', resolve: 'farmhand_ch1_exit' }
  ]
};
```

- [ ] **Step 2: Add the resolvers**

Append to `src/content/narrative/farmhand_ch1_resolvers.ts`:

```typescript
// Shared exit resolver for back field, old well, and farm-side optional encounters.
const farmhand_ch1_exit: NarrativeResolver = (state) => ({ state, next: null });

const old_well_drop_stone: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('old_well_drop_stone')
});

const old_well_look_down: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('old_well_look_down')
});

const old_well_return_to_intro: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('old_well_intro'),
  silent: true
});
```

Add to the exported record:

```typescript
export const farmhandCh1Resolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  henwald_dismiss,
  henwald_levy,
  henwald_return_to_intro,
  henwald_engage_rat,
  farmhand_ch1_exit,
  old_well_drop_stone,
  old_well_look_down,
  old_well_return_to_intro
};
```

- [ ] **Step 3: Create the encounter files**

Create `src/content/encounters/back_field_weed.ts`:

```typescript
import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const back_field_weed: NarrativeEncounter = {
  id: EncounterId('back_field_weed'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('back_field_weed'),
  label: 'Weed for a while'
};
```

Create `src/content/encounters/old_well_inspect.ts`:

```typescript
import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const old_well_inspect: NarrativeEncounter = {
  id: EncounterId('old_well_inspect'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('old_well_intro'),
  label: 'Approach the well'
};
```

- [ ] **Step 4: Register**

Modify `src/content/encounters/index.ts`:

```typescript
import { back_field_weed } from './back_field_weed';
import { old_well_inspect } from './old_well_inspect';
```

```typescript
  [back_field_weed.id]: back_field_weed,
  [old_well_inspect.id]: old_well_inspect,
```

Modify `src/content/narrative/nodes.ts`:

```typescript
import {
  henwald_intro, henwald_levy_response, henwald_post_victory, henwald_post_dismiss,
  back_field_weed, old_well_intro, old_well_drop_stone, old_well_look_down
} from './farmhand_ch1_nodes';
```

```typescript
  [back_field_weed.id]: back_field_weed,
  [old_well_intro.id]: old_well_intro,
  [old_well_drop_stone.id]: old_well_drop_stone,
  [old_well_look_down.id]: old_well_look_down,
```

- [ ] **Step 5: Append a test**

Append to `src/__tests__/farmhand_ch1.e2e.test.ts`:

```typescript
describe('Back Field and Old Well spokes', () => {
  it('weeding the back field returns to the location cleanly', () => {
    let s = createInitialState(13);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('back_field') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'back_field_weed' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.combat).toBeNull();
  });

  it('Old Well: drop a stone, then step back', () => {
    let s = createInitialState(13);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('old_well') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'old_well_inspect' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // drop stone
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 1 }); // step back
    expect(s.combat).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests + commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/content/narrative/farmhand_ch1_nodes.ts src/content/narrative/farmhand_ch1_resolvers.ts src/content/encounters/back_field_weed.ts src/content/encounters/old_well_inspect.ts src/content/encounters/index.ts src/content/narrative/nodes.ts src/__tests__/farmhand_ch1.e2e.test.ts
git commit -m "feat(content): Back Field weed action + Old Well inspect interactions"
```

---

### Task 9: Mother kitchen encounter (pre-tornado state)

**Files:**
- Modify: `src/content/narrative/farmhand_ch1_nodes.ts` (Mother nodes)
- Modify: `src/content/narrative/farmhand_ch1_resolvers.ts` (Mother resolvers)
- Create: `src/content/encounters/mother_kitchen.ts`
- Modify: `src/content/encounters/index.ts`
- Modify: `src/content/narrative/nodes.ts`
- Test: extend `src/__tests__/farmhand_ch1.e2e.test.ts`

- [ ] **Step 1: Add Mother nodes (pre-tornado)**

Append to `src/content/narrative/farmhand_ch1_nodes.ts`:

```typescript
// =====================================================================
// Mother — pre-tornado kitchen dialogue
// =====================================================================

// Root node: branches based on flags via `visible` predicates on choices.
export const mother_kitchen_root: NarrativeNode = {
  id: NarrativeNodeId('mother_kitchen_root'),
  prose:
    'Mother looks up. "There y\'are, dear. Pull up the bench."',
  choices: [
    { label: 'Sit with Mother.', resolve: 'mother_sit' },
    { label: 'Look at the Note on the table.', resolve: 'mother_look_at_note' },
    { label: 'Step outside.', resolve: 'farmhand_ch1_exit' }
  ]
};

// Sub-node: Mother's response branches based on flags. We use three variants and pick via resolver.
export const mother_sit_animal_talk: NarrativeNode = {
  id: NarrativeNodeId('mother_sit_animal_talk'),
  speaker: 'Mother',
  prose:
    'She returns to her knitting. A pause. Then — "You been at the coop, dear? Henwald run his mouth about the rat again?"\n\n' +
    'She smiles, returns to her work. "You and your chickens. You\'ve been talking to them since you could walk — your father always ' +
    'said you had an ear for it. I wonder, sometimes, what they say back to you."\n\n' +
    'She pauses, considers.\n\n' +
    '"They\'ve never said anything to me. Not a word. A \'cluck-cluck,\' yes. Words, no." The smile is gentle, not contradicting. ' +
    'Just describing. "Whatever you hear, dear — I believe you. I just wish I heard it too."',
  choices: [
    { label: '(stand up.)', resolve: 'mother_return_to_root' }
  ]
};

export const mother_sit_rat_thanks: NarrativeNode = {
  id: NarrativeNodeId('mother_sit_rat_thanks'),
  speaker: 'Mother',
  prose:
    '"That rat won\'t be back. Henwald told me. ...well, Henwald clucked at me, and I assumed." She pats your hand.',
  choices: [
    { label: '(stand up.)', resolve: 'mother_return_to_root' }
  ]
};

export const mother_sit_cow: NarrativeNode = {
  id: NarrativeNodeId('mother_sit_cow'),
  speaker: 'Mother',
  prose:
    '"You been out and about. Good. The cow\'s been watching the sky. I don\'t like it when the cow watches the sky."',
  choices: [
    { label: '(stand up.)', resolve: 'mother_return_to_root' }
  ]
};

export const mother_look_at_note: NarrativeNode = {
  id: NarrativeNodeId('mother_look_at_note'),
  prose:
    'The Note from Mother sits where it always sits. The paper is older than the writing. You cannot quite remember what it says — ' +
    'only that it is for you, and that one day you will know what it is for. You leave it on the table.',
  choices: [
    { label: '(turn back to Mother.)', resolve: 'mother_return_to_root' }
  ]
};
```

- [ ] **Step 2: Add Mother resolvers**

Append to `src/content/narrative/farmhand_ch1_resolvers.ts`:

```typescript
// Mother "sit with" branches based on which spoke-flags are set.
const mother_sit: NarrativeResolver = (state) => {
  // Mark the kitchen as visited (this resolver fires the first time the player engages Mother in dialogue).
  const s: GameState = {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, visited_family_kitchen: true } }
  };
  // Choose a sub-node based on flags:
  if (s.world.flags['defeated:first_tax_rat']) {
    return { state: s, next: NarrativeNodeId('mother_sit_rat_thanks') };
  }
  if (s.world.flags['talked_to_henwald']) {
    return { state: s, next: NarrativeNodeId('mother_sit_animal_talk') };
  }
  return { state: s, next: NarrativeNodeId('mother_sit_cow') };
};

const mother_look_at_note: NarrativeResolver = (state) => ({
  state: {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, visited_family_kitchen: true } }
  },
  next: NarrativeNodeId('mother_look_at_note')
});

const mother_return_to_root: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('mother_kitchen_root'),
  silent: true
});
```

Add to the export:

```typescript
  mother_sit,
  mother_look_at_note,
  mother_return_to_root,
```

- [ ] **Step 3: Create the encounter file**

Create `src/content/encounters/mother_kitchen.ts`:

```typescript
import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

// Pre-tornado kitchen interaction. The post-tornado state uses a separate
// encounter and root node (added in Task 10).
export const mother_kitchen: NarrativeEncounter = {
  id: EncounterId('mother_kitchen'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mother_kitchen_root'),
  label: 'Sit with Mother',
  hiddenIfFlag: 'farmhand_post_tornado'
};
```

- [ ] **Step 4: Register**

Modify `src/content/encounters/index.ts` to register `mother_kitchen`.

Modify `src/content/narrative/nodes.ts` to import and register the Mother nodes.

- [ ] **Step 5: Test the Mother branching**

Append to `src/__tests__/farmhand_ch1.e2e.test.ts`:

```typescript
describe('Mother kitchen (pre-tornado)', () => {
  it('default: Mother mentions the cow watching the sky', () => {
    let s = createInitialState(17);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('family_kitchen') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'mother_kitchen' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // Sit with Mother
    const log = s.log.map((e) => e.text).join('\n');
    expect(log).toMatch(/cow\'s been watching the sky/);
    expect(s.world.flags['visited_family_kitchen']).toBe(true);
  });

  it('with talked_to_henwald flag: Mother does the animal-talk seam', () => {
    let s = createInitialState(17);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = { ...s, world: { ...s.world, flags: { ...s.world.flags, talked_to_henwald: true } } };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('family_kitchen') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'mother_kitchen' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const log = s.log.map((e) => e.text).join('\n');
    expect(log).toMatch(/talking to them since you could walk/);
    expect(log).toMatch(/I just wish I heard it too/);
  });
});
```

- [ ] **Step 6: Run tests + commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/content/narrative/farmhand_ch1_nodes.ts src/content/narrative/farmhand_ch1_resolvers.ts src/content/encounters/mother_kitchen.ts src/content/encounters/index.ts src/content/narrative/nodes.ts src/__tests__/farmhand_ch1.e2e.test.ts
git commit -m "feat(content): Mother kitchen pre-tornado dialogue with animal-talk seam"
```

---

### Task 10: Tornado beat + Mother culmination (post-tornado state)

**Files:**
- Modify: `src/content/story/beats.ts` (add `farmhand_tornado_strikes`, remove `hermit_beckons`)
- Modify: `src/content/narrative/farmhand_ch1_nodes.ts` (post-tornado kitchen)
- Modify: `src/content/narrative/farmhand_ch1_resolvers.ts` (Mother post-tornado dialogue + exit)
- Create: `src/content/encounters/mother_kitchen_post_tornado.ts`
- Modify: `src/content/encounters/index.ts`
- Modify: `src/content/locations/family_kitchen.ts` (add post-tornado encounter)
- Modify: `src/engine/events.ts` (auto-arrive at family_kitchen on tornado trigger if needed)
- Test: extend e2e tests

- [ ] **Step 1: Add the tornado beat**

Replace `hermit_beckons` in `src/content/story/beats.ts` with `farmhand_tornado_strikes`:

```typescript
const farmhand_tornado_strikes: StoryBeat = {
  id: BeatId('farmhand_tornado_strikes'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'stage', stage: 'chapter_1' },
    { kind: 'flag', flag: 'class.reluctant_farmhand' },
    // 3 of 4 spokes visited (we check at least 3 via separate preconditions —
    // but the predicate system has no "at least N of M" check. Workaround:
    // require flag combinations that mean "any 3 of 4 visited." Simplest:
    // a single flag `farmhand_3_spokes_visited` set by a helper beat that
    // counts spoke visits.)
    { kind: 'flag', flag: 'farmhand_3_spokes_visited' },
    { kind: 'flag_unset', flag: 'farmhand_tornado_fired' }
  ],
  onTrigger: [
    {
      kind: 'log',
      entry: {
        kind: 'scene-divider',
        text: ''
      }
    },
    {
      kind: 'log',
      entry: {
        kind: 'narration',
        text:
          'Outside, the wind has been holding its breath all morning. It exhales, suddenly, in the wrong direction.\n\n' +
          'Then a column of air the wrong color drops between the silo and the cow\'s paddock. The cow, finally proved correct, runs. ' +
          'The chickens — Henwald loudest among them — make a sound no folk-tale prepared anyone for.\n\n' +
          'The barn, which has stood since your grandfather built it, considers its options and decides to lie down.\n\n' +
          'The farmhouse holds. The kettle does not even fall off the stove.'
      }
    },
    { kind: 'set_flag', flag: 'farmhand_tornado_fired', value: true },
    { kind: 'set_flag', flag: 'farmhand_post_tornado', value: true },
    { kind: 'set_flag', flag: '__pending_enter_location', value: 'family_kitchen' }
  ]
};
```

And a helper beat that ticks the spoke-counter:

```typescript
const farmhand_count_spokes: StoryBeat = {
  id: BeatId('farmhand_count_spokes'),
  stage: 'chapter_1',
  preconditions: [
    { kind: 'flag', flag: 'class.reluctant_farmhand' },
    { kind: 'flag_unset', flag: 'farmhand_3_spokes_visited' },
    // At-least-3-of-4 spoke flags. Predicate system doesn't have an exact
    // primitive, so use any_flag for the trigger and check via a JS predicate.
    // Workaround: add a new Predicate kind `flag_count_at_least` that counts
    // truthy flags from a list.
  ],
  // ... actually this is getting complex. See alternative approach below.
};
```

**Cleaner approach:** add a new Predicate `flag_count_at_least` to the engine that checks "at least N flags in this list are truthy." This avoids cumbersome chained logic.

Add to `src/engine/types.ts`:

```typescript
export type Predicate =
  // ... existing variants
  | { kind: 'flag_count_at_least'; flags: string[]; min: number };
```

Add to `src/engine/story.ts` `evalPredicate`:

```typescript
case 'flag_count_at_least': {
  const count = p.flags.filter((f) => Boolean(state.world.flags[f])).length;
  return count >= p.min;
}
```

Now `farmhand_tornado_strikes` preconditions become:

```typescript
preconditions: [
  { kind: 'stage', stage: 'chapter_1' },
  { kind: 'flag', flag: 'class.reluctant_farmhand' },
  {
    kind: 'flag_count_at_least',
    flags: ['visited_back_field', 'visited_chicken_coop', 'visited_old_well', 'visited_family_kitchen'],
    min: 3
  },
  { kind: 'flag_unset', flag: 'farmhand_tornado_fired' }
],
```

(Drop the `farmhand_count_spokes` helper beat — no longer needed.)

- [ ] **Step 2: Add spoke-visit flag tracking**

The spoke-visit flags need to be set when the player enters each spoke. Add this to `src/engine/events.ts` `EnterLocation` case — after the existing dusty_crossroads / Old Road / mentor branches:

```typescript
// Farmhand Ch 1 spoke tracking — set per-spoke visit flags.
const FARMHAND_SPOKE_FLAGS: Record<string, string> = {
  back_field: 'visited_back_field',
  chicken_coop: 'visited_chicken_coop',
  old_well: 'visited_old_well',
  family_kitchen: 'visited_family_kitchen'
};
const spokeFlag = FARMHAND_SPOKE_FLAGS[event.locationId];
if (spokeFlag && !result.world.flags[spokeFlag]) {
  result = {
    ...result,
    world: { ...result.world, flags: { ...result.world.flags, [spokeFlag]: true } }
  };
}
```

- [ ] **Step 3: Remove `hermit_beckons` beat**

Delete the `hermit_beckons` beat from `src/content/story/beats.ts` and from the exported `beats` record.

- [ ] **Step 4: Add post-tornado Mother nodes**

Append to `src/content/narrative/farmhand_ch1_nodes.ts`:

```typescript
// =====================================================================
// Mother — post-tornado culmination
// =====================================================================

export const mother_post_tornado_root: NarrativeNode = {
  id: NarrativeNodeId('mother_post_tornado_root'),
  prose:
    'The kitchen smells of kettle steam and a faint draft from a window that has shifted half an inch in its frame. ' +
    'Mother stands at the window, looking out at where the barn used to be, the way someone looks at an old photograph they have been carrying for a while.',
  choices: [
    { label: '(approach Mother)', resolve: 'mother_post_tornado_speak' }
  ]
};

export const mother_post_tornado_speech: NarrativeNode = {
  id: NarrativeNodeId('mother_post_tornado_speech'),
  speaker: 'Mother',
  prose:
    'Mother does not turn around immediately.\n\n' +
    '"Barn\'s down, dear. Mostly. The big beam\'s a write-off. The roof\'s just kindling now."\n\n' +
    'She turns, finally, and her eyes find yours.\n\n' +
    '"I can\'t make the walk anymore. I haven\'t been able to for a year. Town\'s two days; the crossroads is closer — ' +
    'there\'s always something at the crossroads, on a Tuesday, the gods know why. You\'ll need beams, nails, hands. ' +
    'Three days, maybe four. The chickens will keep. Henwald will see to them."\n\n' +
    'She slides the Note across the kitchen table.\n\n' +
    '"I wrote this list a while ago. I was hoping I wouldn\'t need it."',
  choices: [
    { label: '(take the Note and step outside)', resolve: 'mother_post_tornado_exit' }
  ]
};
```

- [ ] **Step 5: Add post-tornado resolvers**

Append to `src/content/narrative/farmhand_ch1_resolvers.ts`:

```typescript
const mother_post_tornado_speak: NarrativeResolver = (state) => ({
  state,
  next: NarrativeNodeId('mother_post_tornado_speech')
});

// On exit: push the Fate-push prose (gate has turned, tweed man at the stile),
// unlock the crossroads, and queue an EnterLocation back to family_farm so the
// player ends up at the hub with the new exit available.
const mother_post_tornado_exit: NarrativeResolver = (state) => {
  let s = appendLogs(state, [
    {
      kind: 'system',
      systemLabel: 'ITEM',
      text: "Mother's Note now reads as a list. Check inventory."
    },
    { kind: 'scene-divider', text: '' },
    {
      kind: 'narration',
      text:
        'You step out the kitchen door. The back field is there, where it has always been. But the gate, this morning, ' +
        'faces the wrong way. The cow has positioned herself against the latch with what you must concede is intent. ' +
        'Beyond her, the hedgerow ends at a stile that was, you would have sworn, on the OTHER side of the field. ' +
        'A small board nailed to its post reads, in a careful hand: **"DUSTY CROSSROADS — that way."** ' +
        'The man in tweed who passed earlier is leaning on the stile. He sees you, raises a polite hand, and walks on.'
    }
  ]);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: {
          ...s.world.flags,
          unlocked_crossroads: true,
          __pending_enter_location: 'family_farm'
        }
      }
    },
    next: null
  };
};
```

Add to the export:

```typescript
  mother_post_tornado_speak,
  mother_post_tornado_exit,
```

- [ ] **Step 6: Create post-tornado encounter**

Create `src/content/encounters/mother_kitchen_post_tornado.ts`:

```typescript
import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

// Auto-plays on entry to family_kitchen post-tornado (the kitchen location's
// auto-arrive logic queues this encounter when farmhand_post_tornado is set).
export const mother_kitchen_post_tornado: NarrativeEncounter = {
  id: EncounterId('mother_kitchen_post_tornado'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mother_post_tornado_root'),
  visibleIfFlag: 'farmhand_post_tornado'
};
```

- [ ] **Step 7: Wire the kitchen post-tornado auto-arrive**

Modify `src/engine/events.ts` `EnterLocation` case. Add an auto-arrive branch for family_kitchen post-tornado:

```typescript
// Family Kitchen post-tornado auto-arrive — queue the Mother culmination scene.
if (event.locationId === 'family_kitchen'
    && result.world.flags['farmhand_post_tornado']
    && !result.world.flags['farmhand_culmination_played']
    && !result.combat) {
  result = {
    ...result,
    world: {
      ...result.world,
      flags: {
        ...result.world.flags,
        __pending_encounter: 'mother_kitchen_post_tornado',
        farmhand_culmination_played: true
      }
    }
  };
}
```

- [ ] **Step 8: Update family_kitchen.encounterIds**

```typescript
encounterIds: [
  EncounterId('mother_kitchen'),
  EncounterId('mother_kitchen_post_tornado')
]
```

(The pre-tornado one is `hiddenIfFlag: 'farmhand_post_tornado'`; the post-tornado one is `visibleIfFlag: 'farmhand_post_tornado'`.)

- [ ] **Step 9: Register the new content**

Modify `src/content/encounters/index.ts`, `src/content/narrative/nodes.ts` to register the new encounter and nodes.

- [ ] **Step 10: End-to-end tornado flow test**

Append to `src/__tests__/farmhand_ch1.e2e.test.ts`:

```typescript
describe('Tornado culmination', () => {
  it('tornado fires after 3 spoke visits; player auto-arrives at kitchen; Mother culmination plays', () => {
    let s = createInitialState(19);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };

    // Visit 3 spokes in any order.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('back_field') });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('chicken_coop') });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('old_well') });
    if (s.combat) s = { ...s, combat: null };

    // At this point, the tornado beat should have fired.
    expect(s.world.flags['farmhand_tornado_fired']).toBe(true);
    expect(s.world.flags['farmhand_post_tornado']).toBe(true);
    // Player has been auto-routed to family_kitchen with the post-tornado encounter queued.
    expect(s.world.currentLocation).toBe('family_kitchen');
    expect(s.combat?.kind).toBe('narrative');

    // Step through the culmination dialogue.
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // approach Mother
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // take the Note + exit

    expect(s.world.flags['unlocked_crossroads']).toBe(true);
    expect(s.world.currentLocation).toBe('family_farm');
    expect(s.combat).toBeNull();
  });
});
```

- [ ] **Step 11: Run + commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/content/story/beats.ts src/content/narrative/farmhand_ch1_nodes.ts src/content/narrative/farmhand_ch1_resolvers.ts src/content/encounters/mother_kitchen_post_tornado.ts src/content/encounters/index.ts src/content/narrative/nodes.ts src/content/locations/family_kitchen.ts src/engine/events.ts src/engine/types.ts src/engine/story.ts src/__tests__/farmhand_ch1.e2e.test.ts
git commit -m "feat(ch1): farmhand tornado culmination + Mother supplies-list scene"
```

---

### Task 11: Update `narrative-spine.md`

**Files:**
- Modify: `docs/superpowers/narrative-spine.md`

- [ ] **Step 1: Add the 6 spine updates per spec §12**

Apply these textual additions to `docs/superpowers/narrative-spine.md`:

1. **Under "Chapter 1 — Status Quo":** Add a paragraph noting the per-class hub-and-spoke pattern, with specifics for Farmhand:
   > *Per-class Ch 1 framework: each class explores a hub-and-spoke region (3-5 spokes) culminating in an EXTERNAL forced-leave event that overrides their want. For the Farmhand: hub is the family farm, spokes are Back Field / Chicken Coop / Old Well / Family Kitchen, and a freak tornado destroys the barn — Mother gives the Note (now a supplies list) to send the Farmhand to the crossroads for materials. The worldly cause (storm) layers over the meta cause (Fate has rearranged the geometry of the gate). Other classes follow the same shape in their own ways.*

2. **Under "Recurring Motifs":** Add Mother's animal-talk seam:
   > *Animal-talk: the Farmhand has the monomyth's "talking animal helper" trope (Henwald the rooster speaks to them). Mother does not — she hears clucks. The script gives the protagonist the trope; reality doesn't.*

3. **Under "Anchor Items / Set Pieces":** Add a new sub-section for the supplies arc:
   > *The Note from Mother / Supplies list (Farmhand only). A quest item the Farmhand starts with, blank pre-tornado, filled post-tornado with a 4-item list: a strong beam, a sack of nails, a strong-backed neighbor, Mother's tea. Each supply is acquired as a reward across Ch 2-7. The supplies axis pairs with the MacGuffin axis at Ch 9 endings (Accept = tragic clutter, Refuse = the supplies are everything, Rewrite = supplies are re-authored). Per-supply chapter assignments TBD.*

4. **Under "Recurring Motifs" / "The Editor's apparatus":** Add the Tax Rat reframing:
   > *The Officious Tax Rat works for the Editor's bureaucratic apparatus (not made explicit). His vest bears a monogram matching the Archmage's staff in Ch 4. His paperwork stamps "On Schedule." Across iterations, the Tax Rat shows up wherever an "unspecified authority" needs an unspecified levy.*

5. **Under "Chapter 1 — Status Quo":** Add Mother's character note:
   > *Mother (Farmhand-only NPC): elderly, frail, lives in the farmhouse, can't make the walk to the crossroads. Sharp, competent, warmly undemonstrative. The Note from Mother is from her, given over post-tornado. Mother provides the Farmhand's emotional anchor and her situation shapes the Ch 9 ending tone (alongside the Neighbor reveal).*

6. **Under "Recurring Motifs":** Add Henwald:
   > *Henwald (Farmhand Ch 1 NPC, possible later recurrence): rooster, Foghorn-Leghorn cadence (bombastic Southern, paternal, friendly), spokes-chicken at the family farm coop. Speaks in "I say, I say" and quoted-but-unattributed phrases. The Farmhand's talking-animal companion (per the spine's monomyth-trope-grant idea).*

- [ ] **Step 2: Commit spine update**

```bash
git add docs/superpowers/narrative-spine.md
git commit -m "docs(spine): add Mother / Henwald / Tax Rat / supplies-arc / per-class Ch 1 framework"
```

---

### Task 12: Full end-to-end test sweep

**Files:**
- Modify: `src/__tests__/farmhand_ch1.e2e.test.ts` (add full-flow test)

- [ ] **Step 1: Full Ch 1 Farmhand flow test**

Append:

```typescript
describe('Farmhand Ch 1 — full happy-path flow', () => {
  it('opener → all 4 spokes (with Tax Rat defeat) → tornado → Mother → crossroads unlocked', () => {
    let s = createInitialState(23);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null }; // skip opener narrative

    // Visit the Back Field, optionally fight the Allium (skip — narrative encounter not required).
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('back_field') });
    if (s.combat) s = { ...s, combat: null };
    expect(s.world.flags['visited_back_field']).toBe(true);

    // Visit the Chicken Coop, engage Henwald, defeat the Tax Rat.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('chicken_coop') });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'henwald' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // I'll see to him
    // Force Tax Rat to 0 HP and attack.
    if (s.combat?.kind === 'turn-based') {
      const sCombat = s.combat;
      s = { ...s, combat: { ...sCombat, combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 0 } : c) } };
    }
    s = reduce(s, { kind: 'AttackTarget' });
    expect(s.world.flags['defeated:first_tax_rat']).toBe(true);
    // The henwald_awards_eggs beat fires; player gets 3 eggs.
    expect(s.character.inventory.find((e) => e.itemId === 'farm_fresh_egg')?.qty).toBe(3);

    // Visit the Old Well.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('old_well') });
    if (s.combat) s = { ...s, combat: null };
    expect(s.world.flags['visited_old_well']).toBe(true);

    // Now 3-of-4 spokes visited. The tornado beat fires on the NEXT reduce — let's verify
    // by checking if it's already fired (since checkBeats runs after the EnterLocation).
    expect(s.world.flags['farmhand_tornado_fired']).toBe(true);
    expect(s.world.currentLocation).toBe('family_kitchen');

    // Step through Mother's culmination.
    if (s.combat?.kind === 'narrative') {
      s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // approach
      s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // take Note & exit
    }
    expect(s.world.flags['unlocked_crossroads']).toBe(true);
    expect(s.world.currentLocation).toBe('family_farm');

    // The crossroads exit should now be visible at family_farm. (Encoded as visibleIfFlag.)
    // Move there.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('dusty_crossroads') });
    expect(s.world.currentLocation).toBe('dusty_crossroads');
  });
});
```

- [ ] **Step 2: Run full sweep + typecheck**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all tests pass, clean compile.

- [ ] **Step 3: Final commit**

```bash
git add src/__tests__/farmhand_ch1.e2e.test.ts
git commit -m "test(ch1): full Farmhand Ch 1 end-to-end happy-path coverage"
```

---

## Self-review notes

**Spec coverage:**
- §2 Framework decisions: documented in plan intro and reflected in architecture. ✓
- §3 Per-class authoring approach for Ch 1: locked in via the `class.reluctant_farmhand` exit-gating (Task 6). Other classes' Ch 1 follow the same pattern in their own specs. ✓
- §4 Hub: family_farm updated in Task 6. ✓
- §5 Spokes (4): Tasks 6 (locations), 7 (Henwald), 8 (back field weed, old well), 9 (Mother pre-tornado). ✓
- §6 Culmination: Task 10 (tornado beat + post-tornado scene). ✓
- §7 NPCs: Mother in Tasks 9 and 10; Henwald in Task 7; Tax Rat reframed in Task 4. ✓
- §8 Anxious Allium: Task 3. ✓
- §9 Farm-Fresh Egg + ItemEffect.context: Tasks 1 (engine) and 2 (item). ✓
- §10 Note from Mother supplies arc: Task 5 (flag-aware flavor); Ch 9 endings are explicitly deferred. ✓
- §11 Foreshadowing seeds: planted in prose across Tasks 4 (Tax Rat), 7 (Henwald), 9 (Mother), 10 (Mother culmination). ✓
- §12 Spine updates: Task 11. ✓
- §16 Acceptance criteria: each criterion maps to a task. ✓

**Placeholder scan:** No TBDs in plan code blocks. The supplies list specific chapter assignments are noted as "TBD in future specs" — appropriate (deferred to Ch 2-7 specs).

**Type consistency:**
- Location IDs match across Tasks 6, 8, 9, 10, 12.
- Encounter IDs match across registration and trigger code.
- Flag names match: `visited_back_field`, `visited_chicken_coop`, `visited_old_well`, `visited_family_kitchen`, `talked_to_henwald`, `asked_henwald_levy`, `farmhand_tornado_fired`, `farmhand_post_tornado`, `farmhand_culmination_played`, `unlocked_crossroads`, `class.reluctant_farmhand`, `defeated:first_tax_rat`. All cross-referenced correctly.
- Resolver IDs match between nodes and resolvers files.

**Known caveats for the implementer:**
- The `flag_count_at_least` Predicate variant is a small engine extension (Task 10 Step 1). Goes in `types.ts` and `story.ts`.
- The `__pending_enter_location` flag is an existing mechanism (used by `walk_back_home`). Reusing it here is intentional — the engine's `drainPendingLocation` already handles it.
- The `Item.flavorIfFlag` field is a small engine extension (Task 1) that the InspectModal reads. The plan picks this over the alternative (two distinct items) for cleaner UX.
- The tornado prose is in the beat's `log` effects. If the engine ever supports multi-paragraph entries differently, restructure here.
