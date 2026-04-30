import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const insolent_pell: CombatEncounter = {
  id: EncounterId('combat_insolent_pell'),
  kind: 'combat',
  monsterId: MonsterId('insolent_pell'),
  xpReward: 0,
  repeatable: false
};
