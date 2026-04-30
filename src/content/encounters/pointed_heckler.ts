import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const pointed_heckler: CombatEncounter = {
  id: EncounterId('combat_pointed_heckler'),
  kind: 'combat',
  monsterId: MonsterId('pointed_heckler'),
  xpReward: 0,
  repeatable: false
};
