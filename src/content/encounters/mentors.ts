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

// Post-acceptance flavor encounters (all four classes).
export const mentor_knight_post_acceptance: NarrativeEncounter = {
  id: EncounterId('mentor_knight_post_acceptance'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_knight_post_root')
};

export const mentor_wizard_post_acceptance: NarrativeEncounter = {
  id: EncounterId('mentor_wizard_post_acceptance'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_wizard_post_root')
};

export const mentor_bard_post_acceptance: NarrativeEncounter = {
  id: EncounterId('mentor_bard_post_acceptance'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_bard_post_root')
};

export const mentor_farmhand_post_acceptance: NarrativeEncounter = {
  id: EncounterId('mentor_farmhand_post_acceptance'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_farmhand_post_root')
};

// Second-chance encounters (Knight/Wizard/Bard only — Farmhand has no unlearned-return state).
export const mentor_knight_return_unlearned: NarrativeEncounter = {
  id: EncounterId('mentor_knight_return_unlearned'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_knight_return_root'),
  noFlee: true
};

export const mentor_wizard_return_unlearned: NarrativeEncounter = {
  id: EncounterId('mentor_wizard_return_unlearned'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_wizard_return_root'),
  noFlee: true
};

export const mentor_bard_return_unlearned: NarrativeEncounter = {
  id: EncounterId('mentor_bard_return_unlearned'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mentor_bard_return_root'),
  noFlee: true
};
