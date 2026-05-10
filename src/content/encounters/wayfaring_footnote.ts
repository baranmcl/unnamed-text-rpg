import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const wayfaring_footnote: CombatEncounter = {
  id: EncounterId('combat_wayfaring_footnote'),
  kind: 'combat',
  monsterId: MonsterId('wayfaring_footnote'),
  xpReward: 12,
  repeatable: true
};
