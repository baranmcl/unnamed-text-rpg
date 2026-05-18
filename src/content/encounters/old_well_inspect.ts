import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const old_well_inspect: NarrativeEncounter = {
  id: EncounterId('old_well_inspect'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('old_well_intro'),
  label: 'Approach the well'
};
