/**
 * לקוח הטבלה של ONE (one.co.il) — המקור הישראלי.
 *
 * למה דווקא הוא:
 *  • API ציבורי בלי מפתח ובלי הרשמה,
 *  • מחזיר CORS פתוח (`access-control-allow-origin: *`) ולכן עובד גם בדפדפן
 *    וגם ב-WebView,
 *  • מחזיר את העונה *הנוכחית* בפועל (2026/27) ומתעדכן תוך כדי מחזור,
 *  • שמות הקבוצות כבר בעברית — אין צורך בתרגום ולכן אין סיכוי לתרגום שגוי.
 *
 * זה המקור שמזין את טבלת ליגת העל. ויקיפדיה נשארת מאחוריו כגיבוי בלבד.
 */

import { buildUrl, fetchJson } from '../data/http'
import type { TeamStanding } from '../types'
import { currentSeasonStartYear } from './leagues'
import { canonicalTeam } from './teams'

const BASE = 'https://www.one.co.il/api/league'

/** מספר או undefined — ה-API מחזיר חלק מהשדות כמחרוזת. */
function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

/** הפרש שערים: ONE שולח מחרוזת עם סימן ("+12", "-4", "0"). */
export function parseGoalDifference(
  value: unknown,
  goalsFor?: number,
  goalsAgainst?: number,
): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed && /^[+-]?\d+$/.test(trimmed)) return Number(trimmed)
  }
  if (goalsFor !== undefined && goalsAgainst !== undefined) return goalsFor - goalsAgainst
  return undefined
}

export interface OneStandingRow {
  position?: number
  name?: string
  shortName?: string
  played?: number
  wins?: number
  draws?: number
  losses?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDifference?: string | number
  points?: number
  zoneName?: string
}

export interface OnePayload {
  info?: { name?: string; season?: string }
  standing?: OneStandingRow[]
  lastUpdate?: string
}

export interface OneTable {
  teams: TeamStanding[]
  /** שם העונה כפי שדווח, למשל "2026/2027". */
  season?: string
  /** מתי ONE עדכנה את הטבלה. */
  updated?: string
}

/** "2026/2027" — הפורמט של ONE לשם עונה. */
export function oneSeasonLabel(year: number): string {
  return `${year}/${year + 1}`
}

/**
 * האם שם העונה של ONE הוא העונה הנוכחית.
 *
 * ONE אינה עקבית בין העמודים: ליגת העל מגיעה כ־"2026/2027", והליגה הלאומית
 * והליגות הזרות כ־"26-27". בדיקה של מחרוזת אחת בדיוק דחתה את כל הטבלאות
 * בפורמט השני — כלומר בדיוק את אלה שהיו חסרות.
 */
export function oneSeasonMatches(
  season: string | undefined,
  seasonStartYear: number,
): boolean {
  if (!season?.trim()) return false
  const text = season.trim()
  const range = text.match(/^(\d{2,4})\s*[/-]\s*(\d{2,4})$/)
  if (range) {
    const start = Number(range[1])
    // "2026" נשמר כמו שהוא, "26" הוא 2026, ו"96" הוא 1996.
    const year = start >= 100 ? start : start >= 90 ? 1900 + start : 2000 + start
    return year === seasonStartYear
  }
  const single = text.match(/^(\d{4})$/)
  return Boolean(single && Number(single[1]) === seasonStartYear)
}

/**
 * ממיר שורת טבלה של ONE ל-TeamStanding.
 * שם הקבוצה עובר דרך המפה הקנונית ("מכבי ת\"א" -> "מכבי תל אביב") כדי
 * שמשחק מה-EPG יימצא בטבלה גם כשכל צד משתמש בקיצור אחר.
 */
function mapRow(row: OneStandingRow): TeamStanding | null {
  const rawName = row.name?.trim()
  if (!rawName) return null
  const position = num(row.position)
  if (position === undefined || position <= 0) return null

  const name = canonicalTeam(rawName) ?? rawName
  const aliases = new Set<string>()
  for (const value of [rawName, row.shortName]) {
    const alias = value?.trim()
    if (alias && alias !== name) aliases.add(alias)
  }

  const goalsFor = num(row.goalsFor)
  const goalsAgainst = num(row.goalsAgainst)
  const standing: TeamStanding = {
    name,
    aliases: [...aliases],
    position,
    played: num(row.played) ?? 0,
    points: num(row.points) ?? 0,
    goalDifference: parseGoalDifference(row.goalDifference, goalsFor, goalsAgainst) ?? 0,
  }
  const won = num(row.wins)
  const drawn = num(row.draws)
  const lost = num(row.losses)
  if (won !== undefined) standing.won = won
  if (drawn !== undefined) standing.drawn = drawn
  if (lost !== undefined) standing.lost = lost
  if (goalsFor !== undefined) standing.goalsFor = goalsFor
  if (goalsAgainst !== undefined) standing.goalsAgainst = goalsAgainst
  if (row.zoneName?.trim()) standing.zone = row.zoneName.trim()
  return standing
}

/** מפרסר את תגובת ONE. רשימה קצרה מדי אינה נחשבת טבלת ליגה. */
export function parseOneStandings(payload: OnePayload | null | undefined): TeamStanding[] {
  const rows = payload?.standing
  if (!Array.isArray(rows)) return []
  const teams = rows
    .map(mapRow)
    .filter((row): row is TeamStanding => row !== null)
    .sort((a, b) => a.position - b.position)
  return teams.length >= 8 ? teams : []
}

/**
 * טבלת הליגה מ-ONE. מחזיר null כשאין נתונים או כשהעונה שדווחה אינה העונה
 * הנוכחית — עדיף בלי טבלה מאשר טבלה של עונה שעברה.
 */
export async function fetchOneTable(input: {
  leagueId: string | number
  seasonStartYear?: number
  signal?: AbortSignal
}): Promise<OneTable | null> {
  const url = buildUrl(`${BASE}/${input.leagueId}`, { quick: 1 })
  const payload = await fetchJson<OnePayload>(url, {
    signal: input.signal,
    retries: 1,
    timeoutMs: 12_000,
  })
  const teams = parseOneStandings(payload)
  if (teams.length === 0) return null

  const expected = input.seasonStartYear ?? currentSeasonStartYear()
  const season = payload.info?.season?.trim()
  // שם עונה חסר אינו סיבה לדחות טבלה; שם עונה של עונה אחרת — כן.
  if (season && !oneSeasonMatches(season, expected)) return null
  return { teams, ...(season ? { season } : {}), ...(payload.lastUpdate ? { updated: payload.lastUpdate } : {}) }
}
