import { LocationId, EncounterId, type Location } from '../../engine/types';

export const burning_library: Location = {
  id: LocationId('burning_library'),
  name: 'Slightly On Fire Library',
  act: 'act_i',
  description:
    "The reading room's vaulted ceiling carries an even, contemplative haze of smoke. " +
    'The smoke is being polite. The fire — which is in only the third row of stacks and may yet be reasoned with — ' +
    'is also being polite, for now. Your robes drag. Your staff hums. Your tome insists, in three margins simultaneously, ' +
    'that the situation is fine.',
  reEntryDescription: 'The library has not improved its situation, but the smoke continues its contemplative work.',
  exits: [
    { label: 'Take the Cobbled Walk', targetId: LocationId('dusty_crossroads') }
  ],
  encounterIds: [EncounterId('combat_feral_footnote')]
};
