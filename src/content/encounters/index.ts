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
import { knight_opener_encounter, wizard_opener_encounter, bard_opener_encounter, farmhand_opener_encounter } from './openings';
import { wayfaring_footnote, wayfaring_footnote_mandatory } from './wayfaring_footnote';
import { plot_convenience, plot_convenience_mandatory } from './plot_convenience';
import { patrol_old_road } from './patrol_old_road';
import {
  mentor_knight_first_visit, mentor_wizard_first_visit, mentor_bard_first_visit, mentor_farmhand_first_visit,
  mentor_knight_post_acceptance, mentor_wizard_post_acceptance, mentor_bard_post_acceptance, mentor_farmhand_post_acceptance,
  mentor_knight_return_unlearned, mentor_wizard_return_unlearned, mentor_bard_return_unlearned
} from './mentors';

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
  [bard_opener_encounter.id]: bard_opener_encounter,
  [farmhand_opener_encounter.id]: farmhand_opener_encounter,
  [wayfaring_footnote.id]: wayfaring_footnote,
  [wayfaring_footnote_mandatory.id]: wayfaring_footnote_mandatory,
  [plot_convenience.id]: plot_convenience,
  [plot_convenience_mandatory.id]: plot_convenience_mandatory,
  [patrol_old_road.id]: patrol_old_road,
  [mentor_knight_first_visit.id]: mentor_knight_first_visit,
  [mentor_wizard_first_visit.id]: mentor_wizard_first_visit,
  [mentor_bard_first_visit.id]: mentor_bard_first_visit,
  [mentor_farmhand_first_visit.id]: mentor_farmhand_first_visit,
  [mentor_knight_post_acceptance.id]: mentor_knight_post_acceptance,
  [mentor_wizard_post_acceptance.id]: mentor_wizard_post_acceptance,
  [mentor_bard_post_acceptance.id]: mentor_bard_post_acceptance,
  [mentor_farmhand_post_acceptance.id]: mentor_farmhand_post_acceptance,
  [mentor_knight_return_unlearned.id]: mentor_knight_return_unlearned,
  [mentor_wizard_return_unlearned.id]: mentor_wizard_return_unlearned,
  [mentor_bard_return_unlearned.id]: mentor_bard_return_unlearned,
};
