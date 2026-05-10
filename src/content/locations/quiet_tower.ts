import { LocationId, type Location } from '../../engine/types';

export const quiet_tower: Location = {
  id: LocationId('quiet_tower'),
  name: 'The Quiet Tower',
  chapter: 'chapter_4',
  description:
    'A small stone tower with a single study at the top. Sunlight falls through narrow latticed windows. ' +
    'A tome lies open on a lectern; all three margins agree on the same line. ' +
    'A figure in a clean robe stands at the window, staff in hand. The staff bears a monogram you have, ' +
    'somehow, seen before.',
  reEntryDescription:
    'The tower remains quiet. The tome remains in agreement. The monogram, you find, you still cannot place.',
  exits: [
    { label: 'Back to the Old Road', targetId: LocationId('the_old_road') }
  ]
};
