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

  it('Wizard: full opener flow ends in Footnote combat', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'W', classId: ClassId('accidental_wizard') });
    expect(gameStore.state.combat?.kind).toBe('narrative');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 1 });  // margin b
    expect(gameStore.state.world.flags['consulted_tome']).toBe(true);
    expect(gameStore.state.world.flags['wizard_first_margin']).toBe('b');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // commitment
    expect(gameStore.state.combat?.kind).toBe('turn-based');
    if (gameStore.state.combat?.kind === 'turn-based') {
      expect(gameStore.state.combat.encounterId).toBe(EncounterId('combat_feral_footnote'));
    }
  });

  it('Bard: full opener flow ends in Heckler combat', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'B', classId: ClassId('bard') });
    expect(gameStore.state.combat?.kind).toBe('narrative');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.world.flags['tuned_lute']).toBe(true);
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.combat?.kind).toBe('turn-based');
    if (gameStore.state.combat?.kind === 'turn-based') {
      expect(gameStore.state.combat.encounterId).toBe(EncounterId('combat_pointed_heckler'));
    }
  });

  it('Farmhand: full opener flow ends in free play (no tutorial combat)', () => {
    gameStore.dispatch({ kind: 'StartNewGame', name: 'F', classId: ClassId('reluctant_farmhand') });
    expect(gameStore.state.combat?.kind).toBe('narrative');
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.world.flags['corked_jar']).toBe(true);
    gameStore.dispatch({ kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(gameStore.state.combat).toBeNull();
  });
});
