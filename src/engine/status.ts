import type { GameState, Status, StatusKind } from './types';

type StatusTarget =
  | 'character'                                  // world-scoped (state.character.statuses)
  | { kind: 'combatant'; combatantId: string };  // a specific combatant in active combat

function nextStatusId(state: GameState): number {
  // Derive id from current max across character + all combatants so ids stay unique within a state.
  let max = 0;
  for (const st of state.character.statuses) if (st.id > max) max = st.id;
  if (state.combat?.kind === 'turn-based') {
    for (const c of state.combat.combatants) for (const st of c.statuses) if (st.id > max) max = st.id;
  }
  return max + 1;
}

export function applyStatus(
  state: GameState,
  target: StatusTarget,
  status: Omit<Status, 'id'>
): GameState {
  const id = nextStatusId(state);
  const newStatus: Status = { ...status, id };

  if (target === 'character') {
    // Replace any existing status of the same kind.
    const filtered = state.character.statuses.filter((s) => s.kind !== status.kind);
    return { ...state, character: { ...state.character, statuses: [...filtered, newStatus] } };
  }

  if (state.combat?.kind !== 'turn-based') return state;
  const combat = state.combat;
  const combatants = combat.combatants.map((c) => {
    if (c.id !== target.combatantId) return c;
    const filtered = c.statuses.filter((s) => s.kind !== status.kind);
    return { ...c, statuses: [...filtered, newStatus] };
  });
  return { ...state, combat: { ...combat, combatants } };
}

export function expireStatus<T extends { statuses: Status[] }>(target: T, id: number): T {
  return { ...target, statuses: target.statuses.filter((s) => s.id !== id) };
}

export function expireStatusByKind<T extends { statuses: Status[] }>(target: T, kind: StatusKind): T {
  return { ...target, statuses: target.statuses.filter((s) => s.kind !== kind) };
}

export function hasStatus<T extends { statuses: Status[] }>(target: T, kind: StatusKind): boolean {
  return target.statuses.some((s) => s.kind === kind);
}

export function findStatus<T extends { statuses: Status[] }>(target: T, kind: StatusKind): Status | undefined {
  return target.statuses.find((s) => s.kind === kind);
}

export function tickStatuses<T extends { statuses: Status[] }>(target: T): T {
  const next: Status[] = [];
  for (const s of target.statuses) {
    if (s.duration.kind !== 'turns') {
      next.push(s);
      continue;
    }
    const remaining = s.duration.remaining - 1;
    if (remaining <= 0) continue;
    next.push({ ...s, duration: { kind: 'turns', remaining } });
  }
  return { ...target, statuses: next };
}

// Called at start of combat: copy world-scoped statuses from character onto the player combatant.
export function copyWorldStatusesToPlayer(state: GameState): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const playerStatuses = state.character.statuses.map((s) => ({ ...s }));
  const combat = state.combat;
  const combatants = combat.combatants.map((c) =>
    c.kind === 'player' ? { ...c, statuses: [...c.statuses, ...playerStatuses] } : c
  );
  return { ...state, combat: { ...combat, combatants } };
}

// Called at end of combat: drop combat-scoped statuses from player combatant, decrement
// fights_remaining on world-scoped, persist back to character.
export function persistPlayerStatusesToCharacter(state: GameState): GameState {
  if (state.combat?.kind !== 'turn-based') return state;
  const player = state.combat.combatants.find((c) => c.kind === 'player');
  if (!player) return state;

  const persisted: Status[] = [];
  for (const s of player.statuses) {
    if (s.duration.kind === 'fights_remaining') {
      const n = s.duration.n - 1;
      if (n > 0) persisted.push({ ...s, duration: { kind: 'fights_remaining', n } });
    } else if (s.duration.kind === 'permanent') {
      persisted.push(s);
    }
    // turns / until_end_of_fight / one_shot: dropped
  }
  return { ...state, character: { ...state.character, statuses: persisted } };
}
