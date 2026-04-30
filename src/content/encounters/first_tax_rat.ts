import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const first_tax_rat: CombatEncounter = {
  id: EncounterId('first_tax_rat'),
  kind: 'combat',
  monsterId: MonsterId('officious_tax_rat'),
  xpReward: 100
};
