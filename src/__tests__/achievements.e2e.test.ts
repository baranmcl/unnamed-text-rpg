import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore, SAVE_KEY } from '../ui/store.svelte';
import { ClassId, EncounterId, AchievementId, type GameState } from '../engine/types';
import { loadAchievements, ACHIEVEMENTS_STORAGE_KEY } from '../engine/achievements';

describe('achievements e2e', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('farmhand first-victory unlocks first_blood and persists', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'Brendan', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    if (gameStore.state.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = gameStore.state.combat.combatants.find((c) => c.kind === 'monster')!.id;
    const woundedState: GameState = {
      ...gameStore.state,
      combat: {
        ...gameStore.state.combat,
        combatants: gameStore.state.combat.combatants.map((c) => (c.id === monsterId ? { ...c, hp: 1 } : c))
      }
    };
    // Cheat: drop the monster to 1 HP so the next attack resolves as a kill.
    // The dispatch path is NOT bypassed — AttackTarget below runs through the
    // full reducer and achievement check.
    gameStore.state = woundedState;
    gameStore.dispatch({ kind: 'AttackTarget' });

    expect(gameStore.achievements.unlocked).toContain(AchievementId('first_blood'));
    const sysEntry = gameStore.state.log.find(
      (e) => e.kind === 'system' && e.systemLabel === 'ACHIEVEMENT' && e.text.includes('First Blood')
    );
    expect(sysEntry).toBeDefined();
    expect(loadAchievements().unlocked).toContain(AchievementId('first_blood'));
  });

  it('Consign this tale to the flames leaves achievements intact', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));
    gameStore.resetSave();
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));
    expect(loadAchievements().unlocked).toContain(AchievementId('moonlit'));
  });

  it('Forget thy deeds wipes achievements but leaves the save intact', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    gameStore.saveNow();
    const beforeName = gameStore.state.character.name;
    expect(gameStore.achievements.unlocked).toContain(AchievementId('moonlit'));

    gameStore.forgetAchievements();
    expect(gameStore.achievements.unlocked).toEqual([]);
    expect(localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY)).toBeNull();
    expect(gameStore.state.character.name).toBe(beforeName);
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('moonlit toast is queued and a system log entry appears in the same tick', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmhand') });
    gameStore.dispatch({ kind: 'SetTheme', theme: 'moonlit' });
    expect(gameStore.pendingToasts.some((a) => a.id === AchievementId('moonlit'))).toBe(true);
    expect(
      gameStore.state.log.some(
        (e) => e.kind === 'system' && e.systemLabel === 'ACHIEVEMENT' && e.text.includes('Moonlit')
      )
    ).toBe(true);
  });
});
