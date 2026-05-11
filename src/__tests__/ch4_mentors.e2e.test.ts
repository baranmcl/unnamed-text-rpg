import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/events';
import { createInitialState } from '../engine/state';
import { ClassId, LocationId, SkillId } from '../engine/types';
import type { GameState, NarrativeCombatState } from '../engine/types';
import { content } from '../content';

// Helper: prepare a player who's at the Old Road with the road already cleared
// (skip the 3 mandatory fights by setting flags directly).
function preparedAtOldRoad(classId: ClassId, seed = 5): GameState {
  let s = createInitialState(seed);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId });
  if (s.combat) s = { ...s, combat: null };
  s = {
    ...s,
    world: {
      ...s.world,
      flags: {
        ...s.world.flags,
        accepted_call: true,
        crossed_threshold: true,
        old_road_cleared: true,
        old_road_wins: 3
      }
    },
    story: { ...s.story, stage: 'chapter_4' }
  };
  return s;
}

const CLASS_KEY: Record<string, { cls: ClassId; loc: LocationId; skill: SkillId }> = {
  knight: {
    cls: 'disgraced_knight' as ClassId,
    loc: LocationId('veterans_chapel'),
    skill: 'brute_force' as SkillId
  },
  wizard: {
    cls: 'accidental_wizard' as ClassId,
    loc: LocationId('quiet_tower'),
    skill: 'out_think_it' as SkillId
  },
  bard: {
    cls: 'bard' as ClassId,
    loc: LocationId('laureates_salon'),
    skill: 'swagger' as SkillId
  },
  farmhand: {
    cls: 'reluctant_farmhand' as ClassId,
    loc: LocationId('hedgerow_lane'),
    skill: 'tempt_fate' as SkillId
  }
};

describe.each(Object.entries(CLASS_KEY))('Ch 4 mentor flow — %s', (key, { cls, loc, skill }) => {
  it('Full flow: enter mentor location → arrival → teaching → accept → skill granted, combat clears', () => {
    let s = preparedAtOldRoad(cls);
    s = reduce(s, { kind: 'EnterLocation', locationId: loc });
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).encounterId).toBe(`mentor_${key}_first_visit`);
    // Arrival → teaching (1 choice)
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    // Teaching → accept (choice 0)
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.character.knownSkills).toContain(skill);
    expect(s.world.flags['ever_learned_signature']).toBe(true);
    expect(s.combat).toBeNull();
  });

  it('Probe seam → returns to teaching with probe option disabled', () => {
    let s = preparedAtOldRoad(cls);
    s = reduce(s, { kind: 'EnterLocation', locationId: loc });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // arrival → teaching
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 2 }); // teaching → deflect (probe)
    expect(s.world.flags[`probed_seam_${key}`]).toBe(true);
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // deflect → back to teaching
    // The probe choice on the teaching node is flagged disabled via disabledIfFlag.
    // Probe is choices[2] per the mentor teaching-node spec.
    const teaching = content.narrativeNodes[(`mentor_${key}_teaching`) as import('../engine/types').NarrativeNodeId]!;
    const probeChoice = teaching.choices[2];
    expect(probeChoice?.disabledIfFlag).toBe(`probed_seam_${key}`);
  });

  it('Motivation → returns to teaching with motivation option disabled', () => {
    let s = preparedAtOldRoad(cls);
    s = reduce(s, { kind: 'EnterLocation', locationId: loc });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // arrival → teaching
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 1 }); // teaching → motivation
    expect(s.world.flags[`asked_motivation_${key}`]).toBe(true);
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // motivation → back to teaching
    // Motivation is choices[1] per the mentor teaching-node spec.
    const teaching = content.narrativeNodes[(`mentor_${key}_teaching`) as import('../engine/types').NarrativeNodeId]!;
    const motivationChoice = teaching.choices[1];
    expect(motivationChoice?.disabledIfFlag).toBe(`asked_motivation_${key}`);
  });
});

describe('Knight refuse → return → accept', () => {
  it('refusal sets refused_mentor_knight; returning queues second-chance encounter; accept grants skill', () => {
    let s = preparedAtOldRoad(CLASS_KEY.knight!.cls);
    s = reduce(s, { kind: 'EnterLocation', locationId: CLASS_KEY.knight!.loc });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // arrival → teaching
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 3 }); // teaching → refuse
    expect(s.world.flags['refused_mentor_knight']).toBe(true);
    expect(s.character.knownSkills).not.toContain('brute_force' as SkillId);

    // Leave and return.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('the_old_road') });
    if (s.combat) s = { ...s, combat: null }; // skip any voluntary fight
    s = reduce(s, { kind: 'EnterLocation', locationId: CLASS_KEY.knight!.loc });
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).encounterId).toBe('mentor_knight_return_unlearned');
    // Second-chance: choice 0 = accept.
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });
    expect(s.character.knownSkills).toContain('brute_force' as SkillId);
  });
});

describe('Farmhand refuse → skill granted comedically', () => {
  it('refusing the Neighbor still grants tempt_fate', () => {
    let s = preparedAtOldRoad(CLASS_KEY.farmhand!.cls);
    s = reduce(s, { kind: 'EnterLocation', locationId: CLASS_KEY.farmhand!.loc });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // arrival → teaching
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 3 }); // teaching → refuse (Farmhand comedy)
    expect(s.character.knownSkills).toContain('tempt_fate' as SkillId);
    expect(s.world.flags['refused_mentor_farmhand']).toBe(true);
    expect(s.world.flags['ever_learned_signature']).toBe(true);
    // Returning shows post-acceptance flavor (since skill IS learned).
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('the_old_road') });
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'EnterLocation', locationId: CLASS_KEY.farmhand!.loc });
    expect((s.combat as NarrativeCombatState).encounterId).toBe('mentor_farmhand_post_acceptance');
  });
});

describe('skip-mentor path preserves achievement state', () => {
  it('player can cross the threshold without ever entering the mentor location', () => {
    let s = preparedAtOldRoad(CLASS_KEY.knight!.cls);
    // Player goes directly to the threshold instead of the mentor.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('the_threshold') });
    expect(s.world.flags['ever_learned_signature']).toBeUndefined();
    expect(s.character.knownSkills).not.toContain('brute_force' as SkillId);
  });
});
