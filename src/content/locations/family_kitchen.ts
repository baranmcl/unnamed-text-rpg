import { LocationId, EncounterId, type Location } from '../../engine/types';

export const family_kitchen: Location = {
  id: LocationId('family_kitchen'),
  name: 'The Family Kitchen',
  chapter: 'chapter_1',
  description:
    'The kitchen smells of kettle steam and last year\'s preserves. Mother sits in the chair by the window, knitting something that has ' +
    'been a sock for several weeks now. The kettle is on, despite no one having intended to make tea. The Note from Mother — folded ' +
    'twice, written, blank, depending on the angle — rests on the kitchen table.',
  reEntryDescription:
    'Mother glances up, nods you in, returns to the sock.',
  ambientLines: [
    'Mother, between sips: "The weather\'s been holding its breath today. I don\'t trust it."',
    'The kettle whistles a single note and then doesn\'t.',
    'A stray cat that does not officially live here passes the window with regret.'
  ],
  exits: [
    { label: 'Back outside, to the farm', targetId: LocationId('family_farm') }
  ],
  encounterIds: [EncounterId('mother_kitchen')]
};
