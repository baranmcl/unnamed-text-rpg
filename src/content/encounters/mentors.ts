import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

export const mentor_knight_first_visit: NarrativeEncounter = {
  id: EncounterId('mentor_knight_first_visit'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_knight_arrival'),
  noFlee: true
};

export const mentor_wizard_first_visit: NarrativeEncounter = {
  id: EncounterId('mentor_wizard_first_visit'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_wizard_arrival'),
  noFlee: true
};

export const mentor_bard_first_visit: NarrativeEncounter = {
  id: EncounterId('mentor_bard_first_visit'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_bard_arrival'),
  noFlee: true
};

export const mentor_farmhand_first_visit: NarrativeEncounter = {
  id: EncounterId('mentor_farmhand_first_visit'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_farmhand_arrival'),
  noFlee: true
};
