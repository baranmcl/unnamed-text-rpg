import { SkillId, type Skill } from '../../engine/types';

// NOTE: do NOT side-effect-import './resolvers' here. resolvers.ts imports from
// engine/combat.ts, and combat.ts imports from content. Importing resolvers
// from content/skills/index.ts would create a content → skills → resolvers →
// combat → content cycle. Instead, events.ts imports skillResolvers directly,
// which is the only consumer that actually needs them at runtime.

export const skills: Record<SkillId, Skill> = {
  [SkillId('tempt_fate')]: {
    id: SkillId('tempt_fate'),
    name: 'Tempt Fate',
    description: 'A guaranteed crit on your next action — but with a 15% chance something absurd and bad also happens.',
    mpCost: 6,
    scalingStat: 'bluck',
    unlockLevel: 3,
    resolverId: 'tempt_fate'
  }
};
