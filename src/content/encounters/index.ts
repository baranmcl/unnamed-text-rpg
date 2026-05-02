import { type Encounter, type EncounterId } from '../../engine/types';
import { first_tax_rat } from './first_tax_rat';
import { practice_dummy } from './practice_dummy';
import { the_call } from './the_call';
import { insolent_pell } from './insolent_pell';
import { feral_footnote } from './feral_footnote';
import { pointed_heckler } from './pointed_heckler';
import { grievance_bursar } from './grievance_bursar';
import { errant_examiner } from './errant_examiner';
import { critic_with_notes } from './critic_with_notes';
import { hermit_lingering } from './hermit_lingering';
import { knight_opener_encounter, wizard_opener_encounter, bard_opener_encounter } from './openings';

export const encounters: Record<EncounterId, Encounter> = {
  [first_tax_rat.id]: first_tax_rat,
  [practice_dummy.id]: practice_dummy,
  [the_call.id]: the_call,
  [insolent_pell.id]: insolent_pell,
  [feral_footnote.id]: feral_footnote,
  [pointed_heckler.id]: pointed_heckler,
  [grievance_bursar.id]: grievance_bursar,
  [errant_examiner.id]: errant_examiner,
  [critic_with_notes.id]: critic_with_notes,
  [hermit_lingering.id]: hermit_lingering,
  [knight_opener_encounter.id]: knight_opener_encounter,
  [wizard_opener_encounter.id]: wizard_opener_encounter,
  [bard_opener_encounter.id]: bard_opener_encounter
};
