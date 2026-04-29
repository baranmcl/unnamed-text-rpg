import { NarrativeNodeId, type NarrativeNode } from '../../engine/types';

const callRoot: NarrativeNode = {
  id: NarrativeNodeId('call_root'),
  speaker: 'Old Hermit',
  prose: '"You must be the Chosen One. Right on schedule for your Refusal of the Call."',
  choices: [
    { label: 'Accept Quest', resolve: 'call_accept' },
    { label: 'Refuse (traditional)', resolve: 'call_refuse' },
    { label: 'Insult Hat', resolve: 'call_insult' },
    { label: 'Cry, Briefly', resolve: 'call_cry' }
  ]
};

export const narrativeNodes: Record<NarrativeNodeId, NarrativeNode> = {
  [callRoot.id]: callRoot
};
