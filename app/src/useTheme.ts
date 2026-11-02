import {useEffect, useRef, useState} from 'react';
import {applyTheme, readThemePreference, resolveTheme, storeThemePreference, THEME_MEDIA_QUERY, THEME_STORAGE_KEY, type UiTheme} from './theme';

function savedPreference() {
  try { return readThemePreference(window.localStorage); } catch { return undefined; }
}

export function useTheme(): [UiTheme, (theme: UiTheme) => void] {
  const preference = useRef(savedPreference());
  const [theme, setTheme] = useState<UiTheme>(() => resolveTheme(preference.current, window.matchMedia(THEME_MEDIA_QUERY).matches));

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    const media = window.matchMedia(THEME_MEDIA_QUERY);
    const updateSystem = () => { if (!preference.current) setTheme(resolveTheme(undefined, media.matches)); };
    const updatePreference = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      preference.current = savedPreference();
      setTheme(resolveTheme(preference.current, media.matches));
    };
    media.addEventListener('change', updateSystem);
    window.addEventListener('storage', updatePreference);
    return () => {
      media.removeEventListener('change', updateSystem);
      window.removeEventListener('storage', updatePreference);
    };
  }, []);

  return [theme, next => {
    preference.current = next;
    applyTheme(next);
    setTheme(next);
    try { storeThemePreference(window.localStorage, next); } catch { /* Storage may be unavailable. */ }
  }];
}
