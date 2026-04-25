export type ThemeName = 'parchment' | 'moonlit';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

// Persisted separately from save data per spec §8.
const THEME_KEY = 'heroicchronicle.settings.v1.theme';

export function loadStoredTheme(): ThemeName | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'parchment' || v === 'moonlit') return v;
    return null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode / quota exceeded; ignore */
  }
}

export type TextSize = 'small' | 'medium' | 'large';

export function applyTextSize(size: TextSize): void {
  document.documentElement.dataset.textSize = size;
}
