import { content } from '../content';
import type {
  GameState, LogEntry, NarrativeEncounter, NarrativeNodeId
} from './types';
import { MAX_LOG_ENTRIES } from './types';

function appendLogs(state: GameState, entries: Omit<LogEntry, 'id'>[]): GameState {
  let nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const withIds: LogEntry[] = entries.map((e) => ({ ...e, id: nextId++ }));
  const merged = [...state.log, ...withIds];
  return {
    ...state,
    log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged
  };
}

function pushNode(state: GameState, nodeId: NarrativeNodeId): GameState {
  const node = content.narrativeNodes[nodeId];
  if (!node) return state;
  const entries: Omit<LogEntry, 'id'>[] = [];
  if (node.speaker) {
    entries.push({ kind: 'dialogue', speaker: node.speaker, text: node.prose });
  } else {
    entries.push({ kind: 'narration', text: node.prose });
  }
  return appendLogs(state, entries);
}

export function startNarrativeEncounter(state: GameState, encounter: NarrativeEncounter): GameState {
  const node = content.narrativeNodes[encounter.rootNodeId];
  if (!node) return state;
  const s: GameState = {
    ...state,
    combat: {
      kind: 'narrative',
      encounterId: encounter.id,
      currentNodeId: encounter.rootNodeId
    }
  };
  return pushNode(s, encounter.rootNodeId);
}

export function chooseNarrativeOption(state: GameState, choiceIndex: number): GameState {
  if (!state.combat || state.combat.kind !== 'narrative') return state;
  const node = content.narrativeNodes[state.combat.currentNodeId];
  if (!node) return state;
  const choice = node.choices[choiceIndex];
  if (!choice) return state;
  // Defense-in-depth: if the choice is flag-disabled, ignore the dispatch.
  if (choice.disabledIfFlag && state.world.flags[choice.disabledIfFlag]) return state;
  const resolver = content.narrativeResolvers[choice.resolve];
  if (!resolver) return state;
  const currentNodeId = state.combat.currentNodeId;
  const result = resolver(state);
  let s = result.state;
  if (result.next === null) {
    s = { ...s, combat: null };
  } else if (result.next !== currentNodeId) {
    // Move to a new node and push its prose.
    s = {
      ...s,
      combat: {
        kind: 'narrative',
        encounterId: state.combat.encounterId,
        currentNodeId: result.next
      }
    };
    s = pushNode(s, result.next);
  }
  // If result.next === currentNodeId, we self-loop:
  // - Combat state already points to currentNodeId; no update needed.
  // - Don't re-push the node's prose (avoid speaker dialogue repeating).
  // - Resolver-pushed log entries (narrator interjections, hermit reactions) remain.
  return s;
}

export function endNarrativeEncounter(state: GameState): GameState {
  if (!state.combat || state.combat.kind !== 'narrative') return state;
  return { ...state, combat: null };
}
