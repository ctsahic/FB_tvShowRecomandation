import { describe, expect, it } from 'vitest'
import { formatClockTime, formatMinutesSpan, formatRelativeMinutes } from './he'

describe('פרק זמן בעברית', () => {
  it('עד שעה נשאר בדקות', () => {
    expect(formatMinutesSpan(0)).toBe('0 דק׳')
    expect(formatMinutesSpan(14)).toBe('14 דק׳')
    expect(formatMinutesSpan(45)).toBe('45 דק׳')
    expect(formatMinutesSpan(59)).toBe('59 דק׳')
  })

  it('מעל שעה עובר לשעות — בלי דקות מיותרות כשהזמן עגול', () => {
    expect(formatMinutesSpan(60)).toBe('שעה')
    expect(formatMinutesSpan(120)).toBe('שעתיים')
    expect(formatMinutesSpan(180)).toBe('3 שעות')
    expect(formatMinutesSpan(125)).toBe('שעתיים ו-5 דק׳')
    expect(formatMinutesSpan(189)).toBe('3 שעות ו-9 דק׳')
  })

  it('זמן שלילי לא מפיל את התצוגה', () => {
    expect(formatMinutesSpan(-5)).toBe('0 דק׳')
  })
})

describe('השעון שבפינה', () => {
  it('מציג שעה:דקה:שנייה בזמן ישראל — כולל שעון קיץ', () => {
    // 15 בינואר 2026, 12:00 UTC — חורף בישראל (UTC+2).
    expect(formatClockTime(Date.UTC(2026, 0, 15, 12, 0, 0))).toBe('14:00:00')
    // 1 ביולי 2026, 12:00 UTC — קיץ בישראל (UTC+3).
    expect(formatClockTime(Date.UTC(2026, 6, 1, 12, 0, 0))).toBe('15:00:00')
  })

  it('חוצה חצות בלי 24:00 ובלי לאבד שניות', () => {
    // 22:00 UTC בקיץ = 01:00 בישראל למחרת.
    expect(formatClockTime(Date.UTC(2026, 6, 1, 22, 0, 5))).toBe('01:00:05')
    // 21:00 UTC בקיץ = חצות בדיוק.
    expect(formatClockTime(Date.UTC(2026, 6, 1, 21, 0, 0))).toBe('00:00:00')
  })
})

describe('מתי זה מתחיל', () => {
  it('עד שעה ממשיך להיראות בדקות', () => {
    expect(formatRelativeMinutes(0)).toBe('עכשיו')
    expect(formatRelativeMinutes(1)).toBe('בעוד 1 דק׳')
    expect(formatRelativeMinutes(45)).toBe('בעוד 45 דק׳')
    expect(formatRelativeMinutes(59)).toBe('בעוד 59 דק׳')
  })

  it('מעל שעה עובר לשעות', () => {
    expect(formatRelativeMinutes(61)).toBe('בעוד שעה ו-1 דק׳')
    expect(formatRelativeMinutes(120)).toBe('בעוד שעתיים')
    expect(formatRelativeMinutes(189)).toBe('בעוד 3 שעות ו-9 דק׳')
  })

  it('תכנית שכבר התחילה נספרת לאחור באותו אופן', () => {
    expect(formatRelativeMinutes(-5)).toBe('התחיל לפני 5 דק׳')
    expect(formatRelativeMinutes(-125)).toBe('התחיל לפני שעתיים ו-5 דק׳')
  })
})
