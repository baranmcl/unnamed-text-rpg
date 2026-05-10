import { content } from '../content';
import type {
  BeatEffect, GameState, LogEntry,
  Predicate, StoryBeat
} from './types';
import { MAX_LOG_ENTRIES } from './types';
import { applyLevelUp } from './progression';

// =====================================================================
// Predicate evaluation
// =====================================================================

export function evalPredicate(state: GameState, p: Predicate): boolean {
  switch (p.kind) {
    case 'flag': {
      const v = state.world.flags[p.flag];
      if (p.equals !== undefined) return v === p.equals;
      return Boolean(v);
    }
    case 'visited':
      return state.world.visited.includes(p.locationId);
    case 'beat_completed':
      return state.story.completedBeats.includes(p.beatId);
    case 'stage':
      return state.story.stage === p.stage;
    case 'flag_at_least': {
      const v = state.world.flags[p.flag];
      return typeof v === 'number' && v >= p.min;
    }
    case 'level_at_least':
      return state.character.level >= p.level;
    case 'currency_at_least':
      return state.character.currency >= p.n;
    case 'any_flag':
      return p.flags.some((f) => Boolean(state.world.flags[f]));
    case 'flag_unset': {
      const v = state.world.flags[p.flag];
      return !v;
    }
  }
}

// =====================================================================
// Effect application
// =====================================================================

function appendLog(state: GameState, entry: Omit<LogEntry, 'id'>): GameState {
  const nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const merged = [...state.log, { ...entry, id: nextId }];
  return {
    ...state,
    log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged
  };
}

export function applyEffect(state: GameState, effect: BeatEffect): GameState {
  switch (effect.kind) {
    case 'set_flag':
      return { ...state, world: { ...state.world, flags: { ...state.world.flags, [effect.flag]: effect.value } } };
    case 'grant_item': {
      const qty = effect.qty ?? 1;
      const existing = state.character.inventory.find((e) => e.itemId === effect.itemId);
      const inv = existing
        ? state.character.inventory.map((e) => e.itemId === effect.itemId ? { ...e, qty: e.qty + qty } : e)
        : [...state.character.inventory, { itemId: effect.itemId, qty }];
      return { ...state, character: { ...state.character, inventory: inv } };
    }
    case 'advance_stage': {
      const advanced = { ...state, story: { ...state.story, stage: effect.stage } };
      const withMilestoneLog = appendLog(advanced, {
        kind: 'system',
        systemLabel: 'CHAPTER',
        text: 'You feel the chapter turn beneath your feet.'
      });
      return applyLevelUp(withMilestoneLog);
    }
    case 'log':
      return appendLog(state, effect.entry);
    case 'trigger_encounter':
      // Plan 3 simplification: a beat that wants to start an encounter
      // sets a __pending_encounter flag. The events.ts reducer wrapper
      // detects this flag after checkBeats runs and dispatches the trigger.
      // This avoids a circular import between story.ts and narrative.ts/combat.ts.
      return {
        ...state,
        world: {
          ...state.world,
          flags: { ...state.world.flags, __pending_encounter: effect.encounterId }
        }
      };
  }
}

// =====================================================================
// Beat checking
// =====================================================================

export function checkBeats(state: GameState): GameState {
  let s = state;
  let fired = true;
  let iters = 0;
  while (fired && iters < 8) {
    fired = false;
    iters++;
    for (const beat of Object.values(content.beats) as StoryBeat[]) {
      if (s.story.completedBeats.includes(beat.id)) continue;
      const allMet = beat.preconditions.every((p) => evalPredicate(s, p));
      if (!allMet) continue;
      for (const effect of beat.onTrigger) {
        s = applyEffect(s, effect);
      }
      s = {
        ...s,
        story: {
          ...s.story,
          completedBeats: [...s.story.completedBeats, beat.id],
          currentBeat: beat.id
        }
      };
      fired = true;
    }
  }
  return s;
}
