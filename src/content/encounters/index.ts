import { type Encounter, type EncounterId } from '../../engine/types';
import { first_tax_rat } from './first_tax_rat';
import { practice_dummy } from './practice_dummy';
import { the_call } from './the_call';
import { insolent_pell } from './insolent_pell';
import { feral_footnote } from './feral_footnote';
import { pointed_heckler } from './pointed_heckler';

export const encounters: Record<EncounterId, Encounter> = {
  [first_tax_rat.id]: first_tax_rat,
  [practice_dummy.id]: practice_dummy,
  [the_call.id]: the_call,
  [insolent_pell.id]: insolent_pell,
  [feral_footnote.id]: feral_footnote,
  [pointed_heckler.id]: pointed_heckler
};
