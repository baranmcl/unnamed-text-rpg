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

// checkAchievements is added in Task 3.
export function checkAchievements(
  _state: GameState,
  record: AchievementsRecord
): { record: AchievementsRecord; newlyUnlocked: AchievementId[] } {
  return { record, newlyUnlocked: [] };
}
