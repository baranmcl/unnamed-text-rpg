import type { GameState, LogEntry } from './types';
import { MAX_LOG_ENTRIES } from './types';

// Append entries to the log, deriving sequential ids from the existing log tail.
// This id-generation pattern MUST stay in sync with combat.ts's pushLog so the two
// log-writers never produce a colliding id.
export function appendLogs(state: GameState, entries: Omit<LogEntry, 'id'>[]): GameState {
  let nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const withIds: LogEntry[] = entries.map((e) => ({ ...e, id: nextId++ }));
  const merged = [...state.log, ...withIds];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}
