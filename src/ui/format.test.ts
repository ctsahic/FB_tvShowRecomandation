import { describe, expect, it } from 'vitest'
import type { Enrichment, Programme, Recommendation } from '../types'
import { eventChipClass, ratingChips, statusText } from './format'

function enrichment(overrides: Partial<Enrichment> = {}): Enrichment {
  return { source: 'tmdb', ...overrides }
}

function programme(overrides: Partial<Programme> = {}): Programme {
  return {
    channelId: 'c1',
    channelName: 'HOT סרטים',
    title: 'סרט: דלתא',
    start: 0,
    stop: 0,
    categories: [],
    ...overrides,
  }
}

/* 2026-10-17 08:00 שעון ישראל — שבת בבוקר, לפני משחק הערב. */
const NOW = Date.parse('2026-10-17T05:00:00Z')

function recommendation(start: number, now = NOW): Recommendation {
  const startsInMinutes = Math.round((start - now) / 60_000)
  return {
    id: 'c1:' + start,
    category: 'sport',
    programme: programme({ start, stop: start + 80 * 60_000 }),
    channel: { id: 'c1', name: 'ספורט 5 פלוס', group: 'ספורט' },
    score: 100,
    reasons: [],
    headline: '',
    verdict: '',
    // אותו סף כמו המנוע (STARTING_SOON_MINUTES): חצי שעה לפני השידור.
    status: startsInMinutes <= 0 ? 'live' : startsInMinutes <= 30 ? 'starting-soon' : 'upcoming',
    startsInMinutes,
    favorite: false,
    favoriteTeam: true,
  }
}

describe('צבע תג סוג האירוע', () => {
  it('לכדורסל ולטניס יש מחלקה משל עצמם, והשאר נשארים בברירת המחדל', () => {
    expect(eventChipClass('basketball')).toBe('chip chip--event chip--event-basketball')
    expect(eventChipClass('tennis')).toBe('chip chip--event chip--event-tennis')
    expect(eventChipClass('football')).toBe('chip chip--event')
    expect(eventChipClass(undefined)).toBe('chip chip--event')
  })
})

describe('מתי המשדר — ספירה לאחור', () => {
  it('שידור רחוק מציג רק כמה שעות נותרו — בלי המילה "בהמשך"', () => {
    // המשחק של הערב (20:10 שעון ישראל) — 12 שעות ו-10 דקות מעכשיו.
    expect(statusText(recommendation(Date.parse('2026-10-17T17:10:00Z')))).toBe(
      'בעוד 12 שעות ו-10 דק׳',
    )
    expect(statusText(recommendation(Date.parse('2026-10-18T17:10:00Z')))).toBe(
      'בעוד 36 שעות ו-10 דק׳',
    )
  })

  it('שידור בתוך חצי שעה ומשחק חי מציגים כמה נותר', () => {
    expect(statusText(recommendation(Date.parse('2026-10-17T05:20:00Z')))).toBe(
      'מתחיל בקרוב · בעוד 20 דק׳',
    )
    expect(statusText(recommendation(Date.parse('2026-10-17T06:00:00Z')))).toBe('בעוד שעה')
    const live = recommendation(Date.parse('2026-10-17T04:00:00Z'))
    live.status = 'live'
    live.minutesLeft = 40
    expect(statusText(live)).toBe('משודר עכשיו · 40 דק׳ נותרו')
  })
})

describe('שורת הציונים', () => {
  it('המשוקלל ראשון, ולצידו IMDb, TMDB ו-RT — כולם באותו סולם', () => {
    const chips = ratingChips(
      enrichment({
        imdbRating: 7.5,
        imdbVotes: 18894,
        tmdbRating: 7.4,
        tmdbVotes: 2100,
        rottenTomatoes: 90,
      }),
      programme(),
    )

    expect(chips.map((chip) => chip.key)).toEqual(['weighted', 'imdb', 'tmdb', 'rt'])
    // 18,894 מדרגים מכריעים: הממוצע נשאר 7.5 — מוצג בסולם 1–10.
    expect(chips[0]).toMatchObject({ source: 'משוקלל', value: '7.51', primary: true })
    expect(chips[0]?.votes).toBeUndefined()
    expect(chips[1]).toMatchObject({
      source: 'IMDb',
      value: '7.5',
      votes: '18,894 מדרגים',
      primary: false,
    })
    expect(chips[2]).toMatchObject({
      source: 'TMDB',
      value: '7.4',
      votes: '2,100 מדרגים',
      primary: false,
    })
    // ל-Rotten Tomatoes אין מונה — 90% מוצג כ-9.0 בסולם 1–10.
    expect(chips[3]).toMatchObject({ source: 'RT', value: '9.0', primary: false })
    expect(chips[3]?.votes).toBeUndefined()
  })

  it('בלי IMDb הציון הראשי הוא TMDB — המונה לא נשאר ריק', () => {
    const chips = ratingChips(enrichment({ tmdbRating: 8.1, tmdbVotes: 40 }), programme())
    // TMDB הוא גם הצ׳יפ היחיד וגם הבסיס למשוקלל — המשוקלל מוצג ראשון.
    expect(chips.map((chip) => chip.key)).toEqual(['weighted', 'tmdb'])
    expect(chips[0]).toMatchObject({ source: 'משוקלל', primary: true })
    expect(chips[1]).toMatchObject({ source: 'TMDB', value: '8.1', primary: false })
  })

  it('בלי ציון חיצוני נשאר ציון המדריך (EPG) ולא נעלם מידע', () => {
    const chips = ratingChips(undefined, programme({ rating: 6.4, ratingSystem: 'EPG' }))
    expect(chips).toHaveLength(1)
    expect(chips[0]).toMatchObject({ key: 'epg', source: 'EPG', value: '6.4', primary: true })
  })

  it('בלי שום ציון אין שורה בכלל', () => {
    expect(ratingChips(enrichment(), programme())).toEqual([])
    expect(ratingChips(null, undefined)).toEqual([])
  })
})
