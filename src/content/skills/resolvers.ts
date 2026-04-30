import type { SkillResolver, SkillResolverId } from '../../engine/types';

// Resolvers are registered as additional tasks land them. Each resolver receives
// the post-MP-deduction state and returns the new state.
export const skillResolvers: Record<SkillResolverId, SkillResolver> = {};

export function registerSkillResolver(id: SkillResolverId, fn: SkillResolver): void {
  skillResolvers[id] = fn;
}
