import { LocationId, EncounterId, type Location } from '../../engine/types';

export const old_well: Location = {
  id: LocationId('old_well'),
  name: 'The Old Well',
  chapter: 'chapter_1',
  description:
    'The well sits at the edge of the kitchen garden, where it has always sat. The wood of the lid has weathered to the color of ' +
    'nothing in particular. A bucket hangs from a rope that frays in three different directions, each fraying separately, as though ' +
    'each strand had its own opinion about what frayed wood should look like.',
  reEntryDescription:
    'The well is, as wells go, exactly the same. The bucket has rotated. You did not touch it.',
  ambientLines: [
    'No breeze. The line of the bucket-rope stays vertical, which it never quite does on ordinary days.',
    'A pebble at the edge has, you would swear, moved an inch since you last looked.',
    'The lid creaks once, on its own, then is still.'
  ],
  exits: [
    { label: 'Back to the farm', targetId: LocationId('family_farm') }
  ],
  encounterIds: [
    EncounterId('old_well_inspect')
  ]
};
