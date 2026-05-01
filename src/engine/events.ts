import type { GameState, ClassId, ItemId, LocationId, EncounterId, EquipSlot, LogEntry, SkillId } from './types';
import { MAX_LOG_ENTRIES } from './types';
import { content } from '../content';
import { startCombat, playerAttack, playerFlee, playerUseItem, monsterTurn, endCombat } from './combat';
import { skillResolvers } from '../content/skills/resolvers';
import { checkBeats } from './story';
import { startNarrativeEncounter, chooseNarrativeOption } from './narrative';
import { rng } from './rng';

// MAX_LOG_ENTRIES is imported from ./types — do not redefine locally.

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

type OpeningLine = { kind: GameState['log'][number]['kind']; text: string; speaker?: string; systemLabel?: string };

const ACT_LINE: OpeningLine = { kind: 'system', systemLabel: 'ACT', text: 'The Call to Adventure begins, more or less on schedule.' };

const CLASS_OPENING_LINES: Record<string, OpeningLine[]> = {
  reluctant_farmboy: [
    { kind: 'narration', text: 'You wake on a Tuesday, which is, statistically, when most prophecies arrive.' },
    { kind: 'narration', text: 'The cow regards you with the unfocused malice of a creature who has, against all odds, become aware of fate.' },
    ACT_LINE
  ],
  disgraced_knight: [
    { kind: 'narration', text: 'You wake at the wrong hour, which is, statistically, when most dismissals are pinned to boards.' },
    { kind: 'narration', text: 'The pell regards you with the unfocused disapproval of a post that has, against all odds, become aware of your specific failures.' },
    ACT_LINE
  ],
  accidental_wizard: [
    { kind: 'narration', text: 'You wake to a polite haze of smoke, which is, statistically, when most cantrips of warding go subtly wrong.' },
    { kind: 'narration', text: 'The tome regards you with the unfocused indignation of a book that has, against all odds, become aware of fire.' },
    ACT_LINE
  ],
  bard: [
    { kind: 'narration', text: 'You wake five minutes before curtain, which is, statistically, when most prophecies arrive.' },
    { kind: 'narration', text: 'The audience regards you, audibly, with the unfocused malice of a crowd that has, against all odds, become aware of vowels.' },
    ACT_LINE
  ]
};

export function reduce(state: GameState, event: GameEvent): GameState {
  let next = reduceInner(state, event);
  next = checkBeats(next);
  // Handle any pending encounter trigger that beats may have queued.
  next = drainPendingEncounter(next);
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
  // Re-check beats in case the encounter starting unlocked other beats.
  s = checkBeats(s);
  // (Don't re-drain — the encounter just started; another pending shouldn't queue from a single trigger.)
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
          flags: {}
        },
        story: {
          stage: 'act_i',
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
      const openingLines = CLASS_OPENING_LINES[event.classId] ?? CLASS_OPENING_LINES['reluctant_farmboy']!;
      const withOpening = appendLogs(populated, openingLines);
      // Recurse into EnterLocation for the description. preserveLog prevents the
      // new-game opening lines from being cleared on first entry.
      return reduceInner(withOpening, { kind: 'EnterLocation', locationId: cls.openingLocationId, preserveLog: true });
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
      return appendLogs(baseState, [{ kind: 'narration', text }]);
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
