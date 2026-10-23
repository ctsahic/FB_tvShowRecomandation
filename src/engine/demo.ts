import type { Channel, EpgSnapshot, Programme } from '../types'

/**
 * נתוני דוגמה לתצוגה מקדימה — מאפשרים לראות את הממשק וההמלצות בלי
 * להתחבר לספק. אינם קשורים לספק האמיתי של המשתמש.
 */

const MIN = 60_000

export const DEMO_CHANNELS: readonly Channel[] = [
  { id: 'dem-kan11', name: 'כאן 11', group: 'ישראל', number: 11, israeli: true },
  { id: 'dem-ch12', name: 'חדשות 12', group: 'ישראל', number: 12, israeli: true },
  { id: 'dem-ch13', name: 'חדשות 13', group: 'ישראל', number: 13, israeli: true },
  { id: 'dem-ch14', name: 'עכשיו 14', group: 'ישראל', number: 14, israeli: true },
  { id: 'dem-i24', name: 'i24NEWS', group: 'ישראל', number: 15, israeli: true },
  { id: 'dem-sport1', name: 'ספורט 1', group: 'ספורט', number: 51, israeli: true },
  { id: 'dem-sport2', name: 'ספורט 2', group: 'ספורט', number: 52, israeli: true },
  { id: 'dem-sport5', name: 'ספורט 5', group: 'ספורט', number: 55, israeli: true },
  { id: 'dem-one', name: 'ONE', group: 'ספורט', number: 56, israeli: true },
  { id: 'dem-movies1', name: 'HOT סרטים', group: 'סרטים', number: 201, israeli: true },
  { id: 'dem-movies2', name: 'yes Movies', group: 'סרטים', number: 203, israeli: true },
  { id: 'dem-movies3', name: 'HOT סרטי פעולה', group: 'סרטים', number: 204, israeli: true },
  { id: 'dem-series1', name: 'HOT סדרות', group: 'סדרות', number: 210, israeli: true },
  { id: 'dem-series2', name: 'yes הדרמה', group: 'סדרות', number: 211, israeli: true },
  { id: 'dem-series3', name: 'HOT קומדיה', group: 'סדרות', number: 212, israeli: true },
  { id: 'dem-kids', name: 'ערוץ הילדים', group: 'ילדים', number: 301, israeli: true },
]

interface DemoRow {
  channelId: string
  title: string
  from: number
  to: number
  categories?: string[]
  description?: string
  isLive?: boolean
  rating?: number
  isNew?: boolean
  season?: number
  episodeNumber?: number
  episode?: string
  year?: number
}

const ROWS: readonly DemoRow[] = [
  // ---- ספורט חי ----
  {
    channelId: 'dem-sport1',
    title: 'כדורגל: מכבי תל אביב - הפועל תל אביב',
    from: -35,
    to: 70,
    categories: ['ספורט', 'כדורגל'],
    description: 'דרבי תל אביבי בליגת העל',
    isLive: true,
  },
  {
    channelId: 'dem-sport2',
    title: 'ליגת העל: הפועל באר שבע - מכבי חיפה',
    from: -12,
    to: 78,
    categories: ['ספורט', 'כדורגל'],
    description: 'מוליכת הטבלה מארחת את האלופה',
    isLive: true,
  },
  {
    channelId: 'dem-sport5',
    title: 'ליגת האלופות: מכבי תל אביב - ריאל מדריד',
    from: -8,
    to: 105,
    categories: ['ספורט', 'כדורגל'],
    description: 'משחק ביתי בליגת האלופות',
    isLive: true,
  },
  {
    channelId: 'dem-one',
    title: 'יורוליג: מכבי תל אביב - ריאל מדריד (כדורסל)',
    from: -20,
    to: 90,
    categories: ['ספורט', 'כדורסל'],
    description: 'יורוליג, מחזור 4',
    isLive: true,
  },
  {
    channelId: 'dem-sport5',
    title: 'ליגת ה-NBA: לוס אנג׳לס לייקרס - בוסטון סלטיקס',
    from: -15,
    to: 95,
    categories: ['ספורט', 'כדורסל'],
    description: 'שידור ישיר: כדורסל. עונת 2026/27',
    isLive: true,
  },
  {
    channelId: 'dem-sport1',
    title: 'ליגה איטלקית: אטאלנטה - ונציה',
    from: -25,
    to: 70,
    categories: ['ספורט', 'כדורגל'],
    description: 'מחזור 7 — מאבק בתחתית',
    isLive: true,
  },
  {
    channelId: 'dem-sport2',
    title: 'הליגה האנגלית: ארסנל - ליברפול',
    from: 80,
    to: 185,
    categories: ['ספורט', 'כדורגל'],
    description: 'מחזור 7 — מוליכות הטבלה נפגשות',
    isLive: false,
  },
  {
    channelId: 'dem-sport1',
    title: 'כדורגל: בני סכנין - מכבי חיפה',
    from: 150,
    to: 260,
    categories: ['ספורט', 'כדורגל'],
    isLive: false,
  },
  {
    channelId: 'dem-sport2',
    title: 'שידור חוזר: הפועל באר שבע - מכבי תל אביב',
    from: 40,
    to: 145,
    categories: ['ספורט', 'כדורגל'],
    description: 'שידור חוזר של משחק העונה',
    isLive: false,
  },

  // ---- סרטים ----
  {
    channelId: 'dem-movies1',
    title: 'סרט: הסנדק',
    from: -20,
    to: 130,
    categories: ['סרט', 'דרמה'],
    description: 'סרט הפשע הקלאסי של פרנסיס פורד קופולה',
    rating: 9.2,
  },
  {
    channelId: 'dem-movies2',
    title: 'סרט: הסנדק',
    from: 90,
    to: 240,
    categories: ['סרט', 'דרמה'],
    rating: 9.2,
  },
  {
    channelId: 'dem-movies3',
    title: 'סרט: 1917',
    from: -10,
    to: 90,
    categories: ['סרט', 'מלחמה'],
    description: 'מותחן מלחמה בבימויו של סם מנדס',
    rating: 8.1,
    year: 2019,
  },
  {
    channelId: 'dem-movies1',
    title: 'סרט: סרט אימה סוג ז׳',
    from: 140,
    to: 240,
    categories: ['סרט', 'אימה'],
    rating: 4.1,
  },

  // ---- סדרות ----
  {
    channelId: 'dem-series1',
    title: 'פאודה',
    from: 15,
    to: 65,
    categories: ['סדרה', 'דרמה'],
    description: 'עונה 3, פרק 4 — סדרת המתח הישראלית עטורת הפרסים',
    rating: 8.7,
    isNew: true,
    season: 3,
    episodeNumber: 4,
    episode: 'S03E04',
  },
  {
    channelId: 'dem-series2',
    title: 'סדרה: שובר שורות',
    from: -25,
    to: 30,
    categories: ['סדרה', 'מותחן'],
    description: 'עונה 5, פרק 12',
    rating: 9.5,
    season: 5,
    episodeNumber: 12,
    episode: 'S05E12',
  },
  {
    channelId: 'dem-series3',
    title: 'סדרה: משהו סתמי לגמרי',
    from: 30,
    to: 90,
    categories: ['סדרה'],
    rating: 3.4,
  },

  // ---- חדשות ----
  {
    channelId: 'dem-ch12',
    title: 'מהדורה ראשית',
    from: -5,
    to: 55,
    categories: ['חדשות', 'אקטואליה'],
    description: 'כל החדשות שהתפתחו היום',
    isLive: true,
  },
  {
    channelId: 'dem-ch13',
    title: 'המהדורה המרכזית',
    from: 10,
    to: 70,
    categories: ['חדשות', 'אקטואליה'],
    isLive: false,
  },
  {
    channelId: 'dem-kan11',
    title: 'מבט',
    from: -3,
    to: 50,
    categories: ['חדשות', 'אקטואליה'],
    isLive: true,
  },
  {
    channelId: 'dem-i24',
    title: 'ראש בראש',
    from: -30,
    to: 30,
    categories: ['חדשות', 'ראיון'],
    isLive: true,
  },
]

function toProgramme(row: DemoRow, now: number, channels: readonly Channel[]): Programme {
  const channel = channels.find((entry) => entry.id === row.channelId)
  const programme: Programme = {
    channelId: row.channelId,
    channelName: channel?.name ?? '',
    title: row.title,
    start: now + row.from * MIN,
    stop: now + row.to * MIN,
    categories: row.categories ?? [],
    isLive: row.isLive ?? (row.from <= 0 && row.to > 0),
  }
  if (row.description) programme.description = row.description
  if (row.rating !== undefined) {
    programme.rating = row.rating
    programme.ratingSystem = 'EPG'
  }
  if (row.isNew) programme.isNew = true
  if (row.season !== undefined) programme.season = row.season
  if (row.episodeNumber !== undefined) programme.episodeNumber = row.episodeNumber
  if (row.episode) programme.episode = row.episode
  if (row.year !== undefined) programme.year = row.year
  return programme
}

/** בונה סנפשוט EPG מדומה ביחס לזמן הנוכחי. */
export function buildDemoSnapshot(now: number = Date.now()): EpgSnapshot {
  return {
    channels: [...DEMO_CHANNELS],
    programmes: ROWS.map((row) => toProgramme(row, now, DEMO_CHANNELS)),
    warnings: [],
  }
}
