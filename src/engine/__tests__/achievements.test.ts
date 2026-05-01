import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadAchievements,
  saveAchievements,
  clearAchievements,
  isUnlocked,
  type AchievementsRecord
} from '../achievements';
import { AchievementId } from '../types';

const KEY = 'heroicchronicle.achievements.v1';

function fresh(): AchievementsRecord {
  return {
    unlocked: [],
    played_classes: [],
    tempt_fate_backfires_seen: [],
    unlockedCountAtLastOpen: 0
  };
}

describe('achievements persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadAchievements returns a default record when no key is set', () => {
    expect(loadAchievements()).toEqual(fresh());
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
    expect(loadAchievements()).toEqual(fresh());
  });

  it('loadAchievements returns default when stored value is missing required fields', () => {
    localStorage.setItem(KEY, JSON.stringify({ unlocked: [] }));
    expect(loadAchievements()).toEqual(fresh());
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
    expect(loadAchievements()).toEqual(fresh());
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
