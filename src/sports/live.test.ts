import { describe, expect, it } from 'vitest'
import { TEAM_NAMES, foldTeamName, hebrewNameFor } from './teamNames'
import { LEAGUES } from './leagues'
import { fetchOneTable } from './one'
import { canonicalTeam } from './teams'

const CODES = LEAGUES.filter((league) => league.espn).map((league) => ({
  id: league.id,
  name: league.name,
  espn: league.espn as string,
}))

async function liveTeams(code: string): Promise<{ season: number; names: string[] }> {
  const res = await fetch(`https://site.api.espn.com/apis/v2/sports/soccer/${code}/standings`)
  const json = (await res.json()) as {
    season?: { year?: number }
    children?: Array<{ standings?: { entries?: Array<{ team?: { displayName?: string } }> } }>
  }
  // ליגות עם בתים (MLS) מחזירות כמה children — מאחדים את כולם.
  const names = [
    ...new Set(
      (json.children ?? [])
        .flatMap((child) => child?.standings?.entries ?? [])
        .map((entry) => entry.team?.displayName ?? '')
        .filter(Boolean),
    ),
  ]
  return { season: json.season?.year ?? 0, names }
}

/**
 * בדיקה מול האינטרנט (לא רצה ב-`npm test`):
 *
 *   LIVE_TABLES=1 npx vitest run src/sports/live.test.ts
 *
 * היא מורידה את הטבלאות החיות מכל הליגות ומדווחת אילו קבוצות אין להן
 * שם בעברית ואילו רשומות במפה לא מופיעות באף טבלה (שגיאת איות/קבוצה ישנה).
 */
describe.skipIf(!process.env.LIVE_TABLES)('מפת השמות מול הנתונים החיים', () => {
  it('מדווח כיסוי וטעויות איות', async () => {
    const all = new Map<string, Set<string>>()
    const lines: string[] = []
    for (const league of CODES) {
      const { season, names } = await liveTeams(league.espn)
      for (const name of names) {
        const folded = foldTeamName(name)
        if (!all.has(folded)) all.set(folded, new Set())
        all.get(folded)?.add(name)
      }
      const missing = names.filter((name) => !hebrewNameFor(name))
      lines.push(
        `--- ${league.name} (${league.espn}) season=${season} teams=${names.length} בעברית=${names.length - missing.length}`,
      )
      if (missing.length > 0) lines.push(`    בלי עברית: ${missing.join(' | ')}`)
    }
    console.log(lines.join('\n'))

    const israeli = new Set(
      TEAM_NAMES.filter((entry) => /ירושלים|רמת גן|רעננה|הרצליה|נוף הגליל|ראשון לציון|עכו|יבנה|נס ציונה|טבריה|אשדוד|סכנין|ריינה|חדרה|קריית|פתח תקווה|תל אביב|באר שבע|חיפה|נתניה/.test(entry.he)),
    )
    const unmatched: string[] = []
    for (const entry of TEAM_NAMES) {
      if (israeli.has(entry)) continue
      const folded = foldTeamName(entry.en)
      const aliases = entry.aliases ?? []
      const hit =
        all.has(folded) ||
        aliases.some((alias) => all.has(foldTeamName(alias))) ||
        [...all.keys()].some((key) => key.includes(folded) || folded.includes(key))
      if (!hit) unmatched.push(`${entry.he} = ${entry.en}`)
    }
    console.log(`\n=== רשומות שלא נמצאו באף טבלה חיה (${unmatched.length}) ===`)
    console.log(unmatched.join('\n'))
    expect(unmatched.length).toBeLessThan(500)
  }, 120_000)

  it('מושך את טבלת ליגת העל מ-ONE ומתרגם את כל הקיצורים', async () => {
    const table = await fetchOneTable({ leagueId: 1 })
    console.log(`ONE season=${table?.season} teams=${table?.teams.length}`)
    console.log((table?.teams ?? []).map((t) => `${t.position}. ${t.name} ${t.points}נק`).join('\n'))
    expect(table).not.toBeNull()
    expect(table?.teams.length).toBeGreaterThanOrEqual(12)
    const untranslated = (table?.teams ?? []).filter((t) => canonicalTeam(t.name) !== t.name)
    console.log('שמות שלא תורגמו:', untranslated.map((t) => t.name).join(' | '))
    expect(untranslated).toHaveLength(0)
  }, 60_000)
})
