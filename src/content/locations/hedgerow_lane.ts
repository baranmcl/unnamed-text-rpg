import { LocationId, type Location } from '../../engine/types';

export const hedgerow_lane: Location = {
  id: LocationId('hedgerow_lane'),
  name: 'The Hedgerow Lane',
  chapter: 'chapter_4',
  description:
    'A quiet country lane between two farms. A stile rises over the nearest hedge. A canvas bag sits at the foot of it, ' +
    'packed. A kettle, gently steaming, rests on a flat stone beside the stile. ' +
    'Bees move in the hedgerow. An older, weathered, Farmhand-shaped figure is sitting on the stile and has ' +
    'apparently been waiting for you.',
  reEntryDescription:
    'The lane is empty. The stile is just a stile. The kettle is cold, and gone.',
  exits: [
    { label: 'Back to the Old Road', targetId: LocationId('the_old_road') }
  ]
};
