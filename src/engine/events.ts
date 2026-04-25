import type { GameState } from './types';

// =====================================================================
// Event taxonomy
// =====================================================================
// Plan 1 ships only the settings events. Plans 2+ extend this union with
// exploration, combat, narrative, story, and inventory events.
// =====================================================================

export type GameEvent =
  | { kind: 'SetTheme'; theme: 'parchment' | 'moonlit' }
  | { kind: 'SetTextSize'; size: 'small' | 'medium' | 'large' }
  | { kind: 'ToggleAutoSave' };

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.kind) {
    case 'SetTheme':
      return { ...state, settings: { ...state.settings, theme: event.theme } };
    case 'SetTextSize':
      return { ...state, settings: { ...state.settings, textSize: event.size } };
    case 'ToggleAutoSave':
      return {
        ...state,
        settings: { ...state.settings, autoSave: !state.settings.autoSave }
      };
  }
}
