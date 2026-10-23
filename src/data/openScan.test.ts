import { describe, expect, it } from 'vitest'
import type { EpgCacheEntry } from './epgCache'
import { shouldScanOnOpen } from './epgCache'
import { channelSelectionSignature } from '../config/channels'
import { jerusalemDateString } from './jerusalem'

const NOW = new Date('2026-10-17T12:00:00+03:00').getTime()
const TODAY = jerusalemDateString(NOW)
const SELECTION = ['sport1-hd-il', 'sport2-hd-il']

function cache(overrides: Partial<EpgCacheEntry> = {}): EpgCacheEntry {
  return {
    fetchedAt: NOW - 60 * 60 * 1000,
    date: TODAY,
    source: 'antifriz',
    selection: channelSelectionSignature(SELECTION),
    channels: [],
    programmes: [],
    channelFetchedAt: Object.fromEntries(SELECTION.map((id) => [id, NOW - 60 * 60 * 1000])),
    channelDate: Object.fromEntries(SELECTION.map((id) => [id, TODAY])),
    ...overrides,
  }
}

describe('החלטה בפתיחת האפליקציה', () => {
  it('בלי מטמון — ממתינים לבקשה של המשתמש', () => {
    expect(shouldScanOnOpen(null, SELECTION, NOW)).toBe('wait')
  })

  it('בחירת ערוצים שהשתנתה — הסיבה היחידה לשלוף אוטומטית', () => {
    const entry = cache({ selection: channelSelectionSignature(['sport1-hd-il']) })
    expect(shouldScanOnOpen(entry, SELECTION, NOW)).toBe('selection-changed')
  })

  it('מטמון של אותו יום ובחירה זהה — מציגים ממנו בלי לגעת באתר', () => {
    expect(shouldScanOnOpen(cache(), SELECTION, NOW)).toBe('cache')
  })

  it('מטמון של יום קודם — יום חדש לא מפעיל שליפה לבד', () => {
    const entry = cache({ date: '2026-10-16', fetchedAt: NOW - 26 * 60 * 60 * 1000 })
    expect(shouldScanOnOpen(entry, SELECTION, NOW)).toBe('wait')
  })

  it('בחירה זהה אבל חסרים נתונים לאחד הערוצים — ממתינים', () => {
    const entry = cache({
      channelFetchedAt: { 'sport1-hd-il': NOW - 60 * 60 * 1000 },
      channelDate: { 'sport1-hd-il': TODAY },
    })
    expect(shouldScanOnOpen(entry, SELECTION, NOW)).toBe('wait')
  })
})
