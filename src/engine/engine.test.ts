import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  Channel,
  EpgSnapshot,
  PreferenceSettings,
  Programme,
  Recommendation,
  ScanProgress,
  Settings,
} from '../types'
import { CHANNELS_END_RATIO, buildRecommendations, buildScanResult } from './recommend'
import { classifyProgramme, isMatchPreview, parseMatchTeams } from './classify'
import { competitionImportance, detectCompetition, detectSport } from '../sports/teams'
import { SPORT_KINDS } from '../config/settings'
import { cleanTitle } from '../data/tmdb'
import { parseM3u } from '../data/m3u'
import { parseXmltv, parseXmltvTime } from '../data/xmltv'

/** 2026-10-10 18:00 UTC — זמן קבוע כדי שהבדיקות יהיו דטרמיניסטיות. */
const NOW = Date.UTC(2026, 9, 10, 18, 0, 0)
const MIN = 60_000

const CHANNELS: Channel[] = [
  { id: 'sport1', name: 'ספורט 1', group: 'ספורט' },
  { id: 'sport2', name: 'ספורט 2', group: 'ספורט' },
  { id: 'hot', name: 'HOT סדרות', group: 'סדרות' },
  { id: 'ch12', name: 'חדשות 12', group: 'חדשות' },
  { id: 'mov1', name: 'HOT סרטים', group: 'סרטים' },
  { id: 'mov2', name: 'yes סרטים', group: 'סרטים' },
]

function makeSettings(prefs: Partial<PreferenceSettings> = {}): Settings {
  return {
    provider: {
      mode: 'xtream',
      antifrizBase: 'https://antifriz.tv',
      host: 'example.invalid',
      username: 'u',
      password: 'p',
      m3uUrl: '',
      xmltvUrl: '',
      israeliOnly: true,
      israeliGroupHints: [],
      epgChannelIds: [],
      channelDelaySeconds: 10,
    },
    api: {
      tmdbApiKey: '',
      omdbApiKey: '',
      footballApiKey: '',
      footballBaseUrl: 'https://example.invalid',
    },
    prefs: {
      favoriteTeam: 'הפועל באר שבע',
      favoriteSeries: ['פאודה'],
      favoriteMovies: [],
      favoriteChannels: [],
      liveSportsOnly: true,
      // כברירת מחדל כל הענפים מסומנים — בדיקות הסינון מעבירות רשימה מצומצמת.
      sportKinds: [...SPORT_KINDS],
      minMovieRating: 6.8,
      hideUnratedMovies: true,
      minSeriesRating: 7,
      includeNews: true,
      lookAheadHours: 8,
      // ברירת המחדל של האפליקציה: לפי הזמן הקרוב, לא לפי הציון.
      sortMode: 'time',
      ...prefs,
    },
  }
}

interface Row {
  channelId: string
  title: string
  start: number
  stop: number
  categories?: string[]
  description?: string
  isLive?: boolean
  season?: number
  episodeNumber?: number
  episode?: string
  /** ציון מהמדריך (0-10) — משמש כשיש אין ציון מ-TMDB/IMDb. */
  rating?: number
}

function programme(row: Row): Programme {
  const channel = CHANNELS.find((entry) => entry.id === row.channelId)
  const out: Programme = {
    channelId: row.channelId,
    channelName: channel?.name ?? '',
    title: row.title,
    start: row.start,
    stop: row.stop,
    categories: row.categories ?? [],
    isLive: row.isLive ?? (row.start <= NOW && NOW < row.stop),
  }
  if (row.description) out.description = row.description
  if (row.rating !== undefined) out.rating = row.rating
  if (row.season !== undefined) out.season = row.season
  if (row.episodeNumber !== undefined) out.episodeNumber = row.episodeNumber
  if (row.episode) out.episode = row.episode
  return out
}

/** EPG מדומה בסגנון ספק ישראלי: דרבי חי, משחק של ב"ש, כפילויות סרט וכו'. */
const SNAPSHOT: EpgSnapshot = {
  channels: CHANNELS,
  programmes: [
    programme({
      channelId: 'sport1',
      title: 'כדורגל: מכבי תל אביב - הפועל תל אביב',
      start: NOW - 30 * MIN,
      stop: NOW + 60 * MIN,
      categories: ['ספורט'],
      isLive: true,
    }),
    programme({
      channelId: 'sport2',
      title: 'הפועל באר שבע - בית"ר ירושלים',
      start: NOW - 10 * MIN,
      stop: NOW + 80 * MIN,
      categories: ['ספורט'],
      isLive: true,
    }),
    programme({
      channelId: 'sport1',
      title: 'מכבי חיפה - הפועל חיפה',
      start: NOW + 120 * MIN,
      stop: NOW + 240 * MIN,
      categories: ['ספורט'],
      // משחק עתידי שהספק סימן כשידור ישיר — כלומר ישודר בשידור חי.
      isLive: true,
    }),
    programme({
      channelId: 'sport2',
      title: 'שידור חוזר: הפועל באר שבע - מכבי תל אביב',
      start: NOW + 30 * MIN,
      stop: NOW + 120 * MIN,
      categories: ['ספורט'],
      isLive: false,
    }),
    programme({
      channelId: 'hot',
      title: 'פאודה',
      start: NOW + 20 * MIN,
      stop: NOW + 80 * MIN,
      categories: ['סדרה'],
      episode: 'S03E04',
      season: 3,
      episodeNumber: 4,
    }),
    programme({
      channelId: 'hot',
      title: 'סדרה: משהו סתמי לגמרי',
      start: NOW + 40 * MIN,
      stop: NOW + 100 * MIN,
      categories: ['סדרה'],
    }),
    programme({
      channelId: 'mov1',
      title: 'סרט: 1917',
      start: NOW - 5 * MIN,
      stop: NOW + 115 * MIN,
      categories: ['סרט'],
    }),
    programme({
      channelId: 'mov2',
      title: 'סרט: 1917',
      start: NOW + 60 * MIN,
      stop: NOW + 180 * MIN,
      categories: ['סרט'],
    }),
    programme({
      channelId: 'ch12',
      title: 'מהדורה ראשית',
      start: NOW - 5 * MIN,
      stop: NOW + 55 * MIN,
      categories: ['חדשות'],
      isLive: true,
    }),
  ],
  warnings: [],
}

async function recommend(prefs: Partial<PreferenceSettings> = {}) {
  const warnings: { code: string; message: string }[] = []
  const recommendations = await buildRecommendations(
    SNAPSHOT,
    makeSettings(prefs),
    NOW,
    undefined,
    warnings,
  )
  return { recommendations, warnings }
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* שלב חיפוש הביקורות (העשרה מ-TMDB)                                    */
/* ------------------------------------------------------------------ */

describe('התקדמות חיפוש הביקורות', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  type Behavior =
    /** חיפוש ופרטים תקינים. */
    | { kind: 'ok' }
    /** החיפוש לא מחזיר תוצאות (כותר לא נמצא). */
    | { kind: 'not-found' }
    /** המפתח נדחה (401). */
    | { kind: 'auth' }
    /** שרת שבור (500). */
    | { kind: 'server-error' }
    /** תקין עד N בקשות ואז נשבר. */
    | { kind: 'flaky'; okCalls: number }

  /** סנאפשוט עם הרבה סרטים — כדי לבדוק עצירה של השלב ולא רק שני כותרים. */
  function manyMovies(count: number, stepMinutes = 30): EpgSnapshot {
    return {
      channels: [{ id: 'mov1', name: 'HOT סרטים', group: 'סרטים' }],
      programmes: Array.from({ length: count }, (_, index) =>
        programme({
          channelId: 'mov1',
          title: `סרט: כותר ${index}`,
          start: NOW + (index + 1) * stepMinutes * MIN,
          stop: NOW + (index + 1) * stepMinutes * MIN + 90 * MIN,
          categories: ['סרט'],
        }),
      ),
      warnings: [],
    }
  }

  function tmdbStub(behavior: Behavior, counter: { calls: number }) {
    return async (url: unknown) => {
      counter.calls += 1
      const fail = (status: number, statusText: string) => ({
        ok: false,
        status,
        statusText,
        text: async () => JSON.stringify({ status_message: statusText }),
      })
      if (behavior.kind === 'auth') return fail(401, 'Unauthorized')
      if (behavior.kind === 'server-error') return fail(500, 'Server Error')
      if (behavior.kind === 'flaky' && counter.calls > behavior.okCalls) {
        return fail(500, 'Server Error')
      }

      const body = String(url).includes('/search/')
        ? {
            results:
              behavior.kind === 'not-found'
                ? []
                : [
                    {
                      id: 7,
                      title: 'כותר',
                      name: 'כותר',
                      popularity: 40,
                      vote_average: 8.2,
                      vote_count: 9000,
                    },
                  ],
          }
        : {
            id: 7,
            title: 'כותר',
            vote_average: 8.2,
            vote_count: 9000,
            overview: 'תקציר בעברית.',
            genres: [{ name: 'דרמה' }],
            release_date: '2019-12-25',
          }
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) }
    }
  }

  async function enrichRun(
    behavior: Behavior,
    options: { movies?: number; snapshot?: EpgSnapshot; prefs?: Partial<PreferenceSettings> } = {},
  ) {
    const counter = { calls: 0 }
    vi.stubGlobal('fetch', tmdbStub(behavior, counter))
    const events: ScanProgress[] = []
    const warnings: { code: string; message: string }[] = []
    const settings = makeSettings(options.prefs)
    settings.api.tmdbApiKey = 'demo-key'
    const recommendations = await buildRecommendations(
      options.snapshot ?? manyMovies(options.movies ?? 12),
      settings,
      NOW,
      undefined,
      warnings,
      (progress) => events.push(progress),
    )
    const enrich = events.filter((event) => event.phase === 'enrich')
    return { enrich, warnings, recommendations, calls: counter.calls }
  }

  /** האם הייתה אזהרה כלשהי שקשורה ל-TMDB. */
  function tmdbWarnings(warnings: readonly { code: string }[]): string[] {
    return warnings.filter((warning) => warning.code.startsWith('tmdb')).map((w) => w.code)
  }

  it('הערוצים מסתיימים על 95% — הביקורות מקבלות את 5% האחרונים', () => {
    // ההמתנה האמיתית היא לערוצים; חיפוש הביקורות קצר, ואם הוא מקבל רבע
    // מהבאר המשתמש תקוע על 80% בזמן שהסריקה כבר נגמרה.
    expect(CHANNELS_END_RATIO).toBeCloseTo(0.95, 6)
  })

  it('מדווח על המעבר מהערוצים לחיפוש ביקורות וציונים', async () => {
    const { enrich, warnings } = await enrichRun({ kind: 'ok' })

    expect(enrich.length).toBeGreaterThan(1)
    expect(enrich[0].message).toContain('סיים להביא את הערוצים')
    expect(enrich[0].message).toContain('TMDB')
    expect(enrich[0].done).toBe(0)
    expect(enrich[0].total).toBe(12)

    const last = enrich[enrich.length - 1]
    expect(last.done).toBe(enrich[0].total)
    expect(last.ratio).toBeCloseTo(1, 6)
    expect(last.ratio).toBeGreaterThan(enrich[0].ratio)
    expect(tmdbWarnings(warnings)).toEqual([])
  })

  it('כותר שלא נמצא אינו נחשב כשל — השלב ממשיך עד הסוף', async () => {
    const { enrich, warnings } = await enrichRun({ kind: 'not-found' })
    expect(enrich[enrich.length - 1].done).toBe(12)
    expect(tmdbWarnings(warnings)).toEqual([])
  })

  it('עוצר מיד כשהמפתח נדחה ומזהיר על מפתח שגוי', async () => {
    const { warnings, calls } = await enrichRun({ kind: 'auth' }, { movies: 40 })
    // עצירה בגל הראשון — לא ממשיכים לנסות עשרות כותרים עם מפתח שגוי.
    expect(calls).toBeLessThanOrEqual(5)
    expect(tmdbWarnings(warnings)).toEqual(['tmdbKeyRejected'])
  })

  it('עוצר אחרי כמה כשלי שרת ומדווח שהשרת לא זמין', async () => {
    const { warnings, calls } = await enrichRun({ kind: 'server-error' }, { movies: 40 })
    // לכל היותר 3 כשלים (וגל אחד של במקביליות) — לא 12 כותרים.
    expect(calls).toBeLessThanOrEqual(8)
    expect(tmdbWarnings(warnings)).toEqual(['tmdbUnreachable'])
  })

  it('כשחלק מהתכניות הועשרו ואז השרת נפל — מזהיר על העשרה חלקית', async () => {
    const { warnings } = await enrichRun({ kind: 'flaky', okCalls: 10 }, { movies: 40 })
    expect(tmdbWarnings(warnings)).toEqual(['tmdbPartial'])
  })

  it('מעשיר את כל הסרטים — אין תקרה של 28', async () => {
    const { enrich, calls, recommendations } = await enrichRun(
      { kind: 'ok' },
      // 40 כותרות בתוך חלון הסריקה (8 שעות) — יותר מהתקרה הישנה.
      { snapshot: manyMovies(40, 5) },
    )
    expect(enrich[0].total).toBe(40)
    expect(enrich[enrich.length - 1].done).toBe(40)
    // חיפוש אחד ופרטים אחד לכל כותרת — 80 בקשות, לא 56 של התקרה הישנה.
    expect(calls).toBe(80)
    expect(recommendations.length).toBeGreaterThan(0)
  })

  it('מוציא מהדורת המלצות עוד לפני שנשלף ציון אחד, ומעדכן כשהציונים מגיעים', async () => {
    const counter = { calls: 0 }
    vi.stubGlobal('fetch', tmdbStub({ kind: 'ok' }, counter))
    const settings = makeSettings()
    settings.api.tmdbApiKey = 'demo-key'
    const editions: { items: Recommendation[]; calls: number }[] = []
    const warnings: { code: string; message: string }[] = []
    await buildRecommendations(manyMovies(12), settings, NOW, undefined, warnings, undefined, (partial) =>
      editions.push({ items: partial, calls: counter.calls }),
    )

    // המהדורה הראשונה יוצאת **לפני** כל בקשה — ובלי שום ציון.
    expect(editions.length).toBeGreaterThan(1)
    expect(editions[0].calls).toBe(0)
    expect(editions[0].items.every((item) => item.enrichment === undefined)).toBe(true)

    // המהדורה האחרונה — כל 12 הסרטים, כולם עם ציון, אחרי שהבקשות יצאו.
    const last = editions[editions.length - 1]
    expect(last.calls).toBeGreaterThan(0)
    expect(last.items.length).toBe(12)
    expect(last.items.every((item) => item.enrichment?.tmdbRating === 8.2)).toBe(true)
  })

  it('ההמלצות עדיין נוצרות גם בלי העשרה', async () => {
    const { recommendations } = await enrichRun({ kind: 'auth' }, { snapshot: SNAPSHOT })
    expect(recommendations.length).toBeGreaterThan(0)
  })

  /*
   * "סרטים בלי ציון ובלי ביקורת — אין טעם להציג": כשהמסד של הסרטים לא
   * מכיר את הכותר, אין לכרטיס שום דבר חוץ משם ושעה.
   */
  function moviesOf(recommendations: readonly Recommendation[]) {
    return recommendations.filter((entry) => entry.category === 'movie')
  }

  it('סרט שהמסד לא הכיר — בלי ציון ובלי תקציר — לא מוצג בכלל', async () => {
    const known = await enrichRun({ kind: 'ok' }, { movies: 6 })
    const unknown = await enrichRun({ kind: 'not-found' }, { movies: 6 })

    // אותו סנאפשוט בדיוק: כשיש ציון הכרטיסים מוצגים, וכשאין — אין כרטיסים.
    expect(moviesOf(known.recommendations).length).toBe(6)
    expect(moviesOf(unknown.recommendations)).toEqual([])
  })

  /**
   * סרטים עם ציון מהמדריך בלבד (בלי TMDB) — כרטיסים שמעניינים גם כשהמסד
   * לא מכיר אותם, כדי שהבדיקה תבדוק את הסינון החדש ולא את סף הציון הכללי.
   */
  function ratedMovies(titles: string[]): EpgSnapshot {
    return {
      channels: [{ id: 'mov1', name: 'HOT סרטים', group: 'סרטים' }],
      programmes: titles.map((title, index) =>
        programme({
          channelId: 'mov1',
          title,
          start: NOW + (index + 1) * 30 * MIN,
          stop: NOW + (index + 1) * 30 * MIN + 90 * MIN,
          categories: ['סרט'],
          rating: 8,
        }),
      ),
      warnings: [],
    }
  }

  it('בלי מפתח TMDB הסרטים נשארים — לא מסתירים מה שלא בדקנו', async () => {
    const counter = { calls: 0 }
    vi.stubGlobal('fetch', tmdbStub({ kind: 'not-found' }, counter))
    const warnings: { code: string; message: string }[] = []
    // המפתח ריק: אין שאילתה בכלל, ולכן גם אין על מה להסתמך כדי להסתיר.
    const recommendations = await buildRecommendations(
      ratedMovies(['סרט: אלפא', 'סרט: בטא']),
      makeSettings(),
      NOW,
      undefined,
      warnings,
    )
    expect(counter.calls).toBe(0)
    expect(moviesOf(recommendations).length).toBe(2)
  })

  it('סרט מהמועדפים שלי מוצג גם כשהמסד לא הכיר אותו', async () => {
    const { recommendations } = await enrichRun(
      { kind: 'not-found' },
      {
        snapshot: ratedMovies(['סרט: אלפא', 'סרט: בטא', 'סרט: גמא']),
        prefs: { favoriteMovies: ['סרט: גמא'] },
      },
    )
    expect(moviesOf(recommendations).map((entry) => entry.programme.title)).toEqual([
      'סרט: גמא',
    ])
  })

  it('אפשר לכבות את הסינון בהגדרות', async () => {
    const { recommendations } = await enrichRun(
      { kind: 'not-found' },
      { snapshot: ratedMovies(['סרט: אלפא', 'סרט: בטא', 'סרט: גמא']), prefs: { hideUnratedMovies: false } },
    )
    expect(moviesOf(recommendations).length).toBe(3)
  })

  it('כשההעשרה נפלה לגמרי, טאב הסרטים לא מתרוקן — לא בדקנו, ולכן לא מסתירים', async () => {
    const { recommendations } = await enrichRun(
      { kind: 'server-error' },
      { snapshot: ratedMovies(['סרט: אלפא', 'סרט: בטא', 'סרט: גמא']) },
    )
    expect(moviesOf(recommendations).length).toBe(3)
  })
})

describe('סיווג תכניות', () => {
  it('מזהה סרט לפי תווית מפורשת', () => {
    const result = classifyProgramme(programme({
      channelId: 'mov1',
      title: 'סרט: 1917',
      start: NOW,
      stop: NOW + MIN,
      categories: ['סרט'],
    }))
    expect(result.category).toBe('movie')
  })

  it('לא מתבלבל בין "סרטון" ל"סרט"', () => {
    // ערוץ כללי בכוונה — כדי לבדוק את אותות הכותרת בלבד.
    const result = classifyProgramme({
      channelId: 'neutral',
      channelName: 'ערוץ כללי',
      title: 'סרטון של החיים',
      start: NOW,
      stop: NOW + MIN,
      categories: [],
    })
    expect(result.category).not.toBe('movie')
  })

  it('מזהה משחק כדורגל על שם הקבוצות', () => {
    const result = classifyProgramme(programme({
      channelId: 'sport1',
      title: 'כדורגל: מכבי תל אביב - הפועל תל אביב',
      start: NOW,
      stop: NOW + MIN,
      categories: ['ספורט'],
    }))
    expect(result.category).toBe('sport')
    expect(result.homeTeam).toBe('מכבי תל אביב')
    expect(result.awayTeam).toBe('הפועל תל אביב')
  })

  it('מזהה סדרה לפי מספר פרק', () => {
    const result = classifyProgramme(programme({
      channelId: 'hot',
      title: 'פאודה',
      start: NOW,
      stop: NOW + MIN,
      categories: [],
      episode: 'S03E04',
    }))
    expect(result.category).toBe('series')
  })

  it('מזהה מהדורת חדשות', () => {
    const result = classifyProgramme(programme({
      channelId: 'ch12',
      title: 'מהדורה ראשית',
      start: NOW,
      stop: NOW + MIN,
      categories: ['חדשות'],
    }))
    expect(result.category).toBe('news')
  })

  it('מחלץ קבוצות מתוך כותרת עם קידומת', () => {
    expect(parseMatchTeams('כדורגל: מכבי תל אביב - הפועל תל אביב')).toEqual({
      home: 'מכבי תל אביב',
      away: 'הפועל תל אביב',
    })
  })

  /*
   * הכותרות האמיתיות מלוח השידורים של antifriz: הן נפתחות ב"ישיר!" ובחלקן
   * יש סוגריים בהערה ("אל נאסר (רונאלדו)"). בלי הבדיקות האלה אף משחק זר
   * לא מקבל קבוצות — ולכן גם לא מיקום בטבלה.
   */
  it('מחלץ קבוצות מכותרות אמיתיות של "ישיר!"', () => {
    expect(parseMatchTeams('ישיר! אטאלנטה - ונציה')).toEqual({
      home: 'אטאלנטה',
      away: 'ונציה',
    })
    expect(parseMatchTeams("ישיר! אל נאסר (רונאלדו) - נפטצ'י פרגונה")).toEqual({
      home: 'אל נאסר',
      away: "נפטצ'י פרגונה",
    })
    expect(parseMatchTeams('ישיר! גלאטסראיי - בורסאספור')).toEqual({
      home: 'גלאטסראיי',
      away: 'בורסאספור',
    })
  })

  it('מוציא את מילת הפתיחה שנדבקה לצד של המשחק', () => {
    // הכותרת האמיתית מהמדריך: "לקראת מ. פ''ת - מכבי חיפה".
    expect(parseMatchTeams("לקראת מ. פ''ת - מכבי חיפה")).toEqual({
      home: 'מכבי פתח תקווה',
      away: 'מכבי חיפה',
    })
  })

  it('פרומו למשחק ("ישיר! לקראת …") אינו מומלץ כהמלצה נפרדת', () => {
    // המדריך משדר הקדמה קצרה ואחריה את המשחק עצמו — בלי הסינון המשחק
    // מופיע פעמיים ברשימה.
    const sportChannel = CHANNELS.find((entry) => entry.id === 'sport2') as Channel
    const promo = programme({
      channelId: 'sport2',
      title: "ישיר! לקראת מ. פ''ת - מכבי חיפה",
      description: 'שידור ישיר: כדורגל. לקראת המשחק בליגת העל.',
      start: NOW,
      stop: NOW + 60 * MIN,
      categories: ['ספורט', 'כדורגל'],
    })
    const match = programme({
      channelId: 'sport2',
      title: "ישיר! מ. פ''ת - מכבי חיפה",
      description: 'שידור ישיר: כדורגל. ליגת העל, מחזור 7.',
      start: NOW,
      stop: NOW + 90 * MIN,
      categories: ['ספורט', 'כדורגל'],
    })
    expect(isMatchPreview("ישיר! לקראת מ. פ''ת - מכבי חיפה")).toBe(true)
    expect(isMatchPreview("ישיר! לקראת אברטון - צ'לסי")).toBe(true)
    expect(isMatchPreview('לקראת המחזור בליגה האנגלית')).toBe(true)
    expect(isMatchPreview("ישיר! מ. פ''ת - מכבי חיפה")).toBe(false)
    expect(classifyProgramme(promo, sportChannel).category).not.toBe('sport')
    expect(classifyProgramme(match, sportChannel).category).toBe('sport')
  })

  it('מתרגם קיצורי מדריך לשמות קבוצות תקניים', () => {
    expect(parseMatchTeams('ישיר! ה. י-ם - מ. חיפה')).toEqual({
      home: 'הפועל ירושלים',
      away: 'מכבי חיפה',
    })
    expect(parseMatchTeams('ישיר! ה. ק״ש - ה. ת״א')).toEqual({
      home: 'עירוני קריית שמונה',
      away: 'הפועל תל אביב',
    })
  })

  it('לא מזהה תכנית אולפן או מחזור כמשחק', () => {
    expect(parseMatchTeams('שידור ישיר: מחזור 7 - סיכום')).toBeNull()
    expect(parseMatchTeams('ישיר! אולפן ליגת האלופות - דיון')).toBeNull()
  })

  /*
   * שלושת המקרים האלה מגיעים מהנתונים האמיתיים של הספק: התקציר נפתח בתווית
   * הענף ("שידור ישיר: כדורגל. ..."), ולפעמים שם המסגרת מטעה ("ליגת ווינר"
   * היא של הכדורסל, אבל המשחק עצמו כדורגל).
   */
  it('מעדיף את תווית הענף המפורשת על פני שם המסגרת', () => {
    const football = classifyProgramme(
      programme({
        channelId: 'sport1',
        title: 'ישיר! ה. י-ם - מ. חיפה',
        description: 'שידור ישיר: כדורגל. הפועל ירושלים נגד מכבי חיפה, ליגת ווינר, מחזור 6.',
        start: NOW,
        stop: NOW + MIN,
        categories: ['ספורט'],
      }),
    )
    expect(football.sport).toBe('football')
    expect(football.homeTeam).toBe('הפועל ירושלים')
    expect(football.awayTeam).toBe('מכבי חיפה')

    const basketball = classifyProgramme(
      programme({
        channelId: 'sport1',
        title: 'ישיר! גלאטסראיי - בורסאספור',
        description: 'שידור ישיר: גלאטסראיי - בורסאספור, כדורסל טורקי, מחזור 3, עונת 2026/27.',
        start: NOW,
        stop: NOW + MIN,
        categories: ['ספורט'],
      }),
    )
    expect(basketball.sport).toBe('basketball')
  })

  /*
   * המקרה האמיתי: Sport 5+ HD, 19:00 — כדורעף נשים, אבל שם המסגרת הוא
   * "ליגת העל" בדיוק כמו של ליגת הכדורגל. האות ב' שדבוקה למילה
   * ("בכדורעף") הפילה את זיהוי הענף, והמשחק סווג ככדורגל בליגת העל.
   */
  it('מזהה כדורעף גם כשאות השימוש דבוקה למילה', () => {
    const result = classifyProgramme(programme({
      channelId: 'sport1',
      title: 'ישיר! מ. אשדוד - מ. חדרה',
      description: 'שידור ישיר: מכבי אשדוד נגד מכבי חדרה, ליגת העל בכדורעף נשים, מחזור 1.',
      start: NOW,
      stop: NOW + 155 * MIN,
      categories: ['ספורט'],
      isLive: true,
    }))
    expect(result.category).toBe('sport')
    expect(result.sport).toBe('volleyball')
    expect(result.competition).toBe('ליגת העל')
    // שם הקבוצה נשאר כפי שהוא במדריך: "מכבי אשדוד" בכדורעף אינה "מ.ס. אשדוד"
    // של הכדורגל, ולכן אין כאן הלבשת שם של מועדון כדורגל.
    expect(result.homeTeam).toBe('מ. אשדוד')
    expect(result.awayTeam).toBe('מ. חדרה')
  })

  it('מזהה את שם הליגה שבתקציר של הספק', () => {
    expect(
      detectCompetition(
        'שידור ישיר: כדורגל. קובנטרי - ניוקאסל, הליגה האנגלית, מחזור 6, עונת 2026/27.',
      ),
    ).toBe('הליגה האנגלית')
    expect(detectCompetition('שידור ישיר: כדורגל. אטאלנטה - ונציה, ליגה איטלקית')).toBe(
      'ליגה איטלקית',
    )
    expect(detectCompetition('שידור ישיר: כדורגל. סט. לואיס - לוס אנג\'לס גלאקסי, ליגת ה-MLS')).toBe(
      'ליגת ה-MLS',
    )
    // ה"א הידיעה נוספת בעברית על *כל* המילים — "הליגה הגרמנית" ולא רק
    // "ליגה גרמנית". הליגה השנייה מזוהת כישות נפרדת ולא כליגה הראשונה.
    expect(detectCompetition('הליגה הגרמנית: באיירן מינכן - דורטמונד')).toBe('ליגה גרמנית')
    expect(detectCompetition('הליגה הגרמנית השנייה: שאלקה - המבורג')).toBe(
      'הליגה הגרמנית השנייה',
    )
    expect(detectCompetition('ליגה גרמנית שנייה: שאלקה - המבורג')).toBe('הליגה הגרמנית השנייה')
    expect(
      detectCompetition('שידור ישיר: כדורגל. אל נאסר - נפטצ\'י פרגונה, ליגת האלופות של אסיה'),
    ).toBe('ליגת האלופות של אסיה')
  })

  it('מזהה שידור חוזר', () => {
    const result = classifyProgramme(programme({
      channelId: 'sport2',
      title: 'שידור חוזר: הפועל באר שבע - מכבי תל אביב',
      start: NOW,
      stop: NOW + MIN,
    }))
    expect(result.category).toBe('sport')
    expect(result.isReplay).toBe(true)
  })

  it('מבדיל משחק מתכנית אולפן', () => {
    const match = classifyProgramme(programme({
      channelId: 'sport1',
      title: 'כדורגל: מכבי תל אביב - הפועל תל אביב',
      start: NOW,
      stop: NOW + MIN,
      categories: ['ספורט'],
    }))
    expect(match.isMatch).toBe(true)

    const studio = classifyProgramme(programme({
      channelId: 'sport1',
      title: 'אולפן ליגת העל — סיכום המחזור',
      start: NOW,
      stop: NOW + MIN,
      categories: ['ספורט'],
    }))
    expect(studio.category).toBe('sport')
    expect(studio.isMatch).toBe(false)
  })
})

describe('ניקוד והמלצות', () => {
  it('כל המלצה מגיעה עם הסבר אחד לפחות', async () => {
    const { recommendations } = await recommend()
    expect(recommendations.length).toBeGreaterThan(0)
    for (const recommendation of recommendations) {
      expect(recommendation.reasons.length).toBeGreaterThan(0)
    }
  })

  it('בקטגוריית ספורט נכנסים רק משחקים — בלי שידורי חוזר', async () => {
    const { recommendations } = await recommend()
    const sport = recommendations.filter((entry) => entry.category === 'sport')
    expect(sport.length).toBeGreaterThan(0)
    expect(sport.length).toBeLessThan(SNAPSHOT.programmes.length)
    for (const entry of sport) {
      expect(entry.programme.title).not.toContain('שידור חוזר')
      expect(entry.programme.stop).toBeGreaterThan(NOW)
    }
    // גם משחק שעוד לא התחיל הוא שידור ישיר — המשחק שבעוד שעתיים נכנס גם הוא.
    expect(sport.some((entry) => entry.status !== 'live')).toBe(true)
  })

  it('המשחק החי של הקבוצה האהודה מקבל ציון מועדף', async () => {
    const { recommendations } = await recommend()
    const favorite = recommendations.find((entry) => entry.favoriteTeam)
    expect(favorite).toBeDefined()
    expect(favorite?.score).toBeGreaterThanOrEqual(85)
    expect(favorite?.verdict).toContain('הפועל באר שבע')
    // אותו משחק בדיוק כשידור חוזר — לא מוצג.
    expect(
      recommendations.some((entry) => entry.programme.title.includes('שידור חוזר')),
    ).toBe(false)
  })

  it('הדרבי התל אביבי מסומן כדרבי עם נימוק יריבות וג׳וס גבוה', async () => {
    const { recommendations } = await recommend()
    const derby = recommendations.find((entry) =>
      entry.programme.title.includes('מכבי תל אביב - הפועל תל אביב'),
    )
    expect(derby).toBeDefined()
    expect(derby?.sport?.isDerby).toBe(true)
    expect(derby?.sport?.rivalryLabel).toBe('דרבי תל אביבי')
    expect(derby?.reasons.some((reason) => reason.kind === 'rivalry')).toBe(true)
    expect(derby?.sport?.juice).toBeGreaterThan(50)
    expect(derby?.sport?.juiceLabel).toBeTruthy()
  })

  it('הכרטיס לא חוזר על אותו מידע: כותרת בלי שם הערוץ וה"למה" בלי הציון', async () => {
    const { recommendations } = await recommend()
    const sport = recommendations.filter((entry) => entry.category === 'sport')

    // כותרת של משחק לא חוזרת על שם הערוץ — התג הצהוב הזה כבר על המסך.
    for (const entry of sport) {
      expect(entry.headline).not.toContain(entry.channel.name)
    }

    // הציון מוצג פעם אחת — בשורת הציונים שבכרטיס — ולא שוב במילים.
    const withRatings = recommendations.filter(
      (entry) => entry.category === 'movie' || entry.category === 'series',
    )
    expect(withRatings.length).toBeGreaterThan(0)
    for (const entry of withRatings) {
      expect(entry.verdict).not.toMatch(/\d\.\d/)
    }
  })

  it('משחק רגיל — בלי קבוצה אהודה, דרבי או מסגרת חשובה — נשאר בלי כותרת', async () => {
    // הבדיקה הזו נעשית על סנאפשוט קטן וממוקד: בסנאפשוט הגדול כל משחק
    // "גדול" מסיבה כלשהי (קבוצה אהודה, דרבי או ליגת האלופות).
    const snapshot: EpgSnapshot = {
      channels: [CHANNELS[1]],
      programmes: [
        programme({
          channelId: 'sport2',
          title: 'כדורגל: עירוני טבריה - מכבי פתח תקווה',
          start: NOW - 5 * MIN,
          stop: NOW + 100 * MIN,
          categories: ['ספורט', 'כדורגל'],
          isLive: true,
        }),
      ],
      warnings: [],
    }
    const warnings: { code: string; message: string }[] = []
    const recommendations = await buildRecommendations(
      snapshot,
      makeSettings(),
      NOW,
      undefined,
      warnings,
    )

    const match = recommendations.find((entry) => entry.category === 'sport')
    expect(match).toBeDefined()
    expect(match?.headline).toBe('')
  })

  it('משחק בליגה הלאומית לא מוצג כליגת העל — המדריך כתב את הליגה במפורש', async () => {
    // הטקסט האמיתי מהמדריך של המשתמש: הכותרת מזכירה רק את הקבוצות, ושם
    // הליגה ("ליגה לאומית") מופיע בתיאור. מ.ס. אשדוד מוכרת מהליגה הראשונה,
    // ולכן בלי קריאת התיאור המשחק היה מסומן כליגת העל עם טבלה של ליגה אחרת.
    const snapshot: EpgSnapshot = {
      channels: [CHANNELS[1]],
      programmes: [
        programme({
          channelId: 'sport2',
          title: 'המשחק 15:45 ישיר! מ.ס. אשדוד - מ. קריית גת',
          description: 'שידור ישיר: כדורגל. מ.ס. אשדוד נגד מכבי קריית גת, ליגה לאומית, מחזור 10',
          start: NOW,
          stop: NOW + 120 * MIN,
          categories: ['ספורט'],
          isLive: true,
        }),
      ],
      warnings: [],
    }
    // בלי רשת — כאן בודקים את השיוך לליגה, לא את מקור הטבלה.
    vi.stubGlobal('fetch', async () => {
      throw new Error('network disabled in this test')
    })
    try {
      const warnings: { code: string; message: string }[] = []
      const recommendations = await buildRecommendations(
        snapshot,
        makeSettings(),
        NOW,
        undefined,
        warnings,
      )

      const match = recommendations.find((entry) => entry.category === 'sport')
      expect(match).toBeDefined()
      expect(match?.sport?.competition).toBe('הליגה הלאומית')
      // המשחק שייך לליגה הלאומית: גם בלי טבלה אין מיקום מליגת העל.
      expect(match?.sport?.homeTeam?.leagueName).toBe('הליגה הלאומית')
      expect(match?.sport?.homeTeam?.rankText).toBeUndefined()
      expect(match?.sport?.awayTeam?.rankText).toBeUndefined()
      // וגם לא כותרת של משחק גדול: ליגה שנייה היא לא ליגת העל.
      expect(match?.headline).toBe('')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('מציג את מיקום הקבוצות בטבלה', async () => {
    const { recommendations } = await recommend()
    const withTable = recommendations.find(
      (entry) => entry.sport?.homeTeam?.rankText && entry.sport?.awayTeam?.rankText,
    )
    expect(withTable).toBeDefined()
    expect(withTable?.sport?.homeTeam?.position).toBeGreaterThan(0)
  })

  it('מזהה סדרה מועדפת גם אם אינה נחשבת טובה', async () => {
    const { recommendations } = await recommend()
    const favorite = recommendations.find((entry) => entry.favorite && entry.category === 'series')
    expect(favorite).toBeDefined()
    expect(favorite?.score).toBeGreaterThanOrEqual(82)
    expect(favorite?.status).toBe('starting-soon')
    expect(favorite?.reasons.some((reason) => reason.kind === 'favorite')).toBe(true)
  })

  it('מאחד כפילויות של אותו סרט בערוצים שונים', async () => {
    const { recommendations } = await recommend()
    const movies = recommendations.filter((entry) => entry.category === 'movie')
    expect(movies).toHaveLength(1)
    expect(movies[0].reasons.some((reason) => reason.kind === 'alternates')).toBe(true)
  })

  it('מחזיר קטגוריית חדשות כשהיא דלוקה ומסיר אותה כשהיא כבויה', async () => {
    const withNews = await recommend()
    expect(withNews.recommendations.some((entry) => entry.category === 'news')).toBe(true)

    const withoutNews = await recommend({ includeNews: false })
    expect(withoutNews.recommendations.some((entry) => entry.category === 'news')).toBe(false)
  })

  it('מסנן ערוצים לא ישראליים כשההגדרה דלוקה', async () => {
    const { recommendations } = await recommend()
    for (const recommendation of recommendations) {
      expect(CHANNELS.map((channel) => channel.id)).toContain(recommendation.channel.id)
    }
  })
})

/* ------------------------------------------------------------------ */
/* סרטים: ציון מינימלי                                                  */
/* ------------------------------------------------------------------ */

describe('סרטים — ציון 7 ומעלה', () => {
  /**
   * ארבעה סרטים באותו סנאפשוט: מתחת לסף, בדיוק על הסף, גבוה, ובלי ציון
   * בכלל. כולם עם מספיק נקודות אחרות (ערוץ מועדף / שידור חי) כדי שבלעדי
   * הסינון החדש הם כן היו מומלצים — אחרת הבדיקה לא הייתה מוכיחה כלום.
   */
  const ROWS: Row[] = [
    {
      channelId: 'mov1',
      title: 'סרט: חלש',
      start: NOW - 10 * MIN,
      stop: NOW + 50 * MIN,
      categories: ['סרט'],
      rating: 6.5,
      isLive: true,
    },
    {
      channelId: 'mov1',
      title: 'סרט: בדיוק 7',
      start: NOW + 30 * MIN,
      stop: NOW + 150 * MIN,
      categories: ['סרט'],
      rating: 7,
    },
    {
      channelId: 'mov1',
      title: 'סרט: חזק',
      start: NOW + 90 * MIN,
      stop: NOW + 210 * MIN,
      categories: ['סרט'],
      rating: 8.4,
    },
    {
      channelId: 'mov2',
      title: 'סרט: בלי ציון',
      start: NOW - 10 * MIN,
      stop: NOW + 40 * MIN,
      categories: ['סרט'],
      isLive: true,
    },
  ]

  /** שמות הסרטים ששרדו, לפי סדר ההמלצה. */
  async function movies(prefs: Partial<PreferenceSettings> = {}) {
    const snapshot: EpgSnapshot = {
      channels: CHANNELS,
      programmes: ROWS.map(programme),
      warnings: [],
    }
    const warnings: { code: string; message: string }[] = []
    const recommendations = await buildRecommendations(
      snapshot,
      makeSettings({ favoriteChannels: ['HOT סרטים', 'yes סרטים'], ...prefs }),
      NOW,
      undefined,
      warnings,
    )
    return recommendations
      .filter((entry) => entry.category === 'movie')
      .map((entry) => entry.programme.title)
  }

  it('מסתיר סרט עם ציון מתחת לסף, ומציג את זה שעל הסף ומעלה', async () => {
    // ברירת המחדל היא סדר לפי הזמן הקרוב: קודם הסרט שבאוויר עכשיו (גם אם ציונו
    // הנמוך ביותר — הוא לא ידוע), ואחריו אלה שמתחילים בזמן הקרוב ביותר.
    expect(await movies()).toEqual(['סרט: בלי ציון', 'סרט: בדיוק 7', 'סרט: חזק'])
  })

  it('במצב ״לפי הציון הגבוה״ הסרט המעניין ביותר עולה לראש, גם אם מתחיל מאוחר', async () => {
    // אותו סנאפשוט בדיוק, רק שהסדר נבחר בהגדרות — כדי להוכיח שההגדרה באמת
    // משנה את הסדר ולא סתם מתועדת.
    expect(await movies({ sortMode: 'score' })).toEqual([
      'סרט: חזק',
      'סרט: בדיוק 7',
      'סרט: בלי ציון',
    ])
  })

  it('הסדר לפי הזמן הקרוב אינו נדחף על ידי ציון גבוה של שידור עתידי', async () => {
    const list = await movies()
    // הסרט המשודר עכשיו עומד לפני סרט עם ציון 8.4 שיתחיל בעוד 90 דקות.
    expect(list.indexOf('סרט: בלי ציון')).toBeLessThan(list.indexOf('סרט: חזק'))
  })

  it('סרט בלי שום ציון ידוע נשאר — אין על מה לשפוט אותו', async () => {
    expect(await movies()).toContain('סרט: בלי ציון')
  })

  it('סרט מהמועדפים שלי מוצג גם כשהציון שלו נמוך מהסף', async () => {
    const list = await movies({ favoriteMovies: ['סרט: חלש'] })
    expect(list).toContain('סרט: חלש')
    // המועדף מקבל בוסט, ולכן הוא עולה לראש הרשימה.
    expect(list[0]).toBe('סרט: חלש')
  })

  it('סף 0 מכבה את הסינון לגמרי', async () => {
    expect(await movies({ minMovieRating: 0 })).toContain('סרט: חלש')
  })

  it('הסף הגבוה ביותר לא מסתיר סדרות וחדשות — הוא סינון של סרטים בלבד', async () => {
    // סף כמעט בלתי אפשרי: כל סרט עם ציון ידוע אמור להיעלם, אבל שאר
    // הקטגוריות לא מושפעות ממנו בכלל.
    const { recommendations } = await recommend({ minMovieRating: 9.9, minSeriesRating: 9.9 })
    expect(recommendations.some((entry) => entry.category === 'series')).toBe(true)
    expect(recommendations.some((entry) => entry.category === 'news')).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/* ספורט: רק משחקים חיים, כולם, לפי סדר הזמן                            */
/* ------------------------------------------------------------------ */

describe('ספורט — רק משחקים חיים', () => {
  /** סורק סנאפשוט ומחזיר את התוצאה עם byCategory — שם נקבע סדר הספורט. */
  async function scan(rows: Row[], prefs: Partial<PreferenceSettings> = {}) {
    const snapshot: EpgSnapshot = {
      channels: CHANNELS,
      programmes: rows.map(programme),
      warnings: [],
    }
    const warnings: { code: string; message: string }[] = []
    const recommendations = await buildRecommendations(
      snapshot,
      makeSettings(prefs),
      NOW,
      undefined,
      warnings,
    )
    return buildScanResult(snapshot, recommendations, NOW, warnings)
  }

  it('לא מציג תכנית אולפן, גם כשהיא משודרת עכשיו', async () => {
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'אולפן ליגת העל — סיכום המחזור',
        start: NOW - 10 * MIN,
        stop: NOW + 50 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
    ])
    expect(result.byCategory.sport).toHaveLength(0)
  })

  it('לא מציג שידור חוזר של הקבוצה האהודה', async () => {
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'שידור חוזר: הפועל באר שבע - מכבי תל אביב',
        start: NOW - 5 * MIN,
        stop: NOW + 85 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
    ])
    expect(result.byCategory.sport).toHaveLength(0)
  })

  it('מזהה משחק לפי צורת הכותרת גם בלי קבוצות ישראליות', async () => {
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'ליגת האלופות: ריאל מדריד - ברצלונה',
        start: NOW - 5 * MIN,
        stop: NOW + 55 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
    ])
    expect(result.byCategory.sport).toHaveLength(1)
  })

  /*
   * משחק כדורעף שהמסגרת שלו היא "ליגת העל" — אותו שם של ליגת הכדורגל.
   * הוא חייב להיות מוצג, אבל בלי שום נתון שמגיע מטבלת הכדורגל.
   */
  it('מציג משחק כדורעף בלי לגרור אליו טבלת כדורגל', async () => {
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'ישיר! מ. אשדוד - מ. חדרה',
        description: 'שידור ישיר: מכבי אשדוד נגד מכבי חדרה, ליגת העל בכדורעף נשים, מחזור 1.',
        start: NOW - 10 * MIN,
        stop: NOW + 100 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
    ])
    expect(result.byCategory.sport).toHaveLength(1)
    const match = result.byCategory.sport[0]
    expect(match?.sport?.sport).toBe('volleyball')
    expect(match?.sport?.competition).toBe('ליגת העל')
    // אין מקום בטבלה: לכדורעף אין טבלת כדורגל להציג.
    expect(match?.sport?.homeTeam?.rankText).toBeUndefined()
    expect(match?.sport?.awayTeam?.rankText).toBeUndefined()
    // וגם אין הלבשת שם של מועדון כדורגל: "מ. אשדוד" נשאר של הכדורעף,
    // ולא הופך ל"מ.ס. אשדוד" (שם באנגלית — FC Ashdod).
    expect(match?.sport?.homeTeam?.name).toBe('מ. אשדוד')
    expect(match?.sport?.homeTeam?.englishName).toBeUndefined()
  })

  /*
   * "ענפים שמעניינים אותי": משחק מענף שלא סומן לא מוצג בכלל, משחק שסומן
   * ממשיך להופיע (גם אם אינו כדורגל), ורשימה ריקה משמעה בלי סינון.
   */
  it('מציג רק משחקים מהענפים שסומנו בהגדרות', async () => {
    const rows: Row[] = [
      {
        channelId: 'sport1',
        title: 'כדורגל: מכבי תל אביב - הפועל תל אביב',
        start: NOW - 5 * MIN,
        stop: NOW + 55 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
      {
        channelId: 'sport2',
        title: 'ישיר! מ. אשדוד - מ. חדרה',
        description: 'שידור ישיר: מכבי אשדוד נגד מכבי חדרה, ליגת העל בכדורעף נשים, מחזור 1.',
        start: NOW - 5 * MIN,
        stop: NOW + 55 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
    ]
    const onlyFootball = await scan(rows, { sportKinds: ['football'] })
    expect(onlyFootball.byCategory.sport.map((entry) => entry.sport?.sport)).toEqual(['football'])

    const withVolleyball = await scan(rows, { sportKinds: ['football', 'volleyball'] })
    expect(withVolleyball.byCategory.sport).toHaveLength(2)

    // בלי שום סימון אין סינון — שני המשחקים מוצגים.
    const noFilter = await scan(rows, { sportKinds: [] })
    expect(noFilter.byCategory.sport).toHaveLength(2)
  })

  it('מציג גם משחק תחתית חסר עניין — בספורט אין סף ציון', async () => {
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'הפועל חדרה - עירוני טבריה',
        start: NOW - 5 * MIN,
        stop: NOW + 55 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
      {
        channelId: 'sport2',
        title: 'מכבי תל אביב - מכבי חיפה',
        start: NOW - 5 * MIN,
        stop: NOW + 55 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
    ])
    const bottom = result.byCategory.sport.find((entry) => entry.programme.title.includes('חדרה'))
    const top = result.byCategory.sport.find((entry) => entry.programme.title.includes('מכבי חיפה'))
    // 46 הוא סף ההמלצות הרגיל — בספורט אין סף, ושני המשחקים האלה מוצגים
    // למרות שמשחק התחתית הוא בעל העניין הנמוך ביותר ברשימה.
    expect(result.byCategory.sport).toHaveLength(2)
    expect(bottom).toBeDefined()
    expect(top!.score).toBeGreaterThan(bottom!.score)
  })

  it('מציג את כל המשחקים החיים — בלי תקרת 15 כרטיסים', async () => {
    const teams = [
      'מכבי תל אביב',
      'הפועל באר שבע',
      'מכבי חיפה',
      'בית"ר ירושלים',
      'מכבי נתניה',
      'הפועל תל אביב',
      'הפועל חיפה',
      'מכבי פתח תקווה',
      'בני סכנין',
      'עירוני קריית שמונה',
      'מ.ס. אשדוד',
      'מכבי בני ריינה',
      'הפועל חדרה',
      'עירוני טבריה',
    ]
    const pairs = [
      ...teams.map((team, index) => [team, teams[(index + 1) % teams.length]]),
      ...teams.slice(0, 4).map((team, index) => [team, teams[(index + 3) % teams.length]]),
    ]
    expect(pairs).toHaveLength(18)

    const result = await scan(
      pairs.map(([home, away], index) => ({
        channelId: index % 2 === 0 ? 'sport1' : 'sport2',
        title: `${home} - ${away}`,
        start: NOW - (index + 1) * MIN,
        stop: NOW + 90 * MIN,
        categories: ['ספורט'],
        isLive: true,
      })),
    )
    expect(result.byCategory.sport).toHaveLength(18)
  })

  it('לא מציג פודקאסט עם מקף — למרות שנראה כמו שני צדדים', async () => {
    // שורה אמיתית מהמדריך: "ONE Podcasts - ברצלונה" / "פודקאסט ברצלונה מסכם את המשחק".
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'ONE Podcasts - ברצלונה',
        start: NOW - 5 * MIN,
        stop: NOW + 55 * MIN,
        description: 'פודקאסט ברצלונה מסכם את המשחק נגד חטאפה.',
        categories: [],
        isLive: true,
      },
    ])
    expect(result.byCategory.sport).toHaveLength(0)
  })

  it('מציג משחק חי שמתחיל בעוד רבע שעה — כמו במדריך השידורים', async () => {
    // בדיוק השורה האמיתית מספורט 1: "ישיר! אטאלנטה - ונציה".
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'ישיר! אטאלנטה - ונציה',
        start: NOW + 14 * MIN,
        stop: NOW + 139 * MIN,
        description: 'שידור ישיר: כדורגל. אטאלנטה - ונציה, ליגה איטלקית, מחזור 6',
        categories: [],
        isLive: false,
      },
    ])
    expect(result.byCategory.sport).toHaveLength(1)
    expect(result.byCategory.sport[0].status).toBe('starting-soon')
  })

  it('מסדר לפי זמן השידור — באוויר קודם, ואחר כך מה שמתחיל', async () => {
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'מכבי חיפה - הפועל חיפה',
        start: NOW - 80 * MIN,
        stop: NOW + 10 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
      {
        channelId: 'sport2',
        title: 'מכבי תל אביב - הפועל תל אביב',
        start: NOW - 45 * MIN,
        stop: NOW + 45 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
      {
        channelId: 'sport1',
        title: 'הפועל תל אביב - מכבי נתניה',
        start: NOW - 3 * MIN,
        stop: NOW + 87 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
      {
        channelId: 'sport2',
        title: 'בית"ר ירושלים - מ.ס. אשדוד',
        start: NOW + 25 * MIN,
        stop: NOW + 135 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
      {
        channelId: 'sport1',
        title: 'בני סכנין - עירוני טבריה',
        start: NOW + 150 * MIN,
        stop: NOW + 260 * MIN,
        categories: ['ספורט'],
        isLive: true,
      },
    ])

    expect(result.byCategory.sport.map((entry) => entry.programme.start)).toEqual([
      NOW - 3 * MIN,
      NOW - 45 * MIN,
      NOW - 80 * MIN,
      NOW + 25 * MIN,
      NOW + 150 * MIN,
    ])
    // הערוצים מתחלפים — כלומר זה לא קיבוץ לפי ערוץ.
    expect(result.byCategory.sport.map((entry) => entry.programme.channelId)).toEqual([
      'sport1',
      'sport2',
      'sport1',
      'sport2',
      'sport1',
    ])
  })

  it('לא מציג משחק מלא של שידור חוזר שלא סומן — אין בו את הסימן "ישיר"', async () => {
    // זו השורה שהטרידה את המשתמש: משחק סתמי לגמרי בכותרת, בלי "שידור חוזר"
    // ובלי "ישיר". הספק משדר אותו כקלטת משחק ישן — ולכן הוא לא מוצג.
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'מכבי תל אביב - הפועל תל אביב',
        start: NOW - 5 * MIN,
        stop: NOW + 55 * MIN,
        description: 'המשחק המלא מהמחזור הקודם',
        categories: ['ספורט'],
        isLive: false,
      },
    ])
    expect(result.byCategory.sport).toHaveLength(0)
  })

  it('מזהה שידור ישיר לפי המילה "ישיר" בתקציר, גם בלי סימון מפורש', async () => {
    // שורה אמיתית מהמדריך: הכותרת נקייה, והסימון יושב בתקציר ("שידור ישיר:").
    const result = await scan([
      {
        channelId: 'sport1',
        title: 'מכבי תל אביב - הפועל תל אביב',
        start: NOW - 5 * MIN,
        stop: NOW + 55 * MIN,
        description: 'שידור ישיר: כדורגל. מחזור 7',
        categories: ['ספורט'],
        isLive: false,
      },
    ])
    expect(result.byCategory.sport).toHaveLength(1)
  })

  it('כשמכבים ״רק שידורים ישירים״ חוזרות גם תכניות שאינן משחק', async () => {
    const result = await scan(
      [
        {
          channelId: 'sport1',
          title: 'אולפן ליגת העל',
          start: NOW - 10 * MIN,
          stop: NOW + 50 * MIN,
          categories: ['ספורט'],
          isLive: true,
        },
      ],
      { liveSportsOnly: false },
    )
    expect(result.byCategory.sport).toHaveLength(1)
  })
})

describe('מנועי קלט', () => {
  it('מנקה כותרות EPG לפני חיפוש ב-TMDB', () => {
    expect(cleanTitle('סרט: 1917 (2019)')).toBe('1917')
    expect(cleanTitle('סדרה: פאודה עונה 3')).toBe('פאודה')
  })

  it('מפרסר פלייליסט M3U עם שם בעברית', () => {
    const m3u = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="Sport1.il" tvg-logo="http://x/1.png" group-title="ספורט",ספורט 1 HD',
      'http://example.invalid/live/u/p/1.ts',
      '#EXTINF:-1 tvg-id="Ch12.il" group-title="חדשות",חדשות 12',
      'http://example.invalid/live/u/p/2.ts',
    ].join('\n')
    const channels = parseM3u(m3u)
    expect(channels).toHaveLength(2)
    expect(channels[0].name).toBe('ספורט 1 HD')
    expect(channels[0].epgId).toBe('Sport1.il')
    expect(channels[0].group).toBe('ספורט')
  })

  it('מפרסר XMLTV עם כותרת בעברית וזמן', () => {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<tv generator-info-name="test">',
      '<channel id="Sport1.il"><display-name lang="he">ספורט 1</display-name></channel>',
      '<programme start="20261010183000 +0300" stop="20261010203000 +0300" channel="Sport1.il">',
      '<title lang="he">כדורגל: מכבי תל אביב - הפועל תל אביב</title>',
      '<desc lang="he">דרבי תל אביבי</desc>',
      '<category lang="he">ספורט</category>',
      '<live/>',
      '</programme>',
      '</tv>',
    ].join('\n')
    const result = parseXmltv(xml)
    expect(result.channels).toHaveLength(1)
    expect(result.programmes).toHaveLength(1)
    const first = result.programmes[0]
    expect(first.title).toBe('כדורגל: מכבי תל אביב - הפועל תל אביב')
    expect(first.channelName).toBe('ספורט 1')
    expect(first.isLive).toBe(true)
    expect(first.categories).toEqual(['ספורט'])
    expect(first.stop - first.start).toBe(2 * 60 * MIN)
  })

  it('ממיר זמן XMLTV לאלפיות, כולל היסט', () => {
    const utc = parseXmltvTime('20261010183000 +0000')
    expect(utc).toBe(Date.UTC(2026, 9, 10, 18, 30, 0))
    expect(Number.isNaN(parseXmltvTime('לא זמן'))).toBe(true)
  })
})

describe('זיהוי מסגרת', () => {
  it('לא מתבלבל בין "יורוליג" ל"יורו"', () => {
    expect(detectCompetition('יורוליג: מכבי תל אביב - ריאל מדריד (כדורסל)')).toBe('יורוליג')
    expect(competitionImportance('יורוליג')).toBeGreaterThanOrEqual(0.8)
  })

  it('מעדיף את המסגרת הספציפית על הכללית', () => {
    expect(detectCompetition('גביע המדינה: מכבי חיפה - הפועל חיפה')).toBe('גביע המדינה')
  })

  it('מזהה ליגת האלופות', () => {
    expect(detectCompetition('ליגת האלופות: מכבי תל אביב - ריאל מדריד')).toBe('ליגת האלופות')
  })

  it('מחזיר undefined כשאין מסגרת מזוההת', () => {
    expect(detectCompetition('שידור כלשהו')).toBeUndefined()
  })
})

/*
 * אותיות השימוש (ב, ל, מ, ה, כ, ו, ש) נדבקות למילה בעברית בלי רווח, ולכן
 * "ליגת העל בכדורעף" היה נקרא ככדורגל: הסימון 'כדורעף' לא נתפס בגלל ה-ב'
 * שלפניו, וההתאמה היחידה שנשארה הייתה המסגרת של הכדורגל.
 */
describe('זיהוי ענף עם אותיות שימוש', () => {
  it('לא הופך ענפים אחרים לכדורגל רק בגלל שם המסגרת', () => {
    expect(
      detectSport('שידור ישיר: מכבי אשדוד נגד מכבי חדרה, ליגת העל בכדורעף נשים, מחזור 1'),
    ).toBe('volleyball')
    expect(detectSport('ליגת העל בכדוריד: ראשון לציון - רמת השרון')).toBe('handball')
    expect(detectSport('ליגת העל בכדורסל: מכבי תל אביב - הפועל ירושלים')).toBe('basketball')
    expect(detectSport('בטניס: אליפות אוסטרליה, חצי גמר')).toBe('tennis')
    // הכדורגל נשאר כדורגל — גם כשה-ב' דבוקה למילה.
    expect(detectSport('ליגת העל בכדורגל: מכבי תל אביב - הפועל תל אביב')).toBe('football')
  })

  it('מקל רק לפני המילה — אחריה היא חייבת להיגמר', () => {
    expect(detectSport('במרוץ')).toBe('motorsport')
    expect(detectSport('מרוצים באירופה')).toBe('other')
  })
})
