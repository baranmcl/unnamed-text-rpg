import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadAchievements,
  saveAchievements,
  clearAchievements,
  isUnlocked,
  defaultRecord,
  checkAchievements,
  type AchievementsRecord
} from '../achievements';
import { AchievementId } from '../types';
import { createInitialState } from '../state';
import { ClassId } from '../types';
import { content } from '../../content';

const KEY = 'heroicchronicle.achievements.v1';

describe('achievements persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadAchievements returns a default record when no key is set', () => {
    expect(loadAchievements()).toEqual(defaultRecord());
  });

  it('saveAchievements + loadAchievements round-trip', () => {
    const r: AchievementsRecord = {
      unlocked: [AchievementId('first_blood')],
      played_classes: ['reluctant_farmboy'],
      tempt_fate_backfires_seen: ['trip', 'crit_yourself'],
      unlockedCountAtLastOpen: 1
    };
    saveAchievements(r);
    expect(loadAchievements()).toEqual(r);
  });

  it('loadAchievements returns default when stored value is corrupted', () => {
    localStorage.setItem(KEY, 'not-json{');
    expect(loadAchievements()).toEqual(defaultRecord());
  });

  it('loadAchievements returns default when stored value is missing required fields', () => {
    localStorage.setItem(KEY, JSON.stringify({ unlocked: [] }));
    expect(loadAchievements()).toEqual(defaultRecord());
  });

  it('clearAchievements removes the localStorage key', () => {
    saveAchievements({
      unlocked: [AchievementId('first_blood')],
      played_classes: [],
      tempt_fate_backfires_seen: [],
      unlockedCountAtLastOpen: 0
    });
    clearAchievements();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(loadAchievements()).toEqual(defaultRecord());
  });

  it('isUnlocked returns true iff id is in unlocked list', () => {
    const r: AchievementsRecord = {
      unlocked: [AchievementId('a'), AchievementId('b')],
      played_classes: [],
      tempt_fate_backfires_seen: [],
      unlockedCountAtLastOpen: 0
    };
    expect(isUnlocked(r, AchievementId('a'))).toBe(true);
    expect(isUnlocked(r, AchievementId('c'))).toBe(false);
  });
});

describe('checkAchievements', () => {
  function withCharacter() {
    let s = createInitialState(1);
    s = { ...s, character: { ...s.character, name: 'T', classId: ClassId('reluctant_farmboy'), level: 1 } };
    return s;
  }

  it('returns no newlyUnlocked when no preconditions are met', () => {
    const s = withCharacter();
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toEqual([]);
  });

  it('does not mutate the input record', () => {
    const s = withCharacter();
    const r = defaultRecord();
    const before = JSON.stringify(r);
    checkAchievements(s, r);
    expect(JSON.stringify(r)).toBe(before);
  });

  it('exposes at least 13 entries in content.achievements', () => {
    expect(Object.keys(content.achievements).length).toBeGreaterThanOrEqual(13);
  });

  it('unlocks first_blood when achievements.first_combat_won is set', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.first_combat_won': true } }
    };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('first_blood'));
  });

  it('does not re-fire an already-unlocked achievement', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.first_combat_won': true } }
    };
    const r: AchievementsRecord = { ...defaultRecord(), unlocked: [AchievementId('first_blood')] };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toEqual([]);
  });

  it('unlocks degree_of_heroism at level >= 2', () => {
    const s = { ...withCharacter(), character: { ...withCharacter().character, level: 2 } };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('degree_of_heroism'));
  });

  it('unlocks signature_move on the achievements.signature_unlocked flag', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.signature_unlocked': true } }
    };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('signature_move'));
  });

  it('unlocks worth_their_salt when currency >= 100', () => {
    const s = { ...withCharacter(), character: { ...withCharacter().character, currency: 100 } };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('worth_their_salt'));
  });

  it('unlocks tempt_fate on the achievements.tempted_fate flag', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.tempted_fate': true } }
    };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('tempt_fate'));
  });

  it('unlocks six_cosmic_chuckles when 6 distinct backfires are recorded', () => {
    const s = withCharacter();
    const r: AchievementsRecord = {
      ...defaultRecord(),
      tempt_fate_backfires_seen: ['trip', 'crit_yourself', 'weapon_mute', 'drop_shield', 'free_retaliation', 'wasted_prophecy']
    };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toContain(AchievementId('six_cosmic_chuckles'));
  });

  it('unlocks moonlit on the achievements.theme_moonlit flag', () => {
    const s = {
      ...withCharacter(),
      world: { ...withCharacter().world, flags: { 'achievements.theme_moonlit': true } }
    };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('moonlit'));
  });

  it('unlocks refused_sincerely when refusal_count >= 4', () => {
    const s = { ...withCharacter(), world: { ...withCharacter().world, flags: { refusal_count: 4 } } };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('refused_sincerely'));
  });

  it('unlocks insulted_the_hat on the insulted_hermit_hat flag', () => {
    const s = { ...withCharacter(), world: { ...withCharacter().world, flags: { insulted_hermit_hat: true } } };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('insulted_the_hat'));
  });

  it('unlocks cried_briefly on the cried_at_hermit flag', () => {
    const s = { ...withCharacter(), world: { ...withCharacter().world, flags: { cried_at_hermit: true } } };
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).toContain(AchievementId('cried_briefly'));
  });

  it('unlocks the_tetralogy when 4 classes have been played', () => {
    const s = withCharacter();
    const r: AchievementsRecord = {
      ...defaultRecord(),
      played_classes: ['reluctant_farmboy', 'disgraced_knight', 'accidental_wizard', 'bard']
    };
    const out = checkAchievements(s, r);
    expect(out.newlyUnlocked).toContain(AchievementId('the_tetralogy'));
  });

  it('unlocks each spine seed when its achievement_seed.* flag is manually set', () => {
    for (const [id, flag] of [
      ['on_schedule', 'achievement_seed.on_schedule'],
      ['page_counted', 'achievement_seed.page_counted'],
      ['glimpsed_the_editor', 'achievement_seed.glimpsed_editor']
    ] as const) {
      const s = { ...withCharacter(), world: { ...withCharacter().world, flags: { [flag]: true } } };
      const out = checkAchievements(s, defaultRecord());
      expect(out.newlyUnlocked).toContain(AchievementId(id));
    }
  });

  it('does not fire spine seeds in default state', () => {
    const s = withCharacter();
    const out = checkAchievements(s, defaultRecord());
    expect(out.newlyUnlocked).not.toContain(AchievementId('on_schedule'));
    expect(out.newlyUnlocked).not.toContain(AchievementId('page_counted'));
    expect(out.newlyUnlocked).not.toContain(AchievementId('glimpsed_the_editor'));
  });
});
