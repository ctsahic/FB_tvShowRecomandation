/**
 * מועדפים וידע תוכן: התאמת כותרות שמורות, ספריות "סדרות מומלצות"
 * ותכניות חדשות חשובות. הכל סטטי — עובד גם בלי TMDB ובלי רשת.
 */

/** סדרות מוערכות שמשודרות שוב ושוב בישראל — "סדרה מומלצת" גם בלי ציון. */
export const KNOWN_GOOD_SERIES: readonly string[] = [
  // ישראליות
  'פאודה',
  'טהרן',
  'הנערים',
  'שאט נפש',
  'הבורר',
  'רמזור',
  'צומת מילר',
  'להיות איתה',
  'סברי מרנן',
  'כיפת ברזל',
  'המפקדת',
  'על הספקטרום',
  'קופה ראשית',
  'שעת נעילה',
  'פלפלים יקרים',
  'אבא מטפל',
  'העיר התחתית',
  'קפה עמליה',
  // בינלאומיות
  'שובר שורות',
  'משחקי הכס',
  'הסופרנוס',
  'הסמויה',
  'הכתר',
  'יורשים',
  'דברים מוזרים',
  'בית הנייר',
  'סקוויד גיים',
  'המנדלוריאן',
  'וסטוורלד',
  'פארגו',
  'שרלוק',
  'הומלנד',
  'אבודים',
  'המפץ הגדול',
  'חברים',
  'איך פגשתי את אמא',
  'סיינפלד',
  'המשרד',
  'ברוקלין תשע תשע',
  'טד לאסו',
  'הלוטוס הלבן',
  'המדריך לרוצח',
  'מראה שחורה',
  'דקסטר',
  'הרופא הטוב',
  'אוז',
  'האנטומיה של גריי',
  'חוק וסדר',
  'ncis',
  'הפלאש',
  'גותהאם',
  'המכשף',
  'קאובוי ביבופ',
]

/** סרטים מוערכים שידוע שמשודרים הרבה — אות חיזוק מעל ציון TMDB. */
export const KNOWN_GOOD_MOVIES: readonly string[] = [
  'הסנדק',
  'ספרות זולה',
  'פורסט גאמפ',
  'הנוסע השמיני',
  'פארק היורה',
  'מטריקס',
  'גלדיאטור',
  'שתיקת הכבשים',
  'רוקי',
  'רוברט',
  'האביר האפל',
  'אינטרסטלר',
  'התחלה',
  'מועדון קרב',
  'טיטניק',
  'הנוקמים',
  'ספיידרמן',
  'באטמן',
  'משימה בלתי אפשרית',
  'גיימס בונד',
  'ג\'יימס בונד',
  'מהיר ועצבני',
  'רובוטריקים',
  'שר הטבעות',
  'הארי פוטר',
  'מלחמת הכוכבים',
  'מלך האריות',
  'לשבור את הקרח',
  'הקול בראש',
  'מוצאים את נמו',
  'צעצוע של סיפור',
  'פרזיטים',
  '1917',
  'בלתי נסלח',
  'טרמינל',
]

/** מהדורות ותכניות אקטואליה מרכזיות. */
export const IMPORTANT_NEWS_PROGRAMS: readonly string[] = [
  'מהדורה ראשית',
  'המהדורה המרכזית',
  'מבט',
  'יומן',
  'עובדה',
  'פגוש את העיתונות',
  'חדשות השבוע',
  'השבוע',
  'ריאיון מיוחד',
  'הערב',
  'זה הזמן',
  'שש עם',
  'לילה כלכלי',
  'הדוח',
  'חדשות 12',
  'חדשות 13',
  'המהדורה',
]

/** ערוצי חדשות שנחשבים למקור מהימן בזמן אמת. */
export const IMPORTANT_NEWS_CHANNELS: readonly string[] = [
  'חדשות 12',
  'חדשות 13',
  'כאן 11',
  'כאן 33',
  'ערוץ 14',
  'i24',
  'i24news',
  'ערוץ הכנסת',
  'cnn',
  'bbc',
  'sky news',
  'al jazeera',
  'cnbc',
  'bloomberg',
  'france 24',
  'dw',
  'euronews',
]

const LEADING_LABELS = [
  'סרט ישראלי',
  'סרט',
  'סרטים',
  'סדרה',
  'סדרות',
  'בכורה',
  'שידור חוזר',
  'שידור ישיר',
  'חדש',
  'חדשה',
  'movie',
  'film',
  'series',
  'replay',
  'live',
]

/**
 * מפתח השוואה אחיד לכותרות: מסיר תוויות מובילות, שנים בסוגריים,
 * סימני פיסוק, ומצמצם רווחים. משמש למועדפים ולזיהוי כפילויות.
 */
export function normalizeTitleKey(raw: string): string {
  let out = raw
    .replace(/[\u200e\u200f]/g, '')
    .replace(/\((?:19|20)\d{2}\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/["'׳״.,;:!?()\-–—_/\\|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let changed = true
  while (changed) {
    changed = false
    for (const label of LEADING_LABELS) {
      const pattern = new RegExp(
        `^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:•\\-–]?\\s*`,
        'i',
      )
      if (pattern.test(out)) {
        out = out.replace(pattern, '').trim()
        changed = true
      }
    }
  }
  return out.toLowerCase()
}

function tokens(key: string): string[] {
  return key.split(' ').filter((token) => token.length > 1)
}

/**
 * התאמה סובלנית בין כותרת EPG לרשימה שמורה: קודם כל התאמה מדויקת,
 * ואז הכלה דו-כיוונית, ולבסוף חפיפת מילים משמעותית.
 */
export function matchesContentList(rawTitle: string, list: readonly string[]): boolean {
  const key = normalizeTitleKey(rawTitle)
  if (!key) return false
  for (const entry of list) {
    const target = normalizeTitleKey(entry)
    if (!target) continue
    if (key === target) return true
    if (key.includes(target) || target.includes(key)) {
      if (Math.min(key.length, target.length) >= 4) return true
    }
    const a = tokens(key)
    const b = tokens(target)
    if (a.length > 0 && b.length > 0) {
      const shared = a.filter((token) => b.includes(token)).length
      const ratio = shared / Math.min(a.length, b.length)
      if (ratio >= 0.75 && shared >= 1 && Math.min(a.length, b.length) === shared) return true
    }
  }
  return false
}

export function isFavoriteTitle(rawTitle: string, favorites: readonly string[]): boolean {
  if (favorites.length === 0) return false
  return matchesContentList(rawTitle, favorites)
}

export function isFavoriteChannel(name: string, favorites: readonly string[]): boolean {
  if (!name.trim() || favorites.length === 0) return false
  const key = name.trim().toLowerCase()
  return favorites.some((entry) => {
    const target = entry.trim().toLowerCase()
    return target.length >= 3 && (key === target || key.includes(target) || target.includes(key))
  })
}

export function addToFavorites(list: readonly string[], value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return [...list]
  if (isFavoriteTitle(trimmed, list)) return [...list]
  return [...list, trimmed]
}

export function removeFromFavorites(list: readonly string[], value: string): string[] {
  const key = normalizeTitleKey(value)
  return list.filter((entry) => normalizeTitleKey(entry) !== key)
}

/** "א, ב, ג" → ['א','ב','ג'] — עבור שדות ההגדרות. */
export function parseListInput(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}
