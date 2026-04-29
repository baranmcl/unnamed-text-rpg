import { describe, it, expect } from 'vitest';
import { startNarrativeEncounter, chooseNarrativeOption } from '../narrative';
import { createInitialState } from '../state';
import { ClassId, EncounterId, LocationId, NarrativeNodeId, type GameState, type NarrativeEncounter } from '../types';

// Helpers are referenced by the reference test bodies below (Task 7).
// Prefixed with _ to satisfy noUnusedLocals until the it.todos are expanded.
function _callEncounter(): NarrativeEncounter {
  return {
    id: EncounterId('the_call'),
    kind: 'narrative',
    rootNodeId: NarrativeNodeId('call_root'),
    noFlee: true
  };
}

function _freshState(): GameState {
  let s = createInitialState(1);
  s = {
    ...s,
    character: { ...s.character, name: 'Test', classId: ClassId('reluctant_farmboy') },
    world: { ...s.world, currentLocation: LocationId('dusty_crossroads') }
  };
  return s;
}

// Anchor all symbols so noUnusedLocals is satisfied until it.todos are expanded.
void (startNarrativeEncounter as unknown);
void (chooseNarrativeOption as unknown);
void (expect as unknown);
void (_callEncounter as unknown);
void (_freshState as unknown);

describe('narrative sub-reducer', () => {
  // These tests reference content (the_call encounter, call_root node, resolvers)
  // authored in Tasks 6 and 7. Marked it.todo until then.
  it.todo('startNarrativeEncounter sets combat to narrative kind at the root node');
  it.todo('chooseNarrativeOption with a looping resolver returns to the same node');
  it.todo('chooseNarrativeOption with a terminating resolver clears combat');
  it.todo('chooseNarrativeOption with an out-of-range index is a no-op');
});

/*
 * Reference test bodies for Task 7 — expand the it.todos above once
 * Tasks 6 (the_call encounter) and 7 (call_root node + resolvers) land.
 * Rename _callEncounter → callEncounter and _freshState → freshState.
 *
 * it('startNarrativeEncounter sets combat to narrative kind at the root node', () => {
 *   const s = _freshState();
 *   const s1 = startNarrativeEncounter(s, _callEncounter());
 *   expect(s1.combat).not.toBeNull();
 *   expect(s1.combat?.kind).toBe('narrative');
 *   if (s1.combat?.kind === 'narrative') {
 *     expect(s1.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
 *   }
 *   const lastEntries = s1.log.slice(-2);
 *   expect(lastEntries.some((e) => e.kind === 'dialogue')).toBe(true);
 * });
 *
 * it('chooseNarrativeOption with a looping resolver returns to the same node', () => {
 *   let s = _freshState();
 *   s = startNarrativeEncounter(s, _callEncounter());
 *   const s2 = chooseNarrativeOption(s, 1);
 *   expect(s2.combat?.kind).toBe('narrative');
 *   if (s2.combat?.kind === 'narrative') {
 *     expect(s2.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
 *   }
 *   const lastEntry = s2.log[s2.log.length - 1];
 *   expect(lastEntry?.systemLabel).toBe('NARRATOR');
 * });
 *
 * it('chooseNarrativeOption with a terminating resolver clears combat', () => {
 *   let s = _freshState();
 *   s = startNarrativeEncounter(s, _callEncounter());
 *   const s2 = chooseNarrativeOption(s, 0);
 *   expect(s2.combat).toBeNull();
 *   expect(s2.story.stage).toBe('act_ii');
 * });
 *
 * it('chooseNarrativeOption with an out-of-range index is a no-op', () => {
 *   let s = _freshState();
 *   s = startNarrativeEncounter(s, _callEncounter());
 *   const s2 = chooseNarrativeOption(s, 99);
 *   expect(s2.combat?.kind).toBe('narrative');
 *   if (s2.combat?.kind === 'narrative') {
 *     expect(s2.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
 *   }
 * });
 */
