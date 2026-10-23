import { describe, expect, it } from 'vitest'
import { BACK_TOP_THRESHOLD_PX, resolveBackAction } from './back'

describe('מקש ה-Back של השלט', () => {
  it('סוגר קודם את החלון הפתוח', () => {
    expect(
      resolveBackAction({ detailsOpen: true, settingsOpen: true, scrollY: 900 }),
    ).toBe('close-details')
    expect(
      resolveBackAction({ detailsOpen: false, settingsOpen: true, scrollY: 900 }),
    ).toBe('close-settings')
  })

  it('כשגללו למטה — חוזר למעלה ולא ממוזער', () => {
    expect(
      resolveBackAction({ detailsOpen: false, settingsOpen: false, scrollY: 1200 }),
    ).toBe('top')
    // גם גלילה קטנה: המשתמש כבר לא רואה את שורת הסינון.
    expect(
      resolveBackAction({ detailsOpen: false, settingsOpen: false, scrollY: 200 }),
    ).toBe('top')
  })

  it('בראש העמוד — ממוזער ומשאיר את האפליקציה ברקע', () => {
    expect(
      resolveBackAction({ detailsOpen: false, settingsOpen: false, scrollY: 0 }),
    ).toBe('minimize')
    expect(
      resolveBackAction({
        detailsOpen: false,
        settingsOpen: false,
        scrollY: BACK_TOP_THRESHOLD_PX,
      }),
    ).toBe('minimize')
  })
})
