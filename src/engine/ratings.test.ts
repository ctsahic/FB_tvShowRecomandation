import { describe, expect, it } from 'vitest'
import type { Enrichment } from '../types'
import {
  combineRatings,
  describeSources,
  formatRating10,
  percentToRating10,
  toScore100,
} from './ratings'

function enrichment(overrides: Partial<Enrichment> = {}): Enrichment {
  return { source: 'tmdb', ...overrides }
}

describe('המרת סולמות', () => {
  it('7.5 מתוך 10 הוא 72.5 מתוך 100 — בדיוק הנוסחה של Rotten Tomatoes', () => {
    expect(toScore100(7.5)).toBe(72.5)
    expect(toScore100(1)).toBe(1)
    expect(toScore100(10)).toBe(100)
    // 5.5 הוא אמצע הסולם: (5.5-1)/9 = 0.5 → 50.5.
    expect(toScore100(5.5)).toBe(50.5)
  })

  it('אחוזים של Rotten Tomatoes הופכים למספר: 70% הוא 7.0', () => {
    expect(percentToRating10(70)).toBe(7)
    expect(percentToRating10(90)).toBe(9)
    expect(percentToRating10(100)).toBe(10)
    expect(percentToRating10(0)).toBe(0)
  })

  it('ערך לא תקין לא מפיל את החישוב', () => {
    expect(toScore100(Number.NaN)).toBe(0)
    expect(toScore100(-3)).toBe(0)
    expect(percentToRating10(Number.NaN)).toBe(0)
  })

  it('הציון מוצג בשתי ספרות, בלי אפס מיותר בסוף', () => {
    expect(formatRating10(8.13)).toBe('8.13')
    expect(formatRating10(9.2)).toBe('9.2')
    expect(formatRating10(8)).toBe('8.0')
  })
})

describe('ציון משוקלל', () => {
  it('בלי שום ציון חיצוני אין ממוצע', () => {
    expect(combineRatings(undefined)).toBeNull()
    expect(combineRatings(enrichment())).toBeNull()
    expect(combineRatings(enrichment({ rottenTomatoes: 0 }))).toBeNull()
  })

  it('1000 מדרגים ב-IMDb גוברים על מדרג אחד ב-TMDB', () => {
    const combined = combineRatings(
      enrichment({ imdbRating: 8, imdbVotes: 1000, tmdbRating: 9, tmdbVotes: 1 }),
    )
    expect(combined).not.toBeNull()
    // ‏(8*1000 + 9*1) / 1001 = 8.001 → 8.0, ולא 8.5 כמו ממוצע פשוט.
    expect(combined?.rating10).toBe(8)
    expect(combined?.weight).toBe(1001)
    expect(combined?.score100).toBe(toScore100(8))
  })

  it('משקל המדרגים קובע את כיוון הממוצע — לא פחות מ-1000 מדרגים', () => {
    const heavyImdb = combineRatings(
      enrichment({ imdbRating: 9, imdbVotes: 10_000, tmdbRating: 5, tmdbVotes: 10 }),
    )
    const heavyTmdb = combineRatings(
      enrichment({ imdbRating: 9, imdbVotes: 10, tmdbRating: 5, tmdbVotes: 10_000 }),
    )
    expect(heavyImdb?.rating10).toBe(9)
    expect(heavyTmdb?.rating10).toBe(5)
  })

  it('הממוצע נשמר בשתי ספרות — השקלול לא נעלם בעיגול', () => {
    const combined = combineRatings(
      enrichment({ imdbRating: 8.2, imdbVotes: 1000, tmdbRating: 7.4, tmdbVotes: 500 }),
    )
    // (8.2*1000 + 7.4*500) / 1500 = 7.9333… → 7.93
    expect(combined?.rating10).toBe(7.93)
  })

  it('Rotten Tomatoes (אחוזים) נכנס לסולם 1–10 עם משקל קבוע', () => {
    const combined = combineRatings(enrichment({ rottenTomatoes: 90 }))
    expect(combined?.rating10).toBe(9)
    expect(combined?.sources).toEqual([
      { source: 'RT', rating10: 9, score100: toScore100(9), votes: expect.any(Number) },
    ])
  })

  it('מקור בלי מונה מדרגים לא נעלם — הוא מקבל משקל מינימלי', () => {
    const combined = combineRatings(enrichment({ imdbRating: 8 }))
    expect(combined?.rating10).toBe(8)
    expect(combined?.weight).toBeGreaterThan(0)
  })

  it('כל המקורות מופיעים בהסבר, מהחזק לחלש', () => {
    const combined = combineRatings(
      enrichment({
        imdbRating: 8.1,
        imdbVotes: 4000,
        tmdbRating: 7.9,
        tmdbVotes: 900,
        rottenTomatoes: 88,
      }),
    )
    expect(combined).not.toBeNull()
    expect(describeSources(combined!)).toBe('IMDb 8.1 · TMDB 7.9 · RT 8.8')
  })

  it('הממוצע נשאר בגבולות הסולם גם עם קלט מוזר', () => {
    const combined = combineRatings(
      enrichment({ imdbRating: 12, imdbVotes: 50, tmdbRating: -4, tmdbVotes: 20 }),
    )
    expect(combined?.rating10).toBeLessThanOrEqual(10)
    expect(combined?.rating10).toBeGreaterThanOrEqual(1)
  })
})
