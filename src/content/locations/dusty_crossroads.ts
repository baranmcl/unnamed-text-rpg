import { LocationId, EncounterId, type Location } from '../../engine/types';

export const dusty_crossroads: Location = {
  id: LocationId('dusty_crossroads'),
  name: 'The Dusty Crossroads',
  chapter: 'chapter_1',
  description:
    'You stand at a crossroads, which, as crossroads go, is unusually literal. ' +
    'A signpost leans drunkenly, pointing in four directions, three of which no longer exist. ' +
    'Wind carries the faint smell of onions and minor prophecy.',
  reEntryDescription:
    'The crossroads remains crossed. The signpost remains drunken. Some things are forever.',
  ambientLines: [
    'A leaf crosses the road and visibly reconsiders.',
    'The signpost creaks once, meaningfully, then settles.',
    'Far off, a cow lows. The cow has not, you note, been informed.',
    'A small cloud passes overhead at exactly the speed of foreshadowing.'
  ],
  exits: [
    {
      label: 'Back to the family farm',
      targetId: LocationId('family_farm'),
      visibleIfVisited: LocationId('family_farm')
    },
    {
      label: "Back to the Quartermaster's Yard",
      targetId: LocationId('quartermasters_yard'),
      visibleIfVisited: LocationId('quartermasters_yard')
    },
    {
      label: 'Back to the library',
      targetId: LocationId('burning_library'),
      visibleIfVisited: LocationId('burning_library')
    },
    {
      label: 'Back to the dressing room',
      targetId: LocationId('tavern_dressing_room'),
      visibleIfVisited: LocationId('tavern_dressing_room')
    },
    // The threshold exit is gated behind accepted_call (visibleIfFlag); the
    // destination location is added in Plan 5.
    {
      label: 'Cross the threshold',
      targetId: LocationId('the_old_road'),
      visibleIfFlag: 'accepted_call',
      enabledIfFlag: 'crossed_threshold',
      disabledTooltip: 'The road is yet unwritten.'
    }
  ],
  encounterIds: [EncounterId('hermit_lingering')]
};
