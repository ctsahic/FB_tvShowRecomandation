/**
 * לקוח טבלאות של api-football (v3) — המפתח של המשתמש.
 *
 * חשוב לדעת: במסלול החינמי api-football חוסמת עונות נוכחיות
 * ("Free plans do not have access to this season, try from 2022 to 2024").
 * לכן הטבלה מוחזרת רק אם העונה שהתקבלה היא באמת העונה הנוכחית — אחרת
 * עדיף להראות טבלה ממקור אחר (ESPN) או את ה-snapshot המקומי.
 */

import { buildUrl, fetchJson } from '../data/http'
import type { TeamStanding } from '../types'
import { hebrewNameFor } from './teamNames'

interface ApiFootballRow {
  rank?: number
  points?: number
  goalsDiff?: number
  form?: string
  description?: string
  all?: {
    played?: number
    win?: number
    draw?: number
    lose?: number
    goals?: { for?: number; against?: number }
  }
  team?: { name?: string; code?: string; country?: string }
}

interface ApiFootballResponse {
  response?: Array<{
    league?: {
      season?: number
      standings?: ApiFootballRow[][]
    }
  }>
}

export interface ApiFootballTable {
  teams: TeamStanding[]
  season: number
}

function mapRow(row: ApiFootballRow): TeamStanding | null {
  const english = row.team?.name?.trim()
  if (!english) return null
  const hebrew = hebrewNameFor(english)
  const standing: TeamStanding = {
    name: hebrew ?? english,
    englishName: english,
    aliases: hebrew && hebrew !== english ? [english] : [],
    position: row.rank ?? 0,
    played: row.all?.played ?? 0,
    points: row.points ?? 0,
    goalDifference: row.goalsDiff ?? 0,
  }
  if (row.all?.win !== undefined) standing.won = row.all.win
  if (row.all?.draw !== undefined) standing.drawn = row.all.draw
  if (row.all?.lose !== undefined) standing.lost = row.all.lose
  if (row.all?.goals?.for !== undefined) standing.goalsFor = row.all.goals.for
  if (row.all?.goals?.against !== undefined) standing.goalsAgainst = row.all.goals.against
  if (row.form) standing.form = row.form
  if (row.description) standing.zone = row.description
  return standing
}

/**
 * הטבלה מ-api-football. מחזיר null כשאין מפתח, כשיש שגיאה, או כשהעונה
 * שהוחזרה אינה העונה המבוקשת (מסלול חינמי).
 */
export async function fetchApiFootballTable(input: {
  leagueId: number
  season: number
  apiKey: string
  baseUrl: string
  signal?: AbortSignal
}): Promise<ApiFootballTable | null> {
  const apiKey = input.apiKey?.trim()
  if (!apiKey) return null
  const base = (input.baseUrl?.trim() || 'https://v3.football.api-sports.io').replace(/\/+$/, '')
  const url = buildUrl(`${base}/standings`, { league: input.leagueId, season: input.season })
  const payload = await fetchJson<ApiFootballResponse>(url, {
    signal: input.signal,
    retries: 0,
    timeoutMs: 12_000,
    headers: { 'x-apisports-key': apiKey },
  })
  const league = payload.response?.[0]?.league
  const rows = league?.standings?.[0]
  if (!Array.isArray(rows) || rows.length === 0) return null
  if (typeof league?.season === 'number' && league.season !== input.season) return null
  const teams = rows
    .map(mapRow)
    .filter((row): row is TeamStanding => row !== null && row.position > 0)
    .sort((a, b) => a.position - b.position)
  if (teams.length === 0) return null
  return { teams, season: league?.season ?? input.season }
}

/** חיפוש קבוצה לפי שם (עברית או אנגלית) — משמש כשה-EPG לא נמצא במפה המקומית. */
export async function searchApiFootballTeam(input: {
  query: string
  apiKey: string
  baseUrl: string
  signal?: AbortSignal
}): Promise<string | undefined> {
  const apiKey = input.apiKey?.trim()
  if (!apiKey || !input.query.trim()) return undefined
  const base = (input.baseUrl?.trim() || 'https://v3.football.api-sports.io').replace(/\/+$/, '')
  const url = buildUrl(`${base}/teams`, { search: input.query.trim() })
  const payload = await fetchJson<{ response?: Array<{ team?: { name?: string } }> }>(url, {
    signal: input.signal,
    retries: 0,
    timeoutMs: 10_000,
    headers: { 'x-apisports-key': apiKey },
  })
  return payload.response?.[0]?.team?.name
}
