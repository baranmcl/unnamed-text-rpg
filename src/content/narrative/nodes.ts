import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';
import { knight_opener_a, knight_opener_b, wizard_opener_a, wizard_opener_b_a, wizard_opener_b_b, wizard_opener_b_c, bard_opener_a, bard_opener_b, farmhand_opener_a, farmhand_opener_b } from './openings';

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

export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot,
  [hermitLingering.id]: hermitLingering,
  [knight_opener_a.id]: knight_opener_a,
  [knight_opener_b.id]: knight_opener_b,
  [wizard_opener_a.id]: wizard_opener_a,
  [wizard_opener_b_a.id]: wizard_opener_b_a,
  [wizard_opener_b_b.id]: wizard_opener_b_b,
  [wizard_opener_b_c.id]: wizard_opener_b_c,
  [bard_opener_a.id]: bard_opener_a,
  [bard_opener_b.id]: bard_opener_b,
  [farmhand_opener_a.id]: farmhand_opener_a,
  [farmhand_opener_b.id]: farmhand_opener_b
};
