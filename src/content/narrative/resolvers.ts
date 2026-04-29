import type {
  GameState, LogEntry,
  NarrativeResolver, NarrativeResolverId
} from '../../engine/types';
import { MAX_LOG_ENTRIES, NarrativeNodeId } from '../../engine/types';

function appendLogs(state: GameState, entries: Omit<LogEntry, 'id'>[]): GameState {
  let nextId = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const withIds: LogEntry[] = entries.map((e) => ({ ...e, id: nextId++ }));
  const merged = [...state.log, ...withIds];
  return {
    ...state,
    log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged
  };
}

const ROOT = NarrativeNodeId('call_root');

const call_accept: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'narration', text: 'You accept. The hermit nods, satisfied. Somewhere far off, a destiny adjusts its tie.' },
    { kind: 'system', systemLabel: 'STAGE', text: 'Act II — Tests, Allies, and Enemies begins.' }
  ]);
  return {
    state: {
      ...s,
      story: { ...s.story, stage: 'act_ii' },
      world: { ...s.world, flags: { ...s.world.flags, accepted_call: true } }
    },
    next: null
  };
};

const call_refuse: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    {
      kind: 'system',
      systemLabel: 'NARRATOR',
      text: '(The narrator sighs heavily, retrieves the manuscript, smooths it, and we try this again.)'
    }
  ]);
  return { state: s, next: ROOT };
};

const call_insult: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'That is not, strictly speaking, in the script.' }
  ]);
  return { state: s, next: ROOT };
};

const call_cry: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'There, there.' }
  ]);
  return { state: s, next: ROOT };
};

export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  call_accept,
  call_refuse,
  call_insult,
  call_cry
};
