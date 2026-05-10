import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const plot_convenience: CombatEncounter = {
  id: EncounterId('combat_plot_convenience'),
  kind: 'combat',
  monsterId: MonsterId('plot_convenience'),
  xpReward: 14,
  repeatable: true
};
