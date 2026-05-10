import { EncounterId, MonsterId, type CombatEncounter } from '../../engine/types';

export const plot_convenience: CombatEncounter = {
  id: EncounterId('combat_plot_convenience'),
  kind: 'combat',
  monsterId: MonsterId('plot_convenience'),
  xpReward: 14,
  repeatable: true
};

export const plot_convenience_mandatory: CombatEncounter = {
  id: EncounterId('combat_plot_convenience_mandatory'),
  kind: 'combat',
  monsterId: MonsterId('plot_convenience'),
  xpReward: 14,
  repeatable: true,
  noFlee: true
};
