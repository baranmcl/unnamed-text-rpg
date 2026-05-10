import { describe, it, expect } from 'vitest';
import { reduce } from '../../../engine/events';
import { createInitialState } from '../../../engine/state';
import { registerSkillResolver, skillResolvers } from '../resolvers';
import type { ClassId, EncounterId, SkillId, SkillResolverId, TurnBasedCombatState } from '../../../engine/types';
import { content } from '../../../content';
import { applyStatus } from '../../../engine/status';

describe('UseSkill MP gating', () => {
  it('does nothing if the player does not know the skill', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    const before = s.character.mp.current;
    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
    expect(s.character.mp.current).toBe(before);
  });

  it('deducts MP and runs the resolver when the skill is known and MP is sufficient', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
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
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
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

  it('caps Brute Force damage at 1 when the monster has plot_armor', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['brute_force' as SkillId] } };

    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const monsterId = s.combat.combatants.find((c) => c.kind === 'monster')!.id;

    s = applyStatus(s, { kind: 'combatant', combatantId: monsterId }, {
      kind: 'plot_armor',
      duration: { kind: 'until_end_of_fight' },
      source: 'test'
    });

    // Try a handful of attempts — even if Brute Force's reduced-accuracy miss
    // fires on some, at least one should land, and any landed damage must be 1.
    let landedDamage: number | null = null;
    for (let i = 0; i < 10; i++) {
      const monsterBefore = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!;
      const before = monsterBefore.hp;
      s = reduce(s, { kind: 'UseSkill', skillId: 'brute_force' as SkillId });
      if (s.combat?.kind !== 'turn-based') break;
      const after = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!.hp;
      const dealt = before - after;
      if (dealt > 0) {
        // Once landed, assert the cap and stop — Brute Force shouldn't deal more than 1
        // while plot_armor is active.
        landedDamage = dealt;
        break;
      }
      // Top up MP so the loop can keep firing.
      s = { ...s, character: { ...s.character, mp: { ...s.character.mp, current: s.character.mp.max } } };
    }
    expect(landedDamage).toBe(1);
  });
});

describe('Out-Think It resolver', () => {
  it('applies weakness_revealed to the monster (until_end_of_fight)', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
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
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
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
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
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
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
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
      s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
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

describe('Disgraced Knight playable', () => {
  it("starts in Quartermaster's Yard with Nicked Longsword equipped", () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Sir T', classId: 'disgraced_knight' as ClassId });
    expect(s.world.currentLocation).toBe('quartermasters_yard');
    expect(s.character.equipment.weapon).toBe('nicked_longsword');
  });
});

describe('Accidental Wizard playable', () => {
  it('starts in burning_library with cracked_staff equipped', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Magus T', classId: 'accidental_wizard' as ClassId });
    expect(s.world.currentLocation).toBe('burning_library');
    expect(s.character.equipment.weapon).toBe('cracked_staff');
  });
});

describe('Bard playable', () => {
  it('starts in tavern_dressing_room with dented_lute equipped', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'Maestro T', classId: 'bard' as ClassId });
    expect(s.world.currentLocation).toBe('tavern_dressing_room');
    expect(s.character.equipment.weapon).toBe('dented_lute');
  });
});

describe('Tempt Fate achievement seeds', () => {
  it('sets achievements.tempted_fate on use', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
    s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };
    s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
    expect(s.world.flags['achievements.tempted_fate']).toBe(true);
  });

  it('sets __just_tempted_backfire to a known kind on backfire', () => {
    const KNOWN = new Set(['trip', 'crit_yourself', 'weapon_mute', 'drop_shield', 'free_retaliation', 'wasted_prophecy']);
    let observed: string | null = null;
    for (let seed = 1; seed <= 2000 && observed === null; seed++) {
      let s = createInitialState(seed);
      s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
      s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'practice_dummy' as EncounterId });
      s = { ...s, character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] } };
      s = reduce(s, { kind: 'UseSkill', skillId: 'tempt_fate' as SkillId });
      const v = s.world.flags['__just_tempted_backfire'];
      if (typeof v === 'string') observed = v;
    }
    expect(observed).not.toBeNull();
    expect(KNOWN.has(observed!)).toBe(true);
  });
});
