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

export const wizard_opener_a: NarrativeNode = {
  id: NarrativeNodeId('wizard_opener_a'),
  prose:
    "The reading room's vaulted ceiling carries an even, contemplative haze of smoke. The smoke is being polite. " +
    'The fire — three rows over, may yet be reasoned with — is also being polite, for now. ' +
    'Your tome is open on the lectern. Three margins are arguing. The first cites a lich-king. ' +
    'The second cites an itch-king. The third cites something you do not recognise and would prefer not to. ' +
    'A junior librarian moves between stacks with a slim, unmarked volume; the spine does not match the catalog stamp. ' +
    'She does not look at you, or at the smoke. The cantrip-bell on her satchel does not ring. ' +
    'Something small and predatory has detached from a citation and is now eyeing you over the lectern\'s edge. ' +
    "The tome's three margins continue to argue, undeterred.",
  choices: [
    { label: 'Follow the lich-king margin.', resolve: 'wizard_opener_engage_a' },
    { label: 'Follow the itch-king margin.', resolve: 'wizard_opener_engage_b' },
    { label: 'Follow the third margin.', resolve: 'wizard_opener_engage_c' }
  ]
};

export const wizard_opener_b: NarrativeNode = {
  id: NarrativeNodeId('wizard_opener_b'),
  prose:
    'You follow the chosen line. The tome falls quiet, briefly. The footnote remains.',
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
