import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

export const knight_opening_short: NarrativeNode = {
  id: NarrativeNodeId('knight_opening_short'),
  prose:
    'Dawn over the empty yard. Your dismissal still pinned to the board. ' +
    'Whatever you did — and you cannot quite remember the specifics, only the volume of voices — it was sufficient. ' +
    'The pell, an old friend with no memory of you, is still here. It has improved at being a pell.',
  choices: [
    { label: 'Take it out on the pell.', resolve: 'open_with_pell' }
  ]
};

export const wizard_opening_short: NarrativeNode = {
  id: NarrativeNodeId('wizard_opening_short'),
  prose:
    'Smoke describes lazy circles around the chandelier. Your tome is offering, in increasingly aggressive marginalia, ' +
    'three contradictory pieces of advice about lich-kings, itch-kings, and a third option you do not recognize. ' +
    'Something small and predatory has just detached from a citation and is now eyeing you.',
  choices: [
    { label: 'Address the footnote.', resolve: 'open_with_footnote' }
  ]
};

export const bard_opening_short: NarrativeNode = {
  id: NarrativeNodeId('bard_opening_short'),
  prose: 'PLACEHOLDER — wired by Task 14.',
  choices: []
};
