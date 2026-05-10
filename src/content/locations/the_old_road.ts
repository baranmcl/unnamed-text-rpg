import { LocationId, type Location } from '../../engine/types';

export const the_old_road: Location = {
  id: LocationId('the_old_road'),
  name: 'The Old Road',
  chapter: 'chapter_4',
  description:
    'The road climbs gently away from the crossroads. A milestone bears a chapter heading you do not recognise. ' +
    'A faint footer runs along the base of a roadside sign. The wind smells of paper and minor weather.',
  reEntryDescription:
    'The Old Road has not moved. You suspect, now, that it does not.',
  ambientLines: [
    'A pagebreak, in the form of a hedgerow, breaks evenly across the field.',
    "Above a low wall, someone has written, in a careful hand, '§ 7'.",
    'A roadside shrine bears the names of authors. Most of the dates are wrong.',
    'A milestone aligns suspiciously well with the last decision you made.'
  ],
  exits: [
    { label: 'Back to the crossroads', targetId: LocationId('dusty_crossroads') },
    {
      label: 'Onward, deeper down the road',
      targetId: LocationId('the_threshold'),
      enabledIfFlag: 'old_road_cleared',
      disabledTooltip: 'The road has not earned you yet.'
    },
    // Class-specific mentor exits are added in Task 6.
  ]
};
