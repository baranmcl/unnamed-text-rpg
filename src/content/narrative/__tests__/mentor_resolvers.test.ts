import { describe, it, expect } from 'vitest';
import { reduce } from '../../../engine/events';
import { createInitialState } from '../../../engine/state';
import { startNarrativeEncounter } from '../../../engine/narrative';
import { content } from '../../index';
import { ClassId, NarrativeNodeId, SkillId } from '../../../engine/types';
import type { GameState, NarrativeEncounter, EncounterId } from '../../../engine/types';

function setupAtMentorTeaching(classId: ClassId, mentorKey: string, seed = 1): GameState {
  let s = createInitialState(seed);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId });
  if (s.combat) s = { ...s, combat: null };
  s = { ...s, world: { ...s.world, flags: { ...s.world.flags, accepted_call: true, crossed_threshold: true, old_road_cleared: true, old_road_wins: 3 } } };
  // Jump straight to the teaching node by starting the encounter and advancing.
  const enc = content.encounters[`mentor_${mentorKey}_first_visit` as EncounterId];
  s = startNarrativeEncounter(s, enc as NarrativeEncounter);
  // Advance past arrival → teaching by triggering the first (and only) choice.
  s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
  return s;
}

describe('mentor accept resolver — grants signatureMove', () => {
  it('Knight: accepting grants brute_force', () => {
    let s = setupAtMentorTeaching('disgraced_knight' as ClassId, 'knight');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // "Yes — teach me"
    expect(s.character.knownSkills).toContain('brute_force' as SkillId);
    expect(s.world.flags['ever_learned_signature']).toBe(true);
    expect(s.world.flags['achievements.signature_unlocked']).toBe(true);
    expect(s.combat).toBeNull();
  });

  it('Wizard: accepting grants out_think_it', () => {
    let s = setupAtMentorTeaching('accidental_wizard' as ClassId, 'wizard');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.character.knownSkills).toContain('out_think_it' as SkillId);
  });

  it('Bard: accepting grants swagger', () => {
    let s = setupAtMentorTeaching('bard' as ClassId, 'bard');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.character.knownSkills).toContain('swagger' as SkillId);
  });

  it('Farmhand: accepting grants tempt_fate', () => {
    let s = setupAtMentorTeaching('reluctant_farmhand' as ClassId, 'farmhand');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.character.knownSkills).toContain('tempt_fate' as SkillId);
  });
});

describe('mentor refuse resolver — exits without skill (with Farmhand exception)', () => {
  it('Knight: refusing exits without skill', () => {
    let s = setupAtMentorTeaching('disgraced_knight' as ClassId, 'knight');
    // teaching node choices: [0]=accept, [1]=motivation, [2]=deflect, [3]=walk-on
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 3 });
    expect(s.character.knownSkills).not.toContain('brute_force' as SkillId);
    expect(s.world.flags['refused_mentor_knight']).toBe(true);
    expect(s.world.flags['ever_learned_signature']).toBeUndefined();
    expect(s.combat).toBeNull();
  });

  it('Farmhand: refusing STILL grants tempt_fate (comedic exception)', () => {
    let s = setupAtMentorTeaching('reluctant_farmhand' as ClassId, 'farmhand');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 3 });
    expect(s.character.knownSkills).toContain('tempt_fate' as SkillId);
    expect(s.world.flags['refused_mentor_farmhand']).toBe(true);
    expect(s.world.flags['ever_learned_signature']).toBe(true);
    expect(s.combat).toBeNull();
    // Verify the comedic log line is present.
    const lines = s.log.map((e) => e.text).join('\n');
    expect(lines).toMatch(/Mind the third hedgerow/);
  });
});

describe('mentor probe and motivation resolvers — loop back to teaching, options grey out', () => {
  it('Knight: probing seam sets probed_seam_knight and returns to teaching', () => {
    let s = setupAtMentorTeaching('disgraced_knight' as ClassId, 'knight');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 2 }); // deflect/probe
    expect(s.world.flags['probed_seam_knight']).toBe(true);
    // Now advance through the deflect node back to teaching.
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    // The teaching node's probe choice should now be disabled (rendered greyed).
    const teaching = content.narrativeNodes[NarrativeNodeId('mentor_knight_teaching')];
    const probeChoice = teaching!.choices.find((c) => c.resolve === 'mentor_knight_deflect');
    expect(probeChoice?.disabledIfFlag).toBe('probed_seam_knight');
    expect(s.world.flags['probed_seam_knight']).toBe(true);
  });

  it('Knight: asking motivation sets asked_motivation_knight and returns to teaching', () => {
    let s = setupAtMentorTeaching('disgraced_knight' as ClassId, 'knight');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 1 });
    expect(s.world.flags['asked_motivation_knight']).toBe(true);
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    const teaching = content.narrativeNodes[NarrativeNodeId('mentor_knight_teaching')];
    const motivationChoice = teaching!.choices.find((c) => c.resolve === 'mentor_knight_motivation');
    expect(motivationChoice?.disabledIfFlag).toBe('asked_motivation_knight');
  });
});
