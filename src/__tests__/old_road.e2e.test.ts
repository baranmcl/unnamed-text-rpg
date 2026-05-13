import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/events';
import { createInitialState } from '../engine/state';
import { ClassId, LocationId, MonsterId } from '../engine/types';
import type { GameState, TurnBasedCombatState, CombatEncounter } from '../engine/types';
import { content } from '../content';
import { endCombat } from '../engine/combat';

function startFarmhandAtOldRoad(seed = 42): GameState {
  let s = createInitialState(seed);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
  // Skip openers by force-clearing combat.
  if (s.combat) s = { ...s, combat: null };
  // Mark accepted_call so the dusty_crossroads exit unlocks.
  s = { ...s, world: { ...s.world, flags: { ...s.world.flags, accepted_call: true, crossed_threshold: true } } };
  s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('the_old_road') });
  return s;
}

describe('Old Road auto-arrive dispatcher', () => {
  it('triggers a mandatory combat on first entry when old_road_wins is 0', () => {
    const s = startFarmhandAtOldRoad();
    expect(s.combat?.kind).toBe('turn-based');
    const monsterId = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!.id;
    expect([MonsterId('wayfaring_footnote'), MonsterId('plot_convenience')]).toContain(monsterId);
  });

  it('queued combat has noFlee enforced (cannot flee)', () => {
    let s = startFarmhandAtOldRoad();
    const before = s.combat;
    s = reduce(s, { kind: 'Flee' });
    // Combat should still be active — Flee blocked.
    expect(s.combat).not.toBeNull();
    expect(s.combat?.kind).toBe(before?.kind);
  });
});

describe('Old Road win counter', () => {
  it('increments old_road_wins after victory; sets old_road_cleared at 3', () => {
    let s = startFarmhandAtOldRoad();
    const enc = content.encounters[s.combat!.encounterId] as CombatEncounter;

    // Force monster HP to 0 so endCombat fires victory cleanly.
    if (s.combat?.kind === 'turn-based') {
      const sCombat = s.combat;
      s = {
        ...s,
        combat: {
          ...sCombat,
          combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 0 } : c)
        }
      };
    }

    s = endCombat(s, 'victory', enc);
    expect(s.world.flags['old_road_wins']).toBe(1);
    expect(s.world.flags['old_road_cleared']).toBeUndefined();

    // Re-enter, win again.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('the_old_road') });
    if (s.combat?.kind === 'turn-based') {
      const sCombat = s.combat;
      s = { ...s, combat: { ...sCombat, combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 0 } : c) } };
    }
    s = endCombat(s, 'victory', content.encounters[s.combat!.encounterId] as CombatEncounter);
    expect(s.world.flags['old_road_wins']).toBe(2);

    // Third win.
    s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('the_old_road') });
    if (s.combat?.kind === 'turn-based') {
      const sCombat = s.combat;
      s = { ...s, combat: { ...sCombat, combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 0 } : c) } };
    }
    s = endCombat(s, 'victory', content.encounters[s.combat!.encounterId] as CombatEncounter);
    expect(s.world.flags['old_road_wins']).toBe(3);
    expect(s.world.flags['old_road_cleared']).toBe(true);
  });
});

describe('Old Road patrol button', () => {
  it('is registered on the_old_road location', () => {
    const loc = content.locations[LocationId('the_old_road')];
    expect(loc!.encounterIds).toContain('patrol_old_road');
  });

  it('Press on -> queues a fleeable Old Road combat', () => {
    let s = startFarmhandAtOldRoad();
    // Clear the auto-arrive combat to simulate "player has finished a fight and is back at the location".
    if (s.combat) s = { ...s, combat: null };

    // Now click the patrol encounter.
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'patrol_old_road' as import('../engine/types').EncounterId });
    expect(s.combat?.kind).toBe('narrative');

    // "Press on" is choice 0.
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });

    // After draining the pending encounter, combat should be a fleeable Old Road combat.
    expect(s.combat?.kind).toBe('turn-based');
    const monsterId = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster')!.id;
    expect([MonsterId('wayfaring_footnote'), MonsterId('plot_convenience')]).toContain(monsterId);
    // Must be a fleeable variant (not the mandatory variant — the patrol is voluntary).
    const enc = content.encounters[(s.combat as TurnBasedCombatState).encounterId] as CombatEncounter;
    expect(enc.noFlee).toBeFalsy();
  });

  it('Turn back -> exits cleanly with no combat queued', () => {
    let s = startFarmhandAtOldRoad();
    if (s.combat) s = { ...s, combat: null };
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'patrol_old_road' as import('../engine/types').EncounterId });
    expect(s.combat?.kind).toBe('narrative');
    // "Turn back" is choice 1.
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 1 });
    expect(s.combat).toBeNull();
  });
});
