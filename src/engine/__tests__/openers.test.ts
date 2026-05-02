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

describe('Bard opener', () => {
  function startBard() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'B', classId: ClassId('bard') });
    return s;
  }

  it('starts in the Bard engagement node after StartNewGame', () => {
    const s = startBard();
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('bard_opener_a'));
    }
  });

  it('engagement choice plants tuned_lute and advances to Node B', () => {
    let s = startBard();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.world.flags['tuned_lute']).toBe(true);
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('bard_opener_b'));
    }
  });

  it('commitment choice triggers the Heckler tutorial combat', () => {
    let s = startBard();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.combat?.kind).toBe('turn-based');
    if (s.combat?.kind === 'turn-based') {
      expect(s.combat.encounterId).toBe(EncounterId('combat_pointed_heckler'));
    }
  });

  it('Node A prose contains the man-in-tweed-front-row cameo', () => {
    const s = startBard();
    const lastEntry = s.log[s.log.length - 1];
    expect(lastEntry?.text).toMatch(/A man in tweed sits there, taking notes/);
  });
});

describe('Farmhand opener', () => {
  function startFarmhand() {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'F', classId: ClassId('reluctant_farmhand') });
    return s;
  }

  it('starts in the Farmhand engagement node after StartNewGame', () => {
    const s = startFarmhand();
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('farmhand_opener_a'));
    }
  });

  it('engagement choice plants corked_jar and advances to Node B', () => {
    let s = startFarmhand();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.world.flags['corked_jar']).toBe(true);
    expect(s.combat?.kind).toBe('narrative');
    if (s.combat?.kind === 'narrative') {
      expect(s.combat.currentNodeId).toBe(NarrativeNodeId('farmhand_opener_b'));
    }
  });

  it('commitment choice terminates the encounter (no combat queued)', () => {
    let s = startFarmhand();
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.combat).toBeNull();
    expect(s.world.flags['__pending_encounter']).toBeUndefined();
  });

  it('Node A prose contains the figure-in-tweed-down-the-lane cameo', () => {
    const s = startFarmhand();
    const lastEntry = s.log[s.log.length - 1];
    expect(lastEntry?.text).toMatch(/figure in tweed passes the farm/);
  });
});
