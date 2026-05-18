import { LocationId, EncounterId, type Location } from '../../engine/types';

export const back_field: Location = {
  id: LocationId('back_field'),
  name: 'The Back Field',
  chapter: 'chapter_1',
  description:
    'The back field, un-weeded for a week, opens before you. The weeds, which on closer inspection are mostly thistle and one ' +
    'ambitious dandelion, regard your pitchfork with what is either resignation or grim amusement. The cow, in the near pasture, ' +
    'watches the sky with the focused unease of a creature who knows something but cannot, in any meaningful sense, tell you about it.',
  reEntryDescription:
    'The back field is, somehow, no less un-weeded than the last time you came. The cow has not moved her gaze.',
  ambientLines: [
    'The cow has not, you note, been informed of why the wind is doing nothing.',
    'A thistle nods at you. You decide not to take it personally.',
    'Somewhere overhead, a swallow forgets to bank and corrects itself with visible embarrassment.'
  ],
  exits: [
    { label: 'Back to the farm', targetId: LocationId('family_farm') }
  ],
  encounterIds: [
    EncounterId('combat_anxious_allium'),
    EncounterId('back_field_weed')
  ]
};
