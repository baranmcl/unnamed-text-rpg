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
