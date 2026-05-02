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

export const wizard_opener_b_a: NarrativeNode = {
  id: NarrativeNodeId('wizard_opener_b_a'),
  prose:
    "You follow the lich-king margin's line. The tome falls quiet, briefly. The footnote remains.",
  choices: [
    { label: 'Address the footnote.', resolve: 'open_with_footnote' }
  ]
};

export const wizard_opener_b_b: NarrativeNode = {
  id: NarrativeNodeId('wizard_opener_b_b'),
  prose:
    "You follow the itch-king margin's line. The tome falls quiet, briefly. The footnote remains.",
  choices: [
    { label: 'Address the footnote.', resolve: 'open_with_footnote' }
  ]
};

export const wizard_opener_b_c: NarrativeNode = {
  id: NarrativeNodeId('wizard_opener_b_c'),
  prose:
    "You follow the third margin's line. The tome falls quiet, briefly. The footnote remains.",
  choices: [
    { label: 'Address the footnote.', resolve: 'open_with_footnote' }
  ]
};

export const bard_opener_a: NarrativeNode = {
  id: NarrativeNodeId('bard_opener_a'),
  prose:
    'Five minutes to curtain. The back room of the Wretched Pheasant smells like spilled mead, candlewax, and ambition. ' +
    'One of those vowels is yours. Your lute is missing a string. Your cloak is being ironic again. ' +
    'The audience, audible through three layers of pine, is exercising its consonants. ' +
    'Through a thumbnail-sized gap in the curtain you can see the front row. ' +
    'A man in tweed sits there, taking notes in a book that is not yours, and does not look up. ' +
    'A heckler in the third row has been warming up since dawn and has, by now, achieved a kind of vowel-yoga ' +
    'that bodes badly for your opening number. You have ten minutes. You have two minutes. ' +
    'Time is doing what time does to a Bard.',
  choices: [
    { label: 'Tune the lute.', resolve: 'bard_opener_engage_lute' }
  ]
};

export const bard_opener_b: NarrativeNode = {
  id: NarrativeNodeId('bard_opener_b'),
  prose:
    'The lute holds. The cloak settles. The curtain twitches. ' +
    'You step toward the stage. The heckler is, you note, already standing.',
  choices: [
    { label: 'Open with a dignity-restoration anthem.', resolve: 'open_with_heckler' }
  ]
};

export const farmhand_opener_a: NarrativeNode = {
  id: NarrativeNodeId('farmhand_opener_a'),
  prose:
    'You wake on a Tuesday, which is, statistically, when most prophecies arrive. ' +
    'The kettle is already on. The chickens are already disappointed. ' +
    "On the windowsill: a jar of last year's preserves, dust on the lid, a hand-written label peeling at one corner. " +
    'The back field, un-weeded for a week, calls in the wordless way fields call. ' +
    'Down the lane, a figure in tweed passes the farm without slowing. He glances once at the kitchen window. He keeps walking. ' +
    'The cow, in the near pasture, regards you with the unfocused malice of a creature who has, against all odds, become aware of fate. ' +
    'Whatever the day intends, it has chosen not to ask. You stand at the kitchen window. ' +
    'The jar is small enough to fit in a pocket.',
  choices: [
    { label: 'Take the jar from the windowsill.', resolve: 'farmhand_opener_engage_jar' }
  ]
};

export const farmhand_opener_b: NarrativeNode = {
  id: NarrativeNodeId('farmhand_opener_b'),
  prose:
    'The jar fits. The lid is firm. You step out the kitchen door and the back field opens before you. ' +
    'The cow does not turn. The chickens continue to be disappointed.',
  choices: [
    { label: 'Walk to the back field.', resolve: 'farmhand_to_back_field' }
  ]
};
