import { LocationId, type Location } from '../../engine/types';

export const the_threshold: Location = {
  id: LocationId('the_threshold'),
  name: 'The Threshold',
  chapter: 'chapter_5',
  description:
    'You cross. The road on this side is the same road, and is not. Page numbers are visible to the eye, now, ' +
    "for those who know what they're looking at. The road ends, for now, at a horizon that has not been written yet.",
  reEntryDescription: 'The Threshold remains crossed.',
  exits: [
    { label: 'Back to the Old Road', targetId: LocationId('the_old_road') }
  ]
};
