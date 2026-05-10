import { describe, it, expect } from 'vitest';
import { content, validateContent } from '../index';
import { MonsterId, type StatusKind } from '../../engine/types';

describe('content registry', () => {
  it('exports non-empty registries for items, monsters, encounters, locations, classes, skills, achievements, quests', () => {
    expect(Object.keys(content.items).length).toBeGreaterThan(0);
    expect(Object.keys(content.monsters).length).toBeGreaterThan(0);
    expect(Object.keys(content.encounters).length).toBeGreaterThan(0);
    expect(Object.keys(content.locations).length).toBeGreaterThan(0);
    expect(Object.keys(content.classes).length).toBeGreaterThan(0);
    expect(Object.keys(content.skills).length).toBeGreaterThan(0);
    expect(Object.keys(content.achievements).length).toBeGreaterThan(0);
    expect(Object.keys(content.quests).length).toBeGreaterThan(0);
  });

  it('passes validation', () => {
    expect(() => validateContent()).not.toThrow();
  });
});

describe('apply_status action validation', () => {
  const VALID_STATUS_KINDS: StatusKind[] = [
    'weakness_revealed', 'intimidated', 'guaranteed_crit', 'next_attack_misses',
    'skip_turn', 'weapon_suspended', 'armor_halved', 'free_retaliation'
  ];

  it('every apply_status action references a valid StatusKind', () => {
    for (const monster of Object.values(content.monsters)) {
      for (const action of monster.actions) {
        if (action.kind !== 'apply_status') continue;
        expect(VALID_STATUS_KINDS).toContain(action.status);
      }
    }
  });

  it.each([
    ['insolent_pell', 'weapon_suspended'],
    ['feral_footnote', 'next_attack_misses'],
    ['pointed_heckler', 'skip_turn'],
    ['officious_tax_rat', 'armor_halved']
  ])('tutorial monster %s has exactly one apply_status action with status %s', (monsterId, expectedStatus) => {
    const monster = content.monsters[MonsterId(monsterId)];
    expect(monster).toBeDefined();
    const applyStatusActions = monster!.actions.filter((a) => a.kind === 'apply_status');
    expect(applyStatusActions).toHaveLength(1);
    expect(applyStatusActions[0]!.status).toBe(expectedStatus);
  });
});
