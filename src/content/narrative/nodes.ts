import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';
import { knight_opening_short, wizard_opening_short, bard_opening_short } from './openings';

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
    }
  ]
};

export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot,
  [knight_opening_short.id]: knight_opening_short,
  [wizard_opening_short.id]: wizard_opening_short,
  [bard_opening_short.id]: bard_opening_short
};
