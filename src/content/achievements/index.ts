import { AchievementId, type Achievement } from '../../engine/types';

const first_blood: Achievement = {
  id: AchievementId('first_blood'),
  name: 'First Blood',
  description: 'Win your first combat. Whatever you struck, it had it coming.',
  preconditions: [{ kind: 'flag', flag: 'achievements.first_combat_won' }]
};

const degree_of_heroism: Achievement = {
  id: AchievementId('degree_of_heroism'),
  name: 'Degree of Heroism',
  description: 'Reach the Second Degree of Heroism.',
  preconditions: [{ kind: 'level_at_least', level: 2 }]
};

const signature_move: Achievement = {
  id: AchievementId('signature_move'),
  name: 'Signature Move',
  description: "Unlock your class's signature skill.",
  preconditions: [{ kind: 'flag', flag: 'achievements.signature_unlocked' }]
};

const worth_their_salt: Achievement = {
  id: AchievementId('worth_their_salt'),
  name: 'Worth Their Salt',
  description: 'Carry 100 leaves at once.',
  preconditions: [{ kind: 'currency_at_least', n: 100 }]
};

const tempt_fate: Achievement = {
  id: AchievementId('tempt_fate'),
  name: 'Tempt Fate',
  description: 'Wink at the universe at least once.',
  preconditions: [{ kind: 'flag', flag: 'achievements.tempted_fate' }]
};

const six_cosmic_chuckles: Achievement = {
  id: AchievementId('six_cosmic_chuckles'),
  name: 'Six Cosmic Chuckles',
  description: 'Witness all six Tempt Fate backfires across your runs.',
  preconditions: [{ kind: 'flag_at_least', flag: '__account.backfires_seen.count', min: 6 }]
};

const moonlit: Achievement = {
  id: AchievementId('moonlit'),
  name: 'Moonlit',
  description: 'Switch to the Moonlit theme.',
  preconditions: [{ kind: 'flag', flag: 'achievements.theme_moonlit' }]
};

const refused_sincerely: Achievement = {
  id: AchievementId('refused_sincerely'),
  name: 'Refused, Sincerely',
  description: 'You refused four times. The narrator has gone quiet.',
  preconditions: [{ kind: 'flag_at_least', flag: 'refusal_count', min: 4 }],
  descriptionHidden: true
};

const insulted_the_hat: Achievement = {
  id: AchievementId('insulted_the_hat'),
  name: 'Insulted the Hat',
  description: 'You expressed an opinion about the hat. It expressed one back.',
  preconditions: [{ kind: 'flag', flag: 'insulted_hermit_hat' }],
  descriptionHidden: true
};

const cried_briefly: Achievement = {
  id: AchievementId('cried_briefly'),
  name: 'Cried, Briefly',
  description: 'You wept your share. Briefly. Politely. Tunefully.',
  preconditions: [{ kind: 'flag', flag: 'cried_at_hermit' }],
  descriptionHidden: true
};

const the_tetralogy: Achievement = {
  id: AchievementId('the_tetralogy'),
  name: 'The Tetralogy',
  description: 'Have played all four classes.',
  preconditions: [{ kind: 'flag_at_least', flag: '__account.played_classes.count', min: 4 }]
};

const on_schedule: Achievement = {
  id: AchievementId('on_schedule'),
  name: 'On Schedule',
  description: 'On schedule, more or less.',
  preconditions: [{ kind: 'flag', flag: 'achievement_seed.on_schedule' }],
  hidden: true
};

const page_counted: Achievement = {
  id: AchievementId('page_counted'),
  name: 'Page Counted',
  description: "You noticed something the manuscript wasn't supposed to show.",
  preconditions: [{ kind: 'flag', flag: 'achievement_seed.page_counted' }],
  hidden: true
};

const glimpsed_the_editor: Achievement = {
  id: AchievementId('glimpsed_the_editor'),
  name: 'Glimpsed the Editor',
  description: 'Out of the corner of your eye, a man you have not been introduced to.',
  preconditions: [{ kind: 'flag', flag: 'achievement_seed.glimpsed_editor' }],
  hidden: true
};

const an_unsigned_tale: Achievement = {
  id: AchievementId('an_unsigned_tale'),
  name: 'An Unsigned Tale',
  description: 'You reached the end without ever learning your class signature. The page closes without a mark.',
  preconditions: [
    { kind: 'stage', stage: 'chapter_9' },
    { kind: 'flag_unset', flag: 'ever_learned_signature' }
  ],
  hidden: true
};

const read_the_signs: Achievement = {
  id: AchievementId('read_the_signs'),
  name: 'Read the Signs',
  description: 'You answered the signpost honestly. The wind agreed.',
  preconditions: [{ kind: 'flag', flag: 'achievements.read_the_signs' }],
  hidden: true
};

export const achievements: Record<AchievementId, Achievement> = {
  [first_blood.id]: first_blood,
  [degree_of_heroism.id]: degree_of_heroism,
  [signature_move.id]: signature_move,
  [worth_their_salt.id]: worth_their_salt,
  [tempt_fate.id]: tempt_fate,
  [six_cosmic_chuckles.id]: six_cosmic_chuckles,
  [moonlit.id]: moonlit,
  [refused_sincerely.id]: refused_sincerely,
  [insulted_the_hat.id]: insulted_the_hat,
  [cried_briefly.id]: cried_briefly,
  [the_tetralogy.id]: the_tetralogy,
  [on_schedule.id]: on_schedule,
  [page_counted.id]: page_counted,
  [glimpsed_the_editor.id]: glimpsed_the_editor,
  [an_unsigned_tale.id]: an_unsigned_tale,
  [read_the_signs.id]: read_the_signs
};
