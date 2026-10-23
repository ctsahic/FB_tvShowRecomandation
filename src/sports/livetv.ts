/**
 * טבלת ליגה מ-livetv.sx — מקור גיבוי אחרון, כשגם api-football וגם ESPN
 * לא מחזירים טבלה.
 *
 * למה זה טוב: ל-livetv יש טבלה לכל ליגה כמעט (כולל ליגות קטנות שאין להן
 * רשומה ב-ESPN), בלי מפתח ובלי הרשמה. למה זה רק גיבוי: זה HTML ולא API —
 * אפשר שהעמוד ישנה, והוא לא מחזיר שערי זכות/חובה בנפרד אלא רק הפרש,
 * אין בו טופס (form) ואין אזורי העפלה/ירידה.
 *
 * כתובת העמוד: https://livetv.sx/enx/tables/{id}/ — מזהה הליגה מגיע
 * מ-`LeagueRef.livetv`, ונלקח מהקטלוג שמפורסם בסרגל הצד של האתר עצמו
 * (המיפוי המלא: tools/livetv-tables.md).
 *
 * חשוב לדעת על CORS: livetv.sx לא שולחת Access-Control-Allow-Origin.
 * באפליקציה המותקנת הבקשה עוברת דרך CapacitorHttp (‏fetch ילידי) ולכן עובדת;
 * בדפדפן רגיל (vite dev) היא תיחסם — ואז פשוט נופלים למקור הבא, בלי להרעיש.
 */

import { fetchText } from '../data/http'
import type { TeamStanding } from '../types'
import { hebrewNameFor } from './teamNames'

const BASE = 'https://livetv.sx'
const LANG = 'enx'

export interface LivetvTable {
  teams: TeamStanding[]
  /** שנת פתיחת העונה כפי שהיא כתובה בכותרת העמוד, למשל 2026 ל-"26/27". */
  seasonStartYear?: number
  /** תווית העונה כפי שהיא מופיעה בעמוד, למשל "26/27". */
  seasonLabel?: string
}

export interface LivetvTableOptions {
  signal?: AbortSignal
  /** דומיין חלופי, לכשה-sx חסום (למשל livetv904.me). */
  baseUrl?: string
}

const entityMap: Record<string, string> = {
  '&nbsp;': ' ',
  '&ndash;': '-',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
}

/** טקסט מתוך קטע HTML, בלי תגיות, עם פענוח ישויות בסיסיות. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&[a-z#0-9]+;/gi, (match) => entityMap[match] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** תווית העונה מכותרת העמוד: "England. Premier League 26/27 / Table / LiveTV". */
export function parseLivetvSeasonLabel(title: string): string | undefined {
  const range = title.match(/\b(\d{2})\/(\d{2})\b/)
  if (range) return `${range[1]}/${range[2]}`
  const single = title.match(/\b(20\d{2})\b/)
  if (single) return single[1]
  return undefined
}

/** שנת פתיחת העונה מתווית כמו "26/27" (‏-> 2026) או "2026". */
export function seasonStartYearFrom(label: string | undefined): number | undefined {
  if (!label) return undefined
  const range = label.match(/^(\d{2})\/(\d{2})$/)
  if (range) {
    const start = Number(range[1])
    return start >= 90 ? 1900 + start : 2000 + start
  }
  const year = Number(label)
  return Number.isFinite(year) && year > 1900 ? year : undefined
}

/**
 * שורות המיקום מתוך ה-HTML של עמוד הליגה.
 *
 * המבנה: טבלה אחת ובה שורה לכל קבוצה עם תשעה תאים —
 * מיקום · לוגו · קבוצה · משוחקים · נ׳ · ת׳ · ה׳ · "שערי זכות / חובה" · נקודות.
 * טבלאות אחרות בעמוד (למשל רשימת הליגות שבסרגל) לא נכנסות לחשבון כי אין בהן
 * קישורי קבוצה (`/enx/team/`) ואין בהן תשעה תאים.
 */
export function parseLivetvStandings(html: string): TeamStanding[] {
  const blocks = html.match(/<table[\s\S]*?<\/table>/gi) ?? []
  let best: TeamStanding[] = []

  for (const block of blocks) {
    if (!/<a[^>]+href="[^"]*\/enx\/team\//i.test(block)) continue
    const rows = block.match(/<tr[\s\S]*?<\/tr>/gi) ?? []
    const teams: TeamStanding[] = []

    for (const row of rows) {
      const link = row.match(/<a[^>]+href="[^"]*\/enx\/team\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      if (!link) continue
      const english = textOf(link[1])
      if (!english) continue

      const cells = [...row.matchAll(/<td[\s\S]*?<\/td>/gi)].map((match) => textOf(match[0]))
      // חייבים בדיוק תשעה תאים: מיקום · לוגו · קבוצה · משוחקים · נ׳ · ת׳ · ה׳ · שערים · נקודות.
      if (cells.length !== 9) continue
      const numbers = cells.filter((cell) => /^\d+$/.test(cell)).map(Number)
      if (numbers.length !== 6) continue

      const [position, played, won, drawn, lost, points] = numbers
      if (!position || position > 100) continue

      const hebrew = hebrewNameFor(english)
      const standing: TeamStanding = {
        name: hebrew ?? english,
        englishName: english,
        aliases: hebrew && hebrew !== english ? [english] : [],
        position,
        played,
        points,
        goalDifference: 0,
        won,
        drawn,
        lost,
      }

      // תא השערים הוא "16 / 5" — זכות / חובה.
      const goals = cells
        .map((cell) => cell.match(/^(\d+)\s*\/\s*(\d+)$/))
        .find((match): match is RegExpMatchArray => match !== null)
      if (goals) {
        standing.goalsFor = Number(goals[1])
        standing.goalsAgainst = Number(goals[2])
        standing.goalDifference = standing.goalsFor - standing.goalsAgainst
      }

      teams.push(standing)
    }

    // הטבלה הגדולה בעמוד היא טבלת הליגה; טבלאות קטנות הן בתים/קבוצות של גביע.
    if (teams.length > best.length) best = teams
  }

  return best.sort((a, b) => a.position - b.position)
}

/**
 * הטבלה של הליגה מ-livetv. מחזיר null כשאין מזהה, כשיש שגיאה, או כשהעמוד
 * לא החזיר טבלת מיקום (גביע, ליגה שאין לה טבלה, או שהאתר חסום).
 */
export async function fetchLivetvTable(
  id: number,
  options: LivetvTableOptions = {},
): Promise<LivetvTable | null> {
  if (!Number.isFinite(id) || id <= 0) return null
  const base = (options.baseUrl?.trim() || BASE).replace(/\/+$/, '')
  let html: string
  try {
    html = await fetchText(`${base}/${LANG}/tables/${id}/`, {
      signal: options.signal,
      retries: 0,
      timeoutMs: 12_000,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    })
  } catch {
    // חסימת CORS בדפדפן, מידע סלולרי למטוס וכו' — פשוט אין טבלה מהמקור הזה.
    return null
  }

  const teams = parseLivetvStandings(html)
  if (teams.length < 4) return null

  const title = textOf((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? '')
  const seasonLabel = parseLivetvSeasonLabel(title)
  const seasonStartYear = seasonStartYearFrom(seasonLabel)
  const table: LivetvTable = { teams }
  if (seasonLabel) table.seasonLabel = seasonLabel
  if (seasonStartYear) table.seasonStartYear = seasonStartYear
  return table
}
