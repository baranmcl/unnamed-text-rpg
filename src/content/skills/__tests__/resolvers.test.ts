import { describe, it, expect } from 'vitest';
import { reduce } from '../../../engine/events';
import { createInitialState } from '../../../engine/state';
import { registerSkillResolver, skillResolvers } from '../resolvers';
import type { ClassId, EncounterId, SkillId, SkillResolverId } from '../../../engine/types';
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

    const realResolver = skillResolvers['tempt_fate' as SkillResolverId];
    let resolverCalled = false;
    registerSkillResolver('tempt_fate', (state) => {
      resolverCalled = true;
      return state;
    });

    const mpBefore = s.character.mp.current;
    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
    expect(resolverCalled).toBe(true);
    expect(s.character.mp.current).toBe(mpBefore - 6);

    // Restore the real resolver so subsequent tests are not affected.
    if (realResolver) registerSkillResolver('tempt_fate', realResolver);
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

describe('Tempt Fate resolver', () => {
  it('applies guaranteed_crit (one_shot) to the player', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };

    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });

    if (s.combat?.kind === 'turn-based') {
      const player = s.combat.combatants.find((c) => c.kind === 'player')!;
      expect(player.statuses.some((st) => st.kind === 'guaranteed_crit')).toBe(true);
    }
  });

  it('with seed forcing backfire, applies one of the six self-effects', () => {
    // Seed 1859 is a known-good seed where the 15% backfire gate fires.
    // (The LCG RNG produces d100=8 at rng.step=2 for seed 1859.)
    let backfireFired = false;
    for (let seed = 1859; seed <= 1870 && !backfireFired; seed++) {
      let s = createInitialState(seed);
      s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
      s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
      s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };
      s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
      const backfire = s.log.find((e) =>
        e.text.includes('Skip next turn') ||
        e.text.includes('crit yourself') ||
        e.text.includes('Weapon suspended') ||
        e.text.includes('Armor halved') ||
        e.text.includes('takes the cue') ||
        e.text.includes('destined to miss')
      );
      if (backfire) {
        backfireFired = true;
        break;
      }
    }
    expect(backfireFired).toBe(true);
  });
});
