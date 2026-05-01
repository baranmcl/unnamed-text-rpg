import type { GameState, MonsterId, SkillResolver, SkillResolverId, TurnBasedCombatState, LogEntry } from '../../engine/types';
import { MAX_LOG_ENTRIES } from '../../engine/types';
import { content } from '..';
import { rollHit, rollDamage, rollCrit, monsterFreeRetaliation } from '../../engine/combat';
import { rng } from '../../engine/rng';
import { applyStatus } from '../../engine/status';

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

// =====================================================================
// Out-Think It — Brains. Applies weakness_revealed (until end of fight).
// If encounter has endsByReasoning, the fight resolves as victory.
// =====================================================================

registerSkillResolver('out_think_it', (state) => {
  if (state.combat?.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;

  let s = applyStatus(state, { kind: 'combatant', combatantId: monsterCombatant.id }, {
    kind: 'weakness_revealed',
    duration: { kind: 'until_end_of_fight' },
    source: 'Out-Think It'
  });
  s = pushLog(s, {
    kind: 'combat',
    text: `You expose the contradiction at the heart of its grievance. **${content.monsters[monsterCombatant.id as MonsterId]?.name ?? 'It'} — weakness revealed.**`
  });

  // endsByReasoning encounter opt-in: KO the monster.
  const enc = content.encounters[state.combat.encounterId];
  if (enc?.kind === 'combat' && enc.endsByReasoning) {
    if (s.combat?.kind === 'turn-based') {
      const sCombat = s.combat;
      s = {
        ...s,
        combat: {
          ...sCombat,
          combatants: sCombat.combatants.map((c) =>
            c.kind === 'monster' ? { ...c, hp: 0 } : c
          )
        }
      };
      s = pushLog(s, { kind: 'combat', text: 'They sit down. The argument is over.' });
    }
  }
  return s;
});

// =====================================================================
// Swagger — Bravado. Applies intimidated (turns: 1) to monster.
// =====================================================================

registerSkillResolver('swagger', (state) => {
  if (state.combat?.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];

  let s = applyStatus(state, { kind: 'combatant', combatantId: monsterCombatant.id }, {
    kind: 'intimidated',
    duration: { kind: 'turns', remaining: 1 },
    source: 'Swagger'
  });
  s = pushLog(s, {
    kind: 'combat',
    text: `You roll your shoulders. The ${monster?.name ?? 'foe'} reconsiders its life choices. **Intimidated.**`
  });
  return s;
});

// =====================================================================
// Tempt Fate — (B)Luck. Guaranteed crit on next attack + 15% backfire.
// =====================================================================

type BackfireKind =
  | 'trip'
  | 'crit_yourself'
  | 'weapon_mute'
  | 'drop_shield'
  | 'free_retaliation'
  | 'wasted_prophecy';

const BACKFIRES: BackfireKind[] = [
  'trip', 'crit_yourself', 'weapon_mute', 'drop_shield', 'free_retaliation', 'wasted_prophecy'
];

registerSkillResolver('tempt_fate', (state) => {
  if (state.combat?.kind !== 'turn-based') return state;

  state = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, 'achievements.tempted_fate': true }
    }
  };

  // Apply guaranteed_crit (one-shot) to the player.
  let s = applyStatus(state, { kind: 'combatant', combatantId: 'player' }, {
    kind: 'guaranteed_crit',
    duration: { kind: 'one_shot' },
    source: 'Tempt Fate'
  });

  // Roll d100 for backfire (15% gate).
  const gate = rng.d100(s.rng);
  s = { ...s, rng: gate.state };
  const fired = gate.value <= 15;

  if (!fired) {
    s = pushLog(s, { kind: 'combat', text: 'You wink at the universe. A crit awaits your next swing.' });
    return s;
  }

  s = pushLog(s, { kind: 'combat', text: 'You wink at the universe. The universe winks back. Awkwardly.' });

  // Pick a backfire uniformly via seeded RNG.
  const pick = rng.pick(s.rng, BACKFIRES);
  s = { ...s, rng: pick.state };

  s = {
    ...s,
    world: {
      ...s.world,
      flags: { ...s.world.flags, __just_tempted_backfire: pick.value }
    }
  };

  switch (pick.value) {
    case 'trip':
      s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
        kind: 'skip_turn',
        duration: { kind: 'turns', remaining: 1 },
        source: 'Tempt Fate backfire'
      });
      s = pushLog(s, { kind: 'combat', text: 'You step on your own cloak. **Skip next turn.**' });
      break;

    case 'crit_yourself': {
      const dmgRoll = rng.d6(s.rng);
      s = { ...s, rng: dmgRoll.state };
      const dmg = ((dmgRoll.value - 1) % 4) + 1;
      const newHp = Math.max(0, s.character.hp.current - dmg);
      const sCombat = s.combat as TurnBasedCombatState;
      s = {
        ...s,
        character: { ...s.character, hp: { ...s.character.hp, current: newHp } },
        combat: {
          ...sCombat,
          combatants: sCombat.combatants.map((c) => (c.kind === 'player' ? { ...c, hp: newHp } : c))
        }
      };
      s = pushLog(s, { kind: 'combat', text: `The universe accepts your wink. You crit yourself for ${dmg}.` });
      break;
    }

    case 'weapon_mute':
      s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
        kind: 'weapon_suspended',
        duration: { kind: 'turns', remaining: 3 },
        source: 'Tempt Fate backfire'
      });
      s = pushLog(s, { kind: 'combat', text: 'Your weapon takes a vow of silence for the next three turns. **Weapon suspended.**' });
      break;

    case 'drop_shield':
      s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
        kind: 'armor_halved',
        duration: { kind: 'turns', remaining: 2 },
        source: 'Tempt Fate backfire'
      });
      s = pushLog(s, { kind: 'combat', text: 'You catch a draft and forget how armor works. **Armor halved (2 turns).**' });
      break;

    case 'free_retaliation': {
      const monsterCombatant = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'monster');
      if (monsterCombatant) {
        s = applyStatus(s, { kind: 'combatant', combatantId: monsterCombatant.id }, {
          kind: 'free_retaliation',
          duration: { kind: 'one_shot' },
          source: 'Tempt Fate backfire'
        });
        s = pushLog(s, { kind: 'combat', text: 'You laugh nervously. The foe takes the cue.' });
        s = monsterFreeRetaliation(s);
      }
      break;
    }

    case 'wasted_prophecy':
      s = applyStatus(s, { kind: 'combatant', combatantId: 'player' }, {
        kind: 'next_attack_misses',
        duration: { kind: 'one_shot' },
        source: 'Tempt Fate backfire'
      });
      s = pushLog(s, { kind: 'combat', text: 'A faint cosmic chuckle. **Your next strike is destined to miss.**' });
      break;
  }
  return s;
});
