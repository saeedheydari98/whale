export const THEME_CSS_VARS_STORAGE_KEY = "theme-css-vars:v1";
export const THEME_STATE_STORAGE_KEY = "theme-state:v1";
export const DEVICE_THEME_MODE_STORAGE_KEY = "device-theme-mode:v1";
export const APP_THEME_STORAGE_KEY = "app-theme:v1";
export const APP_THEME_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const APP_THEME_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
export const LEGACY_THEME_LOCAL_STORAGE_KEYS = [
  APP_THEME_STORAGE_KEY,
  THEME_CSS_VARS_STORAGE_KEY,
  THEME_STATE_STORAGE_KEY,
] as const;
