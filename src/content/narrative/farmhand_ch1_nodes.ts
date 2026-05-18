import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

// =====================================================================
// Henwald — the Foghorn-Leghorn rooster at the chicken coop
// =====================================================================

export const henwald_intro: NarrativeNode = {
  id: NarrativeNodeId('henwald_intro'),
  speaker: 'Henwald',
  prose:
    'Henwald struts toward you, comb wobbling with conviction. "Well I say, I say — there y\'are. There y\'are, son. ' +
    'I been settin\' here waitin\' on you like a hen on a glass egg — and you know what kinda hen sits on a glass egg? A *confused* hen, son. A *confused* hen."\n\n' +
    'He puffs his chest, surveys his coop with the disappointment of a man who has Standards.\n\n' +
    '"It\'s the rat. That vest-wearin\', clipboard-totin\', subsection-quotin\' rat. He\'s been here three weeks runnin\' — three! — ' +
    'auditin\' the girls\' egg production like he\'s the King of Eggs himself. Claims he\'s collectin\' for \'an authority.\' Won\'t say which authority. ' +
    'Authority of WHAT? Of WHOM? Boy, even Mother\'s older than that rat, and *she* remembers a time before the levies."',
  choices: [
    { label: '"I\'ll see to him."', resolve: 'henwald_engage_rat' },
    {
      label: '"What does he claim the levy\'s for?"',
      resolve: 'henwald_levy',
      disabledIfFlag: 'asked_henwald_levy',
      disabledTooltip: 'Henwald has already vented his answer.'
    },
    { label: '"Maybe later, Henwald."', resolve: 'henwald_dismiss' }
  ]
};

export const henwald_levy_response: NarrativeNode = {
  id: NarrativeNodeId('henwald_levy_response'),
  speaker: 'Henwald',
  prose:
    '"That\'s the thing, son! He talks in subsections and paragraphs and \'as written in the documentation.\' What documentation? ' +
    'WHAT documentation? Some days I think the rat\'s just makin\' it up as he goes."',
  choices: [
    { label: '(back to the previous matter)', resolve: 'henwald_return_to_intro' }
  ]
};

export const henwald_post_victory: NarrativeNode = {
  id: NarrativeNodeId('henwald_post_victory'),
  speaker: 'Henwald',
  prose:
    'Henwald struts back over, ruffling his feathers in a small victory parade. "Well I say, I say — that was a *sight*, son. ' +
    'I haven\'t seen a rat run that fast since Mother chased one outta the pantry with a soup ladle in \'47."\n\n' +
    'He scratches at the dirt, deliberately not looking at the chicken nearest him.\n\n' +
    '"Now look. Look here. The girls and me been savin\' up for a thank-you, and the girls don\'t take \'no\' for an answer. ' +
    'Take these. They\'re farm-fresh. Hot off the line, as the sayin\' goes."\n\n' +
    '*(3 Farm-Fresh Eggs added to inventory.)*\n\n' +
    '"You can eat \'em, in a pinch. You can throw \'em, in a real pinch. ' +
    'Just don\'t carry \'em in the same pocket as your good handkerchief. I learned that one the hard way."',
  choices: [
    { label: '(Thank Henwald and step away.)', resolve: 'henwald_dismiss' }
  ]
};

// =====================================================================
// Back Field — weed action
// =====================================================================

export const back_field_weed: NarrativeNode = {
  id: NarrativeNodeId('back_field_weed'),
  prose:
    'You weed. For about twenty minutes, you make exactly the kind of progress that explains why the field has been ' +
    'un-weeded for a week. The thistle wins. The dandelion takes notes.',
  choices: [
    { label: '(Step back and survey the field.)', resolve: 'farmhand_ch1_exit' }
  ]
};

// =====================================================================
// Old Well — inspect actions
// =====================================================================

export const old_well_intro: NarrativeNode = {
  id: NarrativeNodeId('old_well_intro'),
  prose:
    'You step up to the well. The lid is closer than it looks, somehow. The bucket has not moved, but neither has it stayed entirely still.',
  choices: [
    { label: 'Drop a stone down.', resolve: 'old_well_drop_stone' },
    { label: 'Look down into the well.', resolve: 'old_well_look_down' },
    { label: 'Step back from the well.', resolve: 'farmhand_ch1_exit' }
  ]
};

export const old_well_drop_stone: NarrativeNode = {
  id: NarrativeNodeId('old_well_drop_stone'),
  prose:
    'You drop a stone down. You count to three. The splash comes on two. The echo, after the splash, sounds like a \'no\' — ' +
    'not yours, and not anybody\'s you recognise.',
  choices: [
    { label: '(Try again.)', resolve: 'old_well_return_to_intro' },
    { label: 'Step back from the well.', resolve: 'farmhand_ch1_exit' }
  ]
};

export const old_well_look_down: NarrativeNode = {
  id: NarrativeNodeId('old_well_look_down'),
  prose:
    'You lean over. The light at the bottom is brighter than it should be at this hour. The bucket is, you note, full. ' +
    'You did not draw it up.',
  choices: [
    { label: '(Pull back.)', resolve: 'old_well_return_to_intro' },
    { label: 'Step back from the well.', resolve: 'farmhand_ch1_exit' }
  ]
};

// =====================================================================
// Mother — pre-tornado kitchen dialogue
// =====================================================================

// Root node: branches based on flags via the `mother_sit` resolver.
export const mother_kitchen_root: NarrativeNode = {
  id: NarrativeNodeId('mother_kitchen_root'),
  prose:
    'Mother looks up. "There y\'are, dear. Pull up the bench."',
  choices: [
    { label: 'Sit with Mother.', resolve: 'mother_sit' },
    { label: 'Look at the Note on the table.', resolve: 'mother_look_at_note' },
    { label: 'Step outside.', resolve: 'farmhand_ch1_exit' }
  ]
};

// Sub-node: Mother's response branches based on flags. We use three variants and pick via resolver.
export const mother_sit_animal_talk: NarrativeNode = {
  id: NarrativeNodeId('mother_sit_animal_talk'),
  speaker: 'Mother',
  prose:
    'She returns to her knitting. A pause. Then — "You been at the coop, dear? Henwald run his mouth about the rat again?"\n\n' +
    'She smiles, returns to her work. "You and your chickens. You\'ve been talking to them since you could walk — your father always ' +
    'said you had an ear for it. I wonder, sometimes, what they say back to you."\n\n' +
    'She pauses, considers.\n\n' +
    '"They\'ve never said anything to me. Not a word. A \'cluck-cluck,\' yes. Words, no." The smile is gentle, not contradicting. ' +
    'Just describing. "Whatever you hear, dear — I believe you. I just wish I heard it too."',
  choices: [
    { label: '(stand up.)', resolve: 'mother_return_to_root' }
  ]
};

export const mother_sit_rat_thanks: NarrativeNode = {
  id: NarrativeNodeId('mother_sit_rat_thanks'),
  speaker: 'Mother',
  prose:
    '"That rat won\'t be back. Henwald told me. ...well, Henwald clucked at me, and I assumed." She pats your hand.',
  choices: [
    { label: '(stand up.)', resolve: 'mother_return_to_root' }
  ]
};

export const mother_sit_cow: NarrativeNode = {
  id: NarrativeNodeId('mother_sit_cow'),
  speaker: 'Mother',
  prose:
    '"You been out and about. Good. The cow\'s been watching the sky. I don\'t like it when the cow watches the sky."',
  choices: [
    { label: '(stand up.)', resolve: 'mother_return_to_root' }
  ]
};

export const mother_look_at_note: NarrativeNode = {
  id: NarrativeNodeId('mother_look_at_note'),
  prose:
    'The Note from Mother sits where it always sits. The paper is older than the writing. You cannot quite remember what it says — ' +
    'only that it is for you, and that one day you will know what it is for. You leave it on the table.',
  choices: [
    { label: '(turn back to Mother.)', resolve: 'mother_return_to_root' }
  ]
};
