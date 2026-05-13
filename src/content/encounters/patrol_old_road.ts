import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

// Player-clickable patrol — gives the option to seek out another fight without
// leaving the Old Road. Available pre- and post-clear. Random monster pick is
// done in the resolver; this encounter is just the framing scene.
export const patrol_old_road: NarrativeEncounter = {
  id: EncounterId('patrol_old_road'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('patrol_old_road_root'),
  label: 'Look for trouble down the road'
};
