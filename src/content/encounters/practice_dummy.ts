import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const practice_dummy: CombatEncounter = {
  id: EncounterId('practice_dummy'),
  kind: 'combat',
  monsterId: MonsterId('practice_hay_bale'),
  xpReward: 5,
  repeatable: true
};
