/**
 * מחסן הטבלאות: המקום היחיד שמביא טבלת ליגה, ממטמן אותה ומסמן את המקור.
 *
 * סדר העדפה לכל ליגה:
 *  1. api-football — המפתח של המשתמש (עונה נוכחית רק במסלול בתשלום).
 *  2. ESPN — חי, בלי מפתח, מחזיר את העונה הנוכחית.
 *  3. 365scores — ליגת הכדורסל הישראלית (‏`israel-basketball`): השמות
 *     בעברית, CORS פתוח, העונה הנוכחית בפועל.
 *  4. ONE (one.co.il) — חי, בלי מפתח, בעברית, לליגת העל.
 *  5. ויקיפדיה העברית — גיבוי לליגת העל.
 *  6. livetv.sx — גיבוי אחרון: HTML בלי מפתח, כמעט לכל ליגה. בדפדפן נחסם
 *     ב-CORS; באפליקציה (CapacitorHttp) עובר כ-fetch ילידי.
 *  7. snapshot מקומי — ליגת העל.
 *
 * כל כשל נופל בשקט למקור הבא, ואם אין כלום — מחזירים null והמסך מסביר
 * שאין טבלה. הטבלה נשמרת גם ב-localStorage ל-6 שעות, כדי שמסך הפרטים ייפתח
 * מיד ולא יגע ברשת בכל לחיצה.
 */

import type { TeamStanding } from '../types'
import { loadSettings } from '../config/settings'
import { fetchApiFootballTable } from './apiFootball'
import { fetchEspnTable } from './espn'
import { fetchLivetvTable } from './livetv'
import { fetchOneTable } from './one'
import { currentSeasonStartYear, findLeague, leagueSport, type LeagueRef } from './leagues'
import { bundledTable, bundledTableDate } from './standings'
import { fetchIsraeliStandings } from './wikipedia'
import { fetchWinnerLeagueTable } from './winnerLeague'

export type TableSource =
  | 'api-football'
  | 'espn'
  | 'scores365'
  | 'one'
  | 'wikipedia'
  | 'livetv'
  | 'bundled'

export interface LeagueTable {
  league: LeagueRef
  teams: TeamStanding[]
  source: TableSource
  /** תיאור המקור בעברית, לתצוגה במסך הפרטים. */
  sourceLabel: string
  /** מתי הנתונים נשלפו (epoch ms). */
  fetchedAt: number
  /** שם העונה, למשל "2026/27". */
  seasonLabel?: string
}

export interface TableConfig {
  apiKey?: string
  baseUrl?: string
}

/**
 * גרסת המטמון. מעלים כשמשתנה סדר המקורות (כדי שטבלה שנשמרה ממקור ישן
 * לא תמנע טעינה מהמקור החדש), למשל כשנוסף ONE לפני ויקיפדיה כליגת העל
 * וכשנוסף livetv כגיבוי אחרון לפני ה-snapshot.
 */
const STORAGE_PREFIX = 'tv-recommender.league-table.v4.'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

/** מטמון המשותף לכל האפליקציה (הסריקה ומסך הפרטים רואים אותו מטמון). */
const memory = new Map<string, LeagueTable>()

function seasonLabel(year: number): string {
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

/**
 * שם העונה של ה-NBA. המקור מסמן אותה בשנת הסיום ("2026-27" -> 2027),
 * ולכן מציגים את שנת הפתיחה שלה ואת שנת הסיום בקצרה.
 */
function basketballSeasonLabel(year: number): string {
  const end = year % 100
  return `${year - 1}/${String(end).padStart(2, '0')}`
}

function readStored(leagueId: string): LeagueTable | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + leagueId)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as LeagueTable
    if (!parsed?.teams?.length) return undefined
    if (Date.now() - (parsed.fetchedAt ?? 0) > CACHE_TTL_MS) return undefined
    const league = findLeague(parsed.league?.name) ?? parsed.league
    return { ...parsed, league }
  } catch {
    return undefined
  }
}

function writeStored(table: LeagueTable): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + table.league.id, JSON.stringify(table))
  } catch {
    // אין אחסון מקומי — ממשיכים עם המטמון שבזיכרון
  }
}

function cache(table: LeagueTable): LeagueTable {
  memory.set(table.league.id, table)
  writeStored(table)
  return table
}

/** ממיר "טקסט או ליגה" לליגה. */
function resolveLeague(input: string | LeagueRef | undefined): LeagueRef | undefined {
  return typeof input === 'string' || input === undefined ? findLeague(input) : input
}

/** הטבלה השמורה (זיכרון או דיסק) בלי לפנות לרשת. */
export function peekLeagueTable(input: string | LeagueRef | undefined): LeagueTable | null {
  const league = resolveLeague(input)
  if (!league) return null
  const table = memory.get(league.id) ?? readStored(league.id)
  if (!table) return null
  if (Date.now() - table.fetchedAt > CACHE_TTL_MS && !league.bundled) {
    memory.delete(league.id)
    return null
  }
  return table
}

/** מוחק טבלה מהזיכרון ומהדיסק — כדי ששליפה הבאה תפנה למקור. */
function forgetLeagueTable(leagueId: string): void {
  memory.delete(leagueId)
  try {
    localStorage.removeItem(STORAGE_PREFIX + leagueId)
  } catch {
    // אין אחסון מקומי — הזיכרון כבר נוקה
  }
}

export function clearLeagueTables(): void {
  memory.clear()
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    // מתעלמים
  }
}

function bundledLookup(league: LeagueRef): LeagueTable {
  return {
    league,
    teams: bundledTable,
    source: 'bundled',
    sourceLabel: `טבלה מקומית · עדכון ${bundledTableDate}`,
    fetchedAt: Date.now(),
  }
}

export interface TableLoadOptions {
  signal?: AbortSignal
  config?: TableConfig
  forceRefresh?: boolean
  /**
   * מתי הסתיים המשחק האחרון בליגה הזו (epoch ms, רלוונטי רק למשחק שכבר נגמר).
   * טבלה שנשלפה לפני כן אינה יכולה לשקף את התוצאה שלו, ולכן היא נשלפת מחדש.
   */
  finishedAt?: number
}

/**
 * מביא את הטבלה לליגה שאליה שייך הטקסט (כותרת שידור / שם מסגרת).
 * תמיד מחזיר משהו או null — לא זורק.
 */
export async function loadLeagueTable(
  input: string | LeagueRef | undefined,
  options: TableLoadOptions = {},
): Promise<LeagueTable | null> {
  const league = resolveLeague(input)
  if (!league) return null

  if (!options.forceRefresh) {
    /*
     * peekLeagueTable (ולא קריאה ישירה מהזיכרון): הוא בודק גם את גיל הטבלה.
     * בטלוויזיה האפליקציה נשארת פתוחה ימים, וקריאה ישירה מהזיכרון הייתה
     * מחזירה לנצח טבלה שנשלפה פעם אחת — כלומר המיקומים לא היו מתעדכנים
     * אחרי מחזור. מעל CACHE_TTL_MS הטבלה נחשבת ישנה ונסלפת מחדש.
     */
    const cached = peekLeagueTable(league)
    /*
     * משחק שהסתיים אחרי שהטבלה נשלפה שינה את הטבלה — ולכן היא מיושנת בהכרח,
     * גם אם עוד לא עברו שש שעות. זה מה שמרענן את הליגה מיד אחרי כל משחק
     * ששוחק, בלי לחכות לפקיעת המטמון הכללי.
     */
    const staleAfterKickoff =
      cached !== null &&
      options.finishedAt !== undefined &&
      cached.fetchedAt < options.finishedAt
    if (cached && !staleAfterKickoff) return cached
    if (staleAfterKickoff) forgetLeagueTable(league.id)
  }

  const config: TableConfig = options.config ?? {
    apiKey: loadSettings().api.footballApiKey,
    baseUrl: loadSettings().api.footballBaseUrl,
  }
  const season = currentSeasonStartYear()

  // 1. api-football — המפתח של המשתמש (מקבל רק עונה נוכחית).
  if (league.apiFootball && config.apiKey?.trim()) {
    try {
      const api = await fetchApiFootballTable({
        leagueId: league.apiFootball,
        season,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl ?? '',
        signal: options.signal,
      })
      if (api && api.teams.length > 0) {
        return cache({
          league,
          teams: api.teams,
          source: 'api-football',
          sourceLabel: `api-football · עונת ${seasonLabel(api.season)}`,
          fetchedAt: Date.now(),
          seasonLabel: seasonLabel(api.season),
        })
      }
    } catch {
      // נופלים למקור הבא בלי להרעיש
    }
  }

  // 2. ESPN — מקור חי לעונה הנוכחית (כדורגל וגם ה-NBA).
  if (league.espn) {
    const basketball = leagueSport(league) === 'basketball'
    try {
      const espn = await fetchEspnTable(league.espn, {
        signal: options.signal,
        sport: basketball ? 'basketball' : 'soccer',
      })
      if (espn) {
        const label = basketball
          ? basketballSeasonLabel(espn.seasonYear)
          : seasonLabel(espn.seasonYear)
        return cache({
          league,
          teams: espn.teams,
          source: 'espn',
          sourceLabel: `ESPN · עונת ${label}`,
          fetchedAt: Date.now(),
          seasonLabel: label,
        })
      }
    } catch {
      // נופלים ל-snapshot
    }
  }

  // 3. 365scores — טבלת הכדורסל הישראלית (ליגת Winner סל).
  if (league.scores365) {
    try {
      const scores = await fetchWinnerLeagueTable({ signal: options.signal })
      if (scores && scores.teams.length > 0) {
        return cache({
          league,
          teams: scores.teams,
          source: 'scores365',
          sourceLabel: '365scores · ליגת Winner',
          fetchedAt: Date.now(),
        })
      }
    } catch {
      // נופלים למקור הבא
    }
  }

  // 4. ONE — מקור ישראלי חי, בעברית, עם CORS פתוח (ליגת העל).
  if (league.one) {
    try {
      const one = await fetchOneTable({
        leagueId: league.one,
        seasonStartYear: season,
        signal: options.signal,
      })
      if (one && one.teams.length > 0) {
        return cache({
          league,
          teams: one.teams,
          source: 'one',
          sourceLabel: `ONE · עונת ${seasonLabel(season)}`,
          fetchedAt: Date.now(),
          seasonLabel: seasonLabel(season),
        })
      }
    } catch {
      // נופלים לויקיפדיה
    }
  }

  // 5. ויקיפדיה העברית — גיבוי לטבלת ליגת העל (כולל הקבוצות שעלו ליגה,
  //    שאינן ב-snapshot).
  if (league.id === 'israel') {
    try {
      const wiki = await fetchIsraeliStandings({ seasonStartYear: season, signal: options.signal })
      if (wiki && wiki.teams.length > 0) {
        return cache({
          league,
          teams: wiki.teams,
          source: 'wikipedia',
          sourceLabel: `ויקיפדיה העברית · עונת ${seasonLabel(season)}`,
          fetchedAt: Date.now(),
          seasonLabel: seasonLabel(season),
        })
      }
    } catch {
      // נופלים ל-snapshot
    }
  }

  // 6. livetv.sx — גיבוי אחרון לליגה שיש לה מזהה שם אבל אין לה טבלה
  //    מ-api-football או מ-ESPN (למשל ליגה קטנה, או עונת חינם באזור אחר).
  if (league.livetv) {
    try {
      const livetv = await fetchLivetvTable(league.livetv, { signal: options.signal })
      if (livetv && livetv.teams.length > 0) {
        return cache({
          league,
          teams: livetv.teams,
          source: 'livetv',
          sourceLabel: livetv.seasonLabel
            ? `LiveTV · עונת ${livetv.seasonLabel}`
            : 'LiveTV',
          fetchedAt: Date.now(),
          ...(livetv.seasonLabel ? { seasonLabel: livetv.seasonLabel } : {}),
        })
      }
    } catch {
      // נופלים ל-snapshot
    }
  }

  // 7. snapshot מקומי — ליגת העל.
  if (league.bundled) return cache(bundledLookup(league))
  return null
}

/** טוען טבלה לכל ליגה בסריקה (לא לכל משחק) ומחזיר מפה לפי מזהה הליגה. */
export async function loadLeagueTables(
  leagues: readonly LeagueRef[],
  options: {
    signal?: AbortSignal
    config?: TableConfig
    /** מתי הסתיים משחק בליגה — לכל ליגה בנפרד. */
    finishedAt?: (league: LeagueRef) => number | undefined
  } = {},
): Promise<Map<string, LeagueTable>> {
  const out = new Map<string, LeagueTable>()
  for (const league of leagues) {
    if (out.has(league.id)) continue
    const finishedAt = options.finishedAt?.(league)
    const table = await loadLeagueTable(league, {
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.config ? { config: options.config } : {}),
      ...(finishedAt !== undefined ? { finishedAt } : {}),
    })
    if (table && table.league.id === league.id) out.set(league.id, table)
  }
  return out
}

export type { LeagueRef }
