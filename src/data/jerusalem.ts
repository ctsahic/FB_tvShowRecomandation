/**
 * המרות זמן לפי שעון ישראל.
 *
 * לוח השידורים של antifriz נותן רק "HH:MM" ויום, בלי אזור זמן — לכן חייבים
 * להמיר לשעון ישראל, כולל מעברי שעון קיץ/חורף.
 */

const TIME_ZONE = 'Asia/Jerusalem'

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

interface WallClock {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function wallClock(epochMs: number): WallClock {
  const out: Partial<WallClock> = {}
  for (const part of FORMATTER.formatToParts(new Date(epochMs))) {
    if (part.type === 'year') out.year = Number(part.value)
    else if (part.type === 'month') out.month = Number(part.value)
    else if (part.type === 'day') out.day = Number(part.value)
    else if (part.type === 'hour') out.hour = Number(part.value)
    else if (part.type === 'minute') out.minute = Number(part.value)
    else if (part.type === 'second') out.second = Number(part.value)
  }
  return out as WallClock
}

/** היסט אזור הזמן במילישניות ברגע נתון: שעון ישראל פחות UTC. */
export function jerusalemOffsetMs(epochMs: number): number {
  const wall = wallClock(epochMs)
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  )
  return asUtc - epochMs
}

/** 'YYYY-MM-DD' לפי שעון ישראל. */
export function jerusalemDateString(epochMs: number): string {
  const wall = wallClock(epochMs)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`
}

/**
 * המרת תאריך ושעה בשעון ישראל ל-epoch ms.
 * שתי איטרציות מספיקות כדי להיות מדויקים גם ביום של מעבר שעון.
 */
export function jerusalemTimeToEpoch(date: string, hour: number, minute: number): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
  if (!match) return Number.NaN
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return Number.NaN

  const naive = Date.UTC(year, month - 1, day, hour, minute, 0)
  let guess = naive - jerusalemOffsetMs(naive)
  guess = naive - jerusalemOffsetMs(guess)
  return guess
}

/** התחלת היום (00:00) בשעון ישראל, כ-epoch ms. */
export function jerusalemStartOfDay(epochMs: number): number {
  return jerusalemTimeToEpoch(jerusalemDateString(epochMs), 0, 0)
}

/** כמה שעות עברו מאז חתימת זמן נתונה. */
export function hoursSince(timestamp: number, now: number): number {
  return (now - timestamp) / 3_600_000
}
