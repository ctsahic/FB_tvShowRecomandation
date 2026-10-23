import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Channel, Programme, ScanProgress } from '../types'
import {
  antifrizChannelGroup,
  decodeHtmlEntities,
  parseAntifrizChannelList,
  parseAntifrizSchedule,
} from './antifriz'
import {
  EPG_CACHE_KEY,
  cacheAgeHours,
  channelsToFetch,
  clearEpgCache,
  describeCacheAge,
  isCacheFresh,
  isChannelFresh,
  loadEpgCache,
  mergeEpgCache,
  saveEpgCache,
} from './epgCache'
import {
  CHANNEL_BY_ID,
  CHANNEL_CATALOG,
  DEFAULT_EPG_CHANNEL_IDS,
  channelSelectionSignature,
  isKnownChannelId,
  normalizeChannelSelection,
} from '../config/channels'
import {
  DEFAULT_OMDB_API_KEY,
  DEFAULT_SETTINGS,
  DEFAULT_TMDB_API_KEY,
  loadSettings,
  sanitizeSettings,
} from '../config/settings'
import { jerusalemDateString, jerusalemOffsetMs, jerusalemTimeToEpoch } from './jerusalem'
import { classifyProgramme } from '../engine/classify'
import { CHANNELS_END_RATIO, scanEpg } from '../engine/recommend'

/* ------------------------------------------------------------------ */
/* דמו של ה-HTML האמיתי מ-antifriz.tv                                   */
/* ------------------------------------------------------------------ */

const CHANNEL_LIST_HTML = `
<div class="dropdown-menu" aria-labelledby="dropdownMenuButton" style="">
<a class="dropdown-item" href="/tv-guide/9-kanal-hd-il"><img src="/storage/images/pack_logos/321babe4.png" loading="lazy" style="height: 10px;"> 9 Канал HD </a>
<a class="dropdown-item" href="/tv-guide/yes-israel-il"><img src="/storage/images/channel_logos/51bab3.png" loading="lazy" style="height: 10px;"> Yes Israeli HD </a>
<a class="dropdown-item" href="/tv-guide/sport5-hd-il"><img src="/storage/images/pack_logos/65dd4a.png" loading="lazy" style="height: 10px;"> Sport 5 HD </a>
<a class="dropdown-item" href="/tv-guide/freetv-series-comedy-il-hd"><img src="/images/a.png"> FreeTV Series Comedy HD </a>
<a class="dropdown-item" href="/tv-guide/yes-movies-kids-hd-il"> Yes Movies KIDS HD </a>
</div>
<ul class="nav nav-fill">
  <li class="nav-item"><a class="nav-link " href="/tv-guide/yes-israel-il?date=2026-10-09">Вчера</a></li>
  <li class="nav-item"><a class="nav-link  active " href="/tv-guide/yes-israel-il?date=2026-10-10">Сегодня</a></li>
</ul>
`

const SCHEDULE_HTML = `
<ul class="list-group mt-2">
  <li class="list-group-item">
    <strong class="mr-2">01:40</strong>
    ג&#039;רוזלם
    <p class="mt-2">
      אימה. שרה, סטודנטית אמריקאית, מגיעה עם חבריה לטיול. בימוי: יואב ודורון פז. 2015 כ&#039; עב&#039; ש.ח.
    </p>
  </li>
  <li class="list-group-item">
    <strong class="mr-2">03:11</strong>
    אסיה
  </li>
  <li class="list-group-item">
    <strong class="mr-2">05:00</strong>
    ישיר! ליגת העל: מכבי תל אביב - הפועל תל אביב
    <p class="mt-2">שידור ישיר: כדורגל. דרבי תל אביבי, מחזור 4.</p>
  </li>
</ul>
`

const DATE = '2026-10-10'

/* ------------------------------------------------------------------ */

describe('פרסור רשימת הערוצים מ-antifriz', () => {
  it('מחלץ את הערוצים מהדרופדאון ולא מתוויות הימים', () => {
    const channels = parseAntifrizChannelList(CHANNEL_LIST_HTML)
    expect(channels.map((channel) => channel.slug)).toEqual([
      '9-kanal-hd-il',
      'yes-israel-il',
      'sport5-hd-il',
      'freetv-series-comedy-il-hd',
      'yes-movies-kids-hd-il',
    ])
    // שם התצוגה אחרי התמונה, בלי תגיות
    expect(channels[0].name).toBe('9 Канал HD')
    expect(channels[4].name).toBe('Yes Movies KIDS HD')
    expect(channels[0].logo).toBe('/storage/images/pack_logos/321babe4.png')
    expect(channels[4].logo).toBeUndefined()
  })

  it('לא מחזיר כלום על HTML ריק', () => {
    expect(parseAntifrizChannelList('')).toEqual([])
    expect(parseAntifrizChannelList('<html><body>nope</body></html>')).toEqual([])
  })
})

describe('פרסור לוח השידורים מ-antifriz', () => {
  const items = parseAntifrizSchedule(SCHEDULE_HTML, DATE)

  it('מחלץ כותרת, תקציר וזמנים', () => {
    expect(items).toHaveLength(3)
    expect(items[0].title).toBe("ג'רוזלם")
    expect(items[0].description).toContain('בימוי: יואב ודורון פז')
    expect(items[2].title).toBe('ישיר! ליגת העל: מכבי תל אביב - הפועל תל אביב')
    expect(items[2].description).toContain('שידור ישיר')
  })

  it('ממיר HH:MM לשעון ישראל', () => {
    expect(items[0].start).toBe(jerusalemTimeToEpoch(DATE, 1, 40))
    expect(items[1].start).toBe(jerusalemTimeToEpoch(DATE, 3, 11))
  })

  it('סוגר כל תכנית במועד ההתחלה של הבאה, ואת האחרונה ב-120 דקות', () => {
    expect(items[0].stop).toBe(items[1].start)
    expect(items[1].stop).toBe(items[2].start)
    expect(items[2].stop - items[2].start).toBe(120 * 60_000)
  })

  it('לא נשבר על שורה בלי תקציר', () => {
    expect(items[1].description).toBeUndefined()
  })

  it('מחזיר מערך ריק על HTML חסר', () => {
    expect(parseAntifrizSchedule('', DATE)).toEqual([])
    expect(parseAntifrizSchedule('<li class="list-group-item">בלי שעה</li>', DATE)).toEqual([])
  })

  it('מפענח ישויות HTML', () => {
    expect(decodeHtmlEntities('ג&#039;רוזלם &amp; עוד &quot;טקסט&quot;')).toBe(
      "ג'רוזלם & עוד \"טקסט\"",
    )
  })
})

describe('חלוקת ערוצי antifriz לקבוצות', () => {
  const cases: Array<[string, string]> = [
    ['Sport 5 HD', 'ספורט'],
    ['One HD', 'ספורט'],
    ['Eurosport 1 HD IL', 'ספורט'],
    ['HOT Cinema 1 HD', 'סרטים'],
    ['FreeTV Movies Thriller HD', 'סרטים'],
    ['Yes Israeli HD', 'כללי'],
    ['FreeTV Series Comedy HD', 'סדרות'],
    ['HOT Comedy HD', 'סדרות'],
    ['i24 HD', 'חדשות'],
    // מלכודות: הילדים קודם, והתיעודי לא נופל לספורט
    ['Yes Movies KIDS HD', 'ילדים'],
    ['Cinema Family HD', 'ילדים'],
    ['Kan23 HD', 'ילדים'],
    ['One Doco HD', 'תיעודי'],
    ['National Geographic HD IL', 'תיעודי'],
    ['Keshet 12 HD', 'כללי'],
  ]

  it.each(cases)('%s -> %s', (name, expected) => {
    expect(antifrizChannelGroup(name)).toBe(expected)
  })
})

describe('סיווג תכניות ממקור בלי קטגוריות', () => {
  function programme(overrides: Partial<Programme>): Programme {
    return {
      channelId: 'antifriz:x',
      channelName: 'x',
      title: 'כותרת',
      start: 0,
      stop: 60_000,
      categories: [],
      ...overrides,
    }
  }

  const movieChannel: Channel = { id: 'm', name: 'HOT Cinema 1 HD', group: 'סרטים' }
  const sportChannel: Channel = { id: 's', name: 'Sport 5 HD', group: 'ספורט' }
  const seriesChannel: Channel = { id: 't', name: 'FreeTV Series Drama HD', group: 'סדרות' }

  it('ערוץ סרטים מסווג כסרט גם בלי המילה "סרט"', () => {
    const result = classifyProgramme(
      programme({ title: 'סאלח שבתי', description: 'קומדיה ישראלית קלאסית. 1964.' }),
      movieChannel,
    )
    expect(result.category).toBe('movie')
  })

  it('תקציר עם קרדיטי בימוי מסגיר סרט גם בערוץ כללי', () => {
    const result = classifyProgramme(
      programme({ title: 'אסיה', description: 'דרמה מרגשת. במאית רותי פרי-בר.' }),
      { id: 'g', name: 'Yes Israeli HD', group: 'כללי' },
    )
    expect(result.category).toBe('movie')
  })

  it('ערוץ ספורט מסווג כספורט', () => {
    const result = classifyProgramme(
      programme({
        title: 'ישיר! ליגת העל: מכבי תל אביב - הפועל תל אביב',
        description: 'שידור ישיר: כדורגל.',
      }),
      sportChannel,
    )
    expect(result.category).toBe('sport')
    expect(result.homeTeam).toBe('מכבי תל אביב')
    expect(result.awayTeam).toBe('הפועל תל אביב')
  })

  it('מזהה שידור חוזר לפי "ש.ח." בתקציר', () => {
    const result = classifyProgramme(
      programme({ title: 'משחק הפרישה של מסי', description: 'שידור חוזר: כדורגל. 2026 כ\' עב\'. ש.ח.' }),
      sportChannel,
    )
    expect(result.isReplay).toBe(true)
  })

  it('ערוץ סדרות מסווג כסדרה', () => {
    const result = classifyProgramme(
      programme({ title: 'פאודה', description: 'עונה 3, פרק 4.' }),
      seriesChannel,
    )
    expect(result.category).toBe('series')
  })
})

describe('זמן שעון ישראל', () => {
  it('מזהה את היסט הקיץ והחורף', () => {
    expect(jerusalemOffsetMs(jerusalemTimeToEpoch('2026-07-15', 12, 0))).toBe(3 * 3_600_000)
    expect(jerusalemOffsetMs(jerusalemTimeToEpoch('2026-01-15', 12, 0))).toBe(2 * 3_600_000)
  })

  it('המרה הלוך ושוב נשמרת', () => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    for (const [hour, minute] of [
      [0, 5],
      [1, 40],
      [13, 21],
      [23, 59],
    ]) {
      const epoch = jerusalemTimeToEpoch(DATE, hour, minute)
      const roundTrip = formatter.format(new Date(epoch))
      const expected = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      expect(roundTrip).toBe(expected)
    }
  })

  it('מחזיר NaN לתאריך שבור', () => {
    expect(Number.isNaN(jerusalemTimeToEpoch('לא-תאריך', 10, 0))).toBe(true)
  })

  it('מחשב את היום בשעון ישראל', () => {
    // 22:00 UTC ב-9 באוקטובר הוא כבר 1:00 ב-10 באוקטובר בישראל
    expect(jerusalemDateString(Date.UTC(2026, 9, 9, 22, 0))).toBe('2026-10-10')
    expect(jerusalemDateString(Date.UTC(2026, 9, 10, 21, 0))).toBe('2026-10-11')
  })
})

/* ------------------------------------------------------------------ */
/* מטמון                                                               */
/* ------------------------------------------------------------------ */

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  clear(): void {
    this.map.clear()
  }
}

class FullStorage extends MemoryStorage {
  override setItem(): void {
    throw new DOMException('quota', 'QuotaExceededError')
  }
}

const NOW = Date.UTC(2026, 9, 10, 12, 0, 0)
const TODAY = jerusalemDateString(NOW)
const HOUR = 3_600_000

function entry(fetchedAt: number, date = TODAY, selection = '') {
  return {
    fetchedAt,
    date,
    source: 'antifriz',
    selection,
    channels: [{ id: 'c1', name: 'Sport 5 HD', group: 'ספורט' }] as Channel[],
    programmes: [
      {
        channelId: 'c1',
        channelName: 'Sport 5 HD',
        title: 'משחק',
        start: NOW,
        stop: NOW + HOUR,
        categories: [],
        description: 'א'.repeat(900),
      },
    ] as Programme[],
  }
}

describe('מטמון לוח השידורים', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('שומר וטוען, ומקצר תקצירים ארוכים', () => {
    expect(saveEpgCache(entry(NOW))).toBe(true)
    const loaded = loadEpgCache()
    expect(loaded).not.toBeNull()
    expect(loaded?.channels).toHaveLength(1)
    expect((loaded?.programmes[0].description ?? '').length).toBeLessThanOrEqual(300)
  })

  it('רענן באותו יום כשאותה בחירת ערוצים — בלי קריאה נוספת לאתר', () => {
    expect(isCacheFresh(entry(NOW - 5 * HOUR), NOW, '')).toBe(true)
    expect(isCacheFresh(entry(NOW - 13 * HOUR), NOW, '')).toBe(true)
  })

  it('לא רענן כשהמשתמש החליף ערוצים', () => {
    const cached = entry(NOW - HOUR, TODAY, 'yes-movies-action-hd-il')
    expect(isCacheFresh(cached, NOW, 'yes-movies-action-hd-il')).toBe(true)
    expect(isCacheFresh(cached, NOW, 'yes-movies-action-hd-il,12-kanal-il')).toBe(false)
  })

  it('שומר את חתימת הבחירה וטוען אותה בחזרה', () => {
    expect(saveEpgCache(entry(NOW, TODAY, 'a,b'))).toBe(true)
    expect(loadEpgCache()?.selection).toBe('a,b')
  })

  /*
   * החשבונאות לפי ערוץ: מה שכבר ירד היום לא יורד שוב, גם כשהבחירה משתנה.
   * הבקשה של המשתמש: "מה שירד אין צורך להוריד שוב עד יום למחרת — או עד
   * שאלחץ הבא נתונים שוב".
   */
  const chan = (slug: string): Channel => ({ id: `antifriz:${slug}`, name: slug, epgId: slug })
  const prog = (slug: string, title: string): Programme => ({
    channelId: `antifriz:${slug}`,
    channelName: slug,
    title,
    start: NOW,
    stop: NOW + HOUR,
    categories: [],
  })

  it('מוריד רק את הערוצים שאין להם נתון מהיום', () => {
    const cache = mergeEpgCache(
      null,
      { channels: [chan('a')], programmes: [prog('a', 'A')], selection: ['a'] },
      NOW - HOUR,
    )
    expect(isChannelFresh(cache, 'a', NOW)).toBe(true)
    // הוספת ערוץ חדש לא גוררת הורדה מחדש של הקיים.
    expect(channelsToFetch(cache, ['a', 'b'], NOW)).toEqual(['b'])
    // וכל עוד אותו יום — הערוץ הישן נשאר טרי.
    expect(isChannelFresh(cache, 'a', NOW + 3 * HOUR)).toBe(true)
    // למחרת בבוקר כבר אין לו נתון תקף.
    expect(channelsToFetch(cache, ['a'], NOW + 24 * HOUR)).toEqual(['a'])
  })

  it('ממזג שליפה חלקית בלי לאבד את מה שכבר ירד', () => {
    const first = mergeEpgCache(
      null,
      { channels: [chan('a')], programmes: [prog('a', 'A')], selection: ['a'] },
      NOW,
    )
    const merged = mergeEpgCache(
      first,
      { channels: [chan('b')], programmes: [prog('b', 'B')], selection: ['a', 'b'] },
      NOW + HOUR,
    )
    expect(merged.channels.map((c) => c.epgId)).toEqual(['a', 'b'])
    expect(merged.programmes.map((p) => p.title)).toEqual(['A', 'B'])
    expect(merged.channelFetchedAt?.['a']).toBe(NOW)
    expect(merged.channelFetchedAt?.['b']).toBe(NOW + HOUR)

    // שליפה חוזרת של ערוץ בודד מחליפה את השורות שלו ולא משכפלת אותן.
    const again = mergeEpgCache(
      merged,
      { channels: [chan('a')], programmes: [prog('a', 'A2')], selection: ['a', 'b'] },
      NOW + 2 * HOUR,
    )
    const rowsA = again.programmes.filter((p) => p.channelId === 'antifriz:a')
    expect(rowsA.map((p) => p.title)).toEqual(['A2'])
    expect(again.programmes.filter((p) => p.channelId === 'antifriz:b')).toHaveLength(1)
    expect(again.channelFetchedAt?.['a']).toBe(NOW + 2 * HOUR)
  })

  it('מוחק מהמטמון נתונים של יום קודם', () => {
    const old = mergeEpgCache(
      null,
      { channels: [chan('a')], programmes: [prog('a', 'A')], selection: ['a'] },
      NOW,
    )
    const merged = mergeEpgCache(
      old,
      { channels: [chan('b')], programmes: [prog('b', 'B')], selection: ['b'] },
      NOW + 24 * HOUR,
    )
    // הערוץ של אתמול לא "מהבהב" בחזרה לתוצאה של היום.
    expect(merged.channels.map((c) => c.epgId)).toEqual(['b'])
    expect(merged.programmes.map((p) => p.title)).toEqual(['B'])
  })

  it('מטמון שנשמר לפני החשבונאות לפי ערוץ לא מפעיל שליפה מחדש', () => {
    // הפורמט הישן: תאריך אחד לכל המטמון, בלי חותמות לפי ערוץ.
    localStorage.setItem(
      EPG_CACHE_KEY,
      JSON.stringify({
        fetchedAt: NOW - HOUR,
        date: TODAY,
        source: 'antifriz',
        selection: 'sport5-hd-il',
        channels: [chan('sport5-hd-il')],
        programmes: [prog('sport5-hd-il', 'משחק')],
      }),
    )
    const loaded = loadEpgCache()
    expect(loaded?.channelDate?.['sport5-hd-il']).toBe(TODAY)
    expect(channelsToFetch(loaded, ['sport5-hd-il'], NOW)).toEqual([])
  })

  it('לא רענן כשהתאריך בשעון ישראל כבר התחלף', () => {
    expect(isCacheFresh(entry(NOW - HOUR, '2026-10-09'), NOW, '')).toBe(false)
  })

  it('לא רענן מעבר לתקרת הגיל הקשיחה', () => {
    expect(isCacheFresh(entry(NOW - 27 * HOUR, TODAY), NOW, '')).toBe(false)
  })

  it('לא רענן בלי מטמון או עם חתימת זמן עתידית', () => {
    expect(isCacheFresh(null, NOW, '')).toBe(false)
    expect(isCacheFresh(entry(NOW + 3 * HOUR), NOW, '')).toBe(false)
  })

  it('מחשב גיל בשעות', () => {
    expect(cacheAgeHours(entry(NOW - 4 * HOUR), NOW)).toBeCloseTo(4, 5)
    expect(cacheAgeHours(null, NOW)).toBe(Number.POSITIVE_INFINITY)
  })

  it('מסמן שרענון כדאי כשהבחירה השתנתה', () => {
    const cached = entry(NOW - HOUR, TODAY, 'a')
    expect(describeCacheAge(cached, NOW, 'a')).not.toContain('כדאי לרענן')
    expect(describeCacheAge(cached, NOW, 'a,b')).toContain('כדאי לרענן')
  })

  it('מחזיר false ולא זורק כשאין מקום באחסון', () => {
    vi.stubGlobal('localStorage', new FullStorage())
    expect(saveEpgCache(entry(NOW))).toBe(false)
  })

  it('מתעלם מ-JSON פגום', () => {
    localStorage.setItem(EPG_CACHE_KEY, '{not json')
    expect(loadEpgCache()).toBeNull()
    localStorage.setItem(EPG_CACHE_KEY, '{"channels":5}')
    expect(loadEpgCache()).toBeNull()
  })

  it('מנקה את המטמון', () => {
    saveEpgCache(entry(NOW))
    clearEpgCache()
    expect(loadEpgCache()).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/* באר ההתקדמות של הסריקה                                             */
/* ------------------------------------------------------------------ */

/** תשובת fetch מדומה: רשימת הערוצים לדף המדריך, לוח שידורים לשאר. */
async function fakeFetch(url: unknown) {
  const text = String(url).includes('?date=') ? SCHEDULE_HTML : CHANNEL_LIST_HTML
  return { ok: true, status: 200, statusText: 'OK', text: async () => text }
}

describe('התקדמות הסריקה', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('מדווח את שם הערוץ, ההשהיה שהוגדרה והספירה לאחור', async () => {
    vi.stubGlobal('fetch', fakeFetch)
    const events: ScanProgress[] = []
    const settings = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      provider: {
        ...DEFAULT_SETTINGS.provider,
        // שני ערוצים שקיימים ב-CHANNEL_LIST_HTML, והשהיה קצרה לבדיקה.
        epgChannelIds: ['yes-israel-il', 'sport5-hd-il'],
        channelDelaySeconds: 1,
      },
    })

    let waitingEmittedAt = 0
    const snapshot = await scanEpg({
      settings,
      now: NOW,
      forceRefresh: true,
      onProgress: (progress) => {
        if (progress.phase === 'waiting') waitingEmittedAt = Date.now()
        events.push(progress)
      },
    })

    expect(snapshot.channels).toHaveLength(2)
    expect(events[0].phase).toBe('list')

    const channelEvents = events.filter((event) => event.phase === 'channels')
    // סריקה מאפס — בלי תוספת "ממשיכים מאותה נקודה" לקבועה.
    expect(channelEvents[0].label).toBe('לוח השידורים')
    expect(channelEvents[0].channelName).toBe('Yes Israeli HD')
    expect(channelEvents[0].channelNumber).toBe(52)
    expect(channelEvents[0].message).toContain('Yes Israeli HD')
    expect(channelEvents[0].total).toBe(2)

    const waiting = events.filter((event) => event.phase === 'waiting')
    expect(waiting).toHaveLength(1)
    expect(waiting[0].waitSeconds).toBe(1)
    expect(waiting[0].channelName).toBe('Sport 5 HD')
    expect(waiting[0].message).toContain('Sport 5 HD')
    // הספירה לאחור מתבססת על הזמן שבו ההשהיה נגמרת — בדיוק ההשהיה שהוגדרה.
    const waitMs = (waiting[0].waitUntil ?? 0) - waitingEmittedAt
    expect(waitMs).toBeGreaterThanOrEqual(950)
    expect(waitMs).toBeLessThanOrEqual(1100)
    expect(waiting[0].ratioAfterWait).toBeGreaterThan(waiting[0].ratio)

    // הבאר לא זזה אחורה אף פעם — גם לא כשההשהיה נגמרת ומתחילה הבקשה הבאה:
    // יחס סוף ההשהיה שווה ליחס שבו מתחילה הבקשה של הערוץ הבא.
    const ratios = events.map((event) => event.ratio)
    expect(ratios).toEqual([...ratios].sort((a, b) => a - b))
    const waitIndex = events.findIndex((event) => event.phase === 'waiting')
    expect(events[waitIndex + 1].phase).toBe('channels')
    expect(events[waitIndex + 1].ratio).toBeCloseTo(waiting[0].ratioAfterWait ?? 0, 6)
    expect(ratios.every((ratio) => ratio >= 0 && ratio <= CHANNELS_END_RATIO)).toBe(true)
  })

  it('בקריאה מהמטמון אין דיווח על ערוצים אלא שלב המטמון', async () => {
    vi.stubGlobal('fetch', fakeFetch)
    const settings = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      provider: {
        ...DEFAULT_SETTINGS.provider,
        epgChannelIds: ['yes-israel-il', 'sport5-hd-il'],
        channelDelaySeconds: 1,
      },
    })
    const events: ScanProgress[] = []
    await scanEpg({
      settings,
      now: NOW,
      forceRefresh: true,
      onProgress: (progress) => events.push(progress),
    })

    events.length = 0
    const cached = await scanEpg({
      settings,
      now: NOW + 60_000,
      onProgress: (progress) => events.push(progress),
    })
    expect(cached.channels).toHaveLength(2)
    expect(events.map((event) => event.phase)).toEqual(['cache'])
  })

  /*
   * הלב של הבקשה: הוספת ערוץ אחד לא מורידה מחדש את כל הערוצים. ה-fakeFetch
   * מתעד כל בקשה ללוח שידורים (יש בה ?date=), וכך סופרים בדיוק מה ירד.
   */
  it('ערוץ שכבר ירד היום לא יורד שוב — גם כשמוסיפים ערוץ לבחירה', async () => {
    const scheduleRequests: string[] = []
    vi.stubGlobal('fetch', async (url: unknown) => {
      if (String(url).includes('?date=')) scheduleRequests.push(String(url))
      return fakeFetch(url)
    })
    const makeSettings = (ids: string[]) =>
      sanitizeSettings({
        ...DEFAULT_SETTINGS,
        provider: {
          ...DEFAULT_SETTINGS.provider,
          epgChannelIds: ids,
          channelDelaySeconds: 0,
        },
      })

    // סריקה ראשונה: מורידים שני ערוצים.
    const first = await scanEpg({
      settings: makeSettings(['yes-israel-il', 'sport5-hd-il']),
      now: NOW,
      forceRefresh: true,
    })
    expect(first.channels).toHaveLength(2)
    expect(scheduleRequests).toHaveLength(2)

    // הוספת ערוץ שלישי: יורד רק הוא.
    scheduleRequests.length = 0
    const events: ScanProgress[] = []
    const added = await scanEpg({
      settings: makeSettings(['yes-israel-il', 'sport5-hd-il', '9-kanal-hd-il']),
      now: NOW + HOUR,
      onProgress: (progress) => events.push(progress),
    })
    expect(scheduleRequests).toHaveLength(1)
    expect(scheduleRequests[0]).toContain('9-kanal-hd-il')
    expect(added.channels).toHaveLength(3)
    expect(events.some((event) => event.message.includes('כבר שמור מהיום'))).toBe(true)

    // הפעם הכל טרי — וגם אין פנייה לאתר בכלל.
    scheduleRequests.length = 0
    const second = await scanEpg({
      settings: makeSettings(['yes-israel-il', 'sport5-hd-il', '9-kanal-hd-il']),
      now: NOW + 2 * HOUR,
    })
    expect(scheduleRequests).toHaveLength(0)
    expect(second.channels).toHaveLength(3)

    // הסרת ערוץ מהבחירה: הוא לא חוזר לתוצאה, ואין הורדות.
    const removed = await scanEpg({
      settings: makeSettings(['yes-israel-il', 'sport5-hd-il']),
      now: NOW + 3 * HOUR,
    })
    expect(scheduleRequests).toHaveLength(0)
    expect(removed.channels.map((channel) => channel.epgId)).toEqual([
      'yes-israel-il',
      'sport5-hd-il',
    ])

    // "הבא נתונים עכשיו" — מוריד מחדש את כל הנבחרים.
    scheduleRequests.length = 0
    await scanEpg({
      settings: makeSettings(['yes-israel-il', 'sport5-hd-il']),
      now: NOW + 4 * HOUR,
      forceRefresh: true,
    })
    expect(scheduleRequests).toHaveLength(2)
  })

  /*
   * הבקשה של המשתמש: "התחלתי סריקה של 30 ערוצים, הגעתי לכמעט 50%, יצאתי
   * מהאפליקציה — וכשחזרתי הסריקה התחילה מהתחלה". הסיבה: לוח השידורים נשמר
   * למטמון רק בסוף הסריקה, ולכן ערוץ שכבר ירד אבד ברגע שהסריקה נקטעת.
   *
   * כאן מדמים את היציאה מהאפליקציה — הסריקה נעצרת (AbortSignal) אחרי הערוץ
   * הראשון — ומוודאים שהערוץ הזה כבר שמור, ושאין מנסים להוריד אותו שוב.
   */
  it('סריקה שנקטעת באמצע ממשיכה מאותה נקודה ולא מתחילה מאפס', async () => {
    const scheduleRequests: string[] = []
    const controller = new AbortController()
    vi.stubGlobal('fetch', async (url: unknown) => {
      const text = String(url)
      if (text.includes('?date=')) {
        scheduleRequests.push(text)
        // הערוץ הראשון ירד — ומיד "יוצאים מהאפליקציה".
        if (scheduleRequests.length === 1) controller.abort()
      }
      return fakeFetch(url)
    })
    const makeSettings = (ids: string[]) =>
      sanitizeSettings({
        ...DEFAULT_SETTINGS,
        provider: {
          ...DEFAULT_SETTINGS.provider,
          epgChannelIds: ids,
          channelDelaySeconds: 0,
        },
      })
    const selection = ['yes-israel-il', 'sport5-hd-il', '9-kanal-hd-il']
    const settings = makeSettings(selection)

    const interrupted = await scanEpg({
      settings,
      now: NOW,
      signal: controller.signal,
      forceRefresh: true,
    })
    // הסריקה נעצרה אחרי ערוץ אחד בלבד, ורק הוא הוצא מהאתר.
    expect(scheduleRequests).toHaveLength(1)
    expect(interrupted.channels).toHaveLength(1)
    const firstFetched = interrupted.channels[0].epgId ?? ''
    expect(firstFetched).not.toBe('')

    // מה שירד שמור במטמון — ובסריקה הבאה אין ניסיון להוריד אותו שוב.
    const stored = loadEpgCache()
    expect(stored?.channels.map((channel) => channel.epgId)).toContain(firstFetched)
    const remaining = channelsToFetch(stored, settings.provider.epgChannelIds, NOW)
    expect(remaining).toHaveLength(2)
    expect(remaining).not.toContain(firstFetched)

    // חזרה לאפליקציה: ממשיכים מהמקום שבו נעצרנו, לא מאפס.
    scheduleRequests.length = 0
    const events: ScanProgress[] = []
    const resumed = await scanEpg({
      settings,
      now: NOW + 60_000,
      onProgress: (progress) => events.push(progress),
    })
    expect(scheduleRequests).toHaveLength(2)
    expect(scheduleRequests.every((url) => !url.includes(firstFetched))).toBe(true)
    expect(resumed.channels).toHaveLength(3)
    expect(events.some((event) => event.message.includes('ממשיכים מאותה נקודה'))).toBe(true)
    // וגם על המסך: הקבועה של שלב ההורדה מספרת שממשיכים מאותה נקודה.
    const channelLabels = events
      .filter((event) => event.phase === 'channels')
      .map((event) => event.label)
    expect(channelLabels[0]).toContain('ממשיכים מאותה נקודה')
  })
})

/* ------------------------------------------------------------------ */
/* קטלוג הערוצים ובחירת ה-EPG                                          */
/* ------------------------------------------------------------------ */

describe('קטלוג הערוצים (config/channels)', () => {
  it('מכיל את 131 הערוצים עם מספרים ומזהים ייחודיים', () => {
    expect(CHANNEL_CATALOG).toHaveLength(131)
    const ids = CHANNEL_CATALOG.map((channel) => channel.id)
    const numbers = CHANNEL_CATALOG.map((channel) => channel.number)
    expect(new Set(ids).size).toBe(131)
    expect(new Set(numbers).size).toBe(131)
    expect(numbers[0]).toBe(1)
    expect(numbers[130]).toBe(131)
    // כל המספרים ברצף 1..131 — סדר התצוגה בהגדרות עוקב אחרי המדריך.
    expect(numbers).toEqual([...Array(131).keys()].map((index) => index + 1))
  })

  it('ברירת המחדל: שמונת ערוצי הספורט המרכזיים — וכולם קיימים בקטלוג', () => {
    expect([...DEFAULT_EPG_CHANNEL_IDS]).toEqual([
      'sport1-hd-il',
      'sport2-hd-il',
      'sport3-hd-il',
      'sport4-hd-il',
      'sport5-hd-il',
      'yes-sport5-plus-il-hd',
      'sport5-plus-live-hd-il',
      'sport6-il-hd',
    ])
    for (const id of DEFAULT_EPG_CHANNEL_IDS) expect(isKnownChannelId(id)).toBe(true)
    expect(CHANNEL_BY_ID.get('sport1-hd-il')?.number).toBe(70)
    expect(CHANNEL_BY_ID.get('yes-sport5-plus-il-hd')?.number).toBe(75)
    expect(CHANNEL_BY_ID.get('sport5-plus-live-hd-il')?.number).toBe(76)
    expect(CHANNEL_BY_ID.get('sport6-il-hd')?.number).toBe(80)
    // הרשימה כבר בסדר הקטלוג — הנירמול לא משנה אותה.
    expect(normalizeChannelSelection(DEFAULT_EPG_CHANNEL_IDS)).toEqual([
      ...DEFAULT_EPG_CHANNEL_IDS,
    ])
  })

  it('מסנן מזהים לא מוכרים ושומר על סדר הקטלוג', () => {
    // הסדר הוא סדר הקטלוג (ערוץ 4 לפני ערוץ 9), לא סדר הבחירה.
    expect(normalizeChannelSelection(['12-kanal-il', 'לא-קיים', 'yes-movies-action-hd-il'])).toEqual([
      '12-kanal-il',
      'yes-movies-action-hd-il',
    ])
    expect(channelSelectionSignature(['yes-movies-action-hd-il', '12-kanal-il'])).toBe(
      '12-kanal-il,yes-movies-action-hd-il',
    )
  })

  it('ברירת המחדל מכילה השהיה של 10 שניות ובחירה של שני ערוצים', () => {
    expect(DEFAULT_SETTINGS.provider.channelDelaySeconds).toBe(10)
    expect(DEFAULT_SETTINGS.provider.epgChannelIds).toEqual([...DEFAULT_EPG_CHANNEL_IDS])
    // המפתחות של TMDB ו-OMDb מובנים בגרסה — כדי שסרטים יקבלו ציון וציוני
    // IMDb/Rotten Tomatoes בלי הקלדה בכל מכשיר.
    expect(DEFAULT_SETTINGS.api.tmdbApiKey).toBe(DEFAULT_TMDB_API_KEY)
    expect(DEFAULT_SETTINGS.api.omdbApiKey).toBe(DEFAULT_OMDB_API_KEY)
    expect(DEFAULT_TMDB_API_KEY.trim()).not.toBe('')
    expect(DEFAULT_OMDB_API_KEY.trim()).not.toBe('')
  })

  it('תיקון הגדרות שנשמרו: סינון לקטלוג וחסימת השהיה שלילית', () => {
    const broken = {
      ...DEFAULT_SETTINGS,
      provider: {
        ...DEFAULT_SETTINGS.provider,
        epgChannelIds: ['לא-קיים'],
        channelDelaySeconds: -5,
      },
    }
    const fixed = sanitizeSettings(broken)
    expect(fixed.provider.epgChannelIds).toEqual([...DEFAULT_EPG_CHANNEL_IDS])
    expect(fixed.provider.channelDelaySeconds).toBe(0)

    const tooBig = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      provider: { ...DEFAULT_SETTINGS.provider, channelDelaySeconds: 9999 },
    })
    expect(tooBig.provider.channelDelaySeconds).toBe(120)
  })

  it('הגדרות ישנות עם ברירת המחדל הקודמת (6.8) עוברות לסף החדש — 7', () => {
    const legacy = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      prefs: { ...DEFAULT_SETTINGS.prefs, minMovieRating: 6.8 },
    })
    expect(legacy.prefs.minMovieRating).toBe(7)
    expect(DEFAULT_SETTINGS.prefs.minMovieRating).toBe(7)
  })

  it('ציון שהמשתמש בחר בעצמו נשמר כמו שהוא — גם אם הוא שונה מהברירת מחדל', () => {
    for (const chosen of [0, 5.5, 8.4, 10]) {
      const kept = sanitizeSettings({
        ...DEFAULT_SETTINGS,
        prefs: { ...DEFAULT_SETTINGS.prefs, minMovieRating: chosen },
      })
      expect(kept.prefs.minMovieRating).toBe(chosen)
    }
  })

  it('ציון מחוץ לטווח 0-10 נחתך לטווח, וערך לא מספרי נופל לברירת המחדל', () => {
    const clamp = (value: unknown) =>
      sanitizeSettings({
        ...DEFAULT_SETTINGS,
        prefs: { ...DEFAULT_SETTINGS.prefs, minMovieRating: value as number },
      }).prefs.minMovieRating

    expect(clamp(42)).toBe(10)
    expect(clamp(-3)).toBe(0)
    expect(clamp(Number.NaN)).toBe(DEFAULT_SETTINGS.prefs.minMovieRating)
  })

  it('טוען הגדרות שמורות ומוסיף את השדות החדשים', () => {
    vi.stubGlobal('localStorage', new MemoryStorage())
    localStorage.setItem(
      'tv-recommender.settings.v1',
      JSON.stringify({ provider: { mode: 'antifriz', epgChannelIds: ['hot-cinema1-il'] } }),
    )
    const loaded = loadSettings()
    expect(loaded.provider.epgChannelIds).toEqual(['hot-cinema1-il'])
    expect(loaded.provider.channelDelaySeconds).toBe(10)
    // הגדרות שנשמרו לפני שהמפתח נוסף מכילות מחרוזת ריקה — ומאמצות את
    // ברירת המחדל, כדי שהסרטים יעבדו בלי הקלדה מחדש.
    expect(loaded.api.tmdbApiKey).toBe(DEFAULT_TMDB_API_KEY)
    expect(loaded.api.omdbApiKey).toBe(DEFAULT_OMDB_API_KEY)
    vi.unstubAllGlobals()
  })
})
