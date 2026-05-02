import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/events';
import { createInitialState } from '../engine/state';
import type { ClassId, LocationId, SkillId } from '../engine/types';

describe('E2E: each class plays from creation through to its starting location', () => {
  const classCases = [
    { classId: 'reluctant_farmhand' as ClassId, location: 'family_farm' as LocationId, signatureMove: 'tempt_fate' as SkillId },
    { classId: 'disgraced_knight' as ClassId, location: 'quartermasters_yard' as LocationId, signatureMove: 'brute_force' as SkillId },
    { classId: 'accidental_wizard' as ClassId, location: 'burning_library' as LocationId, signatureMove: 'out_think_it' as SkillId },
    { classId: 'bard' as ClassId, location: 'tavern_dressing_room' as LocationId, signatureMove: 'swagger' as SkillId }
  ];

  for (const tc of classCases) {
    it(`${tc.classId}: starts in correct location with class equipment`, () => {
      let s = createInitialState(42);
      s = reduce(s, { kind: 'StartNewGame', name: 'Hero', classId: tc.classId });
      expect(s.world.currentLocation).toBe(tc.location);
      expect(s.character.classId).toBe(tc.classId);
      expect(s.character.knownSkills).not.toContain(tc.signatureMove);
      // Some equipment slots should be populated (each class equips at least one item by default).
      expect(Object.keys(s.character.equipment).length).toBeGreaterThan(0);
    });
  }
});
