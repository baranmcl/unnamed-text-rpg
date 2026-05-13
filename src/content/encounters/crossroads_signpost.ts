import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

// Pre-Call riddle at the Dusty Crossroads. Solving (or stepping back from) the
// signpost sets `crossroads_explored: true`, which unblocks the Hermit's beat.
// Encounter hides once the player has accepted the call (no point coming back).
export const crossroads_signpost: NarrativeEncounter = {
  id: EncounterId('crossroads_signpost'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('crossroads_signpost_root'),
  label: 'Examine the signpost',
  hiddenIfFlag: 'accepted_call'
};
