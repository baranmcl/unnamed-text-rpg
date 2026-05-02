import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

export const knight_opener_a: NarrativeNode = {
  id: NarrativeNodeId('knight_opener_a'),
  prose:
    'Dawn over the empty yard. Dust hangs where it has been kicked, an hour ago, by boots that were not yours. ' +
    'The pell stands in the middle of it, leaning slightly to starboard. On the duty board, the dismissal-notice. ' +
    'Wind tugs at one corner. The other three pins still hold. The yard at this hour is empty, mostly. ' +
    'A figure in tweed crosses the parade ground at the far edge, unhurried, and is gone before the dust settles. ' +
    'The pell, an old friend with no memory of you, has improved at being a pell. ' +
    'Whatever you did — and you cannot quite remember the specifics, only the volume of voices — it was sufficient. ' +
    'The notice itemises.',
  choices: [
    { label: 'Read the notice.', resolve: 'knight_opener_engage_notice' }
  ]
};

export const knight_opener_b: NarrativeNode = {
  id: NarrativeNodeId('knight_opener_b'),
  prose:
    'You read it. The notice is shorter than the noise it caused. ' +
    'You step away from the duty board. The pell waits.',
  choices: [
    { label: 'Take it out on the pell.', resolve: 'open_with_pell' }
  ]
};

// Wizard / Bard / Farmhand short nodes (placeholders) — replaced in Tasks 3-5.
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
  prose:
    'Five minutes to the curtain. Your lute is missing strings; your cloak is being ironic again. ' +
    'A heckler in the third row has been warming up since dawn and has, by now, achieved a kind of vowel-yoga ' +
    'that bodes badly for your opening number.',
  choices: [
    { label: 'Open with a dignity-restoration anthem.', resolve: 'open_with_heckler' }
  ]
};

export const farmhand_opening_short: NarrativeNode = {
  id: NarrativeNodeId('farmhand_opening_short'),
  prose: 'PLACEHOLDER — wired by Plan 5.',
  choices: []
};
