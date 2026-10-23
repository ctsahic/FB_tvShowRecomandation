import { describe, expect, it } from 'vitest'
import type { Channel, Programme } from '../types'
import { classifyProgramme, isKidsMovieGenre } from './classify'

function programme(overrides: Partial<Programme> = {}): Programme {
  return {
    channelId: 'k1',
    channelName: 'Yes Movies KIDS HD',
    title: 'לשבור את הקרח',
    start: 0,
    stop: 60 * 60 * 1000,
    categories: [],
    ...overrides,
  }
}

function channel(group: string, name = 'Yes Movies KIDS HD'): Channel {
  return { id: 'k1', name, group }
}

describe('סרטי ילדים — סיווג', () => {
  it('ערוץ שמוגדר „סרטי ילדים” מסווג כסרט ילדים', () => {
    const result = classifyProgramme(programme({ title: 'מואנה' }), channel('סרטי ילדים'))
    expect(result.category).toBe('movie-kids')
  })

  it('סרט בכותרת עם תוכן אנימציה/משפחה מסווג כסרט ילדים', () => {
    const result = classifyProgramme(
      programme({ title: 'סרט: לשבור את הקרח', description: 'אנימציה משפחתית על שתי אחיות' }),
      channel('סרטים', 'Yes+ Cinema HD'),
    )
    expect(result.category).toBe('movie-kids')
  })

  it('סרט דרמה רגיל נשאר „סרטים” ולא עובר לילדים', () => {
    const result = classifyProgramme(
      programme({ title: 'סרט: יקבים', description: 'דרמה משפחתית צרפתית' }),
      channel('סרטים', 'HOT Cinema 1 HD'),
    )
    // „משפחתית” בתקציר היא סימן חלש בלבד, אבל הכותרת שהיא „סרט” והערוץ
    // „סרטים” שוקלים יותר — ולכן זה נשאר סרט לכל דבר.
    expect(result.category).toBe('movie')
  })

  it('סדרת אנימציה אינה סרט ילדים', () => {
    const result = classifyProgramme(
      programme({
        title: 'סדרת אנימציה: פוקימון',
        episode: 'S02E05',
        season: 2,
        episodeNumber: 5,
      }),
      channel('ילדים', 'Disney HD'),
    )
    expect(result.category).not.toBe('movie-kids')
  })

  it('ז׳אנר TMDB של אנימציה/משפחה/ילדים מזוהה כסרט ילדים', () => {
    expect(isKidsMovieGenre(['אנימציה', 'משפחה', 'הרפתקאות'])).toBe(true)
    expect(isKidsMovieGenre(['ילדים'])).toBe(true)
    expect(isKidsMovieGenre(['פעולה', 'מתח'])).toBe(false)
    expect(isKidsMovieGenre([])).toBe(false)
    expect(isKidsMovieGenre(undefined)).toBe(false)
  })
})
