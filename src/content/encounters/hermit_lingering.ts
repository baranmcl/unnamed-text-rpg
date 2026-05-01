import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const hermit_lingering: NarrativeEncounter = {
  id: EncounterId('hermit_lingering'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('hermit_lingering'),
  label: 'Speak with the Old Hermit',
  visibleIfFlag: 'accepted_call'
};
