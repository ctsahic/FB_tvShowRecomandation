import { describe, expect, it } from 'vitest'
import { formatAppVersion } from './version'

describe('תצוגת הגרסה', () => {
  it('מציג את שם הגרסה ומספר הבנייה', () => {
    expect(formatAppVersion({ version: '1.1', build: '2' })).toBe('1.1 (2)')
  })

  it('בלי מספר בנייה נשאר רק שם הגרסה', () => {
    expect(formatAppVersion({ version: '1.2' })).toBe('1.2')
  })

  it('כשאין גרסה בכלל אין מה להציג', () => {
    expect(formatAppVersion(undefined)).toBeUndefined()
    expect(formatAppVersion({ version: '' })).toBeUndefined()
  })
})
