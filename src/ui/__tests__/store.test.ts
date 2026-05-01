import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../store.svelte';
import { ClassId, EncounterId, AchievementId, type SkillId } from '../../engine/types';
import { loadAchievements } from '../../engine/achievements';

describe('store achievements integration', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('records the played class on StartNewGame', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    expect(gameStore.achievements.played_classes).toContain('reluctant_farmboy');
  });

  it('does not double-add the same played class', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    expect(gameStore.achievements.played_classes.filter((c) => c === 'reluctant_farmboy').length).toBe(1);
  });

  it('queues a toast and writes a system log entry when an achievement unlocks', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));
    expect(gameStore.pendingToasts.some((a) => a.id === AchievementId('moonlit'))).toBe(true);
    const sysEntry = gameStore.state.log.find(
      (e) => e.kind === 'system' && e.systemLabel === 'ACHIEVEMENT' && e.text.includes('Moonlit')
    );
    expect(sysEntry).toBeDefined();
  });

  it('persists the achievements record to localStorage', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    const persisted = loadAchievements();
    expect(persisted.unlocked).toContain(AchievementId('moonlit'));
  });

  it('drains __just_tempted_backfire into tempt_fate_backfires_seen and clears the flag', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    gameStore.state = { ...gameStore.state, character: { ...gameStore.state.character, knownSkills: ['tempt_fate' as SkillId], mp: { current: 999, max: 999 } } };

    let firedKind: string | null = null;
    for (let i = 0; i < 2000 && firedKind === null; i++) {
      gameStore.dispatch({ kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
      // After the dispatch, the transient flag must already be drained from state.
      expect(gameStore.state.world.flags['__just_tempted_backfire']).toBeUndefined();
      const seen = gameStore.achievements.tempt_fate_backfires_seen;
      if (seen.length > 0) firedKind = seen[seen.length - 1] ?? null;
      // Restart combat for repeated trials (the pell may have died).
      if (gameStore.state.combat === null) {
        gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
      }
    }
    expect(firedKind).not.toBeNull();
  });

  it('forgetAchievements clears the in-memory record and localStorage', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked.length).toBeGreaterThan(0);
    gameStore.forgetAchievements();
    expect(gameStore.achievements.unlocked.length).toBe(0);
    expect(localStorage.getItem('heroicchronicle.achievements.v1')).toBeNull();
  });

  it('markAchievementsOpened sets unlockedCountAtLastOpen to current length', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked.length).toBeGreaterThan(0);
    gameStore.markAchievementsOpened();
    expect(gameStore.achievements.unlockedCountAtLastOpen).toBe(gameStore.achievements.unlocked.length);
  });
});
