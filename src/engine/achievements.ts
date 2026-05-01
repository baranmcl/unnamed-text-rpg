import { content } from '../content';
import { evalPredicate } from './story';
import type { AchievementId, GameState } from './types';

const STORAGE_KEY = 'heroicchronicle.achievements.v1';

export type AchievementsRecord = {
  unlocked: AchievementId[];
  played_classes: string[];
  tempt_fate_backfires_seen: string[];
  unlockedCountAtLastOpen: number;
};

export function defaultRecord(): AchievementsRecord {
  return {
    unlocked: [],
    played_classes: [],
    tempt_fate_backfires_seen: [],
    unlockedCountAtLastOpen: 0
  };
}

function isValidShape(v: unknown): v is AchievementsRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    Array.isArray(r['unlocked']) &&
    Array.isArray(r['played_classes']) &&
    Array.isArray(r['tempt_fate_backfires_seen']) &&
    typeof r['unlockedCountAtLastOpen'] === 'number'
  );
}

export function loadAchievements(): AchievementsRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRecord();
    const parsed = JSON.parse(raw);
    if (!isValidShape(parsed)) return defaultRecord();
    return parsed;
  } catch {
    return defaultRecord();
  }
}

export function saveAchievements(record: AchievementsRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* quota exceeded / private mode — ignore */
  }
}

export function clearAchievements(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isUnlocked(record: AchievementsRecord, id: AchievementId): boolean {
  return record.unlocked.includes(id);
}

export function checkAchievements(
  state: GameState,
  record: AchievementsRecord
): { record: AchievementsRecord; newlyUnlocked: AchievementId[] } {
  // Synthesize account-level counters as virtual flags so the existing
  // predicate evaluator can reach them via flag_at_least.
  const virtualState: GameState = {
    ...state,
    world: {
      ...state.world,
      flags: {
        ...state.world.flags,
        '__account.played_classes.count': record.played_classes.length,
        '__account.backfires_seen.count': record.tempt_fate_backfires_seen.length
      }
    }
  };

  const newlyUnlocked: AchievementId[] = [];
  const already = new Set(record.unlocked);

  for (const ach of Object.values(content.achievements)) {
    if (already.has(ach.id)) continue;
    const allMet = ach.preconditions.every((p) => evalPredicate(virtualState, p));
    if (allMet) newlyUnlocked.push(ach.id);
  }

  if (newlyUnlocked.length === 0) return { record, newlyUnlocked: [] };

  const nextRecord: AchievementsRecord = {
    ...record,
    unlocked: [...record.unlocked, ...newlyUnlocked]
  };
  return { record: nextRecord, newlyUnlocked };
}
