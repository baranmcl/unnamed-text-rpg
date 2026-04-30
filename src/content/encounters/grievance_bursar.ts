import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const grievance_bursar: CombatEncounter = {
  id: EncounterId('grievance_bursar'),
  kind: 'combat',
  monsterId: MonsterId('grievance_bursar'),
  xpReward: 100
};
