import { describe, it, expect } from 'vitest';
import { reduce } from '../events';
import { createInitialState } from '../state';
import { ClassId, EncounterId, ItemId } from '../types';
import type { GameState } from '../types';

describe('SetTheme moonlit achievement seed', () => {
  it('sets achievements.theme_moonlit when theme switches to moonlit', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'SetTheme', theme: 'moonlit' });
    expect(s.world.flags['achievements.theme_moonlit']).toBe(true);
  });

  it('does not set the flag when theme stays parchment', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'SetTheme', theme: 'parchment' });
    expect(s.world.flags['achievements.theme_moonlit']).toBeUndefined();
  });
});

// =====================================================================
// UseItem routing through narrative encounters and out-of-combat damage
// =====================================================================

function farmhandWithItem(itemId: ItemId, qty = 1, seed = 3): GameState {
  let s = createInitialState(seed);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
  if (s.combat) s = { ...s, combat: null };
  s = {
    ...s,
    character: {
      ...s.character,
      inventory: [...s.character.inventory, { itemId, qty }],
      // Wound the player so heal_hp has observable effect.
      hp: { ...s.character.hp, current: 5 }
    }
  };
  return s;
}

describe('UseItem during a narrative encounter', () => {
  it('routes through out-of-combat use; heal_hp works and consumes the item', () => {
    let s = farmhandWithItem('hardtack' as ItemId);
    // Trigger a narrative encounter (any one — use the_call equivalent path).
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'crossroads_signpost' as EncounterId });
    expect(s.combat?.kind).toBe('narrative');
    const hpBefore = s.character.hp.current;
    const qtyBefore = s.character.inventory.find((e) => e.itemId === 'hardtack')?.qty ?? 0;

    s = reduce(s, { kind: 'UseItem', itemId: 'hardtack' as ItemId });

    // Item consumed and HP recovered.
    const qtyAfter = s.character.inventory.find((e) => e.itemId === 'hardtack')?.qty ?? 0;
    expect(qtyAfter).toBe(qtyBefore - 1);
    expect(s.character.hp.current).toBeGreaterThan(hpBefore);
    // Narrative encounter still active — using an item shouldn't end the scene.
    expect(s.combat?.kind).toBe('narrative');
  });

  it('refuses to consume a deal_damage item when there is no combat target', () => {
    let s = farmhandWithItem('crooked_arrow' as ItemId);
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'crossroads_signpost' as EncounterId });
    expect(s.combat?.kind).toBe('narrative');
    const qtyBefore = s.character.inventory.find((e) => e.itemId === 'crooked_arrow')?.qty ?? 0;

    s = reduce(s, { kind: 'UseItem', itemId: 'crooked_arrow' as ItemId });

    // Item NOT consumed.
    const qtyAfter = s.character.inventory.find((e) => e.itemId === 'crooked_arrow')?.qty ?? 0;
    expect(qtyAfter).toBe(qtyBefore);
    // Diegetic feedback in the log.
    const lastLog = s.log.at(-1);
    expect(lastLog?.text).toMatch(/nothing here to throw it at/i);
  });
});

describe('UseItem out of combat on the world map', () => {
  it('refuses to consume a deal_damage item with no target', () => {
    let s = farmhandWithItem('crooked_arrow' as ItemId);
    // No combat, no narrative.
    expect(s.combat).toBeNull();
    const qtyBefore = s.character.inventory.find((e) => e.itemId === 'crooked_arrow')?.qty ?? 0;

    s = reduce(s, { kind: 'UseItem', itemId: 'crooked_arrow' as ItemId });

    const qtyAfter = s.character.inventory.find((e) => e.itemId === 'crooked_arrow')?.qty ?? 0;
    expect(qtyAfter).toBe(qtyBefore);
    expect(s.log.at(-1)?.text).toMatch(/nothing here to throw it at/i);
  });
});
