import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from '../ui/store.svelte';
import { ClassId, EncounterId } from '../engine/types';

describe('openers e2e', () => {
  beforeEach(() => {
    localStorage.clear();
    gameStore.resetSave();
    gameStore.forgetAchievements();
  });

  it('Knight: full opener flow ends in Pell combat', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'K', classId: ClassId('disgraced_knight') });
    expect(gameStore.state.combat?.kind).toBe('narrative');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // engagement
    expect(gameStore.state.world.flags['read_dismissal_notice']).toBe(true);
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // commitment
    expect(gameStore.state.combat?.kind).toBe('turn-based');
    if (gameStore.state.combat?.kind === 'turn-based') {
      expect(gameStore.state.combat.encounterId).toBe(EncounterId('combat_insolent_pell'));
    }
  });
});
