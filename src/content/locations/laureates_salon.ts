import { LocationId, type Location } from '../../engine/types';

export const laureates_salon: Location = {
  id: LocationId('laureates_salon'),
  name: "The Laureate's Salon",
  chapter: 'chapter_4',
  description:
    'A small upstairs room. Framed lyrics on the walls. A half-drunk glass on a low table. ' +
    'A battered chaise. A velvet curtain muffles the noise from below. ' +
    'A figure sits at the chaise, humming a snatch of melody you would swear you have heard humming before.',
  reEntryDescription:
    'The salon is quieter than it should be. The glass is in a slightly different place than you remember.',
  exits: [
    { label: 'Back to the Old Road', targetId: LocationId('the_old_road') }
  ]
};
