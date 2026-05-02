import { describe, it, expect } from 'vitest';
import { reduce } from '../events';
import { createInitialState } from '../state';
import { ClassId, EncounterId, NarrativeNodeId } from '../types';

describe('Knight opener', () => {
  function startKnight() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'K', classId: ClassId('disgraced_knight') });
    return s;
  }

  it('starts in the Knight engagement node after StartNewGame', () => {
    const s = startKnight();
    expect(s.combat).not.toBeNull();
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('knight_opener_a'));
    }
  });

  it('engagement choice plants read_dismissal_notice and advances to Node B', () => {
    let s = startKnight();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.world.flags['read_dismissal_notice']).toBe(true);
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('knight_opener_b'));
    }
  });

  it('commitment choice triggers the Pell tutorial combat', () => {
    let s = startKnight();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // Engagement
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // Commitment
    expect(s.combat?.kind).toBe('turn-based');
    if (s.combat?.kind === 'turn-based') {
      expect(s.combat.encounterId).toBe(EncounterId('combat_insolent_pell'));
    }
  });

  it('Node A prose contains the tweed cameo phrase', () => {
    const s = startKnight();
    const lastEntry = s.log[s.log.length - 1];
    expect(lastEntry?.text).toMatch(/figure in tweed crosses the parade ground/);
  });
});
