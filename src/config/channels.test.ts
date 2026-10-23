import { describe, expect, it } from 'vitest'
import {
  CHANNEL_CATALOG,
  CHANNEL_CATEGORIES,
  channelsInCategory,
  toggleCategorySelection,
} from './channels'

describe('קטלוג הערוצים — קטגוריות', () => {
  it('כל קטגוריה מוגדרת מכילה לפחות ערוץ אחד, וכל ערוץ שייך לקטגוריה מוכרת', () => {
    const known = new Set(CHANNEL_CATEGORIES.map((category) => category.id))
    for (const channel of CHANNEL_CATALOG) {
      expect(known.has(channel.category)).toBe(true)
    }
    for (const category of CHANNEL_CATEGORIES) {
      expect(channelsInCategory(category.id).length).toBeGreaterThan(0)
    }
  })

  it('Vamos HD אינו בקטגוריית הספורט — הוא בכללי', () => {
    const sports = channelsInCategory('sport').map((channel) => channel.id)
    expect(sports).not.toContain('vamos-il-hd')
    expect(CHANNEL_CATALOG.find((channel) => channel.id === 'vamos-il-hd')?.category).toBe('general')
  })

  it('סרטי ילדים מופרדים מסרטים ומערוצי ילדים', () => {
    const kidsMovies = channelsInCategory('movies-kids').map((channel) => channel.id)
    expect(kidsMovies).toEqual([
      'yes-movies-kids-hd-il',
      'cinema-family-il-hd',
      'freetv-movies-family-il-hd',
    ])
    const movies = channelsInCategory('movies').map((channel) => channel.id)
    const kids = channelsInCategory('kids').map((channel) => channel.id)
    for (const id of kidsMovies) {
      expect(movies).not.toContain(id)
      expect(kids).not.toContain(id)
    }
  })

  it('בחירת קטגוריה מסמנת את כל ערוציה בלבד, בסדר הקטלוג', () => {
    const picked = toggleCategorySelection(['12-kanal-il'], 'movies-kids', true)
    expect(picked).toEqual([
      '12-kanal-il',
      'yes-movies-kids-hd-il',
      'cinema-family-il-hd',
      'freetv-movies-family-il-hd',
    ])
    // סדר הקטלוג ולא סדר הלחיצות — גם כשהבחירה הקודמת הייתה מבולגנת.
    expect(toggleCategorySelection(['one-hd-il', '12-kanal-il'], 'sport', true)).toEqual([
      '12-kanal-il',
      'sport1-hd-il',
      'sport2-hd-il',
      'sport3-hd-il',
      'sport4-hd-il',
      'sport5-hd-il',
      'yes-sport5-plus-il-hd',
      'sport5-plus-live-hd-il',
      'sport5-stars-il-hd',
      'sport5-gold-il',
      'sport5-max-il-hd',
      'sport6-il-hd',
      'eurosport1-il-hd',
      'eurosport2-il-hd',
      'one-hd-il',
      'one2-hd-il',
    ])
  })

  it('ניקוי קטגוריה מסיר רק את ערוציה', () => {
    const all = CHANNEL_CATALOG.map((channel) => channel.id)
    const withoutMovies = toggleCategorySelection(all, 'movies', false)
    expect(withoutMovies).not.toContain('hot-cinema1-il')
    expect(withoutMovies).toContain('yes-movies-kids-hd-il')
    expect(withoutMovies).toContain('hot-hbo-il')
    expect(withoutMovies.length).toBe(all.length - channelsInCategory('movies').length)
  })
})
