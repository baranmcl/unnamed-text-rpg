import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const knight_opener_encounter: NarrativeEncounter = {
  id: EncounterId('knight_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('knight_opener_a'),
  noFlee: true
};

// Wizard / Bard / Farmhand opener encounters — added in Tasks 3-5.
