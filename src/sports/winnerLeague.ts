/**
 * טבלת ליגת Winner סל (ליגת הכדורסל הישראלית הראשונה) מ-365scores.
 *
 * למה דווקא הוא:
 *  • API ציבורי בלי מפתח ובלי הרשמה, עם CORS פתוח — עובד גם בדפדפן וגם
 *    ב-WebView של האפליקציה,
 *  • מחזיר את העונה הנוכחית בפועל (2026/27), מתעדכן תוך כדי מחזור,
 *  • עם `langId=2` השמות כבר בעברית ("הפועל ירושלים") — אין תרגום
 *    שיכול להשתבש ואין סיכוי להציג שם של קבוצת כדורגל.
 *
 * 365scores לא מספקת "נקודות טבלה" כמו בכדורגל: הדירוג הוא לפי ניצחונות
 * (2 נקודות לניצחון בליגה הישראלית), והמאזן עצמו הוא הנתון המעניין.
 */

import { buildUrl, fetchJson } from '../data/http'
import type { TeamStanding } from '../types'
import { hebrewNameFor } from './teamNames'

const BASE = 'https://webws.365scores.com/web/standings/'

/** מזהה התחרות של ליגת Winner סל באתר 365scores. */
export const WINNER_LEAGUE_365_ID = 47

interface Scores365Competitor {
  name?: string
}

export interface Scores365Row {
  competitor?: Scores365Competitor
  position?: number | string
  gamePlayed?: number | string
  gamesWon?: number | string
  gamesLost?: number | string
  points?: number | string
  /** אחוז ניצחונות כמחרוזת: "1.000" / ".000". */
  pct?: number | string
  for?: number | string
  against?: number | string
}

export interface Scores365Standing {
  isCurrentStage?: boolean
  displayName?: string
  seasonNum?: number
  rows?: readonly Scores365Row[]
}

export interface Scores365Payload {
  standings?: readonly Scores365Standing[]
}

/** מספר או undefined — ה-API מחזיר חלק מהשדות כמחרוזת. */
function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** "1.000" -> 100, ".733" -> 73.3 */
export function pctToPercent(value: unknown): number | undefined {
  const parsed = num(value)
  if (parsed === undefined) return undefined
  return Math.round(parsed * 1000) / 10
}

/** שם לתצוגה: משאירים עברית כמו שהיא, ומתרגמים שם באנגלית כשיש כזה. */
function displayName(raw: string): string {
  if (/[\u0590-\u05FF]/.test(raw)) return raw
  return hebrewNameFor(raw) ?? raw
}

/**
 * מפרסר את תגובת 365scores לטבלה. השלב הנוכחי הוא זה שמוצג (בעונה עם
 * פלייאוף יש גם שלבי גמר, ואסור להציג אותם כליגה).
 */
export function parseScores365Standings(
  payload: Scores365Payload | null | undefined,
): TeamStanding[] {
  const standings = payload?.standings
  if (!Array.isArray(standings) || standings.length === 0) return []
  const current = standings.find((entry) => entry.isCurrentStage) ?? standings[0]
  const rows = current?.rows
  if (!Array.isArray(rows)) return []

  const teams: TeamStanding[] = []
  for (const row of rows) {
    const rawName = row.competitor?.name?.trim()
    const position = num(row.position)
    if (!rawName || position === undefined || position <= 0) continue

    const played = num(row.gamePlayed) ?? 0
    const won = num(row.gamesWon)
    const lost = num(row.gamesLost)
    const scored = num(row.for)
    const conceded = num(row.against)
    const winPercent = pctToPercent(row.pct)

    const standing: TeamStanding = {
      name: displayName(rawName),
      aliases: rawName === displayName(rawName) ? [] : [rawName],
      position,
      played,
      // בליגה הישראלית 2 נקודות לניצחון; אם השדה חסר נגזור מהניצחונות.
      points: num(row.points) ?? (won === undefined ? 0 : won * 2),
      goalDifference: scored !== undefined && conceded !== undefined ? scored - conceded : 0,
    }
    if (won !== undefined) standing.won = won
    if (lost !== undefined) standing.lost = lost
    if (scored !== undefined) standing.goalsFor = scored
    if (conceded !== undefined) standing.goalsAgainst = conceded
    if (winPercent !== undefined) {
      standing.winPercent = winPercent
    } else if (won !== undefined && played > 0) {
      standing.winPercent = Math.round((won / played) * 1000) / 10
    }
    teams.push(standing)
  }

  if (teams.length < 8) return []
  teams.sort((a, b) => a.position - b.position)
  return teams
}

/** טבלת Winner League מהמקור החי. מחזיר null כשאין טבלה שלמה. */
export async function fetchWinnerLeagueTable(options: {
  signal?: AbortSignal
} = {}): Promise<{ teams: TeamStanding[] } | null> {
  const url = buildUrl(BASE, {
    appTypeId: 5,
    // 2 = עברית: השמות והליגה מגיעים מתורגמים מהמקור.
    langId: 2,
    competitionId: WINNER_LEAGUE_365_ID,
    competitions: WINNER_LEAGUE_365_ID,
  })
  const payload = await fetchJson<Scores365Payload>(url, {
    signal: options.signal,
    retries: 1,
    timeoutMs: 12_000,
  })
  const teams = parseScores365Standings(payload)
  return teams.length > 0 ? { teams } : null
}
