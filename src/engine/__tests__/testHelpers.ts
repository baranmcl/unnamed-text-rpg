import { reduce } from '../events';
import type { GameState } from '../types';

/**
 * Walks past the bespoke Farmhand opener (engagement → commitment terminates).
 * Use after StartNewGame in tests that need the post-opener free-play state.
 */
export function skipFarmhandOpener(s: GameState): GameState {
  let next = reduce(s, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // engagement
  next = reduce(next, { kind: 'ChooseNarrativeOption', choiceIndex: 0 });  // commitment
  return next;
}
