import { describe, it, expect } from 'vitest';
import { createInitialState, createDemoState } from '../state';
import { SAVE_VERSION } from '../types';
import { reduce } from '../events';
import { ClassId, ItemId, LocationId, EncounterId } from '../types';

describe('createInitialState', () => {
  it('returns a fresh state with no character', () => {
    const s = createInitialState(424242);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.rng.seed).toBe(424242);
    expect(s.rng.step).toBe(0);
    expect(s.character.name).toBe('');
    expect(s.character.level).toBe(0);
    expect(s.world.visited).toEqual([]);
    expect(s.combat).toBeNull();
    expect(s.log).toEqual([]);
    expect(s.settings.theme).toBe('parchment');
    expect(s.settings.textSize).toBe('medium');
    expect(s.settings.autoSave).toBe(true);
  });
});

describe('createDemoState', () => {
  it('returns a fully-populated state suitable for UI development', () => {
    const s = createDemoState();
    expect(s.character.name).toBe('Sir Brendan');
    expect(s.character.level).toBe(3);
    expect(s.character.stats.brawn).toBeGreaterThan(0);
    expect(s.character.hp.current).toBeGreaterThan(0);
    expect(s.character.hp.max).toBeGreaterThanOrEqual(s.character.hp.current);
    expect(s.world.currentLocation).toBeTruthy();
    expect(s.story.stage).toBe('act_i');
    expect(s.log.length).toBeGreaterThan(0);
    // Demo log includes at least one of each kind we render in Plan 1
    const kinds = new Set(s.log.map((e) => e.kind));
    expect(kinds.has('narration')).toBe(true);
    expect(kinds.has('dialogue')).toBe(true);
    expect(kinds.has('system')).toBe(true);
  });
});

describe('reduce — settings events', () => {
  it('SetTheme switches the theme', () => {
    const s0 = createInitialState(1);
    const s1 = reduce(s0, { kind: 'SetTheme', theme: 'moonlit' });
    expect(s1.settings.theme).toBe('moonlit');
    // Other state untouched
    expect(s1.character).toEqual(s0.character);
  });

  it('SetTextSize switches the text size', () => {
    const s0 = createInitialState(1);
    const s1 = reduce(s0, { kind: 'SetTextSize', size: 'large' });
    expect(s1.settings.textSize).toBe('large');
  });

  it('ToggleAutoSave flips the autosave flag', () => {
    const s0 = createInitialState(1);
    const s1 = reduce(s0, { kind: 'ToggleAutoSave' });
    expect(s1.settings.autoSave).toBe(false);
    const s2 = reduce(s1, { kind: 'ToggleAutoSave' });
    expect(s2.settings.autoSave).toBe(true);
  });

  it('reduce is pure: original state is unchanged', () => {
    const s0 = createInitialState(1);
    const before = JSON.stringify(s0);
    reduce(s0, { kind: 'SetTheme', theme: 'moonlit' });
    expect(JSON.stringify(s0)).toBe(before);
  });
});

describe('reduce — game-flow events', () => {
  it('StartNewGame populates character from class definition and emits opening log', () => {
    const s0 = createInitialState(1);
    const s1 = reduce(s0, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmboy') });
    expect(s1.character.name).toBe('Brendan');
    expect(s1.character.classId).toBe(ClassId('reluctant_farmboy'));
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
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmboy') });
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('family_farm') });
    expect(s.world.visited).toContain(LocationId('family_farm'));
  });

  it('EquipItem moves an inventory item into a slot', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmboy') });
    // Unequip first
    s = reduce(s, { kind: 'UnequipSlot', slot: 'weapon' });
    expect(s.character.equipment.weapon).toBeUndefined();
    // Re-equip
    s = reduce(s, { kind: 'EquipItem', itemId: ItemId('rusty_pitchfork') });
    expect(s.character.equipment.weapon).toBe(ItemId('rusty_pitchfork'));
  });

  it('TriggerEncounter starts combat with the encounter\'s monster', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmboy') });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: EncounterId('first_tax_rat') });
    expect(s.combat).not.toBeNull();
  });

  it('AttackTarget reduces enemy hp (sometimes — try several)', () => {
    let s = createInitialState(2);
    s = reduce(s, { kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmboy') });
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
