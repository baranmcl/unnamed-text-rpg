import { LocationId, type Location } from '../../engine/types';

export const veterans_chapel: Location = {
  id: LocationId('veterans_chapel'),
  name: "The Veteran's Chapel",
  chapter: 'chapter_4',
  description:
    'A wayside chapel, smaller than it has any right to be. Candles in cups of beaten tin. ' +
    'A polished sword on the altar, leaning at the angle of a sword that is regularly polished. ' +
    'A worn stone bench. A man kneels with his back to you, posture immaculate.',
  reEntryDescription:
    'The chapel keeps its quiet. The candles do not gutter. The Veteran does not look up until you wish him to.',
  exits: [
    { label: 'Back to the Old Road', targetId: LocationId('the_old_road') }
  ]
};
