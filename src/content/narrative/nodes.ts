import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';
import { knight_opener_a, knight_opener_b, wizard_opener_a, wizard_opener_b_a, wizard_opener_b_b, wizard_opener_b_c, bard_opener_a, bard_opener_b, farmhand_opener_a, farmhand_opener_b } from './openings';
import { henwald_intro, henwald_levy_response, henwald_post_victory, henwald_post_dismiss } from './farmhand_ch1_nodes';
import {
  mentor_knight_arrival, mentor_knight_teaching, mentor_knight_motivation, mentor_knight_deflect,
  mentor_wizard_arrival, mentor_wizard_teaching, mentor_wizard_motivation, mentor_wizard_deflect,
  mentor_bard_arrival, mentor_bard_teaching, mentor_bard_motivation, mentor_bard_deflect,
  mentor_farmhand_arrival, mentor_farmhand_teaching, mentor_farmhand_motivation, mentor_farmhand_deflect,
  mentor_knight_post_root, mentor_wizard_post_root, mentor_bard_post_root, mentor_farmhand_post_root,
  mentor_knight_return_root, mentor_wizard_return_root, mentor_bard_return_root
} from './mentor_nodes';

const callRoot: NarrativeNode = {
  id: NarrativeNodeId('call_root'),
  speaker: 'Old Hermit',
  prose: '"You must be the Chosen One. Right on schedule for your Refusal of the Call."',
  choices: [
    { label: 'Accept Quest', resolve: 'call_accept' },
    { label: 'Refuse (traditional)', resolve: 'call_refuse' },
    {
      label: 'Insult Hat',
      resolve: 'call_insult',
      disabledIfFlag: 'insulted_hermit_hat',
      disabledTooltip: 'You have already insulted the hat.'
    },
    {
      label: 'Cry, Briefly',
      resolve: 'call_cry',
      disabledIfFlag: 'cried_at_hermit',
      disabledTooltip: 'You have already wept your share for now.'
    },
    {
      label: 'Walk back the way you came.',
      resolve: 'walk_back_home',
      visible: { kind: 'any_flag', flags: ['refusal_count', 'insulted_hermit_hat', 'cried_at_hermit'] }
    }
  ]
};

const hermitLingering: NarrativeNode = {
  id: NarrativeNodeId('hermit_lingering'),
  speaker: 'Old Hermit',
  prose:
    '"Still here? I would have thought heroes ran toward their fates, not paced about. ' +
    "Off you go, then. The road won't cross itself.\"",
  choices: [
    { label: '("Off I go, then.")', resolve: 'hermit_dismiss' }
  ]
};

const crossroadsSignpostRoot: NarrativeNode = {
  id: NarrativeNodeId('crossroads_signpost_root'),
  prose:
    'You step up to the signpost. It leans drunkenly. The small note tacked to its side has more words on it now ' +
    'than you remembered — but "now" is doing some work in that sentence. In the same careful hand that wrote your ' +
    'Fate-push earlier, a riddle.\n\n' +
    '**"I keep my secrets in skins, each one heavier than the last."**\n' +
    '**"To know me, you must weep through every layer."**\n' +
    '**"At my heart there is no answer — only more of me."**\n' +
    '**"The wind that knows the way carries me, faintly, before any traveler arrives."**\n\n' +
    '**"What am I?"**',
  choices: [
    {
      label: 'A prophecy.',
      resolve: 'signpost_answer_prophecy',
      disabledIfFlag: 'riddle_tried_prophecy',
      disabledTooltip: 'The signpost already heard you out on this one.'
    },
    {
      label: 'Memory.',
      resolve: 'signpost_answer_memory',
      disabledIfFlag: 'riddle_tried_memory',
      disabledTooltip: 'The signpost already heard you out on this one.'
    },
    {
      label: 'Grief.',
      resolve: 'signpost_answer_grief',
      disabledIfFlag: 'riddle_tried_grief',
      disabledTooltip: 'The signpost already heard you out on this one.'
    },
    { label: 'An onion.', resolve: 'signpost_answer_onion' },
    { label: 'Step back.', resolve: 'signpost_step_back' }
  ]
};

const patrolOldRoadRoot: NarrativeNode = {
  id: NarrativeNodeId('patrol_old_road_root'),
  prose:
    'You walk a little further along the Old Road. The hedgerow thickens. A footer in the margin of a milestone ' +
    'lengthens by one numeral. Somewhere ahead, a citation clears its throat.',
  choices: [
    { label: 'Press on along the page.', resolve: 'patrol_old_road_press_on' },
    { label: 'Turn back.', resolve: 'patrol_old_road_turn_back' }
  ]
};

export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot,
  [hermitLingering.id]: hermitLingering,
  [crossroadsSignpostRoot.id]: crossroadsSignpostRoot,
  [patrolOldRoadRoot.id]: patrolOldRoadRoot,
  [knight_opener_a.id]: knight_opener_a,
  [knight_opener_b.id]: knight_opener_b,
  [wizard_opener_a.id]: wizard_opener_a,
  [wizard_opener_b_a.id]: wizard_opener_b_a,
  [wizard_opener_b_b.id]: wizard_opener_b_b,
  [wizard_opener_b_c.id]: wizard_opener_b_c,
  [bard_opener_a.id]: bard_opener_a,
  [bard_opener_b.id]: bard_opener_b,
  [farmhand_opener_a.id]: farmhand_opener_a,
  [farmhand_opener_b.id]: farmhand_opener_b,
  [mentor_knight_arrival.id]: mentor_knight_arrival,
  [mentor_knight_teaching.id]: mentor_knight_teaching,
  [mentor_knight_motivation.id]: mentor_knight_motivation,
  [mentor_knight_deflect.id]: mentor_knight_deflect,
  [mentor_wizard_arrival.id]: mentor_wizard_arrival,
  [mentor_wizard_teaching.id]: mentor_wizard_teaching,
  [mentor_wizard_motivation.id]: mentor_wizard_motivation,
  [mentor_wizard_deflect.id]: mentor_wizard_deflect,
  [mentor_bard_arrival.id]: mentor_bard_arrival,
  [mentor_bard_teaching.id]: mentor_bard_teaching,
  [mentor_bard_motivation.id]: mentor_bard_motivation,
  [mentor_bard_deflect.id]: mentor_bard_deflect,
  [mentor_farmhand_arrival.id]: mentor_farmhand_arrival,
  [mentor_farmhand_teaching.id]: mentor_farmhand_teaching,
  [mentor_farmhand_motivation.id]: mentor_farmhand_motivation,
  [mentor_farmhand_deflect.id]: mentor_farmhand_deflect,
  [mentor_knight_post_root.id]: mentor_knight_post_root,
  [mentor_wizard_post_root.id]: mentor_wizard_post_root,
  [mentor_bard_post_root.id]: mentor_bard_post_root,
  [mentor_farmhand_post_root.id]: mentor_farmhand_post_root,
  [mentor_knight_return_root.id]: mentor_knight_return_root,
  [mentor_wizard_return_root.id]: mentor_wizard_return_root,
  [mentor_bard_return_root.id]: mentor_bard_return_root,
  [henwald_intro.id]: henwald_intro,
  [henwald_levy_response.id]: henwald_levy_response,
  [henwald_post_victory.id]: henwald_post_victory,
  [henwald_post_dismiss.id]: henwald_post_dismiss,
};
