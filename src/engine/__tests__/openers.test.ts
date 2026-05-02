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

describe('Wizard opener', () => {
  function startWizard() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'W', classId: ClassId('accidental_wizard') });
    return s;
  }

  it('starts in the Wizard engagement node after StartNewGame', () => {
    const s = startWizard();
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('wizard_opener_a'));
    }
  });

  it.each([
    [0, 'a'],
    [1, 'b'],
    [2, 'c']
  ])('margin choice index %i plants wizard_first_margin = %s and consulted_tome', (idx, margin) => {
    let s = startWizard();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: idx });
    expect(s.world.flags['consulted_tome']).toBe(true);
    expect(s.world.flags['wizard_first_margin']).toBe(margin);
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('wizard_opener_b'));
    }
  });

  it('commitment choice triggers the Footnote tutorial combat', () => {
    let s = startWizard();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // Engagement (margin a)
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // Commitment
    expect(s.combat?.kind).toBe('turn-based');
    if (s.combat?.kind === 'turn-based') {
      expect(s.combat.encounterId).toBe(EncounterId('combat_feral_footnote'));
    }
  });

  it('Node A prose contains the librarian-with-unmarked-volume cameo', () => {
    const s = startWizard();
    const lastEntry = s.log[s.log.length - 1];
    expect(lastEntry?.text).toMatch(/junior librarian moves between stacks with a slim, unmarked volume/);
  });
});
