import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findLeague, findMatchLeague, leagueById } from './leagues'
import { clearLeagueTables, loadLeagueTable } from './tableStore'
import { parseScores365Standings, pctToPercent } from './winnerLeague'

/** שורה אחת כפי ש-365scores מחזיר אותה (langId=2, עברית). */
function row(
  position: number,
  name: string,
  won: number,
  lost: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    competitor: { name },
    position,
    gamePlayed: won + lost,
    gamesWon: won,
    gamesLost: lost,
    points: won * 2 + lost,
    pct: `${won / (won + lost)}`,
    for: 100,
    against: 90,
    ...overrides,
  }
}

const ROWS = [
  row(1, 'מכבי תל אביב', 3, 0),
  row(2, 'הפועל ירושלים', 2, 1),
  row(3, 'הפועל תל אביב', 2, 1),
  row(4, 'מכבי עירוני רמת גן', 2, 1),
  row(5, 'הפועל עירוני אילת', 1, 2),
  row(6, 'עירוני קרית אתא', 1, 2),
  row(7, 'הפועל העמק', 1, 2),
  row(8, 'מכבי ראשון לציון', 1, 2),
  row(9, 'בני הרצליה', 1, 2),
  row(10, 'הפועל באר שבע/דימונה', 0, 3),
  row(11, 'עירוני נס ציונה', 0, 3),
  row(12, 'הפועל חולון', 0, 3),
]

describe('טבלת ליגת Winner סל מ-365scores', () => {
  it('פרסור שורות: מיקום, מאזן, סלים ואחוז ניצחונות', () => {
    const teams = parseScores365Standings({ standings: [{ isCurrentStage: true, rows: ROWS }] })
    expect(teams).toHaveLength(12)
    expect(teams[0]).toMatchObject({
      name: 'מכבי תל אביב',
      position: 1,
      played: 3,
      won: 3,
      lost: 0,
      points: 6,
    })
    expect(teams[0]?.winPercent).toBe(100)

    const beerSheva = teams.find((team) => team.name === 'הפועל באר שבע/דימונה')
    expect(beerSheva).toMatchObject({ position: 10, won: 0, lost: 3, points: 3 })
    expect(beerSheva?.winPercent).toBe(0)
  })

  it('לוקח את השלב הנוכחי ולא שלב פלייאוף', () => {
    const teams = parseScores365Standings({
      standings: [
        { isCurrentStage: false, rows: [row(1, 'שלב אחר', 9, 0)] },
        { isCurrentStage: true, rows: ROWS },
      ],
    })
    expect(teams[0]?.name).toBe('מכבי תל אביב')
  })

  it('טבלה קצרה מדי או שבורה אינה נחשבת טבלה', () => {
    expect(parseScores365Standings({ standings: [{ rows: ROWS.slice(0, 5) }] })).toEqual([])
    expect(parseScores365Standings({ standings: [] })).toEqual([])
    expect(parseScores365Standings(null)).toEqual([])
    expect(parseScores365Standings({ standings: [{ rows: [] }] })).toEqual([])
  })

  it('מדלג על שורה בלי שם או בלי מיקום', () => {
    const broken = [{ position: 1 }, ...ROWS]
    const teams = parseScores365Standings({ standings: [{ rows: broken }] })
    expect(teams).toHaveLength(ROWS.length)
    expect(teams.every((team) => Boolean(team.name))).toBe(true)
  })

  it('אחוז ניצחונות: "1.000" -> 100 ו-".733" -> 73.3', () => {
    expect(pctToPercent('1.000')).toBe(100)
    expect(pctToPercent(0.733)).toBe(73.3)
    expect(pctToPercent(undefined)).toBeUndefined()
  })
})

describe('הטבלה מתעדכנת ולא נתקעת במטמון', () => {
  beforeEach(() => {
    clearLeagueTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    clearLeagueTables()
  })

  it('אחרי מחזור חדש נשלפת הטבלה מהמקור שוב והמיקום מתעדכן', async () => {
    const start = Date.parse('2026-10-18T08:00:00Z')
    const now = vi.spyOn(Date, 'now').mockReturnValue(start)
    let calls = 0
    vi.stubGlobal('fetch', async () => {
      calls++
      // בקשה ראשונה: הפועל ירושלים במקום 2; בקשה שנייה, אחרי מחזור: מקום 4.
      const rows = ROWS.map((row, index) =>
        index === 1 ? { ...row, position: calls === 1 ? 2 : 4, gamesWon: 1, gamesLost: 2 } : row,
      )
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ standings: [{ isCurrentStage: true, rows }] }),
      }
    })

    const league = leagueById('israel-basketball')
    const first = await loadLeagueTable(league)
    expect(first?.source).toBe('scores365')
    expect(first?.teams.find((team) => team.name === 'הפועל ירושלים')?.position).toBe(2)
    expect(calls).toBe(1)

    // שבוע לאחר מכן — האפליקציה עדיין פתוחה, והטבלה בזיכרון כבר ישנה.
    now.mockReturnValue(start + 7 * 24 * 60 * 60 * 1000)
    const second = await loadLeagueTable(league)
    expect(calls).toBe(2)
    expect(second?.teams.find((team) => team.name === 'הפועל ירושלים')?.position).toBe(4)
  })

  it('טבלה שנשלפה לפני שמשחק הסתיים נשלפת מחדש מיד אחרי המשחק', async () => {
    const start = Date.parse('2026-10-18T08:00:00Z')
    vi.spyOn(Date, 'now').mockReturnValue(start)
    let calls = 0
    vi.stubGlobal('fetch', async () => {
      calls++
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ standings: [{ isCurrentStage: true, rows: ROWS }] }),
      }
    })

    const league = leagueById('israel-basketball')
    await loadLeagueTable(league)
    expect(calls).toBe(1)

    // אותו רגע: אף משחק לא הסתיים אחרי השליפה — אין שליפה מיותרת.
    await loadLeagueTable(league, { finishedAt: start - 60 * 60 * 1000 })
    expect(calls).toBe(1)

    // משחק הסתיים חצי שעה אחרי השליפה — הטבלה חייבת להתעדכן.
    await loadLeagueTable(league, { finishedAt: start + 30 * 60 * 1000 })
    expect(calls).toBe(2)
  })
})

describe('זיהוי ליגת הכדורסל מול ליגת הכדורגל', () => {
  it('"ליגת ווינר סל" היא ליגת הכדורסל, לא ליגת העל בכדורגל', () => {
    expect(findLeague('ליגת ווינר סל')?.id).toBe('israel-basketball')
    expect(findLeague('ליגת העל')?.id).toBe('israel')
  })

  it('משחק כדורסל מקבל את טבלת הכדורסל', () => {
    const league = findMatchLeague({
      texts: ['כדורסל. הפועל ירושלים נגד הפועל באר שבע, ליגת ווינר סל, מחזור 2'],
      home: 'הפועל ירושלים',
      away: 'הפועל באר שבע',
      sport: 'basketball',
    })
    expect(league?.id).toBe('israel-basketball')
    expect(league?.scores365).toBe(47)
  })

  it('משחק כדורגל שמוזכרת בו "ליגת ווינר" נשאר בליגת העל', () => {
    const league = findMatchLeague({
      texts: ['שידור ישיר: כדורגל. הפועל ירושלים נגד מכבי חיפה, ליגת ווינר, מחזור 6.'],
      home: 'הפועל ירושלים',
      away: 'מכבי חיפה',
      sport: 'football',
    })
    expect(league?.id).toBe('israel')
  })
})
