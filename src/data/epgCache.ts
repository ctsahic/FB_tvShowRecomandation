import type { Channel, Programme } from '../types'
import { channelSelectionSignature } from '../config/channels'
import { hoursSince, jerusalemDateString } from './jerusalem'

/**
 * מטמון ללוח השידורים שנשלף מהאינטרנט.
 *
 * אין שרת EPG — כל ערוץ הוא בקשה נפרדת לאתר, ולכן התוצאה נשמרת ב-localStorage
 * ומשמשת שוב כל עוד:
 *   • אותו יום (לפי שעון ישראל) — לוח של יום אחר חסר ערך מבחינתנו,
 *   • וטרם עברו EPG_CACHE_TTL_HOURS מאז השליפה האחרונה של אותו ערוץ.
 *
 * החשבונאות היא **לפי ערוץ**: מה שכבר ירד היום לא יורד שוב, גם אם המשתמש
 * הוסיף ערוץ חדש לבחירה או הסיר אחר. רק לערוצים שאין להם נתון טרי נשלפת
 * בקשה מהאתר, והשאר מגיעים מהמטמון (mergeEpgCache). "הבא נתונים עכשיו"
 * הוא הדרך היחידה לכפות שליפה מחדש של ערוצים שכבר יש להם נתון מהיום.
 */

export interface EpgCacheEntry {
  fetchedAt: number
  /** 'YYYY-MM-DD' לפי שעון ישראל — היום שעבורו נשלף הלוח. */
  date: string
  /** מזהה המקור, למשל 'antifriz'. */
  source: string
  /** חתימת רשימת הערוצים שנבחרה בסריקה האחרונה. */
  selection: string
  channels: Channel[]
  programmes: Programme[]
  /**
   * מתי נשלף לוח השידורים של כל ערוץ בנפרד (epoch ms), לפי מפתח הערוץ
   * (`channelCacheKey`). זה מה שמאפשר לדלג על ערוצים שכבר ירדו היום.
   */
  channelFetchedAt?: Record<string, number>
  /** היום הישראלי שאליו שייך הנתון של כל ערוץ — קובע מתי הוא "מתבטל". */
  channelDate?: Record<string, string>
}

/** המפתח שלפיו המטמון מתעד ערוץ — ה-slug של האתר, ואם אין, ה-id. */
export function channelCacheKey(channel: Channel): string {
  return channel.epgId?.trim() || channel.id
}

function numberMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'number' && Number.isFinite(item)) out[key] = item
  }
  return out
}

function stringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string') out[key] = item
  }
  return out
}

/**
 * תקרת גיל קשיחה. הבקשה של המשתמש: `אם ביצעתי בדיקה ולא החלפתי ערוץ —
 * לא תתבצע שום קריאה`. לכן היום הוא הקובע, והתקרה כאן רק מונעת מצב שבו
 * מטמון "תקוע" בלי לרענן. ברירת המחדל גבוהה מיום שלם, כלומר בפועל
 * יום + אותה בחירה = אין קריאה שנייה.
 */
export const EPG_CACHE_TTL_HOURS = 26
export const EPG_CACHE_KEY = 'tv-recommender.epg-cache.v1'

/** תיאור ארוך הוא רוב נפח המטמון, ולכן נחתך. */
const MAX_DESCRIPTION_CHARS = 300

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function compactProgrammes(
  programmes: readonly Programme[],
  withDescriptions: boolean,
): Programme[] {
  const out: Programme[] = []
  for (const programme of programmes) {
    if (!Number.isFinite(programme.start) || !Number.isFinite(programme.stop)) continue
    const copy: Programme = { ...programme }
    if (withDescriptions && copy.description) {
      copy.description = copy.description.slice(0, MAX_DESCRIPTION_CHARS)
    } else {
      delete copy.description
      delete copy.subTitle
      delete copy.credits
    }
    out.push(copy)
  }
  return out
}

export function loadEpgCache(): EpgCacheEntry | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(EPG_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const record = parsed as Record<string, unknown>
    const fetchedAt = record.fetchedAt
    const date = record.date
    if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) return null
    if (typeof date !== 'string' || date.length === 0) return null
    if (!Array.isArray(record.channels) || !Array.isArray(record.programmes)) return null
    const channels = record.channels as Channel[]
    // מטמון שנשמר לפני החשבונאות לפי ערוץ (v1) מכיל תאריך אחד לכולם —
    // נותנים לו אותו תאריך, כדי שלא תיפתח שליפה מחדש אחרי עדכון גרסה.
    const hasPerChannel =
      typeof record.channelFetchedAt === 'object' && record.channelFetchedAt !== null
    const channelFetchedAt = hasPerChannel
      ? numberMap(record.channelFetchedAt)
      : Object.fromEntries(channels.map((channel) => [channelCacheKey(channel), fetchedAt]))
    const channelDate = hasPerChannel
      ? stringMap(record.channelDate)
      : Object.fromEntries(channels.map((channel) => [channelCacheKey(channel), date]))
    return {
      fetchedAt,
      date,
      source: typeof record.source === 'string' ? record.source : 'unknown',
      selection: typeof record.selection === 'string' ? record.selection : '',
      channels,
      programmes: record.programmes as Programme[],
      channelFetchedAt,
      channelDate,
    }
  } catch {
    return null
  }
}

/**
 * שמירת המטמון. מחזיר false אם לא הצליח (למשל חריגה ממכסת האחסון).
 * לא זורק בשום מצב.
 */
export function saveEpgCache(entry: EpgCacheEntry): boolean {
  const store = storage()
  if (!store) return false

  const base = {
    fetchedAt: entry.fetchedAt,
    date: entry.date,
    source: entry.source,
    selection: entry.selection,
    channels: entry.channels,
    channelFetchedAt: entry.channelFetchedAt ?? {},
    channelDate: entry.channelDate ?? {},
  }

  // ניסיון ראשון עם תיאורים, ואם האחסון מלא — ניסיון שני בלעדיהם.
  const attempts: Programme[][] = [
    compactProgrammes(entry.programmes, true),
    compactProgrammes(entry.programmes, false),
  ]

  for (const programmes of attempts) {
    try {
      store.setItem(EPG_CACHE_KEY, JSON.stringify({ ...base, programmes }))
      return true
    } catch {
      // כנראה QuotaExceededError — ממשיכים לניסיון המצומצם
    }
  }

  clearEpgCache()
  return false
}

export function clearEpgCache(): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(EPG_CACHE_KEY)
  } catch {
    // מתעלמים
  }
}

/**
 * האם המטמון עדיין שמיש.
 *
 * שלושה תנאים, וכולם חייבים להתקיים:
 *   1. אותו יום ישראלי — אחרת מיד לאחר חצות היינו מציגים לו"ז של היום הקודם,
 *   2. אותה בחירת ערוצים — אחרת חסרים לנו הערוצים שהמשתמש הוסיף,
 *   3. גיל קטן מהתקרה (EPG_CACHE_TTL_HOURS, ברירת מחדל 26 שעות).
 *
 * `selection` הוא רשימת מזהי הערוצים; אפשר להעביר גם חתימה מוכנה.
 */
export function isCacheFresh(
  entry: EpgCacheEntry | null,
  now: number,
  selection: readonly string[] | string = '',
  ttlHours: number = EPG_CACHE_TTL_HOURS,
): boolean {
  if (!entry) return false
  if (!Number.isFinite(entry.fetchedAt) || entry.fetchedAt > now) return false
  if (entry.date !== jerusalemDateString(now)) return false
  const signature = typeof selection === 'string' ? selection : channelSelectionSignature(selection)
  if (entry.selection !== signature) return false
  return hoursSince(entry.fetchedAt, now) < ttlHours
}

/**
 * האם ללוח השידורים של הערוץ הזה יש נתון טרי — כלומר הוא נשלף היום.
 * "טרי" = אותו יום ישראלי וגם לא עברו יותר מ-`ttlHours` מאז השליפה שלו.
 */
export function isChannelFresh(
  entry: EpgCacheEntry | null,
  key: string,
  now: number,
  ttlHours: number = EPG_CACHE_TTL_HOURS,
): boolean {
  if (!entry || !key) return false
  const at = entry.channelFetchedAt?.[key]
  if (typeof at !== 'number' || !Number.isFinite(at) || at > now) return false
  if (entry.channelDate?.[key] !== jerusalemDateString(now)) return false
  return hoursSince(at, now) < ttlHours
}

/**
 * מתוך רשימת הערוצים הנבחרת — רק אלה שאין להם נתון טרי ולכן צריך להוריד.
 * זה הלב של ההתנהגות שהמשתמש ביקש: מה שכבר ירד היום לא יורד שוב.
 */
export function channelsToFetch(
  entry: EpgCacheEntry | null,
  selection: readonly string[],
  now: number,
  ttlHours: number = EPG_CACHE_TTL_HOURS,
): string[] {
  if (!entry) return [...selection]
  return selection.filter((key) => !isChannelFresh(entry, key, now, ttlHours))
}

/**
 * מה לעשות בפתיחת האפליקציה — בלי לפנות לאינטרנט סתם:
 *
 *  • `cache` — יש מטמון של הבחירה הנוכחית וכל הערוצים שלו טריים. אפשר להציג
 *    מהמטמון בלי לפנות לאתר בכלל.
 *  • `selection-changed` — המשתמש החליף ערוצים מאז הסריקה האחרונה. זה המצב
 *    היחיד שבו מותר לשלוף נתונים אוטומטית בפתיחה, כי בלעדיו הטבלה חסרה.
 *  • `wait` — אין מטמון, או שהוא של יום קודם. לא שולפים כלום בלי בקשה
 *    מפורשת („הבא נתונים עכשיו”).
 *
 * יום חדש **אינו** סיבה לשלוף לבד: המשתמש ביקש במפורש שהאפליקציה תמתין
 * לבקשה שלו. לכן מטמון של אתמול נופל ל-`wait` ולא ל-`selection-changed`.
 */
export type OpenScanDecision = 'cache' | 'selection-changed' | 'wait'

export function shouldScanOnOpen(
  entry: EpgCacheEntry | null,
  selection: readonly string[],
  now: number,
  ttlHours: number = EPG_CACHE_TTL_HOURS,
): OpenScanDecision {
  if (!entry) return 'wait'
  // מטמון של יום אחר לא נחשב בכלל — יום חדש ממתין לבקשה מפורשת.
  if (entry.date !== jerusalemDateString(now)) return 'wait'
  if (entry.selection !== channelSelectionSignature(selection)) return 'selection-changed'
  return channelsToFetch(entry, selection, now, ttlHours).length === 0 ? 'cache' : 'wait'
}

/**
 * ממזג שליפה חדשה של חלק מהערוצים לתוך המטמון הקיים.
 *
 * מה שנשלף עכשיו מקבל חותמת זמן ושל היום; כל השאר נשמר כמו שהוא — כל עוד
 * הוא מהיום (נתון של יום קודם נמחק, כי לוח של אתמול חסר ערך).
 */
export function mergeEpgCache(
  previous: EpgCacheEntry | null,
  update: {
    channels: readonly Channel[]
    programmes: readonly Programme[]
    selection: readonly string[]
    source?: string
  },
  now: number,
): EpgCacheEntry {
  const today = jerusalemDateString(now)
  const fetchedKeys = new Set(update.channels.map((channel) => channelCacheKey(channel)))
  const fetchedIds = new Set(update.channels.map((channel) => channel.id))

  const keepChannel = (channel: Channel): boolean => {
    const key = channelCacheKey(channel)
    if (fetchedKeys.has(key)) return false
    // רק ערוצים שיש להם נתון מהיום ממשיכים איתנו.
    return previous?.channelDate?.[key] === today
  }

  const channels: Channel[] = [
    ...(previous?.channels ?? []).filter(keepChannel),
    ...update.channels,
  ]
  const keptIds = new Set(channels.filter(keepChannel).map((channel) => channel.id))
  const programmes: Programme[] = [
    ...(previous?.programmes ?? []).filter(
      (programme) => keptIds.has(programme.channelId) && !fetchedIds.has(programme.channelId),
    ),
    ...update.programmes,
  ]

  const channelFetchedAt = { ...(previous?.channelFetchedAt ?? {}) }
  const channelDate = { ...(previous?.channelDate ?? {}) }
  for (const key of fetchedKeys) {
    channelFetchedAt[key] = now
    channelDate[key] = today
  }

  return {
    fetchedAt: now,
    date: today,
    source: update.source ?? previous?.source ?? 'unknown',
    selection: channelSelectionSignature(update.selection),
    channels,
    programmes,
    channelFetchedAt,
    channelDate,
  }
}

export function cacheAgeHours(entry: EpgCacheEntry | null, now: number): number {
  if (!entry || !Number.isFinite(entry.fetchedAt)) return Number.POSITIVE_INFINITY
  return Math.max(0, hoursSince(entry.fetchedAt, now))
}

/** שורה קצרה לממשק: מתי הנתונים עודכנו והאם כדאי לרענן. */
export function describeCacheAge(
  entry: EpgCacheEntry | null,
  now: number,
  selection?: readonly string[] | string,
): string {
  if (!entry) return 'אין נתונים שמורים'
  const age = cacheAgeHours(entry, now)
  if (!Number.isFinite(age)) return 'אין נתונים שמורים'

  const hours = Math.floor(age)
  const base =
    hours < 1 ? 'הנתונים עודכנו לפני פחות משעה' : `הנתונים עודכנו לפני ${hours} שעות`
  if (selection === undefined) return base
  return isCacheFresh(entry, now, selection) ? base : `${base} — כדאי לרענן`
}
