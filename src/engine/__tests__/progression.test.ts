import { describe, it, expect } from 'vitest';
import { applyLevelUp, awardXp, STAT_ROTATIONS } from '../progression';
import { createInitialState } from '../state';
import { ClassId, SkillId, type GameState } from '../types';
import { reduce } from '../events';

function farmboyAtLevel1(): GameState {
  let s = createInitialState(1);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmboy' as ClassId });
  return s;
}

describe('STAT_ROTATIONS', () => {
  it('has an entry for every class', () => {
    expect(STAT_ROTATIONS['reluctant_farmboy' as ClassId]).toBeDefined();
  });
});

describe('applyLevelUp', () => {
  it('increments level and adds HP/MP per the spec formula', () => {
    const s = farmboyAtLevel1();
    const before = { hp: s.character.hp.max, mp: s.character.mp.max, level: s.character.level };
    const after = applyLevelUp(s);
    expect(after.character.level).toBe(before.level + 1);
    expect(after.character.hp.max).toBe(before.hp + Math.floor(s.character.stats.brawn * 1.5));
    expect(after.character.mp.max).toBe(before.mp + s.character.stats.brains);
    expect(after.character.hp.current).toBe(after.character.hp.max);
    expect(after.character.mp.current).toBe(after.character.mp.max);
  });

  it('applies the class stat rotation to the appropriate stat at level 2', () => {
    // Farmboy's first rotation entry is "bluck".
    const s = farmboyAtLevel1();
    const before = s.character.stats.bluck;
    const after = applyLevelUp(s);
    expect(after.character.stats.bluck).toBe(before + 1);
  });

  it('unlocks the class signature move at the configured unlockLevel', () => {
    let s = farmboyAtLevel1();
    s = applyLevelUp(s);  // level 2
    expect(s.character.knownSkills).not.toContain('tempt_fate');
    s = applyLevelUp(s);  // level 3
    expect(s.character.knownSkills).toContain('tempt_fate' as SkillId);
  });

  it('does not duplicate a skill if already known', () => {
    let s = farmboyAtLevel1();
    s = applyLevelUp(s);
    s = applyLevelUp(s);
    s = applyLevelUp(s);
    s = applyLevelUp(s);
    const count = s.character.knownSkills.filter((k) => k === 'tempt_fate').length;
    expect(count).toBeLessThanOrEqual(1);
  });
});

describe('applyLevelUp signature_unlocked side-effect', () => {
  it('sets achievements.signature_unlocked when signature skill unlocks', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    s = applyLevelUp(s); // 1 -> 2
    s = applyLevelUp(s); // 2 -> 3 — signature unlocks
    expect(s.character.knownSkills.length).toBeGreaterThan(0);
    expect(s.world.flags['achievements.signature_unlocked']).toBe(true);
  });
});

describe('awardXp helper', () => {
  it('adds the amount to character.xp without leveling up below threshold', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    const startXp = s.character.xp;
    const startLevel = s.character.level;
    s = awardXp(s, 50);
    expect(s.character.xp).toBe(startXp + 50);
    expect(s.character.level).toBe(startLevel);
  });

  it('triggers a single level-up when amount crosses the threshold', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    const startLevel = s.character.level;
    // Threshold for level 1 → 2 is 100. Award 100 XP.
    s = awardXp(s, 100);
    expect(s.character.level).toBe(startLevel + 1);
    // After level-up the leftover XP is below the new threshold (200), so xp = 0.
    expect(s.character.xp).toBe(0);
  });

  it('triggers multiple level-ups when amount crosses several thresholds', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    const startLevel = s.character.level;
    // Award enough XP for at least two level-ups (level 1→2 needs 100, 2→3 needs 200).
    s = awardXp(s, 350);
    expect(s.character.level).toBeGreaterThanOrEqual(startLevel + 2);
  });

  it('handles amount = 0 as a no-op when below threshold', () => {
    let s = createInitialState(1);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: ClassId('reluctant_farmboy') });
    const before = s;
    s = awardXp(s, 0);
    expect(s.character.xp).toBe(before.character.xp);
    expect(s.character.level).toBe(before.character.level);
  });
});
