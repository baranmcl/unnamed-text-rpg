import { EncounterId, MonsterId, type Encounter } from '../../engine/types';

export const encounters: Record<EncounterId, Encounter> = {
  [EncounterId('first_tax_rat')]: {
    id: EncounterId('first_tax_rat'),
    kind: 'combat',
    monsterId: MonsterId('officious_tax_rat'),
    xpReward: 25
  }
};
