import { rng, type RngState, type RngResult } from './rng';
import type { GameState, TurnBasedCombatState, MonsterId, ItemId, CombatEncounter, MonsterAction, Status } from './types';
import { MAX_LOG_ENTRIES } from './types';
import { content } from '../content';
import { awardXp } from './progression';
import {
  tickStatuses,
  hasStatus,
  findStatus,
  applyStatus,
  expireStatusByKind,
  copyWorldStatusesToPlayer,
  persistPlayerStatusesToCharacter
} from './status';

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
  const playerInitRoll = rng.d6(state.rng);
  const monsterInitRoll = rng.d6(playerInitRoll.state);
  const playerInit = state.character.stats.bravado + playerInitRoll.value;
  const monsterInit = monster.bravado + monsterInitRoll.value;

  const combat: TurnBasedCombatState = {
    kind: 'turn-based',
    encounterId: encounter.id,
    combatants: [
      { id: 'player', kind: 'player', hp: state.character.hp.current, initiative: playerInit, statuses: [] },
      { id: encounter.monsterId, kind: 'monster', hp: monster.hp, initiative: monsterInit, statuses: [] }
    ],
    turnIndex: 0,
    round: 1
  };

  let s: GameState = { ...state, rng: monsterInitRoll.state, combat };
  s = copyWorldStatusesToPlayer(s);
  s = pushLog(s, { kind: 'combat', text: `${monster.name} appears.` });
  s = pushLog(s, { kind: 'combat', text: monster.flavor });
  return s;
}

/**
 * Emit the expirationFlavor log entry for an expired player status, by
 * looking up the source monster's apply_status action with matching kind.
 * Silent if the source monster or matching action can't be found (e.g.,
 * a skill-applied status with no matching monster action).
 */
function emitPlayerStatusExpiration(state: GameState, status: Status): GameState {
  if (!status.source) return state;
  const sourceMonster = Object.values(content.monsters).find((m) => m.name === status.source);
  if (!sourceMonster) return state;
  const action = sourceMonster.actions.find(
    (a): a is Extract<MonsterAction, { kind: 'apply_status' }> =>
      a.kind === 'apply_status' && a.status === status.kind
  );
  if (!action) return state;
  return pushLog(state, { kind: 'combat', text: action.expirationFlavor });
}

function tickPlayerCombatant(state: GameState): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const combat = state.combat;
  const playerBefore = combat.combatants.find((c) => c.kind === 'player');
  if (!playerBefore) return state;

  const combatants = combat.combatants.map((c) => (c.kind === 'player' ? tickStatuses(c) : c));
  const playerAfter = combatants.find((c) => c.kind === 'player')!;

  // Diff: any status present before but missing after has expired.
  const expired = playerBefore.statuses.filter(
    (s) => !playerAfter.statuses.some((s2) => s2.id === s.id)
  );

  let s: GameState = { ...state, combat: { ...combat, combatants } };
  for (const status of expired) {
    s = emitPlayerStatusExpiration(s, status);
  }
  return s;
}

function tickMonsterCombatant(state: GameState, monsterId: string): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const combat = state.combat;
  const combatants = combat.combatants.map((c) => (c.id === monsterId ? tickStatuses(c) : c));
  return { ...state, combat: { ...combat, combatants } };
}

export function playerAttack(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;

  // Check skip_turn BEFORE ticking, so `remaining: 1` means "active this turn".
  const preTickPlayer = state.combat.combatants.find((c) => c.kind === 'player');
  const shouldSkip = preTickPlayer ? hasStatus(preTickPlayer, 'skip_turn') : false;

  let s: GameState = tickPlayerCombatant(state);
  if (s.combat?.kind !== 'turn-based') return s;

  if (shouldSkip) {
    s = pushLog(s, { kind: 'combat', text: "You can't act this turn." });
    return s;
  }

  const monsterCombatant = s.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return s;
  const playerCombatant = s.combat.combatants.find((c) => c.kind === 'player');
  if (!playerCombatant) return s;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return s;

  const weaponId = s.character.equipment.weapon;
  const weapon = weaponId ? content.items[weaponId] : undefined;
  const weaponSuspended = hasStatus(playerCombatant, 'weapon_suspended');
  // When weapon is suspended, only weapon damage is zeroed (per spec). Brawn contribution remains.
  const weaponDamage = weaponSuspended ? 0 : (weapon?.damage ?? 1);

  // 1. next_attack_misses forces miss (and also clears guaranteed_crit — wasted prophecy).
  if (hasStatus(playerCombatant, 'next_attack_misses')) {
    // Capture the status before consuming it so we can emit expirationFlavor.
    const missStatus = findStatus(playerCombatant, 'next_attack_misses');
    const sCombat = s.combat;
    const combatants = sCombat.combatants.map((c) => {
      if (c.kind !== 'player') return c;
      let cleared = expireStatusByKind(c, 'next_attack_misses');
      cleared = expireStatusByKind(cleared, 'guaranteed_crit');
      return cleared;
    });
    s = { ...s, combat: { ...sCombat, combatants } };
    s = pushLog(s, { kind: 'combat', text: 'Your strike goes wide — exactly as foretold.' });
    if (missStatus) s = emitPlayerStatusExpiration(s, missStatus);
    return s;
  }

  // 2. Hit roll (or guaranteed_crit forces hit).
  const guaranteedCrit = hasStatus(playerCombatant, 'guaranteed_crit');
  let hit: boolean;
  if (guaranteedCrit) {
    hit = true;
  } else {
    const hitRoll = rollHit(s.rng, s.character.stats.bravado, monster.dodge);
    s = { ...s, rng: hitRoll.state };
    hit = hitRoll.value;
  }
  if (!hit) {
    s = pushLog(s, { kind: 'combat', text: 'Your swing goes wide.' });
    return s;
  }

  // 3. Damage roll.
  const dmgRoll = rollDamage(s.rng, weaponDamage, s.character.stats.brawn, monster.armor);
  s = { ...s, rng: dmgRoll.state };

  // 4. Crit (forced if guaranteed_crit).
  let isCrit: boolean;
  if (guaranteedCrit) {
    isCrit = true;
    // Only expire one_shot guaranteed_crit; permanent/fights_remaining variants stay.
    const sCombat = s.combat as TurnBasedCombatState;
    const combatants = sCombat.combatants.map((c) => {
      if (c.kind !== 'player') return c;
      return { ...c, statuses: c.statuses.filter((st) => !(st.kind === 'guaranteed_crit' && st.duration.kind === 'one_shot')) };
    });
    s = { ...s, combat: { ...sCombat, combatants } };
  } else {
    const critRoll = rollCrit(s.rng, s.character.stats.bluck);
    s = { ...s, rng: critRoll.state };
    isCrit = critRoll.value;
  }
  let finalDamage = isCrit ? Math.floor(dmgRoll.value * 2.2) : dmgRoll.value;

  // 5. weakness_revealed on monster: +50% damage.
  if (hasStatus(monsterCombatant, 'weakness_revealed')) {
    finalDamage = Math.floor(finalDamage * 1.5);
  }

  // 5b. plot_armor on monster: cap incoming damage at 1.
  // Safe to use the pre-attack monsterCombatant: playerAttack only mutates player statuses.
  if (hasStatus(monsterCombatant, 'plot_armor')) {
    finalDamage = Math.min(1, finalDamage);
  }

  // 6. Apply damage.
  const sCombat = s.combat as TurnBasedCombatState;
  const newCombatants = sCombat.combatants.map((c) =>
    c.kind === 'monster' ? { ...c, hp: Math.max(0, c.hp - finalDamage) } : c
  );
  s = { ...s, combat: { ...sCombat, combatants: newCombatants } };
  s = pushLog(s, {
    kind: 'combat',
    text: isCrit ? `Critical hit! You strike for ${finalDamage}.` : `You hit for ${finalDamage}.`
  });

  return s;
}

export function playerUseItem(state: GameState, itemId: ItemId): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;

  // Check skip_turn BEFORE ticking, so `remaining: 1` means "active this turn".
  const preTickPlayer = state.combat.combatants.find((c) => c.kind === 'player');
  const shouldSkip = preTickPlayer ? hasStatus(preTickPlayer, 'skip_turn') : false;

  state = tickPlayerCombatant(state);
  if (state.combat?.kind !== 'turn-based') return state;

  if (shouldSkip) {
    return pushLog(state, { kind: 'combat', text: "You can't act this turn." });
  }
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

  // Check skip_turn BEFORE ticking, so `remaining: 1` means "active this turn".
  const preTickPlayer = state.combat.combatants.find((c) => c.kind === 'player');
  const shouldSkip = preTickPlayer ? hasStatus(preTickPlayer, 'skip_turn') : false;

  state = tickPlayerCombatant(state);
  if (state.combat?.kind !== 'turn-based') return state;

  if (shouldSkip) {
    return pushLog(state, { kind: 'combat', text: "You can't act this turn." });
  }
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

  // Check skip effects on the PRE-TICK combatant so that remaining:1 means "active this turn, then expires".
  const shouldSkip = hasStatus(monsterCombatant, 'intimidated') || hasStatus(monsterCombatant, 'skip_turn');
  const skipText = hasStatus(monsterCombatant, 'intimidated')
    ? `${monster.name} is too rattled to act.`
    : `${monster.name} skips a beat.`;

  let s = tickMonsterCombatant(state, monsterCombatant.id);
  if (s.combat?.kind !== 'turn-based') return s;

  if (shouldSkip) {
    s = pushLog(s, { kind: 'combat', text: skipText });
    return s;
  }

  const tickedMonster = s.combat.combatants.find((c) => c.id === monsterCombatant.id)!;

  const actionRoll = rng.weighted(s.rng, monster.actions.map((a) => ({ value: a, weight: a.weight })));
  s = { ...s, rng: actionRoll.state };
  const action = actionRoll.value;

  if (action.kind === 'flee_if_low_hp' && tickedMonster.hp <= Math.floor(monster.hp / 4)) {
    s = pushLog(s, { kind: 'combat', text: action.flavor });
    s = { ...s, combat: null };
    return s;
  }

  if (action.kind === 'apply_status') {
    s = pushLog(s, { kind: 'combat', text: action.flavor });
    // plot_armor is a self-buff; all other statuses target the player.
    const target = action.status === 'plot_armor'
      ? { kind: 'combatant', combatantId: monsterCombatant.id } as const
      : { kind: 'combatant', combatantId: 'player' } as const;
    s = applyStatus(s, target, {
      kind: action.status,
      duration: action.duration,
      source: monster.name
    });
    s = pushLog(s, { kind: 'combat', text: action.appliedFlavor });
    return s;
  }

  const damageBonus = action.kind === 'special' ? action.damageBonus : 0;
  const hit = rollHit(s.rng, monster.bravado, /*player dodge*/ 10 + Math.floor(state.character.stats.bravado / 2));
  s = { ...s, rng: hit.state };
  if (!hit.value) {
    s = pushLog(s, { kind: 'combat', text: `${action.flavor} (You dodge.)` });
    return s;
  }

  // armor_halved on player halves effective armor.
  const playerCombatant = (s.combat as TurnBasedCombatState).combatants.find((c) => c.kind === 'player')!;
  const armorId = state.character.equipment.armor;
  const armorItem = armorId ? content.items[armorId] : undefined;
  const baseArmor = armorItem?.armor ?? 0;
  const playerArmor = hasStatus(playerCombatant, 'armor_halved') ? Math.floor(baseArmor / 2) : baseArmor;

  const dmg = rollDamage(s.rng, monster.weaponDamage + damageBonus, monster.brawn, playerArmor);
  s = { ...s, rng: dmg.state };
  const newHp = Math.max(0, s.character.hp.current - dmg.value);
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

// Triggers a one-off monster attack outside the normal turn cycle. The monster's
// `free_retaliation` status is cleared after the attack regardless of outcome.
export function monsterFreeRetaliation(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'turn-based') return state;
  const monsterCombatant = state.combat.combatants.find((c) => c.kind === 'monster');
  if (!monsterCombatant) return state;
  if (!hasStatus(monsterCombatant, 'free_retaliation')) return state;
  const monster = content.monsters[monsterCombatant.id as MonsterId];
  if (!monster) return state;

  const action = monster.actions.find((a) => a.kind !== 'flee_if_low_hp') ?? monster.actions[0];
  if (!action) return state;
  const damageBonus = action.kind === 'special' ? action.damageBonus : 0;

  const playerCombatant = state.combat.combatants.find((c) => c.kind === 'player')!;
  let s: GameState = state;
  const hit = rollHit(s.rng, monster.bravado, 10 + Math.floor(s.character.stats.bravado / 2));
  s = { ...s, rng: hit.state };
  if (!hit.value) {
    s = pushLog(s, { kind: 'combat', text: `${action.flavor} (You dodge — barely.)` });
  } else {
    const armorId = s.character.equipment.armor;
    const armorItem = armorId ? content.items[armorId] : undefined;
    const baseArmor = armorItem?.armor ?? 0;
    const playerArmor = hasStatus(playerCombatant, 'armor_halved') ? Math.floor(baseArmor / 2) : baseArmor;
    const dmg = rollDamage(s.rng, monster.weaponDamage + damageBonus, monster.brawn, playerArmor);
    s = { ...s, rng: dmg.state };
    const newHp = Math.max(0, s.character.hp.current - dmg.value);
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
  }

  // Clear the one-shot.
  const sCombat = s.combat as TurnBasedCombatState;
  s = {
    ...s,
    combat: {
      ...sCombat,
      combatants: sCombat.combatants.map((c) =>
        c.id === monsterCombatant.id ? expireStatusByKind(c, 'free_retaliation') : c
      )
    }
  };
  return s;
}

export function endCombat(state: GameState, result: 'victory' | 'defeat' | 'flee', encounter: CombatEncounter): GameState {
  let s: GameState = persistPlayerStatusesToCharacter(state);
  s = { ...s, combat: null };
  if (result === 'victory') {
    // Push the monster's defeated-flavor line before XP/loot, so the player
    // gets a closure beat before the mechanical readouts.
    const monster = content.monsters[encounter.monsterId];
    s = {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, 'achievements.first_combat_won': true }
      }
    };
    if (monster?.defeatedFlavor) {
      s = pushLog(s, { kind: 'narration', text: monster.defeatedFlavor });
    }

    if (encounter.xpReward > 0) {
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

    // Roll currency drop.
    if (monster?.currencyDrop) {
      const { min, max } = monster.currencyDrop;
      if (max > 0 && max >= min) {
        const range = max - min + 1;
        const r = rng.d100(s.rng);
        s = { ...s, rng: r.state };
        const drop = min + (r.value % range);
        if (drop > 0) {
          s = {
            ...s,
            character: { ...s.character, currency: s.character.currency + drop }
          };
          s = pushLog(s, { kind: 'loot', text: `You collect ${drop} ${drop === 1 ? 'leaf' : 'leaves'}.` });
        }
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

    s = awardXp(s, encounter.xpReward);
  } else if (result === 'defeat') {
    const newHp = Math.max(1, Math.floor(s.character.hp.max * 0.5));
    const newMp = Math.max(0, Math.floor(s.character.mp.max * 0.5));
    const lostCurrency = Math.floor(s.character.currency * 0.3);
    s = pushLog(s, { kind: 'narration', text: 'The world goes dim. You wake some time later, with a headache, a bruised ego, and the distinct sense that someone has been through your purse.' });
    if (lostCurrency > 0) {
      s = pushLog(s, { kind: 'loot', text: `You are lighter by ${lostCurrency} ${lostCurrency === 1 ? 'leaf' : 'leaves'}.` });
    }
    s = {
      ...s,
      character: {
        ...s.character,
        hp: { ...s.character.hp, current: newHp },
        mp: { ...s.character.mp, current: newMp },
        currency: s.character.currency - lostCurrency
      }
    };
  }
  return s;
}
