import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTmdbClient } from './tmdb'
import {
  createOmdbClient,
  fetchOmdbRatings,
  isOmdbConfigured,
  parseOmdbPayload,
} from './omdb'
import { scoreProgramme } from '../engine/score'
import { DEFAULT_SETTINGS } from '../config/settings'
import type { Classification } from '../engine/classify'
import type { Channel, Enrichment, Programme } from '../types'

/* ------------------------------------------------------------------ */
/* פרסור תגובת OMDb                                                    */
/* ------------------------------------------------------------------ */

/** תגובה אמיתית (מקוצרת) של OMDb עבור סרט עם ציון IMDb ו-Rotten Tomatoes. */
const OMDB_BODY = {
  Response: 'True',
  imdbID: 'tt1375666',
  imdbRating: '8.8',
  imdbVotes: '2,877,173',
  Metascore: '74',
  Ratings: [
    { Source: 'Internet Movie Database', Value: '8.8/10' },
    { Source: 'Rotten Tomatoes', Value: '86%' },
    { Source: 'Metacritic', Value: '74/100' },
  ],
}

describe('ציוני OMDb (IMDb / Rotten Tomatoes)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('מחלץ ציון IMDb, מצביעים, Rotten Tomatoes ו-Metascore', () => {
    expect(parseOmdbPayload(OMDB_BODY)).toEqual({
      imdbId: 'tt1375666',
      imdbRating: 8.8,
      imdbVotes: 2877173,
      metascore: 74,
      rottenTomatoes: 86,
    })
  })

  it('מתעלם מ-"N/A" ומחזיר null כשלא נמצא כותר', () => {
    const na = parseOmdbPayload({
      Response: 'True',
      imdbID: 'tt1',
      imdbRating: 'N/A',
      imdbVotes: 'N/A',
      Metascore: 'N/A',
      Ratings: [],
    })
    // יש מזהה IMDb אבל אין ציונים — אין מה להציג.
    expect(na).toEqual({ imdbId: 'tt1' })
    expect(parseOmdbPayload({ Response: 'False', Error: 'Movie not found!' })).toBeNull()
    expect(parseOmdbPayload(null)).toBeNull()
  })

  it('מחשב Rotten Tomatoes גם כשהוא לא תחת אותו שם בדיוק', () => {
    const ratings = parseOmdbPayload({
      Response: 'True',
      Ratings: [{ Source: 'Rotten Tomatoes', Value: '9' }],
    })
    expect(ratings?.rottenTomatoes).toBe(9)
  })

  it('לא מבצע בקשה בלי מפתח', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(isOmdbConfigured('')).toBe(false)
    expect(await fetchOmdbRatings({ apiKey: '', imdbId: 'tt1375666' })).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('חיפוש לפי מזהה IMDb, ובגיבוי לפי שם', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (url: unknown) => {
      urls.push(String(url))
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(OMDB_BODY) }
    })
    await fetchOmdbRatings({ apiKey: 'k', imdbId: 'tt1375666' })
    expect(urls[0]).toContain('i=tt1375666')

    await fetchOmdbRatings({ apiKey: 'k', title: 'Inception', year: 2010, isSeries: false })
    expect(urls[1]).toContain('t=Inception')
    expect(urls[1]).toContain('y=2010')
    expect(urls[1]).toContain('type=movie')
  })

  it('הלקוח לא זורק כש-OMDb נופל, ומטמן את התוצאה', async () => {
    const client = createOmdbClient('k')
    const fetchSpy = vi.fn(async () => {
      throw new Error('offline')
    })
    vi.stubGlobal('fetch', fetchSpy)
    expect(await client?.lookup({ imdbId: 'tt1375666' })).toBeNull()
    // קריאה שנייה לאותה בקשה — מהמטמון, בלי בקשה נוספת.
    expect(await client?.lookup({ imdbId: 'tt1375666' })).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(createOmdbClient('')).toBeUndefined()
  })
})

/* ------------------------------------------------------------------ */
/* חיבור TMDB + OMDb                                                   */
/* ------------------------------------------------------------------ */

const TMDB_SEARCH = {
  results: [{ id: 27205, title: 'התחלה', original_title: 'Inception', popularity: 90, vote_average: 8.4, vote_count: 35000 }],
}
const TMDB_DETAILS = {
  id: 27205,
  title: 'התחלה',
  original_title: 'Inception',
  overview: 'תקציר בעברית.',
  vote_average: 8.4,
  vote_count: 35000,
  genres: [{ name: 'מדע בדיוני' }],
  release_date: '2010-07-15',
  imdb_id: 'tt1375666',
  external_ids: { imdb_id: 'tt1375666' },
}

function stubNetwork(ombBody: unknown = OMDB_BODY) {
  const urls: string[] = []
  vi.stubGlobal('fetch', async (url: unknown) => {
    const href = String(url)
    urls.push(href)
    const body = href.includes('omdbapi.com')
      ? ombBody
      : href.includes('/search/')
        ? TMDB_SEARCH
        : TMDB_DETAILS
    return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) }
  })
  return urls
}

describe('העשרה משולבת TMDB + OMDb', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('מוסיף ציוני IMDb ו-Rotten Tomatoes לאותה העשרה של TMDB', async () => {
    const urls = stubNetwork()
    const client = createTmdbClient('tmdb-key', createOmdbClient('omdb-key'))
    const enrichment = await client.lookup({
      title: 'סרט: התחלה',
      year: 2010,
      category: 'movie',
      isSeries: false,
    })
    expect(enrichment?.tmdbRating).toBe(8.4)
    expect(enrichment?.hebrewTitle).toBe('התחלה')
    expect(enrichment?.imdbId).toBe('tt1375666')
    expect(enrichment?.imdbRating).toBe(8.8)
    expect(enrichment?.imdbVotes).toBe(2877173)
    expect(enrichment?.rottenTomatoes).toBe(86)
    expect(enrichment?.metascore).toBe(74)
    // ה-OMDb נשאל לפי מזהה ה-IMDb שהגיע מ-TMDB — לא לפי שם.
    const omdbUrl = urls.find((u) => u.includes('omdbapi.com'))
    expect(omdbUrl).toContain('i=tt1375666')
  })

  it('בלי OMDb ההעשרה נשארת כמו שהייתה', async () => {
    const urls = stubNetwork()
    const client = createTmdbClient('tmdb-key')
    const enrichment = await client.lookup({
      title: 'סרט: התחלה',
      year: 2010,
      category: 'movie',
      isSeries: false,
    })
    expect(enrichment?.tmdbRating).toBe(8.4)
    expect(enrichment?.imdbRating).toBeUndefined()
    expect(urls.some((u) => u.includes('omdbapi.com'))).toBe(false)
  })

  it('כותר שיש לו IMDb אבל אין לו ציון TMDB מדורג לפי IMDb', async () => {
    const programme: Programme = {
      channelId: 'mov1',
      channelName: 'HOT Cinema 1 HD',
      title: 'סרט: התחלה',
      start: 0,
      stop: 60_000,
      categories: ['סרט'],
    }
    const channel: Channel = { id: 'mov1', name: 'HOT Cinema 1 HD' }
    const classification: Classification = {
      category: 'movie',
      confidence: 1,
      sport: 'other',
      isReplay: false,
      isMatch: false,
    }
    // רק IMDb — כלומר TMDB החזיר התאמה בלי ציון, ו-OMDb השלים אותה.
    const enrichment: Enrichment = {
      source: 'tmdb',
      imdbId: 'tt1375666',
      imdbRating: 8.8,
      imdbVotes: 2_877_173,
    }
    const outcome = scoreProgramme(programme, channel, classification, {
      now: Date.UTC(2026, 9, 12, 18, 0, 0),
      settings: DEFAULT_SETTINGS,
      table: [],
      enrichment,
    })
    const ratings = outcome.reasons.find((reason) => reason.kind === 'ratings')
    expect(ratings?.text).toContain('IMDb')
    expect(ratings?.text).toContain('8.8')
  })
})

/* ------------------------------------------------------------------ */
/* כותרת שהמדריך האריך בתיאור אחרי מפריד                                */
/* ------------------------------------------------------------------ */

describe('חיפוש TMDB כשהמדריך מוסיף תיאור אחרי מפריד', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const MIDWAY = {
    id: 522162,
    title: 'הקרב על מידווי',
    original_title: 'Midway',
    popularity: 10.8,
    vote_average: 7.1,
    vote_count: 2829,
    release_date: '2019-11-06',
  }

  /** רשת מדומה שמחזירה תוצאות רק לשאילתה "טובה" — וזוכרת מה נשאל. */
  function stubSearch(goodQuery: string, goodResult: unknown, miss: unknown = { results: [] }) {
    const queries: string[] = []
    vi.stubGlobal('fetch', async (url: unknown) => {
      const href = String(url)
      const query = new URL(href).searchParams.get('query') ?? ''
      if (href.includes('/search/')) queries.push(query)
      const body = href.includes('omdbapi.com')
        ? OMDB_BODY
        : href.includes('/search/')
          ? query === goodQuery
            ? { results: [goodResult] }
            : miss
          : { ...MIDWAY, overview: 'סרט מלחמה.', genres: [{ name: 'מלחמה' }] }
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) }
    })
    return queries
  }

  it('מנסה שוב עם החלק שלפני המפריד ומקבל את הציון', async () => {
    // בדיוק מה שהמדריך שולח לנו: "הקרב על מידווי - סרט מלחמה".
    const queries = stubSearch('הקרב על מידווי', MIDWAY)
    const client = createTmdbClient('tmdb-key', createOmdbClient('omdb-key'))
    const enrichment = await client.lookup({
      title: 'הקרב על מידווי - סרט מלחמה',
      category: 'movie',
      isSeries: false,
    })

    expect(queries[0]).toBe('הקרב על מידווי - סרט מלחמה')
    expect(queries).toContain('הקרב על מידווי')
    expect(enrichment?.tmdbRating).toBe(7.1)
    expect(enrichment?.hebrewTitle).toBe('הקרב על מידווי')
    // וגם הציונים של OMDb מגיעים — אחרת הסרט היה מוצג בלי IMDb/RT.
    expect(enrichment?.imdbRating).toBe(8.8)
    expect(enrichment?.rottenTomatoes).toBe(86)
  })

  it('לא מאמץ תוצאה לא קשורה שהגיעה מהחיפוש המקוצר', async () => {
    const unrelated = {
      id: 999,
      title: 'חופשה משפחתית',
      original_title: 'Family Vacation',
      popularity: 880,
      vote_average: 9.9,
      vote_count: 50_000,
    }
    stubSearch('הקרב על מידווי', unrelated)
    const client = createTmdbClient('tmdb-key', createOmdbClient('omdb-key'))
    const enrichment = await client.lookup({
      title: 'הקרב על מידווי - סרט מלחמה',
      category: 'movie',
      isSeries: false,
    })

    // עדיף בלי ציון מאשר ציון של סרט אחר לגמרי.
    expect(enrichment).toBeNull()
  })

  it('איות כפול במדריך ("מידוויי") נמצא בסיבוב שני', async () => {
    // בדיוק מה שמגיע מהמדריך בפועל: י כפולה בסוף המילה.
    const queries = stubSearch('הקרב על מידווי', MIDWAY)
    const client = createTmdbClient('tmdb-key', createOmdbClient('omdb-key'))
    const enrichment = await client.lookup({
      title: 'סרט: הקרב על מידוויי',
      category: 'movie',
      isSeries: false,
    })

    expect(queries[0]).toBe('הקרב על מידוויי')
    expect(queries).toContain('הקרב על מידווי')
    expect(enrichment?.tmdbRating).toBe(7.1)
    expect(enrichment?.imdbRating).toBe(8.8)
  })

  it('כותרת בלי מפריד לא מפעילה חיפוש נוסף', async () => {
    const queries = stubSearch('הקרב על מידווי', MIDWAY)
    const client = createTmdbClient('tmdb-key', createOmdbClient('omdb-key'))
    const enrichment = await client.lookup({
      title: 'סרט: הקרב על מידווי',
      category: 'movie',
      isSeries: false,
    })

    expect(enrichment?.tmdbRating).toBe(7.1)
    // ניקוי הכותרת לבדו הספיק — בקשה אחת בלבד לחיפוש.
    expect(queries).toEqual(['הקרב על מידווי'])
  })
})
