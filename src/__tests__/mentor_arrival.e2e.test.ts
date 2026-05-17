import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/events';
import { createInitialState } from '../engine/state';
import { ClassId, LocationId, SkillId } from '../engine/types';
import type { GameState, NarrativeCombatState } from '../engine/types';

function setupAtMentorLocationDoor(classId: ClassId, seed = 9): GameState {
  let s = createInitialState(seed);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId });
  if (s.combat) s = { ...s, combat: null };
  s = { ...s, world: { ...s.world, flags: { ...s.world.flags, accepted_call: true, crossed_threshold: true, old_road_cleared: true, old_road_wins: 3, [`class.${classId}`]: true } } };
  return s;
}

describe('mentor location auto-arrive routing', () => {
  it('first visit queues mentor_<class>_first_visit', () => {
    let s = setupAtMentorLocationDoor('disgraced_knight' as ClassId);
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('veterans_chapel') });
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).encounterId).toBe('mentor_knight_first_visit');
  });

  it('post-acceptance entry queues mentor_<class>_post_acceptance', () => {
    let s = setupAtMentorLocationDoor('disgraced_knight' as ClassId);
    s = { ...s, character: { ...s.character, knownSkills: ['brute_force' as SkillId] } };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('veterans_chapel') });
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).encounterId).toBe('mentor_knight_post_acceptance');
  });

  it('return-after-refusal queues mentor_<class>_return_unlearned', () => {
    let s = setupAtMentorLocationDoor('disgraced_knight' as ClassId);
    s = { ...s, world: { ...s.world, flags: { ...s.world.flags, refused_mentor_knight: true } } };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('veterans_chapel') });
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).encounterId).toBe('mentor_knight_return_unlearned');
  });

  it('Farmhand: refused-AND-skill-learned routes to post_acceptance (not return_unlearned)', () => {
    let s = setupAtMentorLocationDoor('reluctant_farmhand' as ClassId);
    // Farmhand refused (which granted the skill comedically) — so skill IS learned.
    s = {
      ...s,
      character: { ...s.character, knownSkills: ['tempt_fate' as SkillId] },
      world: { ...s.world, flags: { ...s.world.flags, refused_mentor_farmhand: true } }
    };
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('hedgerow_lane') });
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).encounterId).toBe('mentor_farmhand_post_acceptance');
  });

  it("Wrong-class entry to a mentor location does NOT trigger an encounter (guard holds)", () => {
    // A Knight directly EnterLocation'd into the Hedgerow Lane (Farmhand's mentor
    // location) should NOT auto-queue any encounter. Class-flagged exits make this
    // impossible via normal navigation, but the engine's guard is the last line of
    // defense if a direct event slips through.
    let s = setupAtMentorLocationDoor('disgraced_knight' as ClassId);
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('hedgerow_lane') });
    expect(s.combat).toBeNull();
    // Other mentor locations (mismatched class) also no-op.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('quiet_tower') });
    expect(s.combat).toBeNull();
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('laureates_salon') });
    expect(s.combat).toBeNull();
  });
});
