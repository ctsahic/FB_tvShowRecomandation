/**
 * Xtream Codes API client.
 *
 * Talks to the `player_api.php` endpoint that every Xtream-compatible IPTV
 * panel exposes, plus the `xmltv.php` and `/live/...` playback URLs.
 *
 * Panel quirks handled here:
 *  - `title` / `description` in `epg_listings` are base64 encoded (see
 *    `decodeXtreamText`).
 *  - Timestamps arrive either as `start_timestamp` / `stop_timestamp`
 *    (epoch seconds) or as `YYYY-MM-DD HH:mm:ss` strings in panel-local time.
 *  - Rows may be arrays or single objects, and fields may be missing entirely,
 *    so every read goes through the coercion helpers below. No helper here
 *    throws on bad input.
 */

import type { Channel, Programme } from '../types'
import { buildUrl, fetchJson, normalizeHost } from './http'

export interface XtreamCredentials {
  host: string
  username: string
  password: string
}

export interface XtreamCategory {
  id: string
  name: string
}

/* ------------------------------------------------------------------ */
/* URL builders                                                        */
/* ------------------------------------------------------------------ */

/** Last-resort query builder that never throws, even for a malformed host. */
function withQuery(
  base: string,
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}

export function xtreamApiUrl(
  creds: XtreamCredentials,
  action?: string,
  extra?: Record<string, string | number>,
): string {
  const host = normalizeHost(creds.host)
  const base = `${host}/player_api.php`
  const params: Record<string, string | number | undefined> = {
    username: creds.username,
    password: creds.password,
    ...(action ? { action } : {}),
    ...(extra ?? {}),
  }
  try {
    return buildUrl(base, params)
  } catch {
    return withQuery(base, params)
  }
}

export function xtreamXmltvUrl(creds: XtreamCredentials): string {
  const host = normalizeHost(creds.host)
  return withQuery(`${host}/xmltv.php`, {
    username: creds.username,
    password: creds.password,
  })
}

export function xtreamLiveStreamUrl(
  creds: XtreamCredentials,
  streamId: number,
  ext = 'ts',
): string {
  const host = normalizeHost(creds.host)
  return `${host}/live/${encodeURIComponent(creds.username)}/${encodeURIComponent(
    creds.password,
  )}/${streamId}.${ext}`
}

/* ------------------------------------------------------------------ */
/* Coercion helpers                                                    */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Accept an array, a single object, or null/undefined as an array. */
function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord)
  }
  if (isRecord(value)) return [value]
  return []
}

function str(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const text = str(value)
  if (!text) return undefined
  const parsed = Number.parseFloat(text)
  return Number.isFinite(parsed) ? parsed : undefined
}

/* ------------------------------------------------------------------ */
/* Text decoding                                                       */
/* ------------------------------------------------------------------ */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/

/**
 * Xtream sends programme titles/descriptions base64 encoded when the language
 * code is set. Try to decode; fall back to the original string whenever the
 * value is not valid base64 or does not round-trip as UTF-8 text.
 */
export function decodeXtreamText(value: string): string {
  if (typeof value !== 'string' || value.length === 0) return ''
  const compact = value.replace(/\s+/g, '')
  // Fast reject: not base64 at all (e.g. plain Hebrew text).
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return value
  if (compact.length % 4 !== 0) return value
  try {
    const binary = atob(compact)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    let decoded: string
    try {
      decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      return value
    }
    if (!decoded || decoded.includes('\uFFFD') || CONTROL_CHARS.test(decoded)) return value
    return decoded
  } catch {
    return value
  }
}

/* ------------------------------------------------------------------ */
/* Israeli channel detection                                           */
/* ------------------------------------------------------------------ */

const HEBREW_RANGE = /[\u0590-\u05FF]/
const GENERIC_ISRAELI_MARKERS = ['ישראל', 'israel', 'israeli', 'il'] as const

/**
 * Channel / category markers that reliably identify Israeli channels in
 * Hebrew IPTV panels. Latin markers are matched on word boundaries so short
 * strings such as "yes", "hot", "one" or "il" do not match unrelated names.
 */
const ISRAELI_CHANNEL_MARKERS: readonly string[] = [
  'ישראל',
  'israel',
  'i24',
  'i24news',
  'כאן',
  'kan',
  'קשת',
  'keshet',
  'רשת',
  'reshet',
  'עכשיו 14',
  'now 14',
  'ערוץ 2',
  'ערוץ 9',
  'ערוץ 10',
  'ערוץ 11',
  'ערוץ 12',
  'ערוץ 13',
  'ערוץ 14',
  'ערוץ 20',
  'ערוץ 24',
  'חדשות 11',
  'חדשות 12',
  'חדשות 13',
  'חדשות 14',
  'חברת החדשות',
  'מבט',
  'ערוץ הספורט',
  'ספורט 1',
  'ספורט 2',
  'ספורט 3',
  'ספורט 4',
  'ספורט 5',
  'ספורט1',
  'ספורט2',
  'ספורט3',
  'ספורט4',
  'ספורט5',
  'sport1',
  'sport2',
  'sport3',
  'sport4',
  'sport5',
  'sport 1',
  'sport 2',
  'sport 5',
  'one',
  'one1',
  'one2',
  'hot',
  'yes',
  'yes tv',
  'yes דרמה',
  'ערוץ הדרמה',
  'דרמה',
  'ערוץ הילדים',
  'ערוץ הילדים ו',
  'הידברות',
  'ערוץ 7',
  'ערוץ הכנסת',
  'כנסת',
  'הטלוויזיה החינוכית',
  'חינוכית',
  'מכאן',
  'נטע',
  'ערוץ ביפ',
  'ביפ',
  'דיסני',
  'ניקלודיאון',
  'ערוץ המוזיקה',
  'מוזיקה 24',
  'טופו',
  'צליל',
  'האח הגדול',
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normaliseMarkerText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * True when `marker` appears in `haystack`.
 * Hebrew markers use substring matching; Latin markers shorter than 4
 * characters require word boundaries to avoid false positives.
 */
function matchesMarker(haystack: string, marker: string): boolean {
  const m = normaliseMarkerText(marker)
  if (!m) return false
  if (HEBREW_RANGE.test(m)) return haystack.includes(m)
  if (m.length < 4) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(m)}([^a-z0-9]|$)`).test(haystack)
  }
  return haystack.includes(m)
}

/** Is this provider category (group) an Israeli one? */
export function isIsraeliCategory(name: string, hints: readonly string[]): boolean {
  const haystack = normaliseMarkerText(name)
  if (!haystack) return false
  for (const hint of hints) {
    if (matchesMarker(haystack, hint)) return true
  }
  for (const marker of GENERIC_ISRAELI_MARKERS) {
    if (matchesMarker(haystack, marker)) return true
  }
  return false
}

/** Does the channel name look like an Israeli channel? */
export function looksIsraeliChannel(name: string): boolean {
  const haystack = normaliseMarkerText(name)
  if (!haystack) return false
  for (const marker of ISRAELI_CHANNEL_MARKERS) {
    if (matchesMarker(haystack, marker)) return true
  }
  // Fallback: an explicit "IL" / "עברית" tag next to the name.
  return /(^|[^a-z0-9])il([^a-z0-9]|$)/.test(haystack) || haystack.includes('עברית')
}

/**
 * 0 = not Israeli, 1 = channel name looks Israeli, 2 = provider put it in an
 * Israeli category. The app keeps the score-2 channels first.
 */
export function israeliGroupScore(channel: Channel, hints: readonly string[]): number {
  if (channel.group && isIsraeliCategory(channel.group, hints)) return 2
  if (looksIsraeliChannel(channel.name)) return 1
  return 0
}

/* ------------------------------------------------------------------ */
/* Catalog calls                                                       */
/* ------------------------------------------------------------------ */

function mapStreamRow(row: Record<string, unknown>, hints: readonly string[]): Channel | null {
  const rawId = row.stream_id
  const id = str(rawId).trim()
  if (!id) return null
  const name = str(row.name).trim() || id
  const channel: Channel = { id, name }
  const group = str(row.category_name).trim()
  if (group) channel.group = group
  const icon = str(row.stream_icon).trim()
  if (icon) channel.icon = icon
  const epgId = str(row.epg_channel_id).trim()
  if (epgId) channel.epgId = epgId
  const channelNumber = num(row.num)
  if (channelNumber !== undefined) channel.number = channelNumber
  channel.israeli = israeliGroupScore(channel, hints) > 0
  return channel
}

/**
 * Fetches the channel catalog. `hints` defaults to nothing so callers can pass
 * the user's configured Israeli group hints; without them Israeli detection
 * falls back to the channel-name heuristics.
 */
export async function getLiveCategories(
  creds: XtreamCredentials,
  signal?: AbortSignal,
): Promise<XtreamCategory[]> {
  const raw = await fetchJson<Record<string, unknown>>(
    xtreamApiUrl(creds, 'get_live_categories'),
    { signal },
  )
  const rows = asArray(Array.isArray(raw) ? raw : raw.categories)
  const out: XtreamCategory[] = []
  for (const row of rows) {
    const id = str(row.category_id).trim()
    const name = str(row.category_name).trim()
    if (!id && !name) continue
    out.push({ id, name })
  }
  return out
}

export async function getLiveStreams(
  creds: XtreamCredentials,
  categoryId: string,
  signal?: AbortSignal,
): Promise<Channel[]> {
  return loadStreams(creds, { category_id: categoryId }, signal)
}

export async function getAllLiveStreams(
  creds: XtreamCredentials,
  signal?: AbortSignal,
): Promise<Channel[]> {
  return loadStreams(creds, undefined, signal)
}

async function loadStreams(
  creds: XtreamCredentials,
  extra: Record<string, string | number> | undefined,
  signal?: AbortSignal,
): Promise<Channel[]> {
  const hints: readonly string[] = []
  const raw = await fetchJson<unknown>(xtreamApiUrl(creds, 'get_live_streams', extra), {
    signal,
  })
  const rows = Array.isArray(raw) ? asArray(raw) : asArray((raw as Record<string, unknown>)?.streams)
  const out: Channel[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const channel = mapStreamRow(row, hints)
    if (!channel || seen.has(channel.id)) continue
    seen.add(channel.id)
    out.push(channel)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* EPG                                                                 */
/* ------------------------------------------------------------------ */

/** `YYYY-MM-DD HH:mm:ss` in panel-local time -> epoch ms. */
function parsePanelDate(value: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value.trim())
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? '0')
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  const ms = new Date(year, month - 1, day, hour, minute, second).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

function listingTime(timestamp: unknown, text: unknown): number | undefined {
  const seconds = num(timestamp)
  if (seconds !== undefined && seconds > 0) return seconds * 1000
  return parsePanelDate(str(text))
}

/**
 * Now/next listings for one channel. `limit` is the number of listings the
 * panel should return (start, then upcoming ones).
 */
export async function getShortEpg(
  creds: XtreamCredentials,
  channel: Channel,
  limit: number,
  signal?: AbortSignal,
): Promise<Programme[]> {
  const url = xtreamApiUrl(creds, 'get_short_epg', {
    stream_id: channel.id,
    limit: Math.max(1, Math.round(limit)),
  })
  const raw = await fetchJson<Record<string, unknown>>(url, { signal })
  const rows = asArray(raw?.epg_listings)
  const now = Date.now()
  const out: Programme[] = []
  for (const row of rows) {
    const start = listingTime(row.start_timestamp, row.start)
    const stop = listingTime(row.stop_timestamp, row.end)
    if (start === undefined || stop === undefined || stop <= start) continue
    const title = decodeXtreamText(str(row.title)).trim()
    if (!title) continue
    const description = decodeXtreamText(str(row.description)).trim()
    const programme: Programme = {
      channelId: channel.id,
      channelName: channel.name,
      title,
      start,
      stop,
      categories: [],
      isLive: start <= now && now < stop,
      hasImage: false,
    }
    if (description) programme.description = description
    const rating = num(row.rating)
    if (rating !== undefined && rating > 0 && rating <= 10) {
      programme.rating = rating
      programme.ratingSystem = 'EPG'
    }
    out.push(programme)
  }
  return out.sort((a, b) => a.start - b.start)
}

/* ------------------------------------------------------------------ */
/* Connection test                                                     */
/* ------------------------------------------------------------------ */

export async function testConnection(
  creds: XtreamCredentials,
  signal?: AbortSignal,
): Promise<{ ok: boolean; channels: number; message?: string }> {
  try {
    const raw = await fetchJson<Record<string, unknown>>(xtreamApiUrl(creds), { signal })
    const userInfo = isRecord(raw.user_info) ? raw.user_info : {}
    const status = str(userInfo.status).trim()
    if (!status) {
      return { ok: false, channels: 0, message: 'השרת לא החזיר פרטי משתמש — בדוק את הכתובת' }
    }
    if (status.toLowerCase() !== 'active') {
      return { ok: false, channels: 0, message: `סטטוס החשבון: ${status}` }
    }
    let channels = 0
    try {
      const streams = await getAllLiveStreams(creds, signal)
      channels = streams.length
    } catch {
      // The account is valid but the catalog failed; report ok with 0 channels.
    }
    return { ok: true, channels }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, channels: 0, message }
  }
}
