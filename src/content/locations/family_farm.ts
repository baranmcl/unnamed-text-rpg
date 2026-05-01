import { LocationId, EncounterId, type Location } from '../../engine/types';

export const family_farm: Location = {
  id: LocationId('family_farm'),
  name: 'The Family Farm',
  act: 'act_i',
  description:
    'The farm sprawls in three directions, mostly downhill. Chickens are in the early stages of a labour dispute. ' +
    'The barn slumps companionably against a fence that has given up. From the eastern field, you hear the ' +
    'unmistakable sound of someone *filing*.',
  reEntryDescription:
    'The farm continues to be the farm. The chickens have moved on to a more polished list of grievances.',
  ambientLines: [
    'A chicken passes you carrying what may be a grievance.',
    'The wind brings the smell of distant onions.',
    'From the barn comes a single, unhurried snort.',
    'Somewhere, a fence post leans into the labour movement.'
  ],
  exits: [
    // Crossroads exit unlocks via the hermit_beckons beat.
    { label: 'Walk to the crossroads', targetId: LocationId('dusty_crossroads'), visibleIfFlag: 'unlocked_crossroads' }
  ],
  encounterIds: [EncounterId('first_tax_rat'), EncounterId('practice_dummy')],
  restSpots: [
    {
      id: 'farm_haystack',
      label: 'Rest in the haystack',
      flavor: 'You burrow into the hay until only your nose is visible. The barn smells of dust, mice, and an emerging sense of self. After a while, you feel restored.'
    }
  ]
};
