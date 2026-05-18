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

export const henwald_post_dismiss: NarrativeNode = {
  id: NarrativeNodeId('henwald_post_dismiss'),
  speaker: 'Henwald',
  prose:
    'Henwald looks at the coop with quiet satisfaction. "The girls are layin\' easier today. They know, son. They know."',
  choices: [
    { label: '(Step away.)', resolve: 'henwald_dismiss' }
  ]
};
