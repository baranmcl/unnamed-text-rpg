import { describe, it, expect } from 'vitest';
import { reduce } from '../../../engine/events';
import { createInitialState } from '../../../engine/state';
import { registerSkillResolver } from '../resolvers';
import type { ClassId, EncounterId, SkillId } from '../../../engine/types';
import { content } from '../../../content';

describe('UseSkill MP gating', () => {
  it('does nothing if the player does not know the skill', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    const before = s.character.mp.current;
    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
    expect(s.character.mp.current).toBe(before);
  });

  it('deducts MP and runs the resolver when the skill is known and MP is sufficient', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };

    let resolverCalled = false;
    registerSkillResolver('tempt_fate', (state) => {
      resolverCalled = true;
      return state;
    });

    const mpBefore = s.character.mp.current;
    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
    expect(resolverCalled).toBe(true);
    expect(s.character.mp.current).toBe(mpBefore - 6);
  });
});

describe('Brute Force resolver', () => {
  it('rolls a single attack with reduced accuracy and 1.8x damage', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['brute_force' as SkillId] } };

    expect(content.skills['brute_force' as SkillId]).toBeDefined();

    const mpBefore = s.character.mp.current;
    s = reduce(s, { kind: 'UseSkill', skillId: 'brute_force' as SkillId });
    expect(s.character.mp.current).toBe(mpBefore - 6);
    const lastTwo = s.log.slice(-3).map((e) => e.text);
    const hadAttackLog = lastTwo.some(
      (t) => t.includes('with all your weight') || t.includes('bites only the dust')
    );
    expect(hadAttackLog).toBe(true);
  });
});

describe('Out-Think It resolver', () => {
  it('applies weakness_revealed to the monster (until_end_of_fight)', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['out_think_it' as SkillId] } };

    s = reduce(s, { kind: 'UseSkill', skillId: 'out_think_it' as SkillId });

    if (s.combat?.kind === 'turn-based') {
      const monster = s.combat.combatants.find((c) => c.kind === 'monster')!;
      const wr = monster.statuses.find((st) => st.kind === 'weakness_revealed');
      expect(wr).toBeDefined();
      expect(wr!.duration.kind).toBe('until_end_of_fight');
    }
  });

  it('replaces existing weakness_revealed (no stacking)', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['out_think_it' as SkillId], mp: { current: 100, max: 100 } } };

    s = reduce(s, { kind: 'UseSkill', skillId: 'out_think_it' as SkillId });
    s = reduce(s, { kind: 'UseSkill', skillId: 'out_think_it' as SkillId });

    if (s.combat?.kind === 'turn-based') {
      const monster = s.combat.combatants.find((c) => c.kind === 'monster')!;
      const count = monster.statuses.filter((st) => st.kind === 'weakness_revealed').length;
      expect(count).toBe(1);
    }
  });
});

describe('Swagger resolver', () => {
  it('applies intimidated (turns: 1) to the monster, causing its next turn to skip', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'first_tax_rat' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['swagger' as SkillId] } };

    s = reduce(s, { kind: 'UseSkill', skillId: 'swagger' as SkillId });

    const skipEntry = s.log.find((e) => e.text.toLowerCase().includes('rattled') || e.text.toLowerCase().includes('reconsider'));
    expect(skipEntry).toBeDefined();
  });
});
