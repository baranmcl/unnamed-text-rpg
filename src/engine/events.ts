import type { GameState, ClassId, ItemId, LocationId, EncounterId, EquipSlot, LogEntry, SkillId } from './types';
import { MAX_LOG_ENTRIES } from './types';
import { content } from '../content';
import { startCombat, playerAttack, playerFlee, playerUseItem, monsterTurn, endCombat } from './combat';
import { skillResolvers } from '../content/skills/resolvers';
import { checkBeats } from './story';
import { checkQuests } from './quests';
import { startNarrativeEncounter, chooseNarrativeOption } from './narrative';
import { rng } from './rng';

// MAX_LOG_ENTRIES is imported from ./types — do not redefine locally.

// Maps each mentor location ID to the class that owns it (for auto-arrive routing
// in EnterLocation). Module-level constant — allocated once.
const MENTOR_LOCATION_TO_CLASS: Record<string, { cls: string; key: string }> = {
  veterans_chapel: { cls: 'disgraced_knight', key: 'knight' },
  quiet_tower: { cls: 'accidental_wizard', key: 'wizard' },
  laureates_salon: { cls: 'bard', key: 'bard' },
  hedgerow_lane: { cls: 'reluctant_farmhand', key: 'farmhand' }
};

// Append entries to the log, deriving sequential ids from the existing log
// tail. This MUST match the id-generation pattern in combat.ts so the two
// modules never produce a colliding id.
function appendLogs(state: GameState, entries: Omit<LogEntry, 'id'>[]): GameState {
  let nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const withIds: LogEntry[] = entries.map((e) => ({ ...e, id: nextId++ }));
  const merged = [...state.log, ...withIds];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}

export type GameEvent =
  | { kind: 'SetTheme'; theme: 'parchment' | 'moonlit' }
  | { kind: 'SetTextSize'; size: 'small' | 'medium' | 'large' }
  | { kind: 'ToggleAutoSave' }
  | { kind: 'StartNewGame'; name: string; classId: ClassId }
  | { kind: 'EnterLocation'; locationId: LocationId; preserveLog?: boolean }
  | { kind: 'TriggerEncounter'; encounterId: EncounterId }
  | { kind: 'AttackTarget' }
  | { kind: 'UseItem'; itemId: ItemId }
  | { kind: 'Flee' }
  | { kind: 'UseSkill'; skillId: SkillId }
  | { kind: 'EquipItem'; itemId: ItemId }
  | { kind: 'UnequipSlot'; slot: EquipSlot }
  | { kind: 'DropItem'; itemId: ItemId }
  | { kind: 'ChooseNarrativeOption'; choiceIndex: number }
  | { kind: 'Rest'; spotId: string };


export function reduce(state: GameState, event: GameEvent): GameState {
  let next = reduceInner(state, event);
  next = checkBeats(next);
  next = checkQuests(next);
  // Handle any pending encounter trigger that beats may have queued.
  next = drainPendingEncounter(next);
  // Handle any pending location entry that resolvers may have queued.
  next = drainPendingLocation(next);
  return next;
}

function drainPendingEncounter(state: GameState): GameState {
  const pending = state.world.flags['__pending_encounter'];
  if (typeof pending !== 'string') return state;
  // Clear the flag first to prevent infinite loops if the encounter trigger fires again.
  const cleared = { ...state.world.flags };
  delete (cleared as Record<string, unknown>)['__pending_encounter'];
  let s: GameState = { ...state, world: { ...state.world, flags: cleared } };
  // Dispatch the encounter via reduceInner (NOT reduce — avoids infinite recursion).
  s = reduceInner(s, { kind: 'TriggerEncounter', encounterId: pending as EncounterId });
  // Re-check beats and quests in case the encounter starting unlocked anything.
  s = checkBeats(s);
  s = checkQuests(s);
  return s;
}

function drainPendingLocation(state: GameState): GameState {
  const pending = state.world.flags['__pending_enter_location'];
  if (typeof pending !== 'string') return state;
  const cleared = { ...state.world.flags };
  delete (cleared as Record<string, unknown>)['__pending_enter_location'];
  let s: GameState = { ...state, world: { ...state.world, flags: cleared } };
  s = reduceInner(s, { kind: 'EnterLocation', locationId: pending as LocationId });
  s = checkBeats(s);
  s = checkQuests(s);
  return s;
}

function reduceInner(state: GameState, event: GameEvent): GameState {
  switch (event.kind) {
    case 'SetTheme': {
      const next = { ...state, settings: { ...state.settings, theme: event.theme } };
      if (event.theme === 'moonlit') {
        return {
          ...next,
          world: {
            ...next.world,
            flags: { ...next.world.flags, 'achievements.theme_moonlit': true }
          }
        };
      }
      return next;
    }
    case 'SetTextSize':
      return { ...state, settings: { ...state.settings, textSize: event.size } };
    case 'ToggleAutoSave':
      return { ...state, settings: { ...state.settings, autoSave: !state.settings.autoSave } };

    case 'StartNewGame': {
      const cls = content.classes[event.classId];
      if (!cls) return state;
      const hpMax = cls.baseHp + cls.startingStats.brawn * 3;
      const mpMax = cls.baseMp + cls.startingStats.brains * 2;
      const inventory = cls.startingItems.map((s) => ({ itemId: s.itemId, qty: s.qty ?? 1 }));
      const equipment: GameState['character']['equipment'] = {};
      for (const startItem of cls.startingItems) {
        if (!startItem.equipped) continue;
        const item = content.items[startItem.itemId];
        if (item?.slot) equipment[item.slot] = startItem.itemId;
      }
      const populated: GameState = {
        ...state,
        character: {
          name: event.name,
          classId: event.classId,
          level: 1,
          xp: 0,
          hp: { current: hpMax, max: hpMax },
          mp: { current: mpMax, max: mpMax },
          stats: { ...cls.startingStats },
          equipment,
          inventory,
          knownSkills: [],
          currency: 0,
          statuses: []
        },
        world: {
          currentLocation: state.world.currentLocation,
          visited: [],
          flags: { [`class.${event.classId}`]: true }
        },
        story: {
          stage: 'chapter_1',
          currentBeat: null,
          completedBeats: [],
          activeQuests: [],
          completedQuests: [],
          completedObjectives: {},
          questLogActivityCount: 0,
          questLogActivityAtLastOpen: 0
        },
        combat: null,
        log: []
      };
      // Recurse into EnterLocation for the description. preserveLog prevents the
      // log from being cleared on first entry.
      const afterEnter = reduceInner(populated, { kind: 'EnterLocation', locationId: cls.openingLocationId, preserveLog: true });
      // Queue the class's opener narrative encounter if one is registered; the
      // outer reduce()'s drainPendingEncounter will pick it up.
      if (cls.openingEncounterId && content.encounters[cls.openingEncounterId]) {
        return {
          ...afterEnter,
          world: {
            ...afterEnter.world,
            flags: { ...afterEnter.world.flags, __pending_encounter: cls.openingEncounterId }
          }
        };
      }
      return afterEnter;
    }

    case 'EnterLocation': {
      const loc = content.locations[event.locationId];
      if (!loc) return state;
      const isReentry = state.world.visited.includes(event.locationId);

      // Re-entry text picks uniformly from [reEntryDescription, ...ambientLines]
      // via the seeded RNG, so each return to a location has a chance of fresh
      // texture without losing the canonical re-entry line.
      let text: string;
      let nextRng = state.rng;
      if (isReentry) {
        const canonical = loc.reEntryDescription ?? loc.description;
        const candidates = [canonical, ...(loc.ambientLines ?? [])];
        if (candidates.length > 1) {
          const pick = rng.pick(nextRng, candidates);
          nextRng = pick.state;
          text = pick.value;
        } else {
          text = canonical;
        }
      } else {
        text = loc.description;
      }

      const visited = isReentry ? state.world.visited : [...state.world.visited, event.locationId].sort();
      // Clear log on actual location transition, unless the caller requests we preserve it.
      const isLocationChange = state.world.currentLocation !== event.locationId;
      const shouldClear = isLocationChange && !event.preserveLog;
      const worldUpdate = { ...state.world, currentLocation: event.locationId, visited };
      const baseState = shouldClear
        ? { ...state, log: [], world: worldUpdate, rng: nextRng }
        : { ...state, world: worldUpdate, rng: nextRng };
      let result = appendLogs(baseState, [{ kind: 'narration', text }]);
      // Re-trigger the_call if the player walked away mid-Refusal and is back.
      // The Hermit is patient; the encounter waits for an Accept (or further refusals).
      if (event.locationId === 'dusty_crossroads'
          && result.world.flags['started_call_encounter']
          && !result.world.flags['accepted_call']
          && !result.combat) {
        result = {
          ...result,
          world: { ...result.world, flags: { ...result.world.flags, __pending_encounter: 'the_call' } }
        };
      }
      // Old Road auto-arrive: queue a mandatory combat while the road is uncleared;
      // 30% voluntary combat chance after.
      if (event.locationId === 'the_old_road' && !result.combat) {
        const wins = (result.world.flags['old_road_wins'] as number | undefined) ?? 0;
        const cleared = Boolean(result.world.flags['old_road_cleared']);
        let shouldFight = false;
        let useMandatory = false;
        if (!cleared && wins < 3) {
          shouldFight = true;
          useMandatory = true;
        } else {
          // Voluntary combat: 30% chance via seeded rng.
          const roll = rng.d100(result.rng);
          result = { ...result, rng: roll.state };
          shouldFight = roll.value <= 30;
          useMandatory = false;
        }
        if (shouldFight) {
          // 50/50 pick between Footnote and Convenience.
          const pickRoll = rng.d100(result.rng);
          result = { ...result, rng: pickRoll.state };
          const pickFootnote = pickRoll.value <= 50;
          const encounterId = useMandatory
            ? (pickFootnote ? 'combat_wayfaring_footnote_mandatory' : 'combat_plot_convenience_mandatory')
            : (pickFootnote ? 'combat_wayfaring_footnote' : 'combat_plot_convenience');
          result = {
            ...result,
            world: { ...result.world, flags: { ...result.world.flags, __pending_encounter: encounterId } }
          };
        }
      }
      // Mentor location auto-arrive: queue the appropriate encounter for the player's class
      // and history (first visit, post-acceptance, or return-after-refusal).
      const mentorMeta = MENTOR_LOCATION_TO_CLASS[event.locationId];
      if (mentorMeta && !result.combat && result.character.classId === mentorMeta.cls) {
        const mentorClass = content.classes[mentorMeta.cls as ClassId];
        const hasLearned = mentorClass ? result.character.knownSkills.includes(mentorClass.signatureMove) : false;
        const hasRefused = Boolean(result.world.flags[`refused_mentor_${mentorMeta.key}`]);
        let encounterId: string;
        if (hasLearned) {
          encounterId = `mentor_${mentorMeta.key}_post_acceptance`;
        } else if (hasRefused) {
          encounterId = `mentor_${mentorMeta.key}_return_unlearned`;
        } else {
          encounterId = `mentor_${mentorMeta.key}_first_visit`;
        }
        result = {
          ...result,
          world: { ...result.world, flags: { ...result.world.flags, __pending_encounter: encounterId } }
        };
      }
      return result;
    }

    case 'TriggerEncounter': {
      const enc = content.encounters[event.encounterId];
      if (!enc) return state;
      if (enc.kind === 'narrative') return startNarrativeEncounter(state, enc);
      return startCombat(state, enc);
    }

    case 'AttackTarget': {
      let s = playerAttack(state);
      // Resolve combat outcome.
      const monster = s.combat?.kind === 'turn-based' ? s.combat.combatants.find((c) => c.kind === 'monster') : undefined;
      if (monster && monster.hp <= 0) {
        const enc = content.encounters[s.combat!.encounterId];
        return enc?.kind === 'combat' ? endCombat(s, 'victory', enc) : { ...s, combat: null };
      }
      // Otherwise, monster turn.
      if (s.combat) {
        s = monsterTurn(s);
        if (s.character.hp.current <= 0) {
          const enc = content.encounters[s.combat!.encounterId];
          return enc?.kind === 'combat' ? endCombat(s, 'defeat', enc) : { ...s, combat: null };
        }
      }
      return s;
    }

    case 'UseItem': {
      let s = state.combat ? playerUseItem(state, event.itemId) : useItemOutOfCombat(state, event.itemId);
      if (state.combat && s.combat) {
        s = monsterTurn(s);
        if (s.character.hp.current <= 0) {
          const enc = content.encounters[s.combat!.encounterId];
          return enc?.kind === 'combat' ? endCombat(s, 'defeat', enc) : { ...s, combat: null };
        }
      }
      return s;
    }

    case 'Flee': {
      let s = playerFlee(state);
      if (state.combat && s.combat) {
        // Failed flee — monster gets a turn.
        s = monsterTurn(s);
        if (s.character.hp.current <= 0) {
          const enc = content.encounters[s.combat!.encounterId];
          return enc?.kind === 'combat' ? endCombat(s, 'defeat', enc) : { ...s, combat: null };
        }
      }
      return s;
    }

    case 'UseSkill': {
      if (!state.combat || state.combat.kind !== 'turn-based') return state;
      const skill = content.skills[event.skillId];
      if (!skill) return state;
      if (!state.character.knownSkills.includes(event.skillId)) return state;
      if (state.character.mp.current < skill.mpCost) return state;

      // Deduct MP.
      let s: GameState = {
        ...state,
        character: {
          ...state.character,
          mp: { ...state.character.mp, current: state.character.mp.current - skill.mpCost }
        }
      };

      // Run resolver.
      const resolver = skillResolvers[skill.resolverId];
      if (!resolver) {
        return appendLogs(s, [{ kind: 'system', systemLabel: 'ERROR', text: `Unknown skill resolver ${skill.resolverId}.` }]);
      }
      s = resolver(s);

      // Check for monster KO from the skill.
      if (s.combat?.kind === 'turn-based') {
        const monster = s.combat.combatants.find((c) => c.kind === 'monster');
        if (monster && monster.hp <= 0) {
          const enc = content.encounters[s.combat.encounterId];
          return enc?.kind === 'combat' ? endCombat(s, 'victory', enc) : { ...s, combat: null };
        }
        // Monster turn (unless the skill ended combat directly).
        s = monsterTurn(s);
        if (s.character.hp.current <= 0) {
          const enc = content.encounters[s.combat!.encounterId];
          return enc?.kind === 'combat' ? endCombat(s, 'defeat', enc) : { ...s, combat: null };
        }
      }
      return s;
    }

    case 'EquipItem': {
      const item = content.items[event.itemId];
      if (!item || !item.slot) return state;
      // Item must be in inventory.
      if (!state.character.inventory.some((e) => e.itemId === event.itemId)) return state;
      return {
        ...state,
        character: { ...state.character, equipment: { ...state.character.equipment, [item.slot]: event.itemId } }
      };
    }

    case 'UnequipSlot': {
      const next = { ...state.character.equipment };
      delete next[event.slot];
      return { ...state, character: { ...state.character, equipment: next } };
    }

    case 'DropItem': {
      const inv = state.character.inventory
        .map((e) => (e.itemId === event.itemId ? { ...e, qty: e.qty - 1 } : e))
        .filter((e) => e.qty > 0);
      const equipment = { ...state.character.equipment };
      // If the dropped item was equipped and qty hit 0, unequip.
      for (const slot of ['weapon', 'armor', 'trinket'] as const) {
        if (equipment[slot] === event.itemId && !inv.some((e) => e.itemId === event.itemId)) {
          delete equipment[slot];
        }
      }
      return { ...state, character: { ...state.character, inventory: inv, equipment } };
    }

    case 'ChooseNarrativeOption':
      return chooseNarrativeOption(state, event.choiceIndex);

    case 'Rest': {
      const loc = content.locations[state.world.currentLocation];
      const spot = loc?.restSpots?.find((s) => s.id === event.spotId);
      if (!spot) return state;
      const restored: GameState = {
        ...state,
        character: {
          ...state.character,
          hp: { ...state.character.hp, current: state.character.hp.max },
          mp: { ...state.character.mp, current: state.character.mp.max }
        }
      };
      return appendLogs(restored, [{ kind: 'narration', text: spot.flavor }]);
    }
  }
}

function useItemOutOfCombat(state: GameState, itemId: ItemId): GameState {
  const item = content.items[itemId];
  if (!item || item.kind !== 'consumable') return state;
  let s = state;
  for (const effect of item.effects ?? []) {
    if (effect.kind === 'heal_hp') {
      const newHp = Math.min(s.character.hp.max, s.character.hp.current + effect.amount);
      s = { ...s, character: { ...s.character, hp: { ...s.character.hp, current: newHp } } };
      s = appendLogs(s, [{ kind: 'system', text: `You eat ${item.name}. (+${effect.amount} HP)`, systemLabel: 'ITEM' }]);
    }
  }
  // Decrement
  const inv = s.character.inventory
    .map((e) => (e.itemId === itemId ? { ...e, qty: e.qty - 1 } : e))
    .filter((e) => e.qty > 0);
  return { ...s, character: { ...s.character, inventory: inv } };
}
