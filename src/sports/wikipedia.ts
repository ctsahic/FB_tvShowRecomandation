/**
 * לקוח טבלאות מוויקיפדיה.
 *
 * למה זה קיים: לליגת העל אין מקור טבלה חי אחר.
 *  • api-football במסלול החינמי חסומה לעונה הנוכחית,
 *  • ESPN תקועה בעונת 2024 בליגה הישראלית,
 *  • TheSportsDB מחזירה טבלה חלקית (5 שורות),
 *  • וה-snapshot המקומי מתיישן ולא מכיר את הקבוצות שעלו ליגה.
 *
 * ויקיפדיה העברית מחזיקה את הטבלה של העונה הנוכחית, בעברית, עם המשחקים,
 * הניצחונות והנקודות — ומאפשרת CORS (`origin=*`), ולכן עובדת גם בתוך ה-WebView.
 */

import { fetchJson } from '../data/http'
import type { TeamStanding } from '../types'
import { canonicalTeam } from './teams'
import { hebrewNameFor } from './teamNames'

const HE_API = 'https://he.wikipedia.org/w/api.php'

interface WikiParseResponse {
  parse?: { title?: string; text?: string }
  error?: { code?: string; info?: string }
}

/** 'עונת 2026/2027 בליגת העל בכדורגל' — שם הערך של העונה הנוכחית. */
export function israeliSeasonPage(year: number): string {
  return `עונת ${year}/${year + 1} בליגת העל בכדורגל`
}

/** ניקוי תא בטבלה: תגיות, קישורי הערות וסימני [1]. */
function cellText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    // הערות שוליים של ויקיפדיה: "1[2]" או "1&#91;2&#93;" — לא חלק מהמספר
    // ולא חלק משם הקבוצה, ולכן מוסרות לפני חילוץ המספרים.
    .replace(/(?:&#91;|\[)[^\]\uFF3B]{0,40}(?:&#93;|\])/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#91;|&#93;|\[|\]/g, ' ')
    .replace(/\(הערה[^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** מספר מתוך תא. תומך ב-"1+", "1-", "12", ו-"1 [ 2 ]" (הערת שוליים). */
export function parseCellNumber(raw: string): number | undefined {
  const text = cellText(raw).replace(/[^\d+\-−]/gu, '')
  if (!text) return undefined
  const negative = text.startsWith('-') || text.startsWith('−') || text.endsWith('-') || text.endsWith('−')
  const digits = text.replace(/[^\d]/g, '')
  if (!digits) return undefined
  const value = Number(digits)
  if (!Number.isFinite(value)) return undefined
  return negative ? -value : value
}

interface ColumnMap {
  position?: number
  name?: number
  played?: number
  won?: number
  drawn?: number
  lost?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDifference?: number
  points?: number
  zone?: number
}

/** מיפוי העמודות לפי הכותרות — כדי לא להיות תלויים בסדר העמודות. */
function mapColumns(header: readonly string[]): ColumnMap {
  const map: ColumnMap = {}
  header.forEach((label, index) => {
    if (map.position === undefined && /מיקום|^מקום/.test(label)) map.position = index
    else if (map.name === undefined && /קבוצה|^שם/.test(label)) map.name = index
    else if (map.played === undefined && /משחקים/.test(label)) map.played = index
    else if (map.won === undefined && /ניצחונות/.test(label)) map.won = index
    else if (map.drawn === undefined && /תיקו/.test(label)) map.drawn = index
    else if (map.lost === undefined && /הפסדים/.test(label)) map.lost = index
    else if (map.goalsFor === undefined && /זכות/.test(label)) map.goalsFor = index
    else if (map.goalsAgainst === undefined && /חובה/.test(label)) map.goalsAgainst = index
    else if (map.goalDifference === undefined && /הפרש/.test(label)) map.goalDifference = index
    else if (map.points === undefined && /נקודות/.test(label)) map.points = index
    else if (map.zone === undefined && /העפלה|הערות|שלב/.test(label)) map.zone = index
  })
  return map
}

function splitRow(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((match) => match[1])
}

/**
 * מפרסר את טבלת הליגה מתוך HTML של ויקיפדיה. מחזיר null אם אין טבלה
 * שנראית כמו טבלת ליגה (כדי לא להציג טבלה של "מלך השערים" כמקום בטבלה).
 */
export function parseStandingsTable(html: string): TeamStanding[] {
  const tables = html.split('<table').slice(1)
  for (const table of tables) {
    const rows = table.split('<tr').slice(1)
    if (rows.length < 6) continue

    let columns: ColumnMap | undefined
    const teams: TeamStanding[] = []
    for (const row of rows) {
      const cells = splitRow(row)
      if (cells.length === 0) continue
      const texts = cells.map(cellText)
      if (!columns) {
        const header: string[] = []
        for (const cell of cells) {
          const match = /<th[^>]*>([\s\S]*?)<\/th>/.exec(cell)
          header.push(cellText(match ? match[1] : cell))
        }
        const candidate = mapColumns(header)
        if (
          candidate.position !== undefined &&
          candidate.name !== undefined &&
          candidate.points !== undefined
        ) {
          columns = candidate
        }
        continue
      }

      const get = (index: number | undefined): string =>
        index === undefined ? '' : (texts[index] ?? '')
      const rawName = get(columns.name)
      if (!rawName) continue
      const position = parseCellNumber(get(columns.position))
      if (position === undefined || position <= 0) continue
      const name = canonicalTeam(rawName) ?? hebrewNameFor(rawName) ?? rawName

      const standing: TeamStanding = {
        name,
        aliases: name === rawName ? [] : [rawName],
        position,
        played: parseCellNumber(get(columns.played)) ?? 0,
        points: parseCellNumber(get(columns.points)) ?? 0,
        goalDifference:
          parseCellNumber(get(columns.goalDifference)) ??
          (parseCellNumber(get(columns.goalsFor)) ?? 0) -
            (parseCellNumber(get(columns.goalsAgainst)) ?? 0),
      }
      const won = parseCellNumber(get(columns.won))
      const drawn = parseCellNumber(get(columns.drawn))
      const lost = parseCellNumber(get(columns.lost))
      const goalsFor = parseCellNumber(get(columns.goalsFor))
      const goalsAgainst = parseCellNumber(get(columns.goalsAgainst))
      const zone = get(columns.zone)
      if (won !== undefined) standing.won = won
      if (drawn !== undefined) standing.drawn = drawn
      if (lost !== undefined) standing.lost = lost
      if (goalsFor !== undefined) standing.goalsFor = goalsFor
      if (goalsAgainst !== undefined) standing.goalsAgainst = goalsAgainst
      if (zone) standing.zone = zone
      teams.push(standing)
    }

    if (teams.length >= 8) return teams.sort((a, b) => a.position - b.position)
  }
  return []
}

export interface WikipediaTable {
  teams: TeamStanding[]
  /** שם הערך שממנו נלקחה הטבלה — לתצוגה. */
  page: string
}

/** טבלת ליגת העל של העונה הנוכחית מוויקיפדיה העברית. */
export async function fetchIsraeliStandings(options: {
  seasonStartYear: number
  signal?: AbortSignal
}): Promise<WikipediaTable | null> {
  const page = israeliSeasonPage(options.seasonStartYear)
  const url =
    `${HE_API}?action=parse&format=json&formatversion=2&prop=text&origin=*` +
    `&page=${encodeURIComponent(page)}`
  const payload = await fetchJson<WikiParseResponse>(url, {
    signal: options.signal,
    retries: 1,
    timeoutMs: 12_000,
  })
  const html = payload.parse?.text
  if (!html) return null
  const teams = parseStandingsTable(html)
  if (teams.length < 8) return null
  return { teams, page: payload.parse?.title ?? page }
}
