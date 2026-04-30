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
  },
  [SkillId('brute_force')]: {
    id: SkillId('brute_force'),
    name: 'Brute Force',
    description: 'A heaving overhead swing. ~1.8× damage but reduced accuracy.',
    mpCost: 6,
    scalingStat: 'brawn',
    unlockLevel: 3,
    resolverId: 'brute_force'
  },
  [SkillId('out_think_it')]: {
    id: SkillId('out_think_it'),
    name: 'Out-Think It',
    description: 'Reveal the contradiction. Subsequent attacks deal +50% damage for the rest of the fight.',
    mpCost: 8,
    scalingStat: 'brains',
    unlockLevel: 3,
    resolverId: 'out_think_it'
  }
};
