import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEAM_NAMES, englishNameFor, findTeamNames, foldTeamName, hebrewNameFor } from './teamNames'
import { findLeague, findMatchLeague } from './leagues'
import { detectCompetition, detectSport } from './teams'
import { clearLeagueTables, loadLeagueTable } from './tableStore'
import { rankText, resolveTeam, standingSummary } from './standings'
import { israeliSeasonPage, parseStandingsTable } from './wikipedia'
import { oneSeasonLabel, oneSeasonMatches, parseGoalDifference, parseOneStandings } from './one'
import { matchInsight } from './insight'
import { buildDemoSnapshot } from '../engine/demo'
import { buildRecommendations } from '../engine/recommend'
import { DEFAULT_SETTINGS } from '../config/settings'
import type { Settings, TeamRef, TeamStanding } from '../types'

/* ------------------------------------------------------------------ */
/* מפת השמות                                                           */
/* ------------------------------------------------------------------ */

describe('מפת ההמרה עברית ↔ אנגלית', () => {
  it('כל רשומה מזוהה בשני הכיוונים', () => {
    for (const entry of TEAM_NAMES) {
      expect(findTeamNames(entry.he)?.en, `עברית->אנגלית: ${entry.he}`).toBe(entry.en)
      expect(findTeamNames(entry.en)?.he, `אנגלית->עברית: ${entry.en}`).toBe(entry.he)
      for (const alias of entry.aliases ?? []) {
        expect(findTeamNames(alias)?.en, `כינוי: ${alias}`).toBe(entry.en)
      }
    }
  })

  it('אין שני מועדונים שחולקים את אותו שם', () => {
    const he = new Map<string, string>()
    const en = new Map<string, string>()
    for (const entry of TEAM_NAMES) {
      const heKey = foldTeamName(entry.he)
      const enKey = foldTeamName(entry.en)
      expect(he.has(heKey), `כפילות בעברית: ${entry.he}`).toBe(false)
      expect(en.has(enKey), `כפילות באנגלית: ${entry.en}`).toBe(false)
      he.set(heKey, entry.en)
      en.set(enKey, entry.he)
    }
  })

  it('מזהה את הקיצורים שמדריך השידורים משתמש בהם', () => {
    expect(hebrewNameFor('ה. י-ם')).toBe('הפועל ירושלים')
    expect(hebrewNameFor('מ. חיפה')).toBe('מכבי חיפה')
    expect(hebrewNameFor('ה. ת״א')).toBe('הפועל תל אביב')
    expect(hebrewNameFor('בית״ר י-ם')).toBe('בית״ר ירושלים')
  })

  it('מזהה שמות זרים בשתי השפות', () => {
    expect(englishNameFor('אטאלנטה')).toBe('Atalanta')
    expect(hebrewNameFor('Atalanta')).toBe('אטאלנטה')
    expect(englishNameFor('קובנטרי')).toBe('Coventry City')
    expect(hebrewNameFor('Coventry City')).toBe('קובנטרי')
    expect(englishNameFor('אל נאסר (רונאלדו)')).toBe('Al Nassr')
    expect(hebrewNameFor('F.C. København')).toBe('קופנהגן')
  })

  it('לא ממציא קבוצה כשאין התאמה', () => {
    expect(findTeamNames('קבוצה שלא קיימת בכלל')).toBeUndefined()
    expect(findTeamNames('')).toBeUndefined()
  })

  it('מזהה את הקיצורים של המדריך גם כשהוא כותב גרשיים כפולים', () => {
    /*
     * המדריך כותב "ה. ת''א" עם שני גרשים ASCII, ואילו המפה והטבלאות נכתבות
     * עם גרשיים עבריים ("ה. ת״א"). גרשיים עבריים הם בתוך טווח התווים העבריים
     * ולכן שרדו את הניקוי — שתי הצורות נורמלו אחרת, והקבוצה לא נמצאה בטבלה
     * ("אין נתוני טבלה" בכרטיס).
     */
    expect(findTeamNames("ה. ת''א")?.he).toBe('הפועל תל אביב')
    expect(findTeamNames("מ. פ''ת")?.he).toBe('מכבי פתח תקווה')
    expect(findTeamNames("ה. ק''ש")?.he).toBe('עירוני קריית שמונה')
    expect(findTeamNames("בית''ר ירושלים")?.he).toBe('בית״ר ירושלים')
    expect(findTeamNames('ה. ב״ש')?.he).toBe('הפועל באר שבע')
    expect(findTeamNames("ה.ב''ש")?.he).toBe('הפועל באר שבע')
    // וגם בפתרון השורה בטבלה — הכרטיס מקבל מיקום.
    const table: TeamStanding[] = [
      { name: 'הפועל תל אביב', englishName: 'Hapoel Tel Aviv', aliases: ['הפועל ת״א'], position: 2, played: 6, points: 13, goalDifference: 5 },
      { name: 'מכבי פתח תקווה', englishName: 'Maccabi Petah Tikva', aliases: ['מ. פ״ת'], position: 9, played: 6, points: 6, goalDifference: -4 },
    ]
    expect(resolveTeam("ה. ת''א", table)?.position).toBe(2)
    expect(resolveTeam("מ. פ''ת", table)?.position).toBe(9)
  })

  it('מתרגם את הקיצורים של המדריך שמנעו מיקום במשחקים ספרדים', () => {
    // הכותרות אמיתיות מהמדריך: "ישיר! אספניול - את. מדריד", "ר. בטיס - ברצלונה".
    expect(englishNameFor('את. מדריד')).toBe('Atlético Madrid')
    expect(englishNameFor('ר. בטיס')).toBe('Real Betis')
    expect(englishNameFor('את. בילבאו')).toBe('Athletic Club')
    expect(englishNameFor('מנ. סיטי')).toBe('Manchester City')
    expect(englishNameFor('פריס סן ז׳רמן')).toBe('Paris Saint-Germain')
    // ובטבלה החיה — מיקום ולא "אין נתוני טבלה".
    const table: TeamStanding[] = [
      { name: 'ברצלונה', englishName: 'Barcelona', aliases: [], position: 1, played: 9, points: 24, goalDifference: 10 },
      { name: 'אתלטיקו מדריד', englishName: 'Atlético Madrid', aliases: [], position: 2, played: 9, points: 19, goalDifference: 6 },
      { name: 'ריאל בטיס', englishName: 'Real Betis', aliases: [], position: 3, played: 9, points: 19, goalDifference: 4 },
    ]
    expect(resolveTeam('את. מדריד', table)?.position).toBe(2)
    expect(resolveTeam('ר. בטיס', table)?.position).toBe(3)
  })
})

/* ------------------------------------------------------------------ */
/* זיהוי הליגה                                                         */
/* ------------------------------------------------------------------ */

describe('זיהוי הליגה של המשחק', () => {
  it('מזהה ליגות זרות מתוך טקסט ה-EPG', () => {
    expect(findLeague('ליגה איטלקית: אטאלנטה - ונציה')?.id).toBe('italy')
    expect(findLeague('סרייה א׳')?.id).toBe('italy')
    expect(findLeague('ליגת האלופות')?.id).toBe('champions-league')
    expect(findLeague('הליגה האנגלית')?.id).toBe('england')
  })

  it('מזהה ליגת העל מתוך שמות הקבוצות גם בלי שם הליגה', () => {
    const league = findMatchLeague({
      texts: ['כדורגל: מכבי תל אביב - הפועל תל אביב'],
      home: 'מכבי תל אביב',
      away: 'הפועל תל אביב',
      sport: 'football',
    })
    expect(league?.id).toBe('israel')
  })

  /*
   * כותרות אמיתיות מהסריקה של המשתמש שלא מזכירות את שם הליגה. בלי הזיהוי
   * לפי שמות הקבוצות המשחקים האלה היו נשארים בלי מיקומים.
   */
  it('מזהה את הליגה לפי הקבוצות כשאין שם מסגרת', () => {
    expect(
      findMatchLeague({
        texts: ['ישיר! ארהוס - סונדריסקה'],
        home: 'ארהוס',
        away: 'סונדריסקה',
        sport: 'football',
      })?.id,
    ).toBe('denmark')
    expect(
      findMatchLeague({
        texts: ['ישיר! לבאנטה - סביליה'],
        home: 'לבאנטה',
        away: 'סביליה',
        sport: 'football',
      })?.id,
    ).toBe('spain')
    expect(
      findMatchLeague({
        texts: ["ישיר! סט. לואיס - ל.א. גלאקסי"],
        home: 'סט. לואיס',
        away: 'ל.א. גלאקסי',
        sport: 'football',
      })?.id,
    ).toBe('usa')
  })

  it('מעדיף את המסגרת שעליה מדווח המדריך', () => {
    // "ליגת האלופות" בטקסט גובר על הליגה המקומית של הקבוצות.
    expect(
      findMatchLeague({
        texts: ['ליגת האלופות: אינטר - מילאן'],
        home: 'אינטר',
        away: 'מילאן',
        sport: 'football',
      })?.id,
    ).toBe('champions-league')
  })

  /*
   * הציטוט האמיתי מהמדריך של המשתמש. בשדה התיאור כתוב במפורש "ליגה לאומית",
   * אבל הכותרת לא מזכירה מסגרת — ומ.ס. אשדוד מוכרת מהליגה הראשונה. בלי
   * קריאה של התיאור המשחק סוין כליגת העל והציג טבלה של ליגה אחרת.
   */
  it('קורא את הליגה שהמדריך מצהיר עליה — הליגה הלאומית, לא ליגת העל', () => {
    const description = 'שידור ישיר: כדורגל. מ.ס. אשדוד נגד מכבי קריית גת, ליגה לאומית, מחזור 10'
    expect(detectCompetition(description)).toBe('הליגה הלאומית')
    expect(findLeague(description)?.id).toBe('israel-national')
    // הליגה הלאומית היא הליגה של המשחק — ולכן הטבלה היא שלה (ONE), ולא
    // הטבלה של ליגת העל שאש"ד מוכרת ממנה.
    expect(
      findMatchLeague({
        texts: ['המשחק 15:45 ישיר! מ.ס. אשדוד - מ. קריית גת', description],
        home: 'מ.ס. אשדוד',
        away: 'מ. קריית גת',
        sport: 'football',
      })?.id,
    ).toBe('israel-national')
    // אותה ליגה מזוהה גם כשהמסגרת מופיעה בכותרת ולא בתיאור.
    expect(
      findMatchLeague({
        texts: ['ליגה לאומית: מ.ס. אשדוד - מ. קריית גת'],
        home: 'מ.ס. אשדוד',
        away: 'מ. קריית גת',
        sport: 'football',
      })?.id,
    ).toBe('israel-national')
  })

  it('מזהה את הליגה הגרמנית עם ה"א הידיעה, ואת הליגה השנייה בנפרד', () => {
    // שתי הצורות של אותה ליגה — "ליגה גרמנית" ו"הליגה הגרמנית".
    expect(findLeague('ליגה גרמנית: באיירן מינכן - דורטמונד')?.id).toBe('germany')
    expect(findLeague('הליגה הגרמנית: באיירן מינכן - דורטמונד')?.id).toBe('germany')
    expect(findLeague('בונדסליגה')?.id).toBe('germany')
    // הליגה השנייה — ליגה אחרת, עם הטבלה שלה (‏ESPN „ger.2”),
    // ולא הליגה הראשונה רק מפני שהשם מכיל אותה.
    expect(findLeague('הליגה הגרמנית השנייה')?.id).toBe('germany-2')
    expect(findLeague('ליגה גרמנית שנייה')?.id).toBe('germany-2')
    expect(findLeague('2. בונדסליגה')?.id).toBe('germany-2')
    expect(
      findMatchLeague({
        texts: ['הליגה הגרמנית השנייה: שאלקה - המבורג'],
        home: 'שאלקה',
        away: 'המבורג',
        sport: 'football',
      })?.id,
    ).toBe('germany-2')
    expect(
      findMatchLeague({
        texts: ['הליגה הגרמנית: באיירן מינכן - דורטמונד'],
        home: 'באיירן מינכן',
        away: 'דורטמונד',
        sport: 'football',
      })?.id,
    ).toBe('germany')
  })

  it('קורא את התיאור האמיתי של המשחק הגרמני: הליגה השנייה, לא הראשונה', () => {
    // הטקסט מהמדריך: הולשטיין קיל - הרטה ברלין, בליגה הגרמנית השנייה.
    const description =
      'שידור ישיר: כדורגל. הולשטיין קיל - הרטה ברלין, הליגה הגרמנית השנייה, מחזור 8, עונת 2026/27.'
    expect(detectCompetition(description)).toBe('הליגה הגרמנית השנייה')
    expect(findLeague(description)?.id).toBe('germany-2')
    expect(
      findMatchLeague({
        texts: ['שידור ישיר! הולשטיין קיל - הרטה ברלין', description],
        home: 'הולשטיין קיל',
        away: 'הרטה ברלין',
        sport: 'football',
      })?.id,
    ).toBe('germany-2')
  })

  it('מפעל בלי טבלה (ליגת האלופות של אסיה) לא עוצר את זיהוי הליגה של הקבוצות', () => {
    expect(
      findMatchLeague({
        texts: ["ליגת האלופות של אסיה: אל נאסר - אל הילאל"],
        home: 'אל נאסר',
        away: 'אל הילאל',
        sport: 'football',
      })?.id,
    ).toBe('saudi')
  })

  it('מזהה את הליגות השנייה של צרפת וספרד כנפרדות מהראשונות', () => {
    expect(detectCompetition('שידור ישיר: כדורגל. נאנט נגד דנקרק, ליגה צרפתית שנייה, מחזור 9.')).toBe(
      'הליגה הצרפתית השנייה',
    )
    expect(findLeague('ליגה צרפתית שנייה')?.id).toBe('france-2')
    expect(findLeague('הליגה הצרפתית השנייה')?.id).toBe('france-2')
    expect(findLeague('ליג 2')?.id).toBe('france-2')
    expect(findLeague('ליגה ספרדית שנייה')?.id).toBe('spain-2')
    // הליגה הראשונה נשארת הראשונה.
    expect(findLeague('ליגה צרפתית')?.id).toBe('france')
    expect(findLeague('ליגה ספרדית 2026/27')?.id).toBe('spain')
    // משחק מליג 2 מקבל את הליגה שלו גם כשרק הקבוצות מופיעות בטקסט.
    expect(
      findMatchLeague({ texts: ['ישיר! נאנט - דנקרק'], home: 'נאנט', away: 'דנקרק', sport: 'football' })
        ?.id,
    ).toBe('france-2')
  })

  it('לא מחזיר טבלת כדורגל למשחק כדורסל', () => {
    // גם כשהטקסט מזכיר מסגרת אירופית, משחק כדורסל לא מקבל טבלת כדורגל.
    expect(
      findMatchLeague({
        texts: ['יורוליג: מכבי תל אביב - ריאל מדריד'],
        home: 'מכבי תל אביב',
        away: 'ריאל מדריד',
        sport: 'basketball',
      }),
    ).toBeUndefined()
    expect(
      findMatchLeague({
        texts: ['ליגת האלופות בכדורסל: מכבי תל אביב - פנאתינייקוס'],
        home: 'מכבי תל אביב',
        away: 'פנאתינייקוס',
        sport: 'basketball',
      }),
    ).toBeUndefined()
  })
})

/* ------------------------------------------------------------------ */
/* ESPN                                                                */
/* ------------------------------------------------------------------ */

function espnEntry(
  name: string,
  rank: number,
  points: number,
  extra: Partial<Record<'gamesPlayed' | 'pointDifferential' | 'wins' | 'ties' | 'losses' | 'pointsFor' | 'pointsAgainst', number>> = {},
  note?: string,
) {
  const stats = [
    { name: 'rank', value: rank },
    { name: 'points', value: points },
    { name: 'gamesPlayed', value: extra.gamesPlayed ?? 6 },
    { name: 'pointDifferential', value: extra.pointDifferential ?? 0 },
    { name: 'wins', value: extra.wins ?? 3 },
    { name: 'ties', value: extra.ties ?? 1 },
    { name: 'losses', value: extra.losses ?? 2 },
    { name: 'pointsFor', value: extra.pointsFor ?? 9 },
    { name: 'pointsAgainst', value: extra.pointsAgainst ?? 6 },
  ]
  return {
    team: { displayName: name, shortDisplayName: name.slice(0, 3).toUpperCase() },
    stats,
    ...(note ? { note: { description: note } } : {}),
  }
}

const SERIE_A_BODY = {
  season: { year: new Date().getUTCMonth() >= 6 ? new Date().getUTCFullYear() : new Date().getUTCFullYear() - 1 },
  children: [
    {
      standings: {
        entries: [
          espnEntry('Internazionale', 1, 16, { pointDifferential: 10, pointsFor: 18, wins: 5 }, 'Champions League'),
          espnEntry('AS Roma', 3, 14, { pointDifferential: 6 }),
          espnEntry('Atalanta', 11, 8, { pointDifferential: 1, wins: 1, ties: 5 }),
          espnEntry('Venezia', 20, 0, { pointDifferential: -14, pointsFor: 2, pointsAgainst: 16, wins: 0, ties: 0, losses: 6 }, 'Relegation'),
        ],
      },
    },
  ],
}

function stubFetch(body: unknown, status = 200) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: async () => JSON.stringify(body),
  })
}

describe('טבלה חיה מ-ESPN', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('מביא את הטבלה האיטלקית, מתרגם שמות ומסמן אזורים', async () => {
    vi.stubGlobal('fetch', stubFetch(SERIE_A_BODY))
    const table = await loadLeagueTable('ליגה איטלקית')
    expect(table?.source).toBe('espn')
    expect(table?.teams).toHaveLength(4)
    expect(table?.teams[0].name).toBe('אינטר')
    expect(table?.teams[0].englishName).toBe('Internazionale')
    expect(table?.teams[0].played).toBe(6)
    expect(table?.teams[0].won).toBe(5)
    expect(table?.teams[3].name).toBe('ונציה')
    expect(table?.teams[3].zone).toBe('Relegation')
    expect(table?.sourceLabel).toContain('ESPN')
  })

  it('מתאים את הקבוצות מהמדריך לטבלה שהתקבלה', async () => {
    vi.stubGlobal('fetch', stubFetch(SERIE_A_BODY))
    const table = await loadLeagueTable('ליגה איטלקית: אטאלנטה - ונציה')
    const teams = table?.teams ?? []
    const atalanta = resolveTeam('אטאלנטה', teams)
    const venezia = resolveTeam('ונציה', teams)
    expect(atalanta?.position).toBe(11)
    expect(venezia?.position).toBe(20)
    expect(standingSummary(atalanta)).toContain('8 נק׳')
  })

  it('דוחה טבלה של עונה שאינה העונה הנוכחית', async () => {
    const stale = { ...SERIE_A_BODY, season: { year: 2024 } }
    vi.stubGlobal('fetch', stubFetch(stale))
    const table = await loadLeagueTable('ליגה איטלקית')
    expect(table).toBeNull()
  })

  it('נופל בשקט לטבלה המקומית של ליגת העל', async () => {
    vi.stubGlobal('fetch', stubFetch({}, 500))
    const table = await loadLeagueTable('ליגת העל', { config: { apiKey: '', baseUrl: '' } })
    expect(table?.source).toBe('bundled')
    expect(table?.teams.length).toBe(14)
    expect(table?.teams[0].name).toBe('מכבי תל אביב')
  })
})

/* ------------------------------------------------------------------ */
/* NBA — טבלת כדורסל מ-ESPN                                            */
/* ------------------------------------------------------------------ */

function nbaEntry(
  name: string,
  wins: number,
  losses: number,
  extra: Partial<Record<'pointsFor' | 'pointsAgainst' | 'differential', number>> = {},
) {
  const played = wins + losses
  return {
    team: { displayName: name },
    stats: [
      { name: 'wins', value: wins },
      { name: 'losses', value: losses },
      { name: 'winPercent', value: played > 0 ? wins / played : 0 },
      { name: 'pointsFor', value: extra.pointsFor ?? 1180 },
      { name: 'pointsAgainst', value: extra.pointsAgainst ?? 1120 },
      { name: 'differential', value: extra.differential ?? 60 },
    ],
  }
}

/** ESPN מסמן את עונת ה-NBA בשנת הסיום ("2026-27" -> 2027). */
const NBA_SEASON_END_YEAR =
  (new Date().getUTCMonth() >= 6
    ? new Date().getUTCFullYear()
    : new Date().getUTCFullYear() - 1) + 1

const NBA_BODY = {
  season: { year: NBA_SEASON_END_YEAR },
  children: [
    {
      name: 'Eastern Conference',
      abbreviation: 'East',
      standings: {
        // הפרש הנקודות מגיע מ-ESPN בשבר עשרוני — והטבלה מציגה שלם.
        entries: [
          nbaEntry('Boston Celtics', 9, 3, { differential: 23.299999 }),
          nbaEntry('New York Knicks', 5, 7),
        ],
      },
    },
    {
      name: 'Western Conference',
      abbreviation: 'West',
      standings: {
        entries: [nbaEntry('Denver Nuggets', 8, 4), nbaEntry('Sacramento Kings', 1, 11)],
      },
    },
  ],
}

describe('טבלת ה-NBA מ-ESPN', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('מזהה משחק NBA ובונה טבלת כדורסל: מאזן, אחוז ניצחונות ובית', async () => {
    vi.stubGlobal('fetch', stubFetch(NBA_BODY))
    const league = findMatchLeague({
      texts: ['ליגת ה-NBA: לוס אנג׳לס לייקרס - בוסטון סלטיקס'],
      home: 'לוס אנג׳לס לייקרס',
      away: 'בוסטון סלטיקס',
      sport: 'basketball',
    })
    expect(league?.id).toBe('nba')

    const table = await loadLeagueTable(league)
    expect(table?.source).toBe('espn')
    // המיקום עולמי — לפי אחוז ניצחונות — ולא לפי בית, כדי שזו תהיה טבלה
    // אחת של הליגה כולה.
    expect(table?.teams.map((team) => team.name)).toEqual([
      'בוסטון סלטיקס',
      'דנוור נאגטס',
      'ניו יורק ניקס',
      'סקרמנטו קינגס',
    ])
    const celtics = table?.teams[0]
    expect(celtics?.position).toBe(1)
    expect(celtics?.played).toBe(12)
    expect(celtics?.won).toBe(9)
    expect(celtics?.lost).toBe(3)
    expect(celtics?.winPercent).toBe(75)
    expect(celtics?.goalDifference).toBe(23)
    expect(celtics?.zone).toBe('מזרח')
    expect(table?.teams[1].zone).toBe('מערב')
    // מסך הפרטים מציג מיקום ומאזן — בלי נקודות טבלה של כדורגל.
    expect(rankText(celtics, 'basketball')).toContain('9-3')
    expect(standingSummary(celtics, 'basketball')).toContain('75%')
  })

  it('דוחה גם עונת NBA שאינה העונה הנוכחית', async () => {
    const stale = { ...NBA_BODY, season: { year: NBA_SEASON_END_YEAR - 3 } }
    vi.stubGlobal('fetch', stubFetch(stale))
    const table = await loadLeagueTable('ליגת ה-NBA')
    expect(table).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/* ONE (one.co.il) — טבלת ליגת העל                                       */
/* ------------------------------------------------------------------ */

/** שנת פתיחת העונה הנוכחית, כמו שהמנוע מחשב. */
const SEASON_YEAR = new Date().getUTCMonth() >= 6 ? new Date().getUTCFullYear() : new Date().getUTCFullYear() - 1
const ONE_SEASON = oneSeasonLabel(SEASON_YEAR)

/** 14 השורות האמיתיות שהתקבלו מ-ONE (קיצורי השמות כמו שהם חוזרים משם). */
const ONE_STANDING = [
  { name: 'מכבי ת"א', position: 1, played: 6, wins: 5, draws: 1, losses: 0, goalsFor: 18, goalsAgainst: 6, goalDifference: '+12', points: 16, zoneName: 'פלייאוף עליון' },
  { name: 'הפועל ת"א', position: 2, played: 6, wins: 4, draws: 1, losses: 1, goalsFor: 14, goalsAgainst: 5, goalDifference: '+9', points: 13, zoneName: 'פלייאוף עליון' },
  { name: 'הפועל ב"ש', position: 3, played: 6, wins: 4, draws: 1, losses: 1, goalsFor: 10, goalsAgainst: 7, goalDifference: '+3', points: 13, zoneName: 'פלייאוף עליון' },
  { name: 'מכבי חיפה', position: 4, played: 5, wins: 4, draws: 0, losses: 1, goalsFor: 12, goalsAgainst: 7, goalDifference: '+5', points: 12, zoneName: 'פלייאוף עליון' },
  { name: 'בית"ר ירושלים', position: 5, played: 6, wins: 4, draws: 0, losses: 2, goalsFor: 11, goalsAgainst: 9, goalDifference: '+2', points: 12, zoneName: 'פלייאוף עליון' },
  { name: 'הפועל חיפה', position: 6, played: 6, wins: 2, draws: 3, losses: 1, goalsFor: 9, goalsAgainst: 7, goalDifference: '+2', points: 9, zoneName: 'פלייאוף עליון' },
  { name: 'הפועל ירושלים', position: 7, played: 5, wins: 2, draws: 1, losses: 2, goalsFor: 12, goalsAgainst: 12, goalDifference: '0', points: 7, zoneName: 'פלייאוף תחתון' },
  { name: 'מכבי נתניה', position: 8, played: 6, wins: 1, draws: 3, losses: 2, goalsFor: 7, goalsAgainst: 7, goalDifference: '0', points: 6, zoneName: 'פלייאוף תחתון' },
  { name: 'מכבי פ"ת', position: 9, played: 6, wins: 2, draws: 0, losses: 4, goalsFor: 9, goalsAgainst: 13, goalDifference: '-4', points: 6, zoneName: 'פלייאוף תחתון' },
  { name: 'בני סכנין', position: 10, played: 6, wins: 1, draws: 2, losses: 3, goalsFor: 3, goalsAgainst: 6, goalDifference: '-3', points: 5, zoneName: 'פלייאוף תחתון' },
  { name: 'הפועל פ"ת', position: 11, played: 6, wins: 1, draws: 1, losses: 4, goalsFor: 3, goalsAgainst: 9, goalDifference: '-6', points: 4, zoneName: 'פלייאוף תחתון' },
  { name: 'עירוני ק"ש', position: 12, played: 6, wins: 1, draws: 0, losses: 5, goalsFor: 6, goalsAgainst: 14, goalDifference: '-8', points: 3, zoneName: 'פלייאוף תחתון' },
  { name: 'הפועל ר"ג', position: 13, played: 6, wins: 1, draws: 0, losses: 5, goalsFor: 4, goalsAgainst: 13, goalDifference: '-9', points: 3, zoneName: 'פלייאוף תחתון' },
  { name: 'עירוני טבריה', position: 14, played: 6, wins: 2, draws: 1, losses: 3, goalsFor: 7, goalsAgainst: 10, goalDifference: '-3', points: 1, zoneName: 'פלייאוף תחתון' },
]

const ONE_BODY = {
  info: { id: '1', name: 'ליגת העל Winner', season: ONE_SEASON },
  standing: ONE_STANDING,
  lastUpdate: '2026-10-12T17:42:50.941Z',
}

describe('טבלת ליגת העל מ-ONE', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('מתרגם את 14 הקיצורים של ONE לשמות הקנוניים בעברית', () => {
    const teams = parseOneStandings(ONE_BODY)
    expect(teams).toHaveLength(14)
    const byPosition = new Map(teams.map((team) => [team.position, team.name]))
    expect(byPosition.get(1)).toBe('מכבי תל אביב')
    expect(byPosition.get(2)).toBe('הפועל תל אביב')
    expect(byPosition.get(3)).toBe('הפועל באר שבע')
    expect(byPosition.get(5)).toBe('בית"ר ירושלים')
    expect(byPosition.get(7)).toBe('הפועל ירושלים')
    expect(byPosition.get(9)).toBe('מכבי פתח תקווה')
    expect(byPosition.get(11)).toBe('הפועל פתח תקווה')
    expect(byPosition.get(12)).toBe('עירוני קריית שמונה')
    expect(byPosition.get(13)).toBe('הפועל רמת גן')
    // כל 14 השמות הם השמות הקנוניים — אף קיצור של ONE לא נשאר כמו שהוא.
    const expected = [
      'מכבי תל אביב',
      'הפועל תל אביב',
      'הפועל באר שבע',
      'מכבי חיפה',
      'בית"ר ירושלים',
      'הפועל חיפה',
      'הפועל ירושלים',
      'מכבי נתניה',
      'מכבי פתח תקווה',
      'בני סכנין',
      'הפועל פתח תקווה',
      'עירוני קריית שמונה',
      'הפועל רמת גן',
      'עירוני טבריה',
    ]
    expect([...teams].sort((a, b) => a.position - b.position).map((team) => team.name)).toEqual(expected)
  })

  it('מפרסר נקודות, מאזן, הפרש שערים דו-סימני ואזור', () => {
    const teams = parseOneStandings(ONE_BODY)
    const maccabi = teams[0]
    expect(maccabi).toMatchObject({
      name: 'מכבי תל אביב',
      position: 1,
      played: 6,
      won: 5,
      drawn: 1,
      lost: 0,
      goalsFor: 18,
      goalsAgainst: 6,
      goalDifference: 12,
      points: 16,
      zone: 'פלייאוף עליון',
    })
    expect(teams.find((team) => team.name === 'מכבי פתח תקווה')?.goalDifference).toBe(-4)
    expect(parseGoalDifference('-9')).toBe(-9)
    expect(parseGoalDifference('0')).toBe(0)
    // בלי מחרוזת — נגזר מהשערים.
    expect(parseGoalDifference(undefined, 10, 12)).toBe(-2)
  })

  it('מתעלם מטבלה קצרה מדי', () => {
    expect(parseOneStandings({ standing: ONE_STANDING.slice(0, 5) })).toHaveLength(0)
    expect(parseOneStandings({})).toHaveLength(0)
  })

  it('טוען את ליגת העל מ-ONE ונותן מיקום למשחק מה-EPG', async () => {
    vi.stubGlobal('fetch', stubFetch(ONE_BODY))
    const table = await loadLeagueTable('ליגת העל', { config: { apiKey: '', baseUrl: '' } })
    expect(table?.source).toBe('one')
    expect(table?.sourceLabel).toContain('ONE')
    expect(table?.teams).toHaveLength(14)
    const hapoel = resolveTeam('ה. י-ם', table?.teams ?? [])
    expect(hapoel?.position).toBe(7)
    expect(standingSummary(hapoel)).toContain('7 נק׳')
    const haifa = resolveTeam('מכבי חיפה', table?.teams ?? [])
    expect(haifa?.position).toBe(4)
  })

  it('דוחה טבלה של עונה שעברה', async () => {
    vi.stubGlobal('fetch', stubFetch({ ...ONE_BODY, info: { season: '2025/2026' } }))
    const table = await loadLeagueTable('ליגת העל', { config: { apiKey: '', baseUrl: '' } })
    // לא מאותה עונה -> ממשיכים לויקיפדיה, שגם היא נכשלת (אותה תשובה) -> מקומית.
    expect(table?.source).toBe('bundled')
  })
})

/* ------------------------------------------------------------------ */
/* הליגה הלאומית                                                        */
/* ------------------------------------------------------------------ */

/** 16 השורות האמיתיות של הליגה הלאומית מ-ONE (קיצורים כמו שהם חוזרים משם). */
const LEUMIT_STANDING = [
  { name: 'מ.ס אשדוד', position: 1, played: 10, wins: 8, draws: 1, losses: 1, goalsFor: 22, goalsAgainst: 8, goalDifference: '+14', points: 25 },
  { name: 'בני יהודה', position: 2, played: 9, wins: 7, draws: 2, losses: 0, goalsFor: 20, goalsAgainst: 7, goalDifference: '+13', points: 23 },
  { name: 'הפועל ראשל"צ', position: 3, played: 9, wins: 6, draws: 2, losses: 1, goalsFor: 18, goalsAgainst: 9, goalDifference: '+9', points: 20 },
  { name: 'מ.ס קריית ים', position: 4, played: 10, wins: 6, draws: 1, losses: 3, goalsFor: 27, goalsAgainst: 16, goalDifference: '+11', points: 19 },
  { name: 'הפועל עפולה', position: 5, played: 10, wins: 5, draws: 3, losses: 2, goalsFor: 18, goalsAgainst: 13, goalDifference: '+5', points: 18 },
  { name: 'הפועל כפר שלם', position: 6, played: 9, wins: 5, draws: 2, losses: 2, goalsFor: 19, goalsAgainst: 18, goalDifference: '+1', points: 17 },
  { name: 'הפועל רעננה', position: 7, played: 9, wins: 5, draws: 0, losses: 4, goalsFor: 20, goalsAgainst: 13, goalDifference: '+7', points: 15 },
  { name: 'מ.ס כפר קאסם', position: 8, played: 10, wins: 4, draws: 1, losses: 5, goalsFor: 13, goalsAgainst: 11, goalDifference: '+2', points: 13 },
  { name: 'מכבי בני ריינה', position: 9, played: 9, wins: 4, draws: 1, losses: 4, goalsFor: 13, goalsAgainst: 13, goalDifference: '0', points: 13 },
  { name: 'עירוני מודיעין', position: 10, played: 10, wins: 3, draws: 2, losses: 5, goalsFor: 15, goalsAgainst: 17, goalDifference: '-2', points: 11 },
  { name: 'מכבי קרית גת', position: 11, played: 10, wins: 2, draws: 4, losses: 4, goalsFor: 9, goalsAgainst: 11, goalDifference: '-2', points: 10 },
  { name: 'מכבי אחי נצרת', position: 12, played: 10, wins: 3, draws: 1, losses: 6, goalsFor: 10, goalsAgainst: 16, goalDifference: '-6', points: 10 },
  { name: 'מכבי הרצליה', position: 13, played: 10, wins: 2, draws: 3, losses: 5, goalsFor: 9, goalsAgainst: 13, goalDifference: '-4', points: 9 },
  { name: 'הפועל כפ"ס', position: 14, played: 10, wins: 3, draws: 0, losses: 7, goalsFor: 14, goalsAgainst: 24, goalDifference: '-10', points: 9 },
  { name: 'מכבי יפו', position: 15, played: 10, wins: 2, draws: 0, losses: 8, goalsFor: 7, goalsAgainst: 22, goalDifference: '-15', points: 6 },
  { name: 'הפועל עכו', position: 16, played: 9, wins: 0, draws: 1, losses: 8, goalsFor: 0, goalsAgainst: 23, goalDifference: '-23', points: 1 },
]

/** ONE כותבת את העונה של הליגה הלאומית כ"26-27" — לא כמו ליגת העל. */
const LEUMIT_SEASON = `${String(SEASON_YEAR).slice(2)}-${String((SEASON_YEAR + 1) % 100).padStart(2, '0')}`

const LEUMIT_BODY = {
  info: { id: '2', name: 'ליגה לאומית', season: LEUMIT_SEASON },
  standing: LEUMIT_STANDING,
  lastUpdate: '2026-10-17T03:18:29.307Z',
}

describe('הליגה הלאומית', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('מקבל את שם העונה בפורמט של ONE', () => {
    expect(oneSeasonMatches(LEUMIT_SEASON, SEASON_YEAR)).toBe(true)
    expect(oneSeasonMatches(oneSeasonLabel(SEASON_YEAR), SEASON_YEAR)).toBe(true)
    expect(oneSeasonMatches(`${SEASON_YEAR}-${SEASON_YEAR + 1}`, SEASON_YEAR)).toBe(true)
    expect(oneSeasonMatches(String(SEASON_YEAR), SEASON_YEAR)).toBe(true)
    expect(oneSeasonMatches('25-26', SEASON_YEAR)).toBe(false)
    expect(oneSeasonMatches(undefined, SEASON_YEAR)).toBe(false)
  })

  it('טוען את הטבלה ומתרגם את הקיצורים לשמות הקנוניים', async () => {
    vi.stubGlobal('fetch', stubFetch(LEUMIT_BODY))
    const table = await loadLeagueTable('ליגה לאומית', { config: { apiKey: '', baseUrl: '' } })
    expect(table?.source).toBe('one')
    expect(table?.league.id).toBe('israel-national')
    expect(table?.teams).toHaveLength(16)
    expect(table?.teams[0].name).toBe('מ.ס. אשדוד')
    expect(table?.teams[14].name).toBe('מכבי יפו')
    // "מ.ס אשדוד" של ONE ו"מ.ס. אשדוד" של המדריך = אותה שורה.
    expect(resolveTeam('מ.ס. אשדוד', table?.teams ?? [])?.position).toBe(1)
    expect(resolveTeam('מ. קריית גת', table?.teams ?? [])?.position).toBe(11)
    expect(resolveTeam('הפועל כפר סבא', table?.teams ?? [])?.position).toBe(14)
  })

  it('מזהה את הליגה של המשחק — בטקסט וגם לפי הקבוצות', () => {
    expect(
      findMatchLeague({
        texts: ['שידור ישיר: כדורגל. הולשטיין קיל - הרטה ברלין, הליגה הגרמנית השנייה'],
        home: 'הולשטיין קיל',
        away: 'הרטה ברלין',
        sport: 'football',
      })?.id,
    ).toBe('germany-2')
    expect(
      findMatchLeague({
        texts: ['שידור ישיר: כדורגל. הפועל כפר סבא - מכבי יפו, הליגה הלאומית, מחזור 8'],
        home: 'הפועל כפר סבא',
        away: 'מכבי יפו',
        sport: 'football',
      })?.id,
    ).toBe('israel-national')
    // בלי שם ליגה בכלל — הקבוצה מהליגה הלאומית קובעת, ולא ליגת העל שאש"ד
    // מוכרת ממנה.
    expect(
      findMatchLeague({
        texts: ['כדורגל: מ.ס. אשדוד - מ. קריית גת'],
        home: 'מ.ס. אשדוד',
        away: 'מ. קריית גת',
        sport: 'football',
      })?.id,
    ).toBe('israel-national')
    // ליגת העל נשארת ליגת העל.
    expect(
      findMatchLeague({
        texts: ['כדורגל: מכבי תל אביב - הפועל תל אביב'],
        home: 'מכבי תל אביב',
        away: 'הפועל תל אביב',
        sport: 'football',
      })?.id,
    ).toBe('israel')
  })

  it('מספק מיקומים למשחק בליגה הלאומית', async () => {
    vi.stubGlobal('fetch', stubFetch(LEUMIT_BODY))
    const now = Date.UTC(2026, 9, 17, 18, 0, 0)
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      api: { ...DEFAULT_SETTINGS.api, footballApiKey: '', tmdbApiKey: '' },
    }
    const demo = buildDemoSnapshot(now)
    const snapshot = {
      channels: demo.channels,
      programmes: [
        ...demo.programmes,
        {
          channelId: 'dem-sport5',
          channelName: 'ספורט 5',
          title: 'שידור ישיר: כדורגל. מ.ס. אשדוד - מ. קריית גת, הליגה הלאומית, מחזור 8',
          start: now - 10 * 60_000,
          stop: now + 80 * 60_000,
          categories: ['ספורט', 'כדורגל'],
        },
      ],
      warnings: [],
    }
    const warnings: { code: string; message: string }[] = []
    const recommendations = await buildRecommendations(snapshot, settings, now, undefined, warnings)
    const match = recommendations.find((entry) => entry.programme.title.includes('קריית גת'))
    expect(match?.sport?.competition).toBe('הליגה הלאומית')
    expect(match?.sport?.homeTeam?.position).toBe(1)
    expect(match?.sport?.awayTeam?.position).toBe(11)
  })
})

/* ------------------------------------------------------------------ */
/* הכותרות האמיתיות של המדריך                                           */
/* ------------------------------------------------------------------ */

describe('המשחקים מהמדריך מקבלים מיקום', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** שורת ESPN מינימלית — רק השדות שהמנוע צריך. */
  const espnEntry = (displayName: string, rank: number, points: number) => ({
    team: { displayName },
    stats: [
      { name: 'rank', value: rank },
      { name: 'gamesPlayed', value: 9 },
      { name: 'points', value: points },
      { name: 'pointDifferential', value: 0 },
    ],
  })
  const espnBody = (entries: unknown[]) => ({
    season: { year: SEASON_YEAR },
    children: [{ standings: { entries } }],
  })

  const emptySettings = (): Settings => ({
    ...DEFAULT_SETTINGS,
    api: { ...DEFAULT_SETTINGS.api, footballApiKey: '', tmdbApiKey: '' },
  })

  it('ספרד: "אספניול - את. מדריד" ו"ר. בטיס - ברצלונה" מקבלים מיקום', async () => {
    // התקציר האמיתי — בלי המילה "כדורגל" ובלי קטגוריות מה-EPG. ‏בלי שם הליגה
    // ברשימת סימני הענף המשחק היה נשאר "ספורט" כללי ובלי טבלה.
    expect(
      detectSport('שידור ישיר: ליגה ספרדית 2026/27, מחזור 9: אספניול מארחת את אתלטיקו מדריד.'),
    ).toBe('football')
    const spain = espnBody([
      espnEntry('Barcelona', 1, 24),
      espnEntry('Atlético Madrid', 2, 19),
      espnEntry('Real Betis', 3, 19),
      espnEntry('Espanyol', 5, 12),
    ])
    vi.stubGlobal('fetch', async (input: unknown) => {
      const body = String(input).includes('esp.1') ? spain : { season: {}, children: [] }
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) }
    })

    const now = Date.UTC(2026, 9, 17, 18, 0, 0)
    const demo = buildDemoSnapshot(now)
    const snapshot = {
      channels: demo.channels,
      programmes: [
        {
          channelId: 'dem-sport5',
          channelName: 'ספורט 5',
          title: 'ישיר! אספניול - את. מדריד',
          description: 'שידור ישיר: ליגה ספרדית 2026/27, מחזור 9: אספניול מארחת את אתלטיקו מדריד.',
          start: now - 5 * 60_000,
          stop: now + 95 * 60_000,
          categories: [],
        },
        {
          channelId: 'dem-sport2',
          channelName: 'ספורט 2',
          title: 'ישיר! ר. בטיס - ברצלונה',
          description: 'שידור ישיר: ליגה ספרדית 2026/27, מחזור 9: ריאל בטיס מארחת את ברצלונה.',
          start: now + 30 * 60_000,
          stop: now + 130 * 60_000,
          categories: [],
        },
      ],
      warnings: [],
    }
    const warnings: { code: string; message: string }[] = []
    const recommendations = await buildRecommendations(
      snapshot,
      emptySettings(),
      now,
      undefined,
      warnings,
    )

    const espanyol = recommendations.find((entry) => entry.programme.title.includes('אספניול'))
    expect(espanyol?.sport?.competition).toBe('ליגה ספרדית')
    expect(espanyol?.sport?.homeTeam?.name).toBe('אספניול')
    expect(espanyol?.sport?.homeTeam?.position).toBe(5)
    // הקיצור "את. מדריד" — הכרטיס היה מציג "אין נתוני טבלה" בלעדיו.
    expect(espanyol?.sport?.awayTeam?.name).toBe('אתלטיקו מדריד')
    expect(espanyol?.sport?.awayTeam?.position).toBe(2)

    const betis = recommendations.find((entry) => entry.programme.title.includes('בטיס'))
    expect(betis?.sport?.homeTeam?.name).toBe('ריאל בטיס')
    expect(betis?.sport?.homeTeam?.position).toBe(3)
    expect(betis?.sport?.awayTeam?.position).toBe(1)
  })

  it('צרפת: המשחק מליג 2 מקבל את טבלת הליגה השנייה ולא את הראשונה', async () => {
    const france2 = espnBody([
      espnEntry('Saint-Étienne', 1, 21),
      espnEntry('Metz', 10, 12),
      espnEntry('Dunkerque', 12, 10),
      espnEntry('Nantes', 14, 9),
    ])
    vi.stubGlobal('fetch', async (input: unknown) => {
      const body = String(input).includes('fra.2') ? france2 : { season: {}, children: [] }
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) }
    })

    const now = Date.UTC(2026, 9, 17, 18, 0, 0)
    const demo = buildDemoSnapshot(now)
    const snapshot = {
      channels: demo.channels,
      programmes: [
        ...demo.programmes,
        {
          channelId: 'dem-sport5',
          channelName: 'ספורט 5',
          title: 'ישיר! נאנט - דנקרק',
          description: 'שידור ישיר: כדורגל. נאנט נגד דנקרק, ליגה צרפתית שנייה, מחזור 9.',
          start: now - 5 * 60_000,
          stop: now + 95 * 60_000,
          categories: ['ספורט', 'כדורגל'],
        },
      ],
      warnings: [],
    }
    const warnings: { code: string; message: string }[] = []
    const recommendations = await buildRecommendations(
      snapshot,
      emptySettings(),
      now,
      undefined,
      warnings,
    )
    const match = recommendations.find((entry) => entry.programme.title.includes('דנקרק'))
    expect(match?.sport?.competition).toBe('הליגה הצרפתית השנייה')
    expect(match?.sport?.homeTeam?.name).toBe('נאנט')
    expect(match?.sport?.homeTeam?.position).toBe(14)
    expect(match?.sport?.awayTeam?.position).toBe(12)
  })
})

/* ------------------------------------------------------------------ */
/* ONE כגיבוי לטבלאות הזרות                                             */
/* ------------------------------------------------------------------ */

describe('ONE כגיבוי לטבלאות שחוץ מ-ESPN', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /*
   * הסיבה שבגללה נוסף הגיבוי: כשה-ESPN לא עונה (או שהעונה שלו לא נוכחית),
   * הליגה נשארה עם "אין נתוני טבלה" בכרטיס. עכשיו שם הטבלה של ONE מחכה.
   */
  it('נופל לטבלת ONE של הליגה הספרדית כשה-ESPN לא עונה', async () => {
    const url = (input: unknown) => String(input)
    vi.stubGlobal('fetch', async (input: unknown) => {
      if (url(input).includes('one.co.il/api/league/10')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () =>
            JSON.stringify({
              info: { name: 'ליגה ספרדית', season: LEUMIT_SEASON },
              standing: [
                { name: 'ברצלונה', position: 1, played: 10, wins: 8, draws: 0, losses: 2, goalsFor: 25, goalsAgainst: 9, goalDifference: '+16', points: 24 },
                { name: 'אתלטיקו מדריד', position: 2, played: 10, wins: 6, draws: 1, losses: 3, goalsFor: 16, goalsAgainst: 9, goalDifference: '+7', points: 19 },
                { name: 'ריאל מדריד', position: 3, played: 10, wins: 5, draws: 3, losses: 2, goalsFor: 15, goalsAgainst: 10, goalDifference: '+5', points: 18 },
                { name: 'סביליה', position: 4, played: 10, wins: 4, draws: 2, losses: 4, goalsFor: 12, goalsAgainst: 13, goalDifference: '-1', points: 14 },
                { name: 'חטאפה', position: 5, played: 10, wins: 3, draws: 2, losses: 5, goalsFor: 9, goalsAgainst: 14, goalDifference: '-5', points: 11 },
                { name: 'בטיס', position: 6, played: 10, wins: 3, draws: 1, losses: 6, goalsFor: 11, goalsAgainst: 16, goalDifference: '-5', points: 10 },
                { name: 'סלטה ויגו', position: 7, played: 10, wins: 2, draws: 3, losses: 5, goalsFor: 10, goalsAgainst: 15, goalDifference: '-5', points: 9 },
                { name: 'אלבסה', position: 8, played: 10, wins: 1, draws: 1, losses: 8, goalsFor: 5, goalsAgainst: 20, goalDifference: '-15', points: 4 },
              ],
            }),
        }
      }
      // כל בקשה אחרת (ESPN) נכשלת.
      throw new Error('network down')
    })
    const table = await loadLeagueTable('ליגה ספרדית', { config: { apiKey: '', baseUrl: '' } })
    expect(table?.source).toBe('one')
    expect(table?.teams[0].name).toBe('ברצלונה')
    expect(resolveTeam('ריאל מדריד', table?.teams ?? [])?.position).toBe(3)
  })
})

/* ------------------------------------------------------------------ */
/* ויקיפדיה — גיבוי לטבלת ליגת העל                                       */
/* ------------------------------------------------------------------ */

const WIKI_HTML = `
<table class="wikitable">
<tr><th>מארחת</th><th>תקופת התחרות</th></tr>
<tr><td>מכבי תל אביב</td><td>אוגוסט 2026</td></tr>
</table>
<table class="wikitable">
<tr><th>מיקום</th><th>קבוצה</th><th>משחקים</th><th>ניצחונות</th><th>תיקו</th><th>הפסדים</th>
<th>שערי<br>זכות</th><th>שערי<br>חובה</th><th>שערי<br>הפרש</th><th>נקודות</th><th>העפלה</th></tr>
<tr><td>1</td><td><a href="/wiki/x">מכבי תל אביב</a></td><td>5</td><td>5</td><td>0</td><td>0</td><td>18</td><td>6</td><td>12+</td><td>15</td><td>פלייאוף עליון</td></tr>
<tr><td>2</td><td>מכבי חיפה</td><td>5</td><td>4</td><td>0</td><td>1</td><td>12</td><td>7</td><td>5+</td><td>12</td><td></td></tr>
<tr><td>6</td><td>הפועל ירושלים</td><td>5</td><td>2</td><td>1</td><td>2</td><td>12</td><td>12</td><td>0</td><td>7</td><td></td></tr>
<tr><td>10</td><td>בני סכנין</td><td>5</td><td>1</td><td>1</td><td>3</td><td>3</td><td>6</td><td>3-</td><td>4</td><td></td></tr>
<tr><td>13</td><td>הפועל פתח תקווה</td><td>4</td><td>1</td><td>0</td><td>3</td><td>2</td><td>8</td><td>6-</td><td>3</td><td></td></tr>
<tr><td>14</td><td>עירוני טבריה</td><td>5</td><td>2</td><td>1</td><td>2</td><td>7</td><td>8</td><td>1-</td><td>1&#91;2&#93;</td><td></td></tr>
<tr><td>15</td><td>הפועל רמת גן</td><td>5</td><td>1</td><td>0</td><td>4</td><td>4</td><td>9</td><td>5-</td><td>3</td><td></td></tr>
<tr><td>16</td><td>הפועל חיפה</td><td>5</td><td>1</td><td>3</td><td>1</td><td>7</td><td>6</td><td>1+</td><td>6</td><td></td></tr>
</table>
`

describe('טבלת ליגת העל מוויקיפדיה', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('מפרסר את הטבלה האמיתית, כולל הפרש שלילי והערת שוליים בנקודות', () => {
    const teams = parseStandingsTable(WIKI_HTML)
    expect(teams).toHaveLength(8)
    expect(teams[0]).toMatchObject({
      name: 'מכבי תל אביב',
      position: 1,
      played: 5,
      points: 15,
      goalDifference: 12,
      zone: 'פלייאוף עליון',
    })
    // "3-" הוא הפרש שערים שלילי ו-"1&#91;2&#93;" הוא 1 עם הערת שוליים.
    const sakhnin = teams.find((team) => team.name === 'בני סכנין')
    expect(sakhnin?.goalDifference).toBe(-3)
    const tiberias = teams.find((team) => team.name === 'עירוני טבריה')
    expect(tiberias?.points).toBe(1)
  })

  it('בונה את שם הערך של העונה הנוכחית', () => {
    expect(israeliSeasonPage(2026)).toBe('עונת 2026/2027 בליגת העל בכדורגל')
  })

  it('נופל לויקיפדיה כש-ONE אינו זמין (גיבוי)', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ parse: { title: 'עונת 2026/2027', text: WIKI_HTML } }),
    }))
    const table = await loadLeagueTable('ליגת העל', { config: { apiKey: '', baseUrl: '' } })
    expect(table?.source).toBe('wikipedia')
    expect(table?.teams[0].name).toBe('מכבי תל אביב')
    const hapoel = resolveTeam('ה. י-ם', table?.teams ?? [])
    expect(hapoel?.position).toBe(6)
    expect(standingSummary(hapoel)).toContain('7 נק׳')
  })
})

/* ------------------------------------------------------------------ */
/* מסלול מלא: מהכרטיס ועד המיקום                                        */
/* ------------------------------------------------------------------ */

describe('מסלול מלא מנתוני הדוגמה', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('נותן מיקום למשחק האיטלקי בדוגמה ומשאיר את הכדורסל בלי טבלה', async () => {
    // רק הליגה האיטלקית מוחזרת — כל בקשה אחרת מקבלת תשובה ריקה.
    vi.stubGlobal('fetch', async (url: unknown) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () =>
        JSON.stringify(String(url).includes('ita.1') ? SERIE_A_BODY : { season: {}, children: [] }),
    }))

    const now = Date.UTC(2026, 9, 12, 18, 0, 0)
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      api: { ...DEFAULT_SETTINGS.api, footballApiKey: '', tmdbApiKey: '' },
    }
    const warnings: { code: string; message: string }[] = []
    const recommendations = await buildRecommendations(
      buildDemoSnapshot(now),
      settings,
      now,
      undefined,
      warnings,
    )

    const italian = recommendations.find((entry) =>
      entry.programme.title.includes('אטאלנטה'),
    )
    expect(italian?.sport?.homeTeam?.name).toBe('אטאלנטה')
    expect(italian?.sport?.homeTeam?.position).toBe(11)
    expect(italian?.sport?.awayTeam?.name).toBe('ונציה')
    expect(italian?.sport?.awayTeam?.position).toBe(20)
    expect(italian?.sport?.homeTeam?.leagueName).toBe('ליגה איטלקית')

    // משחק ישראלי — מהטבלה המקומית, בלי רשת.
    const israeli = recommendations.find((entry) =>
      entry.programme.title.includes('מכבי תל אביב - הפועל תל אביב'),
    )
    expect(israeli?.sport?.homeTeam?.position).toBe(1)

    // ה-NBA מזוהה כליגת כדורסל (התשובה הריקה מעל היא "אין טבלה") — ולכן
    // אין מיקום, אבל גם אין טבלת כדורגל בטעות. השם מגיע ממפת השמות.
    const nba = recommendations.find((entry) => entry.programme.title.includes('NBA'))
    expect(nba?.sport?.competition).toBe('ליגת ה-NBA')
    expect(nba?.sport?.homeTeam?.name).toBe('לוס אנג׳לס לייקרס')
    expect(nba?.sport?.awayTeam?.name).toBe('בוסטון סלטיקס')
    expect(nba?.sport?.homeTeam?.rankText).toBeUndefined()

    // כדורסל אירופי — אין מקור טבלה, ולכן אין מיקום (ולא טבלת כדורגל בטעות).
    const basketball = recommendations.find((entry) =>
      entry.programme.title.includes('יורוליג'),
    )
    expect(basketball?.sport?.homeTeam?.rankText).toBeUndefined()
    expect(basketball?.sport?.homeTeam?.name).toBe('מכבי תל אביב')
  })
})

/* ------------------------------------------------------------------ */
/* למה המשחק מעניין                                                    */
/* ------------------------------------------------------------------ */

function standings(): TeamStanding[] {
  return [
    { name: 'אינטר', englishName: 'Internazionale', aliases: [], position: 1, played: 6, points: 16, goalDifference: 10, won: 5, drawn: 1, lost: 0, goalsFor: 18, goalsAgainst: 8, zone: 'Champions League' },
    { name: 'רומא', englishName: 'AS Roma', aliases: [], position: 3, played: 6, points: 14, goalDifference: 6, won: 4, drawn: 2, lost: 0, goalsFor: 12, goalsAgainst: 6 },
    { name: 'אטאלנטה', englishName: 'Atalanta', aliases: [], position: 11, played: 6, points: 8, goalDifference: 1, won: 1, drawn: 5, lost: 0, goalsFor: 9, goalsAgainst: 8 },
    { name: 'ונציה', englishName: 'Venezia', aliases: [], position: 20, played: 6, points: 0, goalDifference: -14, won: 0, drawn: 0, lost: 6, goalsFor: 2, goalsAgainst: 16, zone: 'Relegation' },
  ]
}

describe('למה המשחק מעניין', () => {
  const atalanta: TeamRef = { name: 'אטאלנטה', englishName: 'Atalanta' }
  const venezia: TeamRef = { name: 'ונציה', englishName: 'Venezia' }

  it('מזהה מאבק ירידה והפרש נקודות', () => {
    const insight = matchInsight({
      table: standings(),
      league: findLeague('ליגה איטלקית'),
      home: atalanta,
      away: venezia,
    })
    const text = insight.bullets.join(' | ')
    expect(insight.hasPositions).toBe(true)
    expect(insight.rows[0].rankText).toContain('11')
    expect(insight.rows[1].rankText).toContain('20')
    expect(text).toContain('מתחת לקו האדום')
    expect(text).toContain('ההגנה החלשה בליגה')
  })

  it('מוריד לקובנטרי-ניוקאסל את שם הליגה מהתקציר', () => {
    expect(
      findLeague('שידור ישיר: כדורגל. קובנטרי - ניוקאסל, הליגה האנגלית, מחזור 6, עונת 2026/27.')
        ?.id,
    ).toBe('england')
  })

  it('לא מחזיר את ליגת האלופות של אירופה למפעל האסייתי, אלא את ליגת הקבוצה', () => {
    // "ליגת האלופות של אסיה" אין לה מקור טבלה — ולכן הזיהוי נופל לטבלה של
    // הליגה של הקבוצות (אל נאסר = הליגה הסעודית) במקום להציג טבלה אירופית.
    const league = findMatchLeague({
      texts: [
        "שידור ישיר: כדורגל. אל נאסר (רונאלדו) - נפטצ'י פרגונה, ליגת האלופות של אסיה, מחזור 2",
      ],
      home: 'אל נאסר',
      away: "נפטצ'י פרגונה",
      sport: 'football',
    })
    expect(league?.id).toBe('saudi')
  })

  it('מזהה משחק של שש נקודות כשהפער קטן', () => {
    const row = (name: string, english: string, position: number, points: number): TeamStanding => ({
      name,
      englishName: english,
      aliases: [],
      position,
      played: 6,
      points,
      goalDifference: 0,
    })
    const insight = matchInsight({
      table: [
        row('אינטר', 'Internazionale', 1, 16),
        row('אטאלנטה', 'Atalanta', 6, 10),
        row('טורינו', 'Torino', 7, 9),
        row('קליארי', 'Cagliari', 8, 8),
        row('מונצה', 'Monza', 9, 7),
        row('ונציה', 'Venezia', 20, 1),
      ],
      league: findLeague('ליגה איטלקית'),
      home: atalanta,
      away: { name: 'טורינו', englishName: 'Torino' },
    })
    expect(insight.bullets.join(' | ')).toContain('רק נקודה אחת מפרידה ביניהן')
  })

  it('מזהה את המוליכה ואת ההתקפה הטובה', () => {
    const insight = matchInsight({
      table: standings(),
      league: findLeague('ליגה איטלקית'),
      home: { name: 'אינטר', englishName: 'Internazionale' },
      away: { name: 'רומא', englishName: 'AS Roma' },
    })
    const text = insight.bullets.join(' | ')
    expect(text).toContain('מוליכה את הטבלה')
    expect(text).toContain('ההתקפה הטובה בליגה')
  })

  it('מסביר שאין טבלה כשאין ליגה מזוהה', () => {
    const insight = matchInsight({ home: atalanta, away: venezia })
    expect(insight.hasPositions).toBe(false)
    expect(insight.bullets.some((bullet) => bullet.includes('אין טבלה'))).toBe(true)
  })
})
