export type UiTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'forma-ui-theme';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function resolveTheme(preference: unknown, prefersDark: boolean): UiTheme {
  return preference === 'light' || preference === 'dark' ? preference : prefersDark ? 'dark' : 'light';
}

export function readThemePreference(storage: Pick<Storage, 'getItem'>): UiTheme | undefined {
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : undefined;
  } catch {
    return undefined;
  }
}

export function storeThemePreference(storage: Pick<Storage, 'setItem'>, theme: UiTheme): void {
  try { storage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Switching still works without storage. */ }
}

export function applyTheme(theme: UiTheme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f172a' : '#ffffff');
}
