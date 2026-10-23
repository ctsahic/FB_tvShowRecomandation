/**
 * לקוח הטבלאות של ESPN.
 *
 * למה דווקא הוא: הוא חינמי, בלי מפתח ובלי הרשמה, מחזיר CORS פתוח (עובד גם
 * בתוך ה-WebView של האפליקציה), ומחזיר את העונה *הנוכחית* בפועל — כולל
 * שורה מלאה לכל קבוצה: משחקים, ניצחונות/תיקו/הפסדים, שערים, נקודות ואזור.
 *
 * שני ענפים נתמכים:
 *  • soccer      — כל ליגות הכדורגל („ita.1”, „eng.1”, …).
 *  • basketball  — ה-NBA. אין שם „נקודות טבלה” כמו בכדורגל, ולכן הדירוג הוא
 *                  לפי אחוז ניצחונות, והאזור הוא הבית (מזרח/מערב).
 *
 * הטבלה נדחית אם העונה שהוחזרה אינה העונה הנוכחית (למשל הליגה הישראלית,
 * שבה ESPN תקועה בעונת 2024) — עדיף בלי טבלה מאשר טבלה מיושנת.
 */

import { fetchJson } from '../data/http'
import type { TeamStanding } from '../types'
import { currentSeasonStartYear } from './leagues'
import { hebrewNameFor } from './teamNames'

const BASE = 'https://site.api.espn.com/apis/v2/sports'

/** הענף שגורר את הכתובת ב-ESPN. */
export type EspnSport = 'soccer' | 'basketball'

interface EspnStat {
  name?: string
  value?: number
  displayValue?: string
}

interface EspnTeam {
  displayName?: string
  name?: string
  shortDisplayName?: string
  abbreviation?: string
  slug?: string
  nickname?: string
}

interface EspnEntry {
  team?: EspnTeam
  stats?: EspnStat[]
  note?: { description?: string }
}

interface EspnGroup {
  name?: string
  abbreviation?: string
  standings?: { entries?: EspnEntry[] }
}

interface EspnResponse {
  season?: { year?: number; slug?: string }
  children?: EspnGroup[]
}

export interface EspnTable {
  teams: TeamStanding[]
  seasonYear: number
  /** מתי ESPN עדכנה את הטבלה, אם דווח. */
  updated?: string
}

export interface EspnTableOptions {
  signal?: AbortSignal
  /** ברירת המחדל: כדורגל. */
  sport?: EspnSport
}

function statValue(entry: EspnEntry, name: string): number | undefined {
  const stat = entry.stats?.find((candidate) => candidate.name === name)
  if (!stat) return undefined
  const value = typeof stat.value === 'number' ? stat.value : Number(stat.value)
  return Number.isFinite(value) ? value : undefined
}

/** הכינויים של הקבוצה בשמות שהמקור מדווח עליהם (להתאמה מול ה-EPG). */
function teamAliases(team: EspnTeam | undefined, english: string): string[] {
  const values = [
    team?.name,
    team?.shortDisplayName,
    team?.nickname,
    team?.abbreviation,
    team?.slug,
  ]
  return [
    ...new Set(values.filter((value): value is string => Boolean(value && value.trim() && value !== english))),
  ]
}

function mapSoccerEntry(entry: EspnEntry): TeamStanding | null {
  const english = entry.team?.displayName?.trim()
  if (!english) return null
  const hebrew = hebrewNameFor(english)
  const standing: TeamStanding = {
    name: hebrew ?? english,
    englishName: english,
    aliases: teamAliases(entry.team, english),
    position: statValue(entry, 'rank') ?? 0,
    played: statValue(entry, 'gamesPlayed') ?? 0,
    points: statValue(entry, 'points') ?? 0,
    goalDifference: statValue(entry, 'pointDifferential') ?? 0,
  }
  const won = statValue(entry, 'wins')
  const drawn = statValue(entry, 'ties')
  const lost = statValue(entry, 'losses')
  const goalsFor = statValue(entry, 'pointsFor')
  const goalsAgainst = statValue(entry, 'pointsAgainst')
  if (won !== undefined) standing.won = won
  if (drawn !== undefined) standing.drawn = drawn
  if (lost !== undefined) standing.lost = lost
  if (goalsFor !== undefined) standing.goalsFor = goalsFor
  if (goalsAgainst !== undefined) standing.goalsAgainst = goalsAgainst
  if (entry.note?.description) standing.zone = entry.note.description
  return standing
}

/** „מזרח”/„מערב” לפי שם הבית ב-ESPN — לתצוגה במקום השם באנגלית. */
function conferenceLabel(group: EspnGroup): string | undefined {
  const text = `${group.abbreviation ?? ''} ${group.name ?? ''}`.toLowerCase()
  if (text.includes('east')) return 'מזרח'
  if (text.includes('west')) return 'מערב'
  const name = group.name?.trim()
  return name || undefined
}

/**
 * שורת NBA. ה-ESPN לא מדרג את הקבוצות בסדר עולמי אלא לפי בית, ואין שם
 * „נקודות” — ולכן המיקום נקבע אחר כך (מיון לפי אחוז ניצחונות), והאזור הוא
 * הבית. השדות הכמותיים ממופים לשדות הכלליים: סלים = נקודות שהקבוצה קלעה.
 */
function mapBasketballEntry(entry: EspnEntry, conference: string | undefined): TeamStanding | null {
  const english = entry.team?.displayName?.trim()
  if (!english) return null
  const hebrew = hebrewNameFor(english)
  const wins = statValue(entry, 'wins') ?? 0
  const losses = statValue(entry, 'losses') ?? 0
  const pointsFor = statValue(entry, 'pointsFor')
  const pointsAgainst = statValue(entry, 'pointsAgainst')
  const standing: TeamStanding = {
    name: hebrew ?? english,
    englishName: english,
    aliases: teamAliases(entry.team, english),
    position: 0,
    played: wins + losses,
    // ה„נקודות” בכדורסל הן ניצחונות — הן מה שקובע את הדירוג.
    points: wins,
    // ה-ESPN מחזיר את הפרש הנקודות בשבר עשרוני; מעבירים אותו לשלם.
    goalDifference: Math.round(
      statValue(entry, 'differential') ?? statValue(entry, 'pointDifferential') ?? 0,
    ),
    won: wins,
    lost: losses,
  }
  const winPercent = statValue(entry, 'winPercent')
  if (winPercent !== undefined) standing.winPercent = Math.round(winPercent * 1000) / 10
  if (pointsFor !== undefined) standing.goalsFor = pointsFor
  if (pointsAgainst !== undefined) standing.goalsAgainst = pointsAgainst
  if (conference) standing.zone = conference
  return standing
}

/** האם העונה שהתקבלה היא העונה הנוכחית של הענף. */
function seasonMatches(sport: EspnSport, seasonYear: number, expected: number): boolean {
  // ליגות כדורגל באירופה מסומנות בשנת הפתיחה. ה-NBA מסומנת בשנת הסיום
  // („2026-27” -> 2027), ולכן מקבלים גם את שנת הפתיחה וגם את זו שאחריה.
  if (sport === 'basketball') return seasonYear === expected || seasonYear === expected + 1
  return seasonYear === expected
}

/** הטבלה של הליגה, או null כשאין נתונים/העונה אינה העונה הנוכחית. */
export async function fetchEspnTable(
  code: string,
  options: EspnTableOptions = {},
): Promise<EspnTable | null> {
  const sport: EspnSport = options.sport ?? 'soccer'
  const url = `${BASE}/${sport}/${code}/standings`
  const payload = await fetchJson<EspnResponse>(url, {
    signal: options.signal,
    retries: 1,
    timeoutMs: 12_000,
  })
  const seasonYear = payload.season?.year
  if (typeof seasonYear !== 'number') return null
  if (!seasonMatches(sport, seasonYear, currentSeasonStartYear())) return null
  const groups = payload.children ?? []
  const entries = groups.flatMap((group) => group.standings?.entries ?? [])
  if (entries.length === 0) return null

  if (sport === 'basketball') {
    const teams = groups
      .flatMap((group) =>
        (group.standings?.entries ?? []).map((entry) =>
          mapBasketballEntry(entry, conferenceLabel(group)),
        ),
      )
      .filter((row): row is TeamStanding => row !== null)
    if (teams.length < 4) return null
    // מיון לפי אחוז ניצחונות (ואם אין — לפי מספר הניצחונות), ואז מיקום עולמי
    // 1..30 — כך שהטבלה היא טבלה אחת של הליגה ולא שתי טבלאות של בתים.
    teams.sort(
      (a, b) =>
        (b.winPercent ?? 0) - (a.winPercent ?? 0) ||
        (b.won ?? 0) - (a.won ?? 0) ||
        b.goalDifference - a.goalDifference,
    )
    teams.forEach((team, index) => {
      team.position = index + 1
    })
    return { teams, seasonYear }
  }

  const teams = entries
    .map(mapSoccerEntry)
    .filter((row): row is TeamStanding => row !== null && row.position > 0)
    .sort((a, b) => a.position - b.position)
  if (teams.length < 4) return null
  return { teams, seasonYear }
}
