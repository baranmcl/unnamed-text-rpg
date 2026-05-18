import { EncounterId, NarrativeNodeId, type NarrativeEncounter } from '../../engine/types';

// Re-entry behavior: pre-victory shows henwald_intro; post-victory shows henwald_post_victory.
// The encounter's rootNodeId is the pre-victory state; the engine's auto-arrive hook at
// chicken_coop picks the right encounter based on `defeated:first_tax_rat`.
export const henwald: NarrativeEncounter = {
  id: EncounterId('henwald'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('henwald_intro'),
  label: 'Talk to Henwald',
  hiddenIfFlag: 'defeated:first_tax_rat'
};

export const henwald_thanks: NarrativeEncounter = {
  id: EncounterId('henwald_thanks'),
  kind: 'narrative',
  rootNodeId: NarrativeNodeId('henwald_post_victory'),
  label: 'Talk to Henwald',
  visibleIfFlag: 'defeated:first_tax_rat'
};
