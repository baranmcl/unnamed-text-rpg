import { LocationId, EncounterId, type Location } from '../../engine/types';

export const tavern_dressing_room: Location = {
  id: LocationId('tavern_dressing_room'),
  name: 'Tavern Dressing Room',
  chapter: 'chapter_1',
  description:
    'The back room of the Wretched Pheasant smells like spilled mead, candlewax, and ambition. ' +
    'Ten minutes to curtain. Through the curtain, the audience is already exercising its vowels. ' +
    'One of those vowels is yours.',
  reEntryDescription: 'The dressing room is the dressing room. The candles are slightly more melted.',
  ambientLines: [
    'The candle gutters. The candle re-gutters.',
    'Through the curtain, a single audience member coughs in a key not quite chosen.',
    'Your reflection adjusts something only it can see.',
    'A stagehand passes the door at speed and does not knock, on principle.'
  ],
  exits: [
    { label: 'Slip out the back-alley', targetId: LocationId('dusty_crossroads'), visibleIfFlag: 'unlocked_back_alley' }
  ],
  encounterIds: [EncounterId('combat_pointed_heckler'), EncounterId('critic_with_notes')],
  restSpots: [
    {
      id: 'dressing_chaise',
      label: 'Lounge on the back-stage chaise',
      flavor: 'You drape yourself across the chaise like a deposed minor noble. The lights are low. The audience is not your problem yet. After a while, you feel restored.'
    }
  ]
};
