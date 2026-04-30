import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const critic_with_notes: CombatEncounter = {
  id: EncounterId('critic_with_notes'),
  kind: 'combat',
  monsterId: MonsterId('critic_with_notes'),
  xpReward: 100
};
