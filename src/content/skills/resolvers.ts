import type { GameState, MonsterId, SkillResolver, SkillResolverId, TurnBasedCombatState, LogEntry } from '../../engine/types';
import { MAX_LOG_ENTRIES } from '../../engine/types';
import { content } from '..';
import { rollHit, rollDamage, rollCrit } from '../../engine/combat';

export const skillResolvers: Record<SkillResolverId, SkillResolver> = {};

export function registerSkillResolver(id: SkillResolverId, fn: SkillResolver): void {
  skillResolvers[id] = fn;
}

function pushLog(state: GameState, entry: Omit<LogEntry, 'id'>): GameState {
  const id = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const merged = [...state.log, { id, ...entry }];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}

// =====================================================================
// Brute Force — Brawn. ~1.8x damage with reduced accuracy.
// =====================================================================

registerSkillResolver('brute_force', (state) => {
  if (state.combat?.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  const weaponId = state.character.equipment.weapon;
  const weapon = weaponId ? content.items[weaponId] : undefined;
  const weaponDamage = weapon?.damage ?? 1;

  // Reduced accuracy: +3 to the target dodge (≈ -15% on a 1d20 + bravado/2).
  const adjustedDodge = monster.dodge + 3;
  const hitRoll = rollHit(state.rng, state.character.stats.bravado, adjustedDodge);
  let s: GameState = { ...state, rng: hitRoll.state };
  if (!hitRoll.value) {
    return pushLog(s, { kind: 'combat', text: `The ${weapon?.name ?? 'weapon'} bites only the dust. (Tempt the swing, lose the moment.)` });
  }

  const dmgRoll = rollDamage(s.rng, weaponDamage, s.character.stats.brawn, monster.armor);
  s = { ...s, rng: dmgRoll.state };
  const critRoll = rollCrit(s.rng, s.character.stats.bluck);
  s = { ...s, rng: critRoll.state };

  const multiplier = 1.8 + state.character.stats.brawn * 0.02;
  const baseDamage = Math.floor(dmgRoll.value * multiplier);
  const finalDamage = critRoll.value ? Math.floor(baseDamage * 2.2) : baseDamage;

  const sCombat = s.combat as TurnBasedCombatState;
  s = {
    ...s,
    combat: {
      ...sCombat,
      combatants: sCombat.combatants.map((c) =>
        c.kind === 'monster' ? { ...c, hp: Math.max(0, c.hp - finalDamage) } : c
      )
    }
  };
  return pushLog(s, {
    kind: 'combat',
    text: critRoll.value
      ? `The ${weapon?.name ?? 'weapon'} comes down with all your weight behind it. **Critical!** Damage: ${finalDamage}.`
      : `The ${weapon?.name ?? 'weapon'} comes down with all your weight behind it. Damage: ${finalDamage}.`
  });
});
