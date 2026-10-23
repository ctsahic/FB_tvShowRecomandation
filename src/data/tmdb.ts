/**
 * TMDB client — enriches movies/series with ratings, Hebrew title, Hebrew
 * overview and genre names (language=he-IL).
 *
 * TMDB also yields the IMDb id, and that is what OMDb needs to add the IMDb
 * and Rotten Tomatoes scores, so an OMDb client can be attached here and its
 * ratings get merged into the same Enrichment.
 *
 * The client never throws: any failure (missing key, network error, empty
 * result) resolves to `null` so a single bad lookup can't break a whole scan.
 */

import type { Enrichment, TmdbClient, TmdbLookupInput } from '../types'
import type { OmdbClient } from './omdb'
import { HttpError, fetchJson } from './http'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

/* ------------------------------------------------------------------ */
/* TMDB response shapes (only the fields we actually read)             */
/* ------------------------------------------------------------------ */

interface TmdbSearchResult {
  id?: number
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  popularity?: number
  vote_average?: number
  vote_count?: number
  release_date?: string
  first_air_date?: string
  overview?: string
  poster_path?: string | null
}

interface TmdbSearchResponse {
  results?: TmdbSearchResult[]
}

interface TmdbGenre {
  id?: number
  name?: string
}

interface TmdbExternalIds {
  imdb_id?: string | null
}

interface TmdbDetails {
  id?: number
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  overview?: string
  vote_average?: number
  vote_count?: number
  popularity?: number
  genres?: TmdbGenre[]
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
  number_of_seasons?: number
  status?: string
  imdb_id?: string | null
  external_ids?: TmdbExternalIds
}

export type TmdbImageSize = 'w200' | 'w342' | 'w500'

/* ------------------------------------------------------------------ */
/* Title cleanup                                                       */
/* ------------------------------------------------------------------ */

/** Labels EPG providers prepend to a title, e.g. "סרט: ..." / "בכורה: ...". */
const LEADING_LABELS = [
  'סרט ישראלי',
  'סרט קולנוע',
  'סרט',
  'סדרה',
  'בכורה',
  'חדש',
  'חדשה',
  'תכנית',
  'הצגה',
  'movie',
  'film',
  'series',
  'tv show',
]

/** Bracket contents that carry no information for a search. */
const NOISE_BRACKETS =
  /^(?:\d{4}|\d{4}\s*[-–]\s*\d{4}|עונה\s*\d+|עונות\s*\d+|חדש|חדשה|בכורה|hd|fhd|uhd|4k|s\d+e\d+|remastered|מחודש)$/i

/** Trailing markers such as "עונה 3", "S01E04", "HD", "חלק א׳". */
const TRAILING_MARKERS =
  /(?:\s*[-–|]\s*|\s+)(?:עונה\s*\d+|עונה\s*(?:ראשונה|שנייה|שניה|שלישית|רביעית)|עונות\s*\d+|פרק\s*\d+|חלק\s*[א-ת׳'"]+|\d{1,2}×\d{1,2}|s\s*\d{1,2}\s*e\s*\d{1,2}|s\d{1,2}|e\d{1,3}|hd|fhd|uhd|4k|1080p|720p|בכורה|חדש|חדשה)\s*$/i

function stripBrackets(input: string): string {
  let out = input
  for (;;) {
    const match = out.match(/\s*[[({]([^[\](){}]*)[)\]}]\s*$/)
    if (!match) break
    const inner = match[1].trim()
    // Only drop the bracket when it is pure noise, otherwise it is part of the name.
    if (!NOISE_BRACKETS.test(inner)) break
    out = out.slice(0, match.index).trim()
  }
  return out
}

/**
 * Strip EPG noise from a raw programme title so TMDB search has a chance.
 * Keeps Hebrew text intact. Returns '' when nothing usable is left.
 */
export function cleanTitle(raw: string): string {
  if (!raw) return ''
  let out = raw.replace(/[\u200e\u200f\u202a-\u202e]/g, ' ').replace(/\s+/g, ' ').trim()

  // Many providers prefix a label, sometimes twice ("חדש: סרט: ...").
  for (let i = 0; i < 3; i++) {
    const before = out
    for (const label of LEADING_LABELS) {
      const pattern = new RegExp(`^${label}\\s*[:\\-–—]\\s*`, 'i')
      out = out.replace(pattern, '')
    }
    if (out === before) break
  }

  out = stripBrackets(out)
  out = out.replace(TRAILING_MARKERS, '')
  out = stripBrackets(out)
  // Leading/trailing separators and punctuation left behind by the strips above.
  out = out.replace(/^[\s:,.|–—-]+/, '').replace(/[\s:,.|–—-]+$/, '')
  out = out.replace(/\s{2,}/g, ' ').trim()

  // A title must keep at least one letter or digit. Numeric film titles are
  // legitimate and common ("1917", "2012"), so digits must not be rejected.
  if (!/[\p{L}\p{N}]/u.test(out)) return ''
  return out
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/["'`׳״]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseYear(date: string | undefined): number | undefined {
  if (!date) return undefined
  const match = date.match(/(\d{4})/)
  if (!match) return undefined
  const year = Number(match[1])
  return Number.isFinite(year) && year > 1900 ? year : undefined
}

function roundRating(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.round(value * 10) / 10
}

export function tmdbImageUrl(posterPath: string | undefined, size: TmdbImageSize = 'w342'): string | undefined {
  if (!posterPath) return undefined
  const path = posterPath.startsWith('/') ? posterPath : `/${posterPath}`
  return `${IMAGE_BASE}/${size}${path}`
}

export function isTmdbConfigured(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.trim().length > 0
}

/**
 * ל-TMDB יש תקציב זמן קצר משל עצמו: הבקשות של העשרה הן AOS (הרבה בקשות קטנות),
 * ואם אחת מהן נתקעת — אין טעם לחכות 15 שניות ולנסות שוב פעמיים. TMDB
 * תקין עונה בפחות משנייה, ולכן 5 שניות הן תקרה נדיבה: כשל מהיר, והמנוע
 * מפסיק את כל שלב הביקורות אחרי מספר כשלים.
 */
const TMDB_TIMEOUT_MS = 5_000

/** האם זו שגיאת הרשאה (מפתח שגוי) או שהשרת דוחה אותנו. */
export function isTmdbAuthError(error: unknown): boolean {
  return error instanceof HttpError && (error.status === 401 || error.status === 403)
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

function buildApiUrl(path: string, apiKey: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE}${path}`)
  url.searchParams.set('api_key', apiKey.trim())
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/** Highest popularity wins; an exact title match always beats popularity. */
function pickBest(results: TmdbSearchResult[], query: string): TmdbSearchResult | undefined {
  if (results.length === 0) return undefined
  const wanted = normalizeForMatch(query)
  const exact = results.find((r) => {
    const names = [r.title, r.name, r.original_title, r.original_name]
    return names.some((n) => n && normalizeForMatch(n) === wanted)
  })
  if (exact) return exact
  return results.reduce((best, current) =>
    (current.popularity ?? 0) > (best.popularity ?? 0) ? current : best,
  )
}

export function createTmdbClient(apiKey: string, omdb?: OmdbClient): TmdbClient {
  const cache = new Map<string, Enrichment | null>()

  async function lookup(input: TmdbLookupInput): Promise<Enrichment | null> {
    if (!isTmdbConfigured(apiKey)) return null
    const query = cleanTitle(input.title)
    if (!query) return null

    const isSeries = input.isSeries
    const cacheKey = `${isSeries ? 'tv' : 'movie'}|${normalizeForMatch(query)}|${input.year ?? ''}`
    if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null

    // "לא נמצא" נשמר במטמון כדי לא לחזור על אותה בקשה; כשל ברשת או שגיאת
    // הרשאה עולים למעלה, כדי שהמנוע יוכל לעצור את השלב במקום לנסות שוב ושוב.
    const result = await resolve(query, input.year, isSeries, input.signal)
    cache.set(cacheKey, result)
    return result
  }

  async function searchOnce(
    query: string,
    year: number | undefined,
    isSeries: boolean,
    signal?: AbortSignal,
  ): Promise<TmdbSearchResult | undefined> {
    const path = isSeries ? '/search/tv' : '/search/movie'
    const params: Record<string, string | number | undefined> = { query, language: 'he-IL' }
    if (year !== undefined) {
      if (isSeries) params.first_air_date_year = year
      else params.year = year
    }
    const response = await fetchJson<TmdbSearchResponse>(buildApiUrl(path, apiKey, params), {
      signal,
      timeoutMs: TMDB_TIMEOUT_MS,
      retries: 0,
    })
    return pickBest(response?.results ?? [], query)
  }

  async function fetchDetails(
    id: number,
    isSeries: boolean,
    language: string,
    signal?: AbortSignal,
  ): Promise<TmdbDetails> {
    const path = isSeries ? `/tv/${id}` : `/movie/${id}`
    // external_ids נותן את מזהה ה-IMDb גם לסדרות (בסרטים הוא גם ב-imdb_id).
    return fetchJson<TmdbDetails>(
      buildApiUrl(path, apiKey, { language, append_to_response: 'external_ids' }),
      {
        signal,
        timeoutMs: TMDB_TIMEOUT_MS,
        retries: 0,
      },
    )
  }

  /**
   * צמצום אות כפולה בתעתיק עברי: המדריך כותב "הקרב על מידוויי" ו-TMDB
   * מכיר רק "הקרב על מידווי" — וכותרת עם האות הכפולה מחזירה אפס תוצאות,
   * כלומר הסרט מוצג בלי שום ציון למרות שהציון קיים.
   *
   * מצמצמים כל אות בנפרד (רק י, רק ו) ולא את שתיהן יחד: מ"מידוויי" צריך
   * להגיע ל"מידווי", וצמצום וו היה נותן "מידוי" — שעדיין לא נמצא.
   */
  function collapseRepeats(
    value: string,
    pattern: RegExp,
    replacement: string,
  ): string | undefined {
    const out = value.replace(pattern, replacement)
    if (out === value) return undefined
    return /[\p{L}\p{N}]/u.test(out) ? out : undefined
  }

  /**
   * החלק שלפני המפריד — "הקרב על מידווי - סרט מלחמה" → "הקרב על מידווי".
   *
   * מדריכי שידורים מוסיפים אחרי מפריד תיאור שהמנוע לא צריך: ז'אנר
   * ("סרט מלחמה"), "כתוביות", "מדובב" וכו'. TMDB לא מכיר את הצירוף המלא,
   * ולכן החיפוש חוזר ריק והסרט מוצג בלי שום ציון — למרות שהציון קיים.
   */
  function beforeSeparator(query: string): string | undefined {
    const cut = query.split(/\s+[-–—|/]\s+/)[0]?.trim()
    if (!cut || cut === query || cut.length < 3) return undefined
    return /[\p{L}\p{N}]/u.test(cut) ? cut : undefined
  }

  /**
   * האם התוצאה סבירה לכותרת המקורית. כשהחיפוש נעשה על כותרת מקוצרת, בלי
   * הבדיקה הזו הוא היה מחזיר לפעמים סרט אקראי ופופולרי מהמילה שנשארה.
   */
  function isPlausibleMatch(
    originalQuery: string,
    searchedQuery: string,
    result: TmdbSearchResult,
  ): boolean {
    const original = normalizeForMatch(originalQuery)
    const searched = normalizeForMatch(searchedQuery)
    return [result.title, result.name, result.original_title, result.original_name]
      .filter((name): name is string => Boolean(name))
      .map(normalizeForMatch)
      .some((name) => name !== '' && (original.includes(name) || name.includes(searched)))
  }

  /**
   * כותרת חלופית לחיפוש, אחרי שהכותרת כפי שהיא לא נמצאה:
   * קודם בלי התיאור שאחרי המפריד, ואם צריך — גם בלי אותיות כפולות.
   */
  function queryVariants(query: string): string[] {
    const shortened = beforeSeparator(query)
    const yod = collapseRepeats(query, /י{2,}/g, 'י')
    const vav = collapseRepeats(query, /ו{2,}/g, 'ו')
    const shortYod = shortened ? collapseRepeats(shortened, /י{2,}/g, 'י') : undefined
    const shortVav = shortened ? collapseRepeats(shortened, /ו{2,}/g, 'ו') : undefined
    const out: string[] = []
    // מהכי פחות פולשני להכי פולשני — כדי להגיע לכותרת הנכונה בסיבוב מוקדם.
    for (const candidate of [shortened, yod, vav, shortYod, shortVav]) {
      if (candidate && candidate !== query && !out.includes(candidate)) out.push(candidate)
    }
    return out
  }

  /**
   * כמה בקשות חיפוש מותרות לכותר אחד. כותרת שלא קיימת ב-TMDB נכשלת בכל
   * הווריאציות, ובלי תקרה היא הייתה מבזבזת את תקציב ההעשרה של כל הסריקה.
   */
  const MAX_SEARCHES_PER_TITLE = 8

  async function findMatch(
    query: string,
    year: number | undefined,
    isSeries: boolean,
    signal?: AbortSignal,
  ): Promise<TmdbSearchResult | undefined> {
    let searchesLeft = MAX_SEARCHES_PER_TITLE

    /** ניסיון אחד, ובגיבוי שני בלי השנה — ספקים מדווחים שנה שגויה. */
    const attempt = async (
      candidate: string,
      yearFallback: boolean,
    ): Promise<TmdbSearchResult | undefined> => {
      if (searchesLeft <= 0) return undefined
      searchesLeft -= 1
      const withYear = await searchOnce(candidate, year, isSeries, signal)
      if (withYear || year === undefined || !yearFallback || searchesLeft <= 0) return withYear
      searchesLeft -= 1
      return searchOnce(candidate, undefined, isSeries, signal)
    }

    // הכותרת כמו שהיא — עם הגיבוי בלי השנה, כי זו השליפה הרגילה.
    const exact = await attempt(query, true)
    if (exact) return exact

    // רק אחרי כישלון: וריאציות איות, ובלי הגיבוי של השנה כדי לחסוך בקשות.
    for (const variant of queryVariants(query)) {
      const found = await attempt(variant, false)
      if (found) return isPlausibleMatch(query, variant, found) ? found : undefined
    }
    return undefined
  }

  async function resolve(
    query: string,
    year: number | undefined,
    isSeries: boolean,
    signal?: AbortSignal,
  ): Promise<Enrichment | null> {
    const match = await findMatch(query, year, isSeries, signal)
    if (!match?.id) return null

    let details = await fetchDetails(match.id, isSeries, 'he-IL', signal)

    // Hebrew pages often exist without a localized overview.
    if (!details.overview || !details.overview.trim()) {
      try {
        const english = await fetchDetails(match.id, isSeries, 'en-US', signal)
        if (english?.overview?.trim()) {
          details = { ...english, genres: details.genres ?? english.genres }
        }
      } catch {
        // Keep whatever we already have.
      }
    }

    const voteCount = details.vote_count ?? match.vote_count ?? 0
    const rawRating = details.vote_average ?? match.vote_average
    const hasRating = voteCount > 0 && typeof rawRating === 'number' && rawRating > 0

    const releaseYear =
      parseYear(details.release_date ?? details.first_air_date) ??
      parseYear(match.release_date ?? match.first_air_date)
    const genres = (details.genres ?? [])
      .map((g) => g?.name?.trim())
      .filter((name): name is string => Boolean(name))

    const enrichment: Enrichment = {
      source: 'tmdb',
      tmdbId: details.id ?? match.id,
      tmdbMediaType: isSeries ? 'tv' : 'movie',
      tmdbRating: hasRating ? roundRating(rawRating) : 0,
      tmdbVotes: voteCount,
      popularity: details.popularity ?? match.popularity,
      overview: (details.overview ?? match.overview ?? '').trim() || undefined,
      genres: genres.length > 0 ? genres : undefined,
      posterPath: details.poster_path ?? match.poster_path ?? undefined,
      releaseYear,
      hebrewTitle: (details.title ?? details.name ?? match.title ?? match.name ?? '').trim() || undefined,
      numberOfSeasons: isSeries ? details.number_of_seasons : undefined,
      stillAiring: isSeries
        ? Boolean(details.status) && details.status !== 'Ended' && details.status !== 'Canceled'
        : undefined,
    }

    /*
     * OMDb משלים את מה של-TMDB אין: ציון IMDb ו-Rotten Tomatoes.
     * אם TMDB לא החזיר מזהה IMDb (למשל סדרה בלי external_ids), מנסים לפי
     * השם המקורי — כלומר כותרת באנגלית, כי לזו OMDb מכיר.
     */
    if (omdb) {
      const imdbId =
        (isSeries ? details.external_ids?.imdb_id : details.imdb_id) ??
        details.imdb_id ??
        details.external_ids?.imdb_id ??
        undefined
      const ratings = await omdb.lookup({
        imdbId: imdbId ?? undefined,
        title: imdbId ? undefined : (details.original_title ?? details.original_name ?? query),
        year: imdbId ? undefined : releaseYear,
        isSeries,
      })
      if (ratings) {
        if (ratings.imdbId) enrichment.imdbId = ratings.imdbId
        else if (imdbId) enrichment.imdbId = imdbId
        if (ratings.imdbRating !== undefined) enrichment.imdbRating = ratings.imdbRating
        if (ratings.imdbVotes !== undefined) enrichment.imdbVotes = ratings.imdbVotes
        if (ratings.rottenTomatoes !== undefined) enrichment.rottenTomatoes = ratings.rottenTomatoes
        if (ratings.metascore !== undefined) enrichment.metascore = ratings.metascore
      } else if (imdbId) {
        enrichment.imdbId = imdbId
      }
    }

    return enrichment
  }

  return { lookup }
}
