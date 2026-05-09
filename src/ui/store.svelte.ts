import { reduce, type GameEvent } from '../engine/events';
import { createInitialState } from '../engine/state';
import { migrateParsedState, SaveLoadError } from '../engine/save';
import { applyTheme, loadStoredTheme, storeTheme, applyTextSize } from './theme';
import {
  loadAchievements, saveAchievements, clearAchievements, checkAchievements,
  type AchievementsRecord
} from '../engine/achievements';
import { content } from '../content';
import { MAX_LOG_ENTRIES, type GameState, type Achievement } from '../engine/types';
import {
  addAutoCheckpoint, addManualBookmark, deleteBookmarkById, findBookmark,
  MAX_SLOTS, type Bookmark, type SlotData
} from '../engine/slots';

// Keys.
const LEGACY_SAVE_KEY = 'heroicchronicle.save.v1';
const ACTIVE_SLOT_KEY = 'heroicchronicle.slots.active.v1';
function slotKey(i: number): string {
  return `heroicchronicle.slot.${i}.v1`;
}

const AUTOSAVE_DEBOUNCE_MS = 500;

function dedupedAppend<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr : [...arr, v];
}

function readSlot(i: number): SlotData | null {
  try {
    const raw = localStorage.getItem(slotKey(i));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const live = migrateParsedState(parsed.live);
    const bookmarks: Bookmark[] = Array.isArray(parsed.bookmarks)
      ? parsed.bookmarks.map((b: any) => ({
          id: b.id,
          kind: b.kind,
          label: b.label,
          createdAt: b.createdAt,
          snapshot: migrateParsedState(b.snapshot)
        }))
      : [];
    return { live, bookmarks };
  } catch (e) {
    if (e instanceof SaveLoadError) {
      console.warn(`Failed to load slot ${i}: ${e.message}`);
    } else {
      console.warn(`Slot ${i} corrupt:`, e);
    }
    return null;
  }
}

function writeSlot(i: number, data: SlotData): void {
  try {
    localStorage.setItem(slotKey(i), JSON.stringify(data));
  } catch {
    /* quota exceeded / private mode */
  }
}

function deleteSlot(i: number): void {
  try { localStorage.removeItem(slotKey(i)); } catch { /* ignore */ }
}

function readActiveSlot(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n >= MAX_SLOTS) return null;
    return n;
  } catch {
    return null;
  }
}

function writeActiveSlot(i: number | null): void {
  try {
    if (i === null) localStorage.removeItem(ACTIVE_SLOT_KEY);
    else localStorage.setItem(ACTIVE_SLOT_KEY, String(i));
  } catch {
    /* ignore */
  }
}

/**
 * One-shot legacy migration: if the old single-key save exists and no slot
 * keys are populated, copy it into slot 0 and set active=0.
 */
function migrateLegacySaveIfNeeded(): void {
  const anySlotExists = Array.from({ length: MAX_SLOTS }, (_, i) => slotKey(i))
    .some((k) => localStorage.getItem(k) !== null);
  if (anySlotExists) return;
  const raw = localStorage.getItem(LEGACY_SAVE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const migrated = migrateParsedState(parsed);
    writeSlot(0, { live: migrated, bookmarks: [] });
    writeActiveSlot(0);
  } catch (e) {
    console.warn('Legacy save migration failed:', e);
  }
}

class GameStore {
  // $state.raw because GameState is replaced wholesale by the reducer; we
  // never deep-mutate it. Raw avoids Proxy overhead.
  state = $state.raw<GameState>(createInitialState(Date.now()));
  achievements = $state.raw<AchievementsRecord>(loadAchievements());
  pendingToasts = $state<Achievement[]>([]);
  activeSlot = $state<number | null>(null);
  // Slot summaries for the picker — bumped whenever a slot is written.
  slotsRevision = $state<number>(0);

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    migrateLegacySaveIfNeeded();
    const active = readActiveSlot();
    if (active !== null) {
      const slot = readSlot(active);
      if (slot) {
        this.state = slot.live;
        this.activeSlot = active;
      } else {
        // Active slot pointer pointed at a missing/corrupt slot — clear it.
        writeActiveSlot(null);
      }
    }
    // Theme is persisted independently of save data so it survives reset.
    const stored = loadStoredTheme();
    if (stored && stored !== this.state.settings.theme) {
      this.state = reduce(this.state, { kind: 'SetTheme', theme: stored });
    }
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
  }

  /** Snapshot of all six slot summaries for the picker. */
  getSlotSummaries(): Array<SlotData | null> {
    // Read fresh from storage every call. With $state slotsRevision tracked,
    // Svelte will re-derive on writes via that signal.
    void this.slotsRevision;
    return Array.from({ length: MAX_SLOTS }, (_, i) => readSlot(i));
  }

  dispatch(event: GameEvent): void {
    const prev = this.state;
    let next = reduce(prev, event);
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

    // 7. Auto-chapter checkpoint: stage transition fires regardless of autoSave.
    if (this.activeSlot !== null && prev.story.stage !== next.story.stage) {
      const slot = readSlot(this.activeSlot) ?? { live: next, bookmarks: [] };
      const updated: SlotData = {
        live: next,
        bookmarks: addAutoCheckpoint(slot.bookmarks, next)
      };
      writeSlot(this.activeSlot, updated);
      this.slotsRevision++;
    }

    // Theme/text-size CSS side-effects.
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
      this.persistLive();
      this.autosaveTimer = null;
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  /** Save current state to the active slot's `live` field. No-op if no active slot. */
  private persistLive(): void {
    if (this.activeSlot === null) return;
    const slot = readSlot(this.activeSlot) ?? { live: this.state, bookmarks: [] };
    writeSlot(this.activeSlot, { live: this.state, bookmarks: slot.bookmarks });
    this.slotsRevision++;
  }

  saveNow(): void {
    this.persistLive();
  }

  /**
   * Set the active slot to `i` and start a fresh character there. The caller
   * should follow this by dispatching `StartNewGame` with the chosen class/name.
   */
  beginNewTaleInSlot(i: number): void {
    if (i < 0 || i >= MAX_SLOTS) return;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.state = createInitialState(Date.now());
    this.activeSlot = i;
    writeActiveSlot(i);
    // Persist the initial state right now so the slot picker shows it.
    this.persistLive();
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
  }

  /** Switch to slot `i` (must be filled). Saves current slot first. */
  switchToSlot(i: number): void {
    if (i < 0 || i >= MAX_SLOTS) return;
    // Save current first (always, regardless of autoSave).
    this.persistLive();
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    const slot = readSlot(i);
    if (!slot) return; // Slot is empty; caller should use beginNewTaleInSlot instead.
    this.state = slot.live;
    this.activeSlot = i;
    writeActiveSlot(i);
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
  }

  /** Save current and return to the slot picker (no active slot). */
  switchToSlotPicker(): void {
    this.persistLive();
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.activeSlot = null;
    writeActiveSlot(null);
    this.state = createInitialState(Date.now());
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
  }

  /** Wipe a slot (the active one, if i is omitted). */
  consignSlot(i?: number): void {
    const target = i ?? this.activeSlot;
    if (target === null) return;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    deleteSlot(target);
    this.slotsRevision++;
    if (target === this.activeSlot) {
      this.activeSlot = null;
      writeActiveSlot(null);
      this.state = createInitialState(Date.now());
      applyTheme(this.state.settings.theme);
      applyTextSize(this.state.settings.textSize);
      storeTheme(this.state.settings.theme);
    }
  }

  /** Bookmark management. All operate on the active slot; no-op if no active slot. */
  createBookmark(label: string): void {
    if (this.activeSlot === null) return;
    const slot = readSlot(this.activeSlot) ?? { live: this.state, bookmarks: [] };
    const next: SlotData = {
      live: this.state,
      bookmarks: addManualBookmark(slot.bookmarks, this.state, label)
    };
    writeSlot(this.activeSlot, next);
    this.slotsRevision++;
  }

  restoreBookmark(id: string): void {
    if (this.activeSlot === null) return;
    const slot = readSlot(this.activeSlot);
    if (!slot) return;
    const target = findBookmark(slot.bookmarks, id);
    if (!target) return;
    this.state = target.snapshot;
    // Persist the restoration immediately (regardless of autoSave).
    writeSlot(this.activeSlot, { live: target.snapshot, bookmarks: slot.bookmarks });
    this.slotsRevision++;
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
  }

  deleteBookmark(id: string): void {
    if (this.activeSlot === null) return;
    const slot = readSlot(this.activeSlot);
    if (!slot) return;
    const target = findBookmark(slot.bookmarks, id);
    // Do not allow deleting auto-chapter bookmarks via the manual delete path.
    if (!target || target.kind === 'auto-chapter') return;
    const next: SlotData = {
      live: slot.live,
      bookmarks: deleteBookmarkById(slot.bookmarks, id)
    };
    writeSlot(this.activeSlot, next);
    this.slotsRevision++;
  }

  /**
   * Backwards-compat shim for any test that still calls resetSave.
   * Wipes the active slot (if any) and always resets in-memory state to a
   * fresh initial state — matching the original single-slot resetSave behaviour.
   */
  resetSave(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    if (this.activeSlot !== null) {
      deleteSlot(this.activeSlot);
      this.slotsRevision++;
      writeActiveSlot(null);
      this.activeSlot = null;
    }
    this.state = createInitialState(Date.now());
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
    storeTheme(this.state.settings.theme);
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

  markQuestLogOpened(): void {
    const next: GameState = {
      ...this.state,
      story: {
        ...this.state.story,
        questLogActivityAtLastOpen: this.state.story.questLogActivityCount
      }
    };
    this.state = next;
    if (this.state.settings.autoSave) {
      this.scheduleAutosave();
    }
  }

  dismissToast(ach: Achievement): void {
    this.pendingToasts = this.pendingToasts.filter((a) => a.id !== ach.id);
  }
}

export const gameStore = new GameStore();

// SAVE_KEY export retained for any test that imports it (now points to legacy key).
export const SAVE_KEY = LEGACY_SAVE_KEY;
