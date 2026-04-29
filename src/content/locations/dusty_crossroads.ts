import { LocationId, type Location } from '../../engine/types';

export const dusty_crossroads: Location = {
  id: LocationId('dusty_crossroads'),
  name: 'The Dusty Crossroads',
  act: 'act_i',
  description:
    'You stand at a crossroads, which, as crossroads go, is unusually literal. ' +
    'A signpost leans drunkenly, pointing in four directions, three of which no longer exist. ' +
    'Wind carries the faint smell of onions and minor prophecy.',
  reEntryDescription:
    'The crossroads remains crossed. The signpost remains drunken. Some things are forever.',
  exits: [
    { label: 'Back to the family farm', targetId: LocationId('family_farm') },
    // The threshold exit is gated behind accepted_call (visibleIfFlag); the
    // destination location is added in Plan 5.
    { label: 'Cross the threshold', targetId: LocationId('the_old_road'), visibleIfFlag: 'crossed_threshold' }
  ],
  encounterIds: []
};
