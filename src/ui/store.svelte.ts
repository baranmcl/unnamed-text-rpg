import { reduce, type GameEvent } from '../engine/events';
import { createInitialState } from '../engine/state';
import { serialize, deserialize, SaveLoadError } from '../engine/save';
import { applyTheme, loadStoredTheme, storeTheme, applyTextSize } from './theme';
import type { GameState } from '../engine/types';

const SAVE_KEY = 'heroicchronicle.save.v1';
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

class GameStore {
  // $state.raw because GameState is replaced wholesale by the reducer; we
  // never deep-mutate it. Raw avoids Proxy overhead.
  state = $state.raw<GameState>(loadOrCreate());

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
    const next = reduce(this.state, event);
    this.state = next;

    // Side-effects that derive from event kind go here.
    if (event.kind === 'SetTheme') {
      applyTheme(event.theme);
      storeTheme(event.theme);
    }

    if (event.kind === 'SetTextSize') {
      applyTextSize(event.size);
    }

    if (next.settings.autoSave) {
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

  // Manual save (used by SettingsModal "Preserve thy tale")
  saveNow(): void {
    persist(this.state);
  }

  // Delete save and reset to initial state
  resetSave(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    this.state = createInitialState(Date.now());
    applyTheme(this.state.settings.theme);
    applyTextSize(this.state.settings.textSize);
  }
}

// Singleton — Svelte 5 stores are typically classes exported as instances.
export const gameStore = new GameStore();
