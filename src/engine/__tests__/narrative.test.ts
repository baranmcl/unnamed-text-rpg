import { describe, it, expect } from 'vitest';
import { startNarrativeEncounter, chooseNarrativeOption } from '../narrative';
import { createInitialState } from '../state';
import { ClassId, EncounterId, LocationId, NarrativeNodeId, type GameState, type NarrativeEncounter } from '../types';

function callEncounter(): NarrativeEncounter {
  return {
    id: EncounterId('the_call'),
    kind: 'narrative',
    rootNodeId: NarrativeNodeId('call_root'),
    noFlee: true
  };
}

function freshState(): GameState {
  let s = createInitialState(1);
  s = {
    ...s,
    character: { ...s.character, name: 'Test', classId: ClassId('reluctant_farmhand') },
    world: { ...s.world, currentLocation: LocationId('dusty_crossroads') }
  };
  return s;
}

describe('narrative sub-reducer', () => {
  it('startNarrativeEncounter sets combat to narrative kind at the root node', () => {
    const s = freshState();
    const s1 = startNarrativeEncounter(s, callEncounter());
    expect(s1.combat).not.toBeNull();
    expect(s1.combat?.kind).toBe('narrative');
    if (s1.combat?.kind === 'narrative') {
      expect(s1.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
    }
    const lastEntries = s1.log.slice(-2);
    expect(lastEntries.some((e) => e.kind === 'dialogue')).toBe(true);
  });

  it('chooseNarrativeOption with a looping resolver returns to the same node', () => {
    let s = freshState();
    s = startNarrativeEncounter(s, callEncounter());
    const s2 = chooseNarrativeOption(s, 1);
    expect(s2.combat?.kind).toBe('narrative');
    if (s2.combat?.kind === 'narrative') {
      expect(s2.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
    }
    const hasNarratorEntry = s2.log.some((e) => e.systemLabel === 'NARRATOR');
    expect(hasNarratorEntry).toBe(true);
  });

  it('chooseNarrativeOption with a terminating resolver clears combat', () => {
    let s = freshState();
    s = startNarrativeEncounter(s, callEncounter());
    const s2 = chooseNarrativeOption(s, 0);
    expect(s2.combat).toBeNull();
    expect(s2.story.stage).toBe('chapter_4');
  });

  it('chooseNarrativeOption with an out-of-range index is a no-op', () => {
    let s = freshState();
    s = startNarrativeEncounter(s, callEncounter());
    const s2 = chooseNarrativeOption(s, 99);
    expect(s2.combat?.kind).toBe('narrative');
    if (s2.combat?.kind === 'narrative') {
      expect(s2.combat.currentNodeId).toBe(NarrativeNodeId('call_root'));
    }
  });
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
 *   expect(s2.story.stage).toBe('chapter_6');
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
