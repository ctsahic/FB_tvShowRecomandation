// מייצר את src/sports/teamLeagues.ts — מיפוי ליגה -> שמות הקבוצות כפי שהם
// מופיעים בטבלה החיה. משמש לזיהוי הליגה לפי שמות הקבוצות בלבד.
import { writeFileSync } from 'node:fs'

const LEAGUES = [
  ['italy', 'ita.1'],
  ['england', 'eng.1'],
  ['spain', 'esp.1'],
  ['germany', 'ger.1'],
  ['france', 'fra.1'],
  ['france-2', 'fra.2'],
  ['spain-2', 'esp.2'],
  ['denmark', 'den.1'],
  ['champions-league', 'uefa.champions'],
  ['europa-league', 'uefa.europa'],
  ['saudi', 'ksa.1'],
  ['turkey', 'tur.1'],
  ['greece', 'gre.1'],
  ['netherlands', 'ned.1'],
  ['portugal', 'por.1'],
  ['scotland', 'sco.1'],
  ['belgium', 'bel.1'],
  ['austria', 'aut.1'],
  ['england-2', 'eng.2'],
  ['usa', 'usa.1'],
]

const out = {}
for (const [id, code] of LEAGUES) {
  const res = await fetch(`https://site.api.espn.com/apis/v2/sports/soccer/${code}/standings`)
  const json = await res.json()
  // ליגות עם בתים (MLS: מזרח/מערב) מחזירות כמה children — מאחדים את כולם.
  const names = [
    ...new Set(
      (json.children ?? [])
        .flatMap((child) => child?.standings?.entries ?? [])
        .map((entry) => entry.team?.displayName)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b))
  out[id] = names
  console.log(`${id.padEnd(18)} ${String(names.length).padStart(3)}  ${names.slice(0, 4).join(', ')}`)
}

const body = Object.entries(out)
  .map(
    ([id, names]) =>
      `  '${id}': [\n${names.map((name) => `    '${name.replace(/'/g, "\\'")}',`).join('\n')}\n  ],`,
  )
  .join('\n')

const file = `/**
 * קובץ מיוצר — מיפוי מזהה ליגה לשמות הקבוצות כפי שהם מופיעים בטבלה החיה.
 *
 * למה זה נחוץ: מדריך השידורים לא תמיד מזכיר את שם הליגה. הכותרת
 * "ישיר! ארהוס - סונדריסקה" לא מכילה את המילים "ליגה דנית", ולכן בלי המיפוי
 * הזה לא היה אפשר לדעת איזו טבלה להביא. כאן מזהים את הליגה מתוך הקבוצות.
 *
 * ליצירה מחדש: \`node tools/gen-team-leagues.mjs\` (דורש רשת).
 */
export const TEAM_LEAGUES: Readonly<Record<string, readonly string[]>> = {
${body}
}
`

writeFileSync('src/sports/teamLeagues.ts', file)
console.log('\nנכתב src/sports/teamLeagues.ts')
