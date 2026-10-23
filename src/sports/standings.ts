/**
 * טבלת הליגה: תצוגה, זיהוי קבוצות וספק הטבלאות.
 *
 * המקורות עצמם (api-football / ESPN / snapshot) יושבים ב-`tableStore`.
 * כאן נשארים שני דברים: איך מזהים קבוצה בתוך טבלה (עברית↔אנגלית), ואיך
 * מספקים את הטבלה למנוע.
 */

import { he } from '../i18n/he'
import type { StandingsProvider, TeamStanding } from '../types'
import ligaSnapshot from './ligaTable.json'
import { canonicalTeam } from './teams'
import { foldTeamName, teamNameVariants } from './teamNames'
import { loadLeagueTable } from './tableStore'

interface LigaSnapshot {
  snapshotDate: string
  competition: string
  teams: TeamStanding[]
}

const snapshot = ligaSnapshot as unknown as LigaSnapshot

/** הטבלה המקומית — מקור הגיבוי של ליגת העל. */
export const bundledTable: TeamStanding[] = snapshot.teams.map((team) => ({
  name: team.name,
  aliases: Array.isArray(team.aliases) ? [...team.aliases] : [],
  position: team.position,
  played: team.played,
  points: team.points,
  goalDifference: team.goalDifference,
}))

export const bundledTableDate: string = snapshot.snapshotDate

/** כל המפתחות שמזהים שורה בטבלה — לתצוגה ולתצוגה בעברית/אנגלית. */
function rowKeys(standing: TeamStanding): Set<string> {
  const keys = new Set<string>()
  const add = (value: string | undefined) => {
    const folded = foldTeamName(value ?? '')
    if (folded) keys.add(folded)
  }
  add(standing.name)
  add(standing.englishName)
  for (const alias of standing.aliases ?? []) add(alias)
  const canonical = canonicalTeam(standing.name)
  if (canonical) add(canonical)
  return keys
}

/**
 * התאמת שם קבוצה (כפי שהוא ב-EPG, בעברית) לשורה בטבלה.
 * הסדר: מפת השמות (עברית↔אנגלית) -> שם קנוני -> התאמה חלקית.
 */
export function resolveTeam(
  name: string,
  table: readonly TeamStanding[],
): TeamStanding | undefined {
  if (!name || !name.trim() || table.length === 0) return undefined

  const wanted = new Set<string>()
  for (const variant of teamNameVariants(name)) {
    const folded = foldTeamName(variant)
    if (folded) wanted.add(folded)
  }
  if (wanted.size === 0) return undefined

  // 1. התאמה מלאה לפי כל וריאציה של השם.
  for (const standing of table) {
    const keys = rowKeys(standing)
    for (const key of keys) {
      if (wanted.has(key)) return standing
    }
  }

  // 2. שם קנוני בעברית (טבלת ליגת העל שמורה בעברית).
  const canonical = canonicalTeam(name)
  if (canonical) {
    const byCanonical = table.find((standing) => canonicalTeam(standing.name) === canonical)
    if (byCanonical) return byCanonical
  }

  // 3. התאמה חלקית — "אטאלנטה ברגמו" מול "אטאלנטה".
  for (const key of wanted) {
    if (key.length < 5) continue
    for (const standing of table) {
      for (const rowKey of rowKeys(standing)) {
        if (rowKey.length < 5) continue
        if (key.includes(rowKey) || rowKey.includes(key)) return standing
      }
    }
  }
  return undefined
}

/**
 * "מקום 3 · 41 נק׳" בכדורגל, או "מקום 3 · 9-3" בכדורסל (שם אין נקודות
 * טבלה — המאזן הוא הנתון). מחרוזת ריקה כשאין נתון.
 */
export function rankText(standing: TeamStanding | undefined, sport?: string): string {
  if (!standing || !standing.position) return ''
  if (sport === 'basketball') {
    const record = recordText(standing)
    return `${he.sport.rank} ${standing.position}${record ? ` · ${record}` : ''}`
  }
  return `${he.sport.rank} ${standing.position} · ${standing.points} ${he.sport.points}`
}

/** "9-3" — ניצחונות-הפסדים. ריק כשאין מאזן. */
function recordText(standing: TeamStanding): string {
  if (standing.won === undefined || standing.lost === undefined) return ''
  return `${standing.won}-${standing.lost}`
}

/** שורת נתונים מלאה לקבוצה, למסך הפרטים: "8 משחקים · 5-1-2 · 18:8 · 16 נק׳". */
export function standingSummary(standing: TeamStanding | undefined, sport?: string): string {
  if (!standing) return ''
  if (sport === 'basketball') {
    const parts: string[] = []
    if (standing.played) parts.push(`${standing.played} ${he.sport.played}`)
    const record = recordText(standing)
    if (record) parts.push(record)
    if (standing.winPercent !== undefined) {
      parts.push(`${standing.winPercent}% ${he.sport.winPercent}`)
    }
    if (standing.goalsFor !== undefined && standing.goalsAgainst !== undefined) {
      parts.push(`${standing.goalsFor}:${standing.goalsAgainst} ${he.sport.pointsScored}`)
    }
    return parts.join(' · ')
  }
  const parts: string[] = []
  if (standing.played) parts.push(`${standing.played} ${he.sport.played}`)
  if (
    standing.won !== undefined &&
    standing.drawn !== undefined &&
    standing.lost !== undefined
  ) {
    parts.push(`${standing.won}-${standing.drawn}-${standing.lost}`)
  }
  if (standing.goalsFor !== undefined && standing.goalsAgainst !== undefined) {
    parts.push(`${standing.goalsFor}:${standing.goalsAgainst}`)
  }
  parts.push(`${standing.points} ${he.sport.points}`)
  return parts.join(' · ')
}

/**
 * ספק הטבלאות למנוע. כל ליגה נטענת מהמקור המתאים לה דרך `tableStore`
 * (api-football -> ESPN -> snapshot), ולכן הטבלה של משחק איטלקי היא הטבלה
 * האיטלקית, ולא טבלת ליגת העל.
 */
export function createStandingsProvider(config: {
  apiKey: string
  baseUrl: string
}): StandingsProvider {
  return {
    async getTable(competition: string, signal?: AbortSignal): Promise<TeamStanding[]> {
      const table = await loadLeagueTable(competition, { signal, config })
      return table?.teams ?? []
    },
    resolve: resolveTeam,
  }
}
