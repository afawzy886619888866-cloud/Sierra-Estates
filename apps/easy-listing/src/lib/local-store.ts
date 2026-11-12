'use client'

import type { AppSettings, SavedProperty } from './types'

/**
 * Client-side persistence (localStorage) for settings + recently saved
 * listings. The durable, shared database is the team's Google Sheet — this
 * store only powers per-browser convenience (settings survive reloads, the
 * "saved" tab shows what THIS device saved recently).
 */

const SETTINGS_KEY = 'sierra-easy-listing.settings.v1'
const PROPERTIES_KEY = 'sierra-easy-listing.properties.v1'
const MAX_SAVED = 200

/** Sierra Estates' own Google Sheet (shared with the team). */
export const DEFAULT_SHEET_LINK =
  'https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit'

/**
 * Shared secret of the team's Apps Script engine (CONFIG.OUTREACH_SECRET).
 * The merged script rejects any POST without it, so it is prefilled —
 * change it here only if you change it inside the script.
 *
 * Rotation note (2026-11-12): the server side resolves SIERRA_SECRET_KEY
 * first (/api/sync/sheet-webhook, GoogleSheetSyncService, and the Apps
 * Script engines themselves read the SIERRA_SECRET_KEY Script Property).
 * This browser tool has no env access, so its prefilled default stays the
 * legacy value — when the secret is rotated, paste the new value once in
 * the tool's Settings dialog (it persists in localStorage, overriding
 * this default).
 */
export const DEFAULT_SECRET = 'SE_OUTREACH_SECRET_2026_CAIRO'

export const DEFAULT_SETTINGS: AppSettings = {
  appsScriptUrl: '',
  sheetLink: DEFAULT_SHEET_LINK,
  companyPhone: '',
  secret: DEFAULT_SECRET,
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      appsScriptUrl: String(parsed.appsScriptUrl ?? '').trim(),
      sheetLink: String(parsed.sheetLink ?? DEFAULT_SHEET_LINK).trim(),
      companyPhone: String(parsed.companyPhone ?? '').trim(),
      secret: String(parsed.secret ?? DEFAULT_SECRET).trim(),
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* storage full / private mode — settings just won't persist */
  }
}

export function loadSavedProperties(): SavedProperty[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PROPERTIES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedProperty[]) : []
  } catch {
    return []
  }
}

export function addSavedProperty(p: SavedProperty): SavedProperty[] {
  const items = [p, ...loadSavedProperties().filter((x) => x.id !== p.id)].slice(0, MAX_SAVED)
  try {
    window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify(items))
  } catch {
    /* quota exceeded — keep working without the local mirror */
  }
  return items
}

export function removeSavedProperty(id: string): SavedProperty[] {
  const items = loadSavedProperties().filter((p) => p.id !== id)
  try {
    window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
  return items
}

/** Codes already used on this device — used to keep internal codes unique. */
export function savedCodes(): string[] {
  return loadSavedProperties().map((p) => p.code)
}

/** Google Drive share link → direct URL usable in an <img> tag. */
export function driveThumb(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([-\w]{10,})/)
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`
  return url
}
