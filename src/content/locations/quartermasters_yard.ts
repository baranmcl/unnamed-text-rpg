import { LocationId, EncounterId, type Location } from '../../engine/types';

export const quartermasters_yard: Location = {
  id: LocationId('quartermasters_yard'),
  name: "Quartermaster's Yard",
  act: 'act_i',
  description:
    'The army yard at first light, abandoned by everyone except a stack of unsigned timesheets ' +
    'and the lingering disappointment of recent superior officers. A pell stands in the middle ' +
    'of the dust, leaning slightly to starboard. Pinned to the duty board: a single sheet of ' +
    "vellum, addressed to you, beginning with the words 'Effective immediately.'",
  reEntryDescription: 'The yard is the yard. The pell, on closer inspection, has not improved.',
  ambientLines: [
    'An unsigned timesheet flutters once and lands on a different unsigned timesheet.',
    'The pell, observed, leans more pronouncedly to starboard.',
    'Somewhere in the buildings, a teakettle begins, then sheepishly stops.',
    'A boot-print in the dust suggests recent dignified departure.'
  ],
  exits: [
    { label: "Walk to the King's Road", targetId: LocationId('dusty_crossroads'), visibleIfFlag: 'unlocked_kings_road' }
  ],
  encounterIds: [EncounterId('combat_insolent_pell'), EncounterId('grievance_bursar')],
  restSpots: [
    {
      id: 'yard_bunk',
      label: 'Crash on a barracks bunk',
      flavor: 'You commandeer an unmade bunk. The mattress is regulation. The dreams are mostly about marching. After a while, you feel restored.'
    }
  ]
};
