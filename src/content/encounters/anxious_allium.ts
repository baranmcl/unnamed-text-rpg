import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const anxious_allium: CombatEncounter = {
  id: EncounterId('combat_anxious_allium'),
  kind: 'combat',
  monsterId: MonsterId('anxious_allium'),
  xpReward: 6,
  repeatable: false
};
