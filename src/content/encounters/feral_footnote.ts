import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const feral_footnote: CombatEncounter = {
  id: EncounterId('combat_feral_footnote'),
  kind: 'combat',
  monsterId: MonsterId('feral_footnote'),
  xpReward: 0,
  repeatable: false
};
