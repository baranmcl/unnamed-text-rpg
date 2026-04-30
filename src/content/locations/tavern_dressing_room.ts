import { LocationId, EncounterId, type Location } from '../../engine/types';

export const tavern_dressing_room: Location = {
  id: LocationId('tavern_dressing_room'),
  name: 'Tavern Dressing Room',
  act: 'act_i',
  description:
    'The back room of the Wretched Pheasant smells like spilled mead, candlewax, and ambition. ' +
    'Ten minutes to curtain. Through the curtain, the audience is already exercising its vowels. ' +
    'One of those vowels is yours.',
  reEntryDescription: 'The dressing room is the dressing room. The candles are slightly more melted.',
  exits: [
    { label: 'Slip out the back-alley', targetId: LocationId('dusty_crossroads') }
  ],
  encounterIds: [EncounterId('combat_pointed_heckler')]
};
