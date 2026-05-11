import type { ClassId, GameState, LogEntry, StatBlock } from './types';
import { MAX_LOG_ENTRIES } from './types';
import { content } from '../content';

const ORDINAL = ['Untested', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

function ordinal(n: number): string {
  return ORDINAL[Math.min(n, ORDINAL.length - 1)] ?? `${n}th`;
}

// Per-class stat-bump rotation. Index 0 = bump applied at level 2; index 1 = level 3; etc.
// Cycles via modulo if the array is exhausted.
export const STAT_ROTATIONS: Record<ClassId, (keyof StatBlock)[]> = {
  ['reluctant_farmhand' as ClassId]: ['bluck', 'brains', 'bluck', 'brawn', 'bluck', 'bravado', 'bluck', 'brains', 'bluck'],
  // Other classes (Knight, Wizard, Bard) added in their respective content tasks.
  ['disgraced_knight' as ClassId]: ['brawn', 'bravado', 'brawn', 'brains', 'brawn', 'bluck', 'brawn', 'bravado', 'brawn'],
  ['accidental_wizard' as ClassId]: ['brains', 'bluck', 'brains', 'bravado', 'brains', 'brawn', 'brains', 'bluck', 'brains'],
  ['bard' as ClassId]: ['bravado', 'bluck', 'bravado', 'brains', 'bravado', 'brawn', 'bravado', 'bluck', 'bravado'],
};

function appendLog(state: GameState, entry: Omit<LogEntry, 'id'>): GameState {
  const id = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const merged = [...state.log, { id, ...entry }];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}

const STAT_DISPLAY: Record<keyof StatBlock, string> = {
  brawn: 'Brawn',
  brains: 'Brains',
  bravado: 'Bravado',
  bluck: '(B)Luck'
};

export function applyLevelUp(state: GameState): GameState {
  const cls = content.classes[state.character.classId];
  const newLevel = state.character.level + 1;
  const hpDelta = Math.floor(state.character.stats.brawn * 1.5);
  const mpDelta = state.character.stats.brains;
  const newHpMax = state.character.hp.max + hpDelta;
  const newMpMax = state.character.mp.max + mpDelta;
  const hpLabel = cls?.hpLabel ?? 'HP';
  const mpLabel = cls?.mpLabel ?? 'MP';

  // Stat rotation lookup (cycles if exhausted).
  const rotation = STAT_ROTATIONS[state.character.classId] ?? [];
  const newStats = { ...state.character.stats };
  let bumpedStat: keyof StatBlock | null = null;
  if (rotation.length > 0) {
    const stat = rotation[(newLevel - 2) % rotation.length]!;
    newStats[stat] = newStats[stat] + 1;
    bumpedStat = stat;
  }

  let s: GameState = {
    ...state,
    character: {
      ...state.character,
      level: newLevel,
      stats: newStats,
      hp: { current: newHpMax, max: newHpMax },
      mp: { current: newMpMax, max: newMpMax }
    }
  };

  const gains: string[] = [];
  if (bumpedStat) gains.push(`**+1 ${STAT_DISPLAY[bumpedStat]}**`);
  if (hpDelta > 0) gains.push(`**+${hpDelta} max ${hpLabel}**`);
  if (mpDelta > 0) gains.push(`**+${mpDelta} max ${mpLabel}**`);
  const gainsText = gains.length > 0 ? ` ${gains.join('. ')}.` : '';

  s = appendLog(s, {
    kind: 'system',
    systemLabel: 'LEVEL',
    text: `You attain the ${ordinal(newLevel)} Degree of Heroism.${gainsText} (Healed to full.)`
  });

  return s;
}

export function awardXp(state: GameState, amount: number): GameState {
  let s: GameState = amount > 0
    ? { ...state, character: { ...state.character, xp: state.character.xp + amount } }
    : state;
  const xpThreshold = (level: number) => level * 100;
  while (s.character.xp >= xpThreshold(s.character.level)) {
    s = { ...s, character: { ...s.character, xp: s.character.xp - xpThreshold(s.character.level) } };
    s = applyLevelUp(s);
  }
  return s;
}
