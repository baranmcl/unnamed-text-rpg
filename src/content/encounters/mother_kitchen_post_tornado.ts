import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

// Auto-plays on entry to family_kitchen post-tornado (the kitchen location's
// auto-arrive logic queues this encounter when farmhand_post_tornado is set).
// Hidden after culmination so the player can't re-trigger the Fate-push exit
// resolver on a return visit.
export const mother_kitchen_post_tornado: NarrativeEncounter = {
  id: EncounterId('mother_kitchen_post_tornado'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('mother_post_tornado_root'),
  visibleIfFlag: 'farmhand_post_tornado',
  hiddenIfFlag: 'farmhand_culmination_played'
};
