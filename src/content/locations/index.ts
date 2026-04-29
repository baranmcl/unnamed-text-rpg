import { LocationId, EncounterId, type Location } from '../../engine/types';

export const locations: Record<LocationId, Location> = {
  [LocationId('family_farm')]: {
    id: LocationId('family_farm'),
    name: 'The Family Farm',
    act: 'act_i',
    description:
      'The farm sprawls in three directions, mostly downhill. Chickens are in the early stages of a labour dispute. ' +
      'The barn slumps companionably against a fence that has given up. From the eastern field, you hear the ' +
      'unmistakable sound of someone *filing*.',
    reEntryDescription:
      'The farm continues to be the farm. The chickens have moved on to a more polished list of grievances.',
    exits: [
      // The Village exit is gated behind a flag — it doesn't exist yet (Plan 5).
      { label: 'Walk into the village', targetId: LocationId('village'), visibleIfFlag: 'unlocked_village' }
    ],
    encounterIds: [EncounterId('first_tax_rat')]
  }
};
