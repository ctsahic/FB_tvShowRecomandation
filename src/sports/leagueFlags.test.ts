import { describe, expect, it } from 'vitest'
import { findMatchLeague, leagueById, leagueFlag, leagueFlagUrl } from './leagues'

describe('דגל הליגה בתג המסגרת בכרטיס', () => {
  it('דגל המדינה נגזר מהמסגרת — גם בליגה השנייה', () => {
    expect(leagueFlag(leagueById('spain'))?.code).toBe('es')
    expect(leagueFlag(leagueById('spain-2'))?.code).toBe('es')
    expect(leagueFlag(leagueById('england'))?.code).toBe(leagueFlag(leagueById('england-2'))?.code)
    expect(leagueFlag(leagueById('germany-2'))?.code).toBe('de')
    expect(leagueFlag(leagueById('france-2'))?.code).toBe('fr')
  })

  it('ליגות ישראליות וכדורסל מקבלות את הדגל שלהן', () => {
    expect(leagueFlag(leagueById('israel'))?.code).toBe('il')
    expect(leagueFlag(leagueById('israel-national'))?.code).toBe('il')
    expect(leagueFlag(leagueById('israel-basketball'))?.code).toBe('il')
    expect(leagueFlag(leagueById('nba'))?.code).toBe('us')
  })

  it('מפעל בין-לאומי מקבל סמל מפעל ולא דגל של מדינה', () => {
    const cup = leagueFlag(leagueById('champions-league'))
    expect(cup?.emoji).toBe('🏆')
    expect(cup?.code).toBeUndefined()
    expect(leagueFlagUrl(cup)).toBeUndefined()
  })

  it('ליגה לא מוכרת או טניס — בלי דגל', () => {
    expect(leagueFlag(undefined)).toBeUndefined()
    expect(leagueFlag(findMatchLeague({ texts: [], sport: 'tennis' }))).toBeUndefined()
  })

  it('כתובת התמונה נגזרת מקוד הדגל', () => {
    expect(leagueFlagUrl(leagueFlag(leagueById('israel-basketball')))).toBe(
      'https://flagcdn.com/w40/il.png',
    )
  })

  it('הדגל של משחק נלקח מהליגה שזוהתה מהמסגרת', () => {
    const league = findMatchLeague({
      texts: ['שידור ישיר: כדורגל. ויאריאל נגד סביליה, הליגה הספרדית השנייה, מחזור 8.'],
      home: 'ויאריאל',
      away: 'סביליה',
      sport: 'football',
    })
    expect(league?.id).toBe('spain-2')
    expect(leagueFlag(league)?.code).toBe('es')
  })
})
