/**
 * Shared settings helper for FaceMood AI
 * Persists user preferences in localStorage and notifies mounted components.
 */

export const SETTINGS_STORAGE_KEY = 'facemood-settings'
export const SETTINGS_CHANGED_EVENT = 'facemood-settings-changed'

export const DEFAULT_SETTINGS = {
  recognitionThreshold: 0.6,
  showLandmarks: true,
  showMesh: true,
  autoRecognize: true,
  notifications: true,
  darkMode: false,
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function applyTheme(darkMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', Boolean(darkMode))
}

export function saveSettingsToStorage(nextSettings) {
  const merged = { ...DEFAULT_SETTINGS, ...nextSettings }
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged))
  applyTheme(merged.darkMode)
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: merged }))
  return merged
}
