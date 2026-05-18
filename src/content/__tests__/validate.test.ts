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
    'skip_turn', 'weapon_suspended', 'armor_halved', 'free_retaliation', 'plot_armor'
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

describe('Old Road monsters', () => {
  it('wayfaring_footnote exists with apply_status next_attack_misses', () => {
    const monster = content.monsters[MonsterId('wayfaring_footnote')];
    expect(monster).toBeDefined();
    const applyStatus = monster!.actions.find((a) => a.kind === 'apply_status');
    expect(applyStatus).toBeDefined();
    if (applyStatus?.kind === 'apply_status') {
      expect(applyStatus.status).toBe('next_attack_misses');
    }
  });

  it('plot_convenience exists with apply_status plot_armor', () => {
    const monster = content.monsters[MonsterId('plot_convenience')];
    expect(monster).toBeDefined();
    const applyStatus = monster!.actions.find((a) => a.kind === 'apply_status');
    expect(applyStatus).toBeDefined();
    if (applyStatus?.kind === 'apply_status') {
      expect(applyStatus.status).toBe('plot_armor');
    }
  });

  it('both Old Road monsters list page_of_errata in their loot table', () => {
    const wf = content.monsters[MonsterId('wayfaring_footnote')]!;
    const pc = content.monsters[MonsterId('plot_convenience')]!;
    expect(wf.loot.some((l) => l.itemId === 'page_of_errata')).toBe(true);
    expect(pc.loot.some((l) => l.itemId === 'page_of_errata')).toBe(true);
  });

  it('page_of_errata heals 15 HP', () => {
    const item = content.items['page_of_errata' as import('../../engine/types').ItemId];
    expect(item).toBeDefined();
    expect(item!.kind).toBe('consumable');
    const healEffect = item!.effects?.find((e) => e.kind === 'heal_hp');
    expect(healEffect).toBeDefined();
    if (healEffect?.kind === 'heal_hp') expect(healEffect.amount).toBe(15);
  });
});

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

describe('an_unsigned_tale achievement', () => {
  it('is registered', () => {
    const ach = content.achievements['an_unsigned_tale' as import('../../engine/types').AchievementId];
    expect(ach).toBeDefined();
    expect(ach!.hidden).toBe(true);
  });

  it("preconditions: stage chapter_9 AND ever_learned_signature flag_unset", () => {
    const ach = content.achievements['an_unsigned_tale' as import('../../engine/types').AchievementId]!;
    const kinds = ach.preconditions.map((p) => p.kind);
    expect(kinds).toContain('stage');
    expect(kinds).toContain('flag_unset');
  });
});
