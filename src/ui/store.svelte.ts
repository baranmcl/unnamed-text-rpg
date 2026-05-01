import { reduce, type GameEvent } from '../engine/events';
import { createInitialState } from '../engine/state';
import { serialize, deserialize, SaveLoadError } from '../engine/save';
import { applyTheme, loadStoredTheme, storeTheme, applyTextSize } from './theme';
import {
  loadAchievements, saveAchievements, clearAchievements, checkAchievements,
  type AchievementsRecord
} from '../engine/achievements';
import { content } from '../content';
import { MAX_LOG_ENTRIES, type GameState, type Achievement } from '../engine/types';

export const SAVE_KEY = 'heroicchronicle.save.v1';
const AUTOSAVE_DEBOUNCE_MS = 500;

function loadOrCreate(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return deserialize(raw);
  } catch (e) {
    if (e instanceof SaveLoadError) {
      console.warn('Failed to load save:', e.message);
    }
  }
  return createInitialState(Date.now());
}

function persist(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    /* quota exceeded / private mode */
  }
}

function dedupedAppend<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr : [...arr, v];
}

class GameStore {
  // $state.raw because GameState is replaced wholesale by the reducer; we
  // never deep-mutate it. Raw avoids Proxy overhead.
  state = $state.raw<GameState>(loadOrCreate());
  achievements = $state.raw<AchievementsRecord>(loadAchievements());
  pendingToasts = $state<Achievement[]>([]);

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Theme is persisted independently of save data so it survives reset.
    const stored = loadStoredTheme();
    if (stored && stored !== this.state.settings.theme) {
      this.state = reduce(this.state, { kind: 'SetTheme', theme: stored });
    }
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
  }

  dispatch(event: GameEvent): void {
    let next = reduce(this.state, event);
    let record = this.achievements;

    // 1. StartNewGame side-effect: track played class.
    if (event.kind === 'StartNewGame') {
      record = { ...record, played_classes: dedupedAppend(record.played_classes, event.classId) };
    }

    // 2. Drain transient backfire flag.
    const backfire = next.world.flags['__just_tempted_backfire'];
    if (typeof backfire === 'string') {
      record = {
        ...record,
        tempt_fate_backfires_seen: dedupedAppend(record.tempt_fate_backfires_seen, backfire)
      };
      const cleared = { ...next.world.flags };
      delete (cleared as Record<string, unknown>)['__just_tempted_backfire'];
      next = { ...next, world: { ...next.world, flags: cleared } };
    }

    // 3. Run the achievement check.
    const result = checkAchievements(next, record);
    record = result.record;

    // 4. For each newly-unlocked: log entry + toast queue.
    if (result.newlyUnlocked.length > 0) {
      const toAdd: Achievement[] = [];
      for (const id of result.newlyUnlocked) {
        const ach = content.achievements[id];
        if (!ach) continue;
        toAdd.push(ach);
        const lastId = next.log.length === 0 ? 0 : next.log[next.log.length - 1]!.id;
        next = {
          ...next,
          log: [
            ...next.log,
            {
              id: lastId + 1,
              kind: 'system',
              systemLabel: 'ACHIEVEMENT',
              text: `✦ ${ach.name} — ${ach.description}`
            }
          ]
        };
      }
      // Apply the same MAX_LOG_ENTRIES cap that engine appenders use.
      if (next.log.length > MAX_LOG_ENTRIES) {
        next = { ...next, log: next.log.slice(-MAX_LOG_ENTRIES) };
      }
      this.pendingToasts = [...this.pendingToasts, ...toAdd];
    }

    // 5. Persist achievements record.
    saveAchievements(record);

    // 6. Commit.
    this.state = next;
    this.achievements = record;

    // Theme/text-size CSS side-effects (unchanged).
    if (event.kind === 'SetTheme') {
      applyTheme(event.theme);
      storeTheme(event.theme);
    }
    if (event.kind === 'SetTextSize') {
      applyTextSize(event.size);
    }

    if (this.state.settings.autoSave) {
      this.scheduleAutosave();
    }
  }

  private scheduleAutosave(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      persist(this.state);
      this.autosaveTimer = null;
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  saveNow(): void {
    persist(this.state);
  }

  resetSave(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    this.state = createInitialState(Date.now());
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
    // Achievements record is intentionally untouched here — Consign leaves it alone.
  }

  forgetAchievements(): void {
    clearAchievements();
    this.achievements = loadAchievements();
    this.pendingToasts = [];
  }

  markAchievementsOpened(): void {
    const next: AchievementsRecord = {
      ...this.achievements,
      unlockedCountAtLastOpen: this.achievements.unlocked.length
    };
    saveAchievements(next);
    this.achievements = next;
  }

  dismissToast(ach: Achievement): void {
    this.pendingToasts = this.pendingToasts.filter((a) => a.id !== ach.id);
  }
}

export const gameStore = new GameStore();
