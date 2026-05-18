import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

// Pre-tornado kitchen interaction. The post-tornado state uses a separate
// encounter and root node (added in Task 10).
export const mother_kitchen: NarrativeEncounter = {
  id: EncounterId('mother_kitchen'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mother_kitchen_root'),
  label: 'Sit with Mother',
  hiddenIfFlag: 'farmhand_post_tornado'
};
