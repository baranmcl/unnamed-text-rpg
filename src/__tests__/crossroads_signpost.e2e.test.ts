import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/events';
import { createInitialState } from '../engine/state';
import { ClassId, EncounterId, LocationId, NarrativeNodeId } from '../engine/types';
import type { GameState, NarrativeCombatState } from '../engine/types';
import { content } from '../content';

// Helper: fresh Farmhand who has visited the family farm and arrived at the
// crossroads. The Hermit MUST NOT auto-fire — that's the new gate.
function freshFarmhandAtCrossroads(seed = 7): GameState {
  let s = createInitialState(seed);
  s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
  if (s.combat) s = { ...s, combat: null };
  // Unlock the crossroads exit and step over.
  s = {
    ...s,
    world: { ...s.world, flags: { ...s.world.flags, unlocked_crossroads: true } }
  };
  s = reduce(s, { kind: 'EnterLocation', locationId: LocationId('dusty_crossroads') });
  return s;
}

describe('Pre-Call crossroads gate', () => {
  it('visiting the crossroads does NOT auto-fire the Hermit (gate requires crossroads_explored)', () => {
    const s = freshFarmhandAtCrossroads();
    expect(s.combat).toBeNull();
    expect(s.world.flags['started_call_encounter']).toBeFalsy();
    expect(s.story.stage).toBe('chapter_1');
  });

  it('Step back from the signpost sets crossroads_explored and the Hermit then arrives', () => {
    let s = freshFarmhandAtCrossroads();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'crossroads_signpost' as EncounterId });
    expect(s.combat?.kind).toBe('narrative');
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 4 }); // Step back
    expect(s.world.flags['crossroads_explored']).toBe(true);
    // The call_received beat fires + drainPendingEncounter dispatches the_call.
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).encounterId).toBe('the_call');
    // No currency awarded for stepping back.
    expect(s.character.currency).toBe(0);
    expect(s.world.flags['achievements.read_the_signs']).toBeFalsy();
  });

  it("defeating the Unsigned Direction also satisfies the gate", () => {
    let s = freshFarmhandAtCrossroads();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'combat_unsigned_direction' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    // Force the monster HP to 0; AttackTarget's post-attack KO check then routes
    // to endCombat('victory'), which sets defeated:combat_unsigned_direction.
    // The unsigned_direction_defeated beat fires off that flag and sets
    // crossroads_explored, which unlocks call_received.
    const sCombat = s.combat;
    s = {
      ...s,
      combat: {
        ...sCombat,
        combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 0 } : c)
      }
    };
    s = reduce(s, { kind: 'AttackTarget' });
    expect(s.world.flags['defeated:combat_unsigned_direction']).toBe(true);
    expect(s.world.flags['crossroads_explored']).toBe(true);
    // The_call should now be active (drainPendingEncounter dispatched it).
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).encounterId).toBe('the_call');
  });

  it('Correct riddle answer (onion) awards currency and the hidden achievement, then summons Hermit', () => {
    let s = freshFarmhandAtCrossroads();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'crossroads_signpost' as EncounterId });
    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 3 }); // 3 = An onion
    expect(s.character.currency).toBe(3);
    expect(s.world.flags['achievements.read_the_signs']).toBe(true);
    expect(s.world.flags['crossroads_explored']).toBe(true);
    expect((s.combat as NarrativeCombatState).encounterId).toBe('the_call');
  });

  it('Wrong riddle answer (prophecy) sets the tried flag, loops back without re-pushing root prose', () => {
    let s = freshFarmhandAtCrossroads();
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'crossroads_signpost' as EncounterId });
    const rootProse = content.narrativeNodes[NarrativeNodeId('crossroads_signpost_root')]!.prose;
    const rootProseCount = (text: string) => s.log.filter((e) => e.text === text).length;
    const before = rootProseCount(rootProse);
    expect(before).toBe(1);

    s = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 }); // 0 = A prophecy

    expect(s.world.flags['riddle_tried_prophecy']).toBe(true);
    // Still in the encounter — node looped back silently.
    expect(s.combat?.kind).toBe('narrative');
    expect((s.combat as NarrativeCombatState).currentNodeId).toBe('crossroads_signpost_root');
    // Root prose was NOT re-pushed (silent loop-back).
    expect(rootProseCount(rootProse)).toBe(1);
    // The choice should now be greyed via disabledIfFlag.
    const choice = content.narrativeNodes[NarrativeNodeId('crossroads_signpost_root')]!.choices[0];
    expect(choice?.disabledIfFlag).toBe('riddle_tried_prophecy');
  });

  it('Pre-Call encounters hide after the player accepts the call', () => {
    const signpost = content.encounters[EncounterId('crossroads_signpost')];
    const lurker = content.encounters[EncounterId('combat_unsigned_direction')];
    expect(signpost?.hiddenIfFlag).toBe('accepted_call');
    expect(lurker?.kind === 'combat' && lurker.hiddenIfFlag).toBe('accepted_call');
  });
});

describe('Crooked Arrow throwable', () => {
  it('deals exactly 6 damage and ignores monster armor', () => {
    let s = createInitialState(11);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    // Give the player a Crooked Arrow.
    s = {
      ...s,
      character: {
        ...s.character,
        inventory: [...s.character.inventory, { itemId: 'crooked_arrow' as import('../engine/types').ItemId, qty: 1 }]
      }
    };
    // Fight Plot Convenience (armor 2). Throwing the arrow should bypass armor.
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'combat_plot_convenience' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    const beforeHp = s.combat.combatants.find((c) => c.kind === 'monster')!.hp;

    s = reduce(s, { kind: 'UseItem', itemId: 'crooked_arrow' as import('../engine/types').ItemId });

    if (s.combat?.kind === 'turn-based') {
      const afterHp = s.combat.combatants.find((c) => c.kind === 'monster')!.hp;
      expect(beforeHp - afterHp).toBe(6);
    }
    // Inventory decremented.
    expect(s.character.inventory.find((e) => e.itemId === 'crooked_arrow')).toBeUndefined();
  });

  it('a finishing throw KOs the monster and resolves to victory without a retaliation turn', () => {
    let s = createInitialState(11);
    s = reduce(s, { kind: 'StartNewGame', name: 'T', classId: 'reluctant_farmhand' as ClassId });
    if (s.combat) s = { ...s, combat: null };
    s = {
      ...s,
      character: {
        ...s.character,
        inventory: [...s.character.inventory, { itemId: 'crooked_arrow' as import('../engine/types').ItemId, qty: 1 }]
      }
    };
    s = reduce(s, { kind: 'TriggerEncounter', encounterId: 'combat_unsigned_direction' as EncounterId });
    if (s.combat?.kind !== 'turn-based') throw new Error('expected combat');
    // Set monster HP to 6 so a single arrow KOs.
    const sCombat = s.combat;
    s = {
      ...s,
      combat: {
        ...sCombat,
        combatants: sCombat.combatants.map((c) => c.kind === 'monster' ? { ...c, hp: 6 } : c)
      }
    };
    const playerHpBefore = s.character.hp.current;
    s = reduce(s, { kind: 'UseItem', itemId: 'crooked_arrow' as import('../engine/types').ItemId });
    // Combat resolved to victory — no monster retaliation, player HP unchanged.
    expect(s.combat).toBeNull();
    expect(s.character.hp.current).toBe(playerHpBefore);
  });
});
