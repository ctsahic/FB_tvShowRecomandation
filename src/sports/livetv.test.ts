import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchLivetvTable,
  parseLivetvSeasonLabel,
  parseLivetvStandings,
  seasonStartYearFrom,
} from './livetv'
import { clearLeagueTables, loadLeagueTable } from './tableStore'
import { hebrewNameFor } from './teamNames'

/* ------------------------------------------------------------------ */
/* דוגמת HTML — שורה בטבלה של livetv                                    */
/* ------------------------------------------------------------------ */

/**
 * שורה כמו שהאתר בונה אותה: תשעה תאים —
 * מיקום · לוגו · קבוצה · משוחקים · נ׳ · ת׳ · ה׳ · "זכות / חובה" · נקודות.
 */
function livetvRow(
  position: number,
  team: string,
  played: number,
  won: number,
  drawn: number,
  lost: number,
  goalsFor: number,
  goalsAgainst: number,
): string {
  const points = won * 3 + drawn
  const cell = (value: string | number) => `<td align="right">${value}</td>`
  return `<tr>
    ${cell(position)}
    <td><img height=18 src="//cdn.livetv904.me/img/teams/18/ods/147.gif">&nbsp;</td>
    <td width="32%"><a href="/enx/team/70000018${position}_team/">${team}</a></td>
    ${cell(played)}${cell(won)}${cell(drawn)}${cell(lost)}
    ${cell(`${goalsFor} / ${goalsAgainst}`)}
    ${cell(points)}
  </tr>`
}

const STANDINGS_TABLE = `<table cellpadding=0 cellspacing=0>
  <tr><td colspan=11 height=1 background="//cdn.livetv904.me/img/cs.gif"></td></tr>
  <tr><td>Pl</td><td>W</td><td>D</td><td>L</td><td>Gls</td><td>Pts</td></tr>
  ${livetvRow(1, 'Internazionale', 6, 5, 1, 0, 16, 5)}
  ${livetvRow(2, 'Napoli', 6, 4, 1, 1, 12, 7)}
  ${livetvRow(3, 'Juventus', 6, 3, 2, 1, 10, 6)}
  ${livetvRow(4, 'Atalanta', 6, 1, 5, 0, 8, 4)}
  ${livetvRow(5, 'Venezia', 6, 0, 0, 6, 2, 16)}
</table>`

/** טבלת הסרגל: קישורי ליגות, בלי קישורי קבוצה ובלי תשעה תאים. */
const SIDEBAR_TABLE = `<table cellpadding=0 cellspacing=0>
  <tr><td><img src="//cdn.livetv904.me/img/tables/93.gif"></td><td><nobr><a href="/enx/tables/93/">Brazil. Serie A</a></nobr></td>
      <td><img src="//cdn.livetv904.me/img/tables/7.gif"></td><td><nobr><a href="/enx/tables/7/">Champions League</a></nobr></td></tr>
</table>`

const LIVETV_HTML = `<html><head><title>Italy. Serie A 26/27 / Table / LiveTV</title></head>
  <body>${SIDEBAR_TABLE}${STANDINGS_TABLE}</body></html>`

const ITALY_ESPN_EMPTY = { season: { year: new Date().getUTCFullYear() }, children: [] }

/* ------------------------------------------------------------------ */
/* פענוח                                                               */
/* ------------------------------------------------------------------ */

describe('פענוח עמוד הטבלה של livetv', () => {
  it('קורא את השורות, מתרגם לעברית ומחשב הפרש שערים', () => {
    const teams = parseLivetvStandings(LIVETV_HTML)
    expect(teams).toHaveLength(5)

    expect(teams[0]).toMatchObject({
      name: 'אינטר',
      englishName: 'Internazionale',
      position: 1,
      played: 6,
      won: 5,
      drawn: 1,
      lost: 0,
      goalsFor: 16,
      goalsAgainst: 5,
      goalDifference: 11,
      points: 16,
    })
    expect(teams[4].name).toBe('ונציה')
    expect(teams[4].points).toBe(0)
    expect(teams[3].goalDifference).toBe(4)
    expect(teams.map((team) => team.position)).toEqual([1, 2, 3, 4, 5])
  })

  it('מתעלם מטבלאות שאינן טבלת מיקום (רשימת הליגות שבסרגל)', () => {
    const teams = parseLivetvStandings(SIDEBAR_TABLE)
    expect(teams).toHaveLength(0)
  })

  it('לא מתרגם קבוצה לא מוכרת — משאיר את השם כפי שהוא', () => {
    const html = `<table>${livetvRow(1, 'Some Unknown Club', 6, 1, 0, 5, 3, 12)}
      ${livetvRow(2, 'Internazionale', 6, 5, 1, 0, 16, 5)}
      ${livetvRow(3, 'Napoli', 6, 4, 1, 1, 12, 7)}
      ${livetvRow(4, 'Juventus', 6, 3, 2, 1, 10, 6)}</table>`
    const teams = parseLivetvStandings(html)
    expect(teams[0].name).toBe('Some Unknown Club')
    expect(teams[0].englishName).toBe('Some Unknown Club')
    expect(hebrewNameFor('Some Unknown Club')).toBeUndefined()
  })

  it('קורא את תווית העונה מכותרת העמוד', () => {
    expect(parseLivetvSeasonLabel('England. Premier League 26/27 / Table / LiveTV')).toBe('26/27')
    expect(parseLivetvSeasonLabel('Copa Libertadores 2026 / Table / LiveTV')).toBe('2026')
    expect(parseLivetvSeasonLabel('Champions League / Table / LiveTV')).toBeUndefined()

    expect(seasonStartYearFrom('26/27')).toBe(2026)
    expect(seasonStartYearFrom('99/00')).toBe(1999)
    expect(seasonStartYearFrom('2026')).toBe(2026)
    expect(seasonStartYearFrom(undefined)).toBeUndefined()
  })

  it('מחזיר null כשאין קובץ HTML תקין', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<html><title>Champions League / Table / LiveTV</title></html>',
    }))
    try {
      const table = await fetchLivetvTable(7)
      expect(table).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

/* ------------------------------------------------------------------ */
/* גיבוי ל-ESPN                                                          */
/* ------------------------------------------------------------------ */

describe('livetv כגיבוי כשהמקורות הקודמים לא מחזירים טבלה', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch() {
    return async (url: unknown) => {
      const html = String(url).includes('livetv.sx')
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => (html ? LIVETV_HTML : JSON.stringify(ITALY_ESPN_EMPTY)),
      }
    }
  }

  it('נופל ל-livetv כשגם api-football וגם ESPN לא מחזירים כלום', async () => {
    vi.stubGlobal('fetch', stubFetch())
    const table = await loadLeagueTable('ליגה איטלקית', { config: { apiKey: '', baseUrl: '' } })

    expect(table?.source).toBe('livetv')
    expect(table?.sourceLabel).toContain('LiveTV')
    expect(table?.seasonLabel).toBe('26/27')
    expect(table?.teams).toHaveLength(5)
    expect(table?.teams[0].name).toBe('אינטר')
  })

  it('לא נוגע ב-livetv כשהמקור הקודם עבד (ESPN)', async () => {
    const requested: string[] = []
    const payload = {
      season: { year: new Date().getUTCMonth() >= 6 ? new Date().getUTCFullYear() : new Date().getUTCFullYear() - 1 },
      children: [
        {
          standings: {
            entries: [
              { team: { displayName: 'Internazionale' }, stats: [{ name: 'rank', value: 1 }, { name: 'gamesPlayed', value: 6 }, { name: 'points', value: 16 }] },
              { team: { displayName: 'Napoli' }, stats: [{ name: 'rank', value: 2 }, { name: 'gamesPlayed', value: 6 }, { name: 'points', value: 13 }] },
              { team: { displayName: 'Juventus' }, stats: [{ name: 'rank', value: 3 }, { name: 'gamesPlayed', value: 6 }, { name: 'points', value: 11 }] },
              { team: { displayName: 'Venezia' }, stats: [{ name: 'rank', value: 20 }, { name: 'gamesPlayed', value: 6 }, { name: 'points', value: 0 }] },
            ],
          },
        },
      ],
    }
    vi.stubGlobal('fetch', async (url: unknown) => {
      requested.push(String(url))
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(payload) }
    })

    const table = await loadLeagueTable('ליגה איטלקית', { config: { apiKey: '', baseUrl: '' } })
    expect(table?.source).toBe('espn')
    expect(requested.some((url) => url.includes('livetv.sx'))).toBe(false)
  })

  it('לליגה בלי מזהה livetv ממשיכה למקור הבא בלי לקרוא ל-livetv', async () => {
    const requested: string[] = []
    vi.stubGlobal('fetch', async (url: unknown) => {
      requested.push(String(url))
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify({}) }
    })

    // הליגה האמריקאית (MLS) — בכוונה בלי מזהה livetv, כי שם הטבלה מפוצלת לבתים.
    const table = await loadLeagueTable('ליגת ה-MLS', { config: { apiKey: '', baseUrl: '' } })
    expect(table).toBeNull()
    expect(requested.some((url) => url.includes('livetv.sx'))).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/* בדיקה מול האתר החי (לא רצה ב-`npm test`)                             */
/* ------------------------------------------------------------------ */

describe.skipIf(!process.env.LIVE_TABLES)('livetv מול האתר החי', () => {
  it('מושך את הטבלה האיטלקית ומתרגם את השמות', async () => {
    const table = await fetchLivetvTable(11)
    console.log(`livetv season=${table?.seasonLabel} teams=${table?.teams.length}`)
    console.log((table?.teams ?? []).map((t) => `${t.position}. ${t.name} ${t.points}נק ${t.goalsFor}:${t.goalsAgainst}`).join('\n'))

    expect(table).not.toBeNull()
    expect(table?.teams.length).toBeGreaterThanOrEqual(18)
    expect(table?.teams[0].position).toBe(1)
    const untranslated = (table?.teams ?? []).filter((team) => team.name === team.englishName)
    console.log('שמות שלא תורגמו:', untranslated.map((team) => team.name).join(' | '))
  }, 60_000)
})
