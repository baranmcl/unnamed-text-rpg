import { rng, type RngState, type RngResult } from './rng';
import type { GameState, TurnBasedCombatState, MonsterId, ItemId, CombatEncounter } from './types';
import { MAX_LOG_ENTRIES } from './types';
import { content } from '../content';

// Spec §7 combat math.
// Hit: 1d20 + floor(bravado/2) ≥ targetDodge
export function rollHit(state: RngState, bravado: number, targetDodge: number): RngResult<boolean> {
  const r = rng.d20(state);
  const total = r.value + Math.floor(bravado / 2);
  return { state: r.state, value: total >= targetDodge };
}

// Damage: weapon + floor(brawn/2) + d6 - targetArmor, minimum 1.
export function rollDamage(
  state: RngState,
  weaponDamage: number,
  brawn: number,
  targetArmor: number
): RngResult<number> {
  const r = rng.d6(state);
  const raw = weaponDamage + Math.floor(brawn / 2) + r.value - targetArmor;
  return { state: r.state, value: Math.max(1, raw) };
}

// Crit: 1d100 ≤ 5 + (bluck * 2)
export function rollCrit(state: RngState, bluck: number): RngResult<boolean> {
  const r = rng.d100(state);
  return { state: r.state, value: r.value <= 5 + bluck * 2 };
}

// Flee: 1d20 + floor((bluck + bravado)/2) ≥ 15
export function rollFlee(state: RngState, bluck: number, bravado: number): RngResult<boolean> {
  const r = rng.d20(state);
  const total = r.value + Math.floor((bluck + bravado) / 2);
  return { state: r.state, value: total >= 15 };
}

// =====================================================================
// Combat sub-reducers
// =====================================================================

// MAX_LOG_ENTRIES is imported from ./types — do not redefine locally.

function ordinal(n: number): string {
  const titles = ['Untested', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
  return titles[Math.min(n, titles.length - 1)] ?? `${n}th`;
}

function pushLog(state: GameState, entry: { kind: GameState['log'][number]['kind']; text: string; speaker?: string; systemLabel?: string }): GameState {
  const id = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const newLog = [...state.log, { id, ...entry }];
  return { ...state, log: newLog.length > MAX_LOG_ENTRIES ? newLog.slice(-MAX_LOG_ENTRIES) : newLog };
}

export function startCombat(state: GameState, encounter: CombatEncounter): GameState {
  const monster = content.monsters[encounter.monsterId];
  if (!monster) {
    return pushLog(state, { kind: 'system', systemLabel: 'ERROR', text: `Unknown monster ${encounter.monsterId}.` });
  }

  // Initiative: bravado + d6 for each (deterministic via state.rng).
  const playerInitRoll = rng.d6(state.rng);
  const monsterInitRoll = rng.d6(playerInitRoll.state);
  const playerInit = state.character.stats.bravado + playerInitRoll.value;
  const monsterInit = monster.bravado + monsterInitRoll.value;

  const combat: TurnBasedCombatState = {
    kind: 'turn-based',
    encounterId: encounter.id,
    combatants: [
      { id: 'player', kind: 'player', hp: state.character.hp.current, initiative: playerInit },
      { id: encounter.monsterId, kind: 'monster', hp: monster.hp, initiative: monsterInit }
    ],
    turnIndex: 0,
    round: 1
  };

  let s: GameState = { ...state, rng: monsterInitRoll.state, combat };
  s = pushLog(s, { kind: 'combat', text: `${monster.name} appears.` });
  s = pushLog(s, { kind: 'combat', text: monster.flavor });
  return s;
}

export function playerAttack(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;

  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  const weaponId = state.character.equipment.weapon;
  const weapon = weaponId ? content.items[weaponId] : undefined;
  const weaponDamage = weapon?.damage ?? 1;

  // Hit check
  const hitRoll = rollHit(state.rng, state.character.stats.bravado, monster.dodge);
  let s: GameState = { ...state, rng: hitRoll.state };
  if (!hitRoll.value) {
    s = pushLog(s, { kind: 'combat', text: `Your swing goes wide.` });
    return s;
  }

  // Damage
  const dmgRoll = rollDamage(s.rng, weaponDamage, s.character.stats.brawn, monster.armor);
  s = { ...s, rng: dmgRoll.state };

  // Crit
  const critRoll = rollCrit(s.rng, s.character.stats.bluck);
  s = { ...s, rng: critRoll.state };
  const finalDamage = critRoll.value ? Math.floor(dmgRoll.value * 2.2) : dmgRoll.value;

  // Apply damage to monster (s.combat is TurnBasedCombatState — narrowed at function entry)
  const sCombat = s.combat as TurnBasedCombatState;
  const newCombatants = sCombat.combatants.map((c) =>
    c.kind === 'monster' ? { ...c, hp: Math.max(0, c.hp - finalDamage) } : c
  );
  s = { ...s, combat: { ...sCombat, combatants: newCombatants } };
  s = pushLog(s, {
    kind: 'combat',
    text: critRoll.value
      ? `Critical hit! You strike for ${finalDamage}.`
      : `You hit for ${finalDamage}.`
  });

  return s;
}

export function playerUseItem(state: GameState, itemId: ItemId): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  const item = content.items[itemId];
  if (!item || item.kind !== 'consumable') return state;

  // Apply each effect.
  let s = state;
  for (const effect of item.effects ?? []) {
    if (effect.kind === 'heal_hp') {
      const newHp = Math.min(s.character.hp.max, s.character.hp.current + effect.amount);
      s = {
        ...s,
        character: { ...s.character, hp: { ...s.character.hp, current: newHp } },
        combat: s.combat && s.combat.kind === 'turn-based'
          ? {
              ...s.combat,
              combatants: s.combat.combatants.map((c) =>
                c.kind === 'player' ? { ...c, hp: newHp } : c
              )
            }
          : s.combat
      };
      s = pushLog(s, { kind: 'combat', text: `You eat ${item.name}. (+${effect.amount} HP)` });
    } else if (effect.kind === 'heal_mp') {
      const newMp = Math.min(s.character.mp.max, s.character.mp.current + effect.amount);
      s = { ...s, character: { ...s.character, mp: { ...s.character.mp, current: newMp } } };
      s = pushLog(s, { kind: 'combat', text: `You feel mentally refreshed. (+${effect.amount} MP)` });
    }
  }

  // Decrement inventory qty
  const inv = s.character.inventory
    .map((entry) => (entry.itemId === itemId ? { ...entry, qty: entry.qty - 1 } : entry))
    .filter((entry) => entry.qty > 0);
  s = { ...s, character: { ...s.character, inventory: inv } };

  return s;
}

export function playerFlee(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  const enc = content.encounters[state.combat.encounterId];
  if (enc?.kind === 'combat' && enc.noFlee) {
    return pushLog(state, { kind: 'combat', text: 'There is no fleeing this.' });
  }

  const r = rollFlee(state.rng, state.character.stats.bluck, state.character.stats.bravado);
  let s: GameState = { ...state, rng: r.state };
  if (r.value) {
    s = pushLog(s, { kind: 'combat', text: 'You flee, with what dignity remains.' });
    s = { ...s, combat: null };
  } else {
    s = pushLog(s, { kind: 'combat', text: 'You attempt to flee. The attempt is, charitably, ungraceful.' });
  }
  return s;
}

export function monsterTurn(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  // Pick action by weight.
  const actionRoll = rng.weighted(state.rng, monster.actions.map((a) => ({ value: a, weight: a.weight })));
  let s: GameState = { ...state, rng: actionRoll.state };
  const action = actionRoll.value;

  if (action.kind === 'flee_if_low_hp' && monsterCombatant.hp <= Math.floor(monster.hp / 4)) {
    s = pushLog(s, { kind: 'combat', text: action.flavor });
    s = { ...s, combat: null };
    return s;
  }

  // Attack-style action (regular or special)
  const damageBonus = action.kind === 'special' ? action.damageBonus : 0;
  const hit = rollHit(s.rng, monster.bravado, /*player dodge*/ 10 + Math.floor(state.character.stats.bravado / 2));
  s = { ...s, rng: hit.state };
  if (!hit.value) {
    s = pushLog(s, { kind: 'combat', text: `${action.flavor} (You dodge.)` });
    return s;
  }
  const armorId = state.character.equipment.armor;
  const armorItem = armorId ? content.items[armorId] : undefined;
  const playerArmor = armorItem?.armor ?? 0;
  const dmg = rollDamage(s.rng, monster.weaponDamage + damageBonus, monster.brawn, playerArmor);
  s = { ...s, rng: dmg.state };
  // Apply to player (s.combat is TurnBasedCombatState — narrowed at function entry)
  const newHp = Math.max(0, state.character.hp.current - dmg.value);
  const sCombat = s.combat as TurnBasedCombatState;
  s = {
    ...s,
    character: { ...s.character, hp: { ...s.character.hp, current: newHp } },
    combat: {
      ...sCombat,
      combatants: sCombat.combatants.map((c) => (c.kind === 'player' ? { ...c, hp: newHp } : c))
    }
  };
  s = pushLog(s, { kind: 'combat', text: `${action.flavor} (-${dmg.value} HP)` });

  return s;
}

export function endCombat(state: GameState, result: 'victory' | 'defeat' | 'flee', encounter: CombatEncounter): GameState {
  let s: GameState = { ...state, combat: null };
  if (result === 'victory') {
    // Push the monster's defeated-flavor line before XP/loot, so the player
    // gets a closure beat before the mechanical readouts.
    const monster = content.monsters[encounter.monsterId];
    if (monster?.defeatedFlavor) {
      s = pushLog(s, { kind: 'narration', text: monster.defeatedFlavor });
    }

    if (encounter.xpReward > 0) {
      s = { ...s, character: { ...s.character, xp: s.character.xp + encounter.xpReward } };
      s = pushLog(s, { kind: 'system', systemLabel: 'EXP.', text: `+${encounter.xpReward} experience.` });
    }

    // Fix 1: Roll monster loot table.
    if (monster) {
      let lootDropped = false;
      for (const lootEntry of monster.loot) {
        const roll = rng.d100(s.rng);
        s = { ...s, rng: roll.state };
        if (roll.value <= lootEntry.chance * 100) {
          lootDropped = true;
          const item = content.items[lootEntry.itemId];
          if (item) {
            const existing = s.character.inventory.find((e) => e.itemId === lootEntry.itemId);
            const newInv = existing
              ? s.character.inventory.map((e) => e.itemId === lootEntry.itemId ? { ...e, qty: e.qty + 1 } : e)
              : [...s.character.inventory, { itemId: lootEntry.itemId, qty: 1 }];
            s = { ...s, character: { ...s.character, inventory: newInv } };
            s = pushLog(s, { kind: 'loot', text: `You find: ${item.name}.` });
          }
        }
      }
      if (monster.loot.length > 0 && !lootDropped) {
        s = pushLog(s, { kind: 'system', systemLabel: 'LOOT', text: 'Nothing of value remains.' });
      }
    }

    // Fix 3: Mark encounter as defeated so it doesn't reappear.
    if (!encounter.repeatable) {
      s = {
        ...s,
        world: {
          ...s.world,
          flags: { ...s.world.flags, [`defeated:${encounter.id}`]: true }
        }
      };
    }

    // Fix 4a: Level-up check (loop in case multiple levels gained at once).
    const xpThreshold = (level: number) => level * 100;
    while (s.character.xp >= xpThreshold(s.character.level)) {
      s = { ...s, character: { ...s.character, xp: s.character.xp - xpThreshold(s.character.level), level: s.character.level + 1 } };
      const newHpMax = s.character.hp.max + Math.floor(s.character.stats.brawn * 1.5);
      const newMpMax = s.character.mp.max + s.character.stats.brains;
      s = {
        ...s,
        character: {
          ...s.character,
          hp: { current: newHpMax, max: newHpMax },
          mp: { current: newMpMax, max: newMpMax }
        }
      };
      s = pushLog(s, {
        kind: 'system',
        systemLabel: 'LEVEL',
        text: `You attain the ${ordinal(s.character.level)} Degree of Heroism. (Healed to full.)`
      });
    }
  } else if (result === 'defeat') {
    s = pushLog(s, { kind: 'narration', text: 'The world goes dim. You wake some time later, with a headache and your dignity rumpled.' });
    // Plan 4 will add proper defeat handling. For Plan 2, restore HP to 1.
    s = { ...s, character: { ...s.character, hp: { ...s.character.hp, current: 1 } } };
  }
  return s;
}
