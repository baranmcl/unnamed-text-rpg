import { QuestId, LocationId, type Quest } from '../../engine/types';

const answer_the_call: Quest = {
  id: QuestId('answer_the_call'),
  title: 'Answer the Call to Adventure',
  description: "Right on schedule, more or less. (You'll see.)",
  kind: 'main',
  activatePredicate: [{ kind: 'stage', stage: 'chapter_1' }],
  objectives: [
    {
      id: 'survive_your_morning',
      label: 'Survive your morning.',
      completePredicate: [
        {
          kind: 'any_flag',
          flags: [
            'unlocked_crossroads',
            'unlocked_kings_road',
            'unlocked_cobbled_walk',
            'unlocked_back_alley'
          ]
        }
      ]
    },
    {
      id: 'travel_to_crossroads',
      label: 'Travel to the Dusty Crossroads.',
      completePredicate: [{ kind: 'visited', locationId: LocationId('dusty_crossroads') }]
    },
    {
      id: 'hear_the_hermit',
      label: 'Hear the Hermit out.',
      completePredicate: [{ kind: 'flag', flag: 'started_call_encounter' }]
    },
    {
      id: 'decide',
      label: 'Decide.',
      completePredicate: [
        {
          kind: 'any_flag',
          flags: ['accepted_call', 'insulted_hermit_hat', 'cried_at_hermit']
        }
      ]
    }
  ],
  rewards: [
    { kind: 'currency', amount: 50 },
    { kind: 'xp', amount: 100 },
  ]
};

export const quests: Record<QuestId, Quest> = {
  [answer_the_call.id]: answer_the_call,
};
