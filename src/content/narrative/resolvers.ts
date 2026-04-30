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

// Refuse escalates each time the player clicks it. Tracked via a counter
// flag (`refusal_count`). After the last line, additional refusals reuse it.
const REFUSE_LINES = [
  "(Fate's greatest skill is the illusion of choice.)",
  "(I understand you're reluctant — but Fate has other plans.)",
  '(The narrator sighs heavily, retrieves the manuscript, smooths it, and we try this again.)',
  '(...the narrator says nothing this time. The crossroads grows quiet.)'
];

const call_refuse: NarrativeResolver = (state) => {
  const prev = (state.world.flags['refusal_count'] as number | undefined) ?? 0;
  const count = prev + 1;
  const lineIndex = Math.min(count - 1, REFUSE_LINES.length - 1);
  const line = REFUSE_LINES[lineIndex]!;
  const s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: line }
  ]);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, refusal_count: count }
      }
    },
    next: ROOT
  };
};

const call_insult: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'That is not, strictly speaking, in the script.' },
    { kind: 'dialogue', speaker: 'Old Hermit', text: '"...My hat is, in point of fact, a perfectly serviceable hat."' }
  ]);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, insulted_hermit_hat: true }
      }
    },
    next: ROOT
  };
};

const call_cry: NarrativeResolver = (state) => {
  const s = appendLogs(state, [
    { kind: 'system', systemLabel: 'NARRATOR', text: 'There, there.' },
    { kind: 'dialogue', speaker: 'Old Hermit', text: '"(Politely offers a slightly grimy handkerchief.)"' }
  ]);
  return {
    state: {
      ...s,
      world: {
        ...s.world,
        flags: { ...s.world.flags, cried_at_hermit: true }
      }
    },
    next: ROOT
  };
};

const open_with_pell: NarrativeResolver = (state) => {
  const next = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, __pending_encounter: 'combat_insolent_pell' }
    }
  };
  return { state: next, next: null };
};

const open_with_footnote: NarrativeResolver = (state) => {
  const next = {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, __pending_encounter: 'combat_feral_footnote' }
    }
  };
  return { state: next, next: null };
};

export const narrativeResolvers: Record<NarrativeResolverId, NarrativeResolver> = {
  call_accept,
  call_refuse,
  call_insult,
  call_cry,
  open_with_pell,
  open_with_footnote
};
