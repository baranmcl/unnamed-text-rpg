import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const errant_examiner: CombatEncounter = {
  id: EncounterId('errant_examiner'),
  kind: 'combat',
  monsterId: MonsterId('errant_examiner'),
  xpReward: 100
};
