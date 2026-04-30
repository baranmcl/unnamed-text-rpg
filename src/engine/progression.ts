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
  ['reluctant_farmboy' as ClassId]: ['bluck', 'brains', 'bluck', 'brawn', 'bluck', 'bravado', 'bluck', 'brains', 'bluck'],
  // Other classes (Knight, Wizard, Bard) added in their respective content tasks.
  ['disgraced_knight' as ClassId]: ['brawn', 'bravado', 'brawn', 'brains', 'brawn', 'bluck', 'brawn', 'bravado', 'brawn'],
};

function appendLog(state: GameState, entry: Omit<LogEntry, 'id'>): GameState {
  const id = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const merged = [...state.log, { id, ...entry }];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}

export function applyLevelUp(state: GameState): GameState {
  const cls = content.classes[state.character.classId];
  const newLevel = state.character.level + 1;
  const newHpMax = state.character.hp.max + Math.floor(state.character.stats.brawn * 1.5);
  const newMpMax = state.character.mp.max + state.character.stats.brains;

  // Stat rotation lookup (cycles if exhausted).
  const rotation = STAT_ROTATIONS[state.character.classId] ?? [];
  const newStats = { ...state.character.stats };
  if (rotation.length > 0) {
    const stat = rotation[(newLevel - 2) % rotation.length]!;
    newStats[stat] = newStats[stat] + 1;
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

  // Skill unlock check.
  if (cls) {
    const skill = content.skills[cls.signatureMove];
    if (skill && skill.unlockLevel === newLevel && !s.character.knownSkills.includes(cls.signatureMove)) {
      s = {
        ...s,
        character: { ...s.character, knownSkills: [...s.character.knownSkills, cls.signatureMove] }
      };
      s = appendLog(s, {
        kind: 'system',
        systemLabel: 'SKILL',
        text: `You learn **${skill.name}**. (Level ${newLevel} signature move.)`
      });
    }
  }

  s = appendLog(s, {
    kind: 'system',
    systemLabel: 'LEVEL',
    text: `You attain the ${ordinal(newLevel)} Degree of Heroism. (Healed to full.)`
  });

  return s;
}
