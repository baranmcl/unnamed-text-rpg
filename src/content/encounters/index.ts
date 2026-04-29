import { type Encounter, type EncounterId } from '../../engine/types';
import { first_tax_rat } from './first_tax_rat';
import { practice_dummy } from './practice_dummy';
import { the_call } from './the_call';

export const encounters: Record<EncounterId, Encounter> = {
  [first_tax_rat.id]: first_tax_rat,
  [practice_dummy.id]: practice_dummy,
  [the_call.id]: the_call
};
