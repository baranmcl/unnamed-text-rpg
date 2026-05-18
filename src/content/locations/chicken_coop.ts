import { LocationId, EncounterId, type Location } from '../../engine/types';

export const chicken_coop: Location = {
  id: LocationId('chicken_coop'),
  name: 'The Chicken Coop',
  chapter: 'chapter_1',
  description:
    'The chicken coop. Henwald is, as ever, in residence. Several of the girls have gathered in the kind of huddle that, in chickens, ' +
    'indicates either a debate about grain pricing or imminent egg-laying. Possibly both. Their spokesman struts toward you.',
  reEntryDescription:
    'Henwald nods you in. The huddle has rearranged itself; the debate appears to have moved on to roofing.',
  ambientLines: [
    'The chickens have been quiet since dawn. Suspiciously so.',
    'Henwald clears his throat without saying anything. The girls take note.',
    'A small egg rolls across the floor for reasons no one is admitting to.'
  ],
  exits: [
    { label: 'Back to the farm', targetId: LocationId('family_farm') }
  ],
  encounterIds: [
    EncounterId('henwald'),
    EncounterId('henwald_thanks')
  ]
};
