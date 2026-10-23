/**
 * לקוח OMDb (omdbapi.com) — ציוני IMDb ו-Rotten Tomatoes.
 *
 * למה זה קיים: TMDB נותן ציון קהילה, תקציר בעברית וז'אנר — אבל אין בו IMDb
 * ואין בו Rotten Tomatoes, ובעברית אלה בדיוק הציונים שהמשתמש מחפש. OMDb
 * מחזיר את שניהם לכל כותר שיש לו מזהה IMDb, ולכן מזהה ה-IMDb מ-TMDB הוא
 * המפתח לחיפוש (ושם הכותרת הוא גיבוי בלבד).
 *
 * המכסה החינמית מוגבלת (1000 בקשות ביום), ולכן שולפים רק לכותר שה-TMDB כבר
 * זיהה — ולא לכל תכנית ב-EPG.
 *
 * הלקוח לעולם לא זורק: כל כשל (אין מפתח, שגיאת רשת, סרט לא נמצא) מחזיר null.
 */

import { buildUrl, fetchJson, HttpError } from './http'

const API_BASE = 'https://www.omdbapi.com/'

interface OmdbResponse {
  Response?: string
  Error?: string
  imdbID?: string
  imdbRating?: string
  imdbVotes?: string
  Metascore?: string
  Ratings?: Array<{ Source?: string; Value?: string }>
}

export interface OmdbRatings {
  imdbId?: string
  /** 0-10, ספרה אחרי הנקודה. */
  imdbRating?: number
  imdbVotes?: number
  /** אחוזים, 0-100. */
  rottenTomatoes?: number
  /** 0-100. */
  metascore?: number
}

export interface OmdbLookupInput {
  /** מזהה IMDb מ-TMDB — הדרך המדויקת. */
  imdbId?: string
  /** גיבוי כשהמזהה חסר (למשל סדרה בלי external_ids). */
  title?: string
  year?: number
  isSeries?: boolean
}

export interface OmdbClient {
  lookup(input: OmdbLookupInput): Promise<OmdbRatings | null>
}

/** מספר מתוך מחרוזת OMDb. \"N/A\" וריק מחזירים undefined. */
function num(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (!text || text === 'N/A') return undefined
  // "2,877,173" או "86%" — מחרוזת אחת עם פסיקים ואחוזים.
  const parsed = Number(text.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

export function isOmdbConfigured(apiKey: string | undefined): boolean {
  return typeof apiKey === 'string' && apiKey.trim().length > 0
}

/** תשובת OMDb -> ציונים. מחזיר null כשלא נמצא כותר או שאין בו ציונים. */
export function parseOmdbPayload(payload: OmdbResponse | null | undefined): OmdbRatings | null {
  if (!payload || payload.Response === 'False') return null
  const ratings: OmdbRatings = {}
  if (payload.imdbID) ratings.imdbId = payload.imdbID

  const imdbRating = num(payload.imdbRating)
  if (imdbRating !== undefined && imdbRating > 0) ratings.imdbRating = imdbRating
  const imdbVotes = num(payload.imdbVotes)
  if (imdbVotes !== undefined) ratings.imdbVotes = imdbVotes
  const metascore = num(payload.Metascore)
  if (metascore !== undefined && metascore > 0) ratings.metascore = metascore

  const rt = payload.Ratings?.find((entry) => /rotten tomatoes/i.test(entry?.Source ?? ''))
  const rottenTomatoes = num(rt?.Value)
  if (rottenTomatoes !== undefined) ratings.rottenTomatoes = rottenTomatoes

  return Object.keys(ratings).length > 0 ? ratings : null
}

/** ציוני IMDb/Rotten Tomatoes מ-OMDb. מחזיר null כשאין מפתח או שאין נתונים. */
export async function fetchOmdbRatings(
  input: OmdbLookupInput & { apiKey: string; signal?: AbortSignal },
): Promise<OmdbRatings | null> {
  if (!isOmdbConfigured(input.apiKey)) return null
  const params: Record<string, string | number | undefined> = { apikey: input.apiKey.trim() }
  if (input.imdbId?.trim()) {
    params.i = input.imdbId.trim()
  } else if (input.title?.trim()) {
    params.t = input.title.trim()
    if (input.year !== undefined) params.y = input.year
    params.type = input.isSeries ? 'series' : 'movie'
  } else {
    return null
  }

  const payload = await fetchJson<OmdbResponse>(buildUrl(API_BASE, params), {
    signal: input.signal,
    // OMDb מהיר, ובלי תשובה תוך 5 שניות אין טעם להמתין — הוא לא קריטי.
    timeoutMs: 5_000,
    retries: 0,
  })
  return parseOmdbPayload(payload)
}

/** האם השרת דחה את המפתח (מכסה שנגמרה או מפתח שגוי). */
export function isOmdbAuthError(error: unknown): boolean {
  return error instanceof HttpError && (error.status === 401 || error.status === 403)
}

export function createOmdbClient(
  apiKey: string,
  options: { enabled?: boolean } = {},
): OmdbClient | undefined {
  if (!isOmdbConfigured(apiKey) || options.enabled === false) return undefined
  const cache = new Map<string, OmdbRatings | null>()

  return {
    async lookup(input) {
      const key =
        input.imdbId?.trim() ||
        `${input.title?.trim().toLowerCase() ?? ''}|${input.year ?? ''}|${input.isSeries ? 'tv' : 'movie'}`
      if (!key) return null
      if (cache.has(key)) return cache.get(key) ?? null
      try {
        const ratings = await fetchOmdbRatings({ ...input, apiKey })
        cache.set(key, ratings)
        return ratings
      } catch {
        // OMDb הוא תוספת בלבד — כשל בו לא מפיל את ההעשרה של TMDB.
        cache.set(key, null)
        return null
      }
    },
  }
}
