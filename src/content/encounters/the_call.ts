import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const the_call: NarrativeEncounter = {
  id: EncounterId('the_call'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('call_root'),
  noFlee: true
};
