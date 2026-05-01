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
  beforeEach(() => {
    localStorage.clear();
  });

  function withCharacter() {
    let s = createInitialState(1);
    s = { ...s, character: { ...s.character, name: 'T', classId: ClassId('reluctant_farmboy'), level: 1 } };
    return s;
  }

  it('returns no newlyUnlocked when registry is empty', () => {
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
});
