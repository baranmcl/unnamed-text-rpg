import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const knight_opener_encounter: NarrativeEncounter = {
  id: EncounterId('knight_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('knight_opener_a'),
  noFlee: true
};

export const wizard_opener_encounter: NarrativeEncounter = {
  id: EncounterId('wizard_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('wizard_opener_a'),
  noFlee: true
};

export const bard_opener_encounter: NarrativeEncounter = {
  id: EncounterId('bard_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('bard_opener_a'),
  noFlee: true
};

export const farmhand_opener_encounter: NarrativeEncounter = {
  id: EncounterId('farmhand_opener_encounter'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('farmhand_opener_a'),
  noFlee: true
};
