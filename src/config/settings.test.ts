import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_SPORT_KINDS,
  SPORT_KINDS,
  normalizeSportKinds,
  sanitizeSettings,
} from './settings'

describe('הענפים שמעניינים אותי', () => {
  it('ברירת המחדל היא כדורגל, כדורסל וטניס', () => {
    expect([...DEFAULT_SETTINGS.prefs.sportKinds]).toEqual([
      'football',
      'basketball',
      'tennis',
    ])
    expect([...DEFAULT_SPORT_KINDS]).toEqual(['football', 'basketball', 'tennis'])
  })

  it('מסננת ענף לא מוכר ומחזירה את הבחירה בסדר התצוגה', () => {
    expect(normalizeSportKinds(['volleyball', 'football', 'quidditch', 'volleyball'])).toEqual([
      'football',
      'volleyball',
    ])
  })

  it('ערך חסר חוזר לברירת המחדל, ורשימה ריקה נשמרת ריקה (בלי סינון)', () => {
    expect(normalizeSportKinds(undefined)).toEqual([...DEFAULT_SPORT_KINDS])
    expect(normalizeSportKinds('football')).toEqual([...DEFAULT_SPORT_KINDS])
    expect(normalizeSportKinds([])).toEqual([])
  })

  /**
   * הגדרות שנשמרו כשהברירה הישנה הייתה "כל הענפים" לא נבחרו על ידי המשתמש —
   * הוא קיבל אותן. לכן הן עוברות לברירת המחדל החדשה.
   */
  it('הגדרות עם כל הענפים (ברירת המחדל הישנה) עוברות לשלושת הענפים', () => {
    const legacy = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      prefs: { ...DEFAULT_SETTINGS.prefs, sportKinds: [...SPORT_KINDS] },
    })
    expect(legacy.prefs.sportKinds).toEqual(['football', 'basketball', 'tennis'])
  })

  it('בחירה אישית נשארת כמו שהיא', () => {
    const chosen = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      prefs: { ...DEFAULT_SETTINGS.prefs, sportKinds: ['volleyball', 'hockey'] },
    })
    expect(chosen.prefs.sportKinds).toEqual(['hockey', 'volleyball'])
  })
})

describe('השעון בפינה', () => {
  it('מוצג כברירת מחדל, וכיבוי מפורש נשמר', () => {
    expect(DEFAULT_SETTINGS.prefs.showClock).toBe(true)
    expect(sanitizeSettings({ ...DEFAULT_SETTINGS }).prefs.showClock).toBe(true)
    expect(
      sanitizeSettings({
        ...DEFAULT_SETTINGS,
        prefs: { ...DEFAULT_SETTINGS.prefs, showClock: false },
      }).prefs.showClock,
    ).toBe(false)
  })

  /**
   * מי שהתקין את הגרסה הקודמת שומר הגדרות בלי המפתח הזה — הוא לא כיבה
   * את השעון אלא לא ידע עליו. לכן ערך חסר פירושו "מוצג".
   */
  it('הגדרות מלפני שהשעון נוסף מציגות אותו', () => {
    const legacyPrefs = { ...DEFAULT_SETTINGS.prefs }
    delete legacyPrefs.showClock
    expect(sanitizeSettings({ ...DEFAULT_SETTINGS, prefs: legacyPrefs }).prefs.showClock).toBe(
      true,
    )
  })
})
