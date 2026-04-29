import { SkillId, type Skill } from '../../engine/types';

export const skills: Record<SkillId, Skill> = {
  [SkillId('tempt_fate')]: {
    id: SkillId('tempt_fate'),
    name: 'Tempt Fate',
    description: 'A guaranteed crit on your next action — but with a 15% chance something absurd and bad also happens.',
    mpCost: 6,
    scalingStat: 'bluck',
    unlockLevel: 3
  }
};
