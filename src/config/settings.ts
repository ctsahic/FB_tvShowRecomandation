import type { PreferenceSettings, Settings, SportKind } from '../types'

import {
  DEFAULT_CHANNEL_DELAY_SECONDS,
  DEFAULT_EPG_CHANNEL_IDS,
  MAX_CHANNEL_DELAY_SECONDS,
  MIN_CHANNEL_DELAY_SECONDS,
  normalizeChannelSelection,
} from './channels'

const STORAGE_KEY = 'tv-recommender.settings.v1'

/**
 * ערוצים ישראליים בפאנלים של Xtream בדרך כלל יושבים בקטגוריות בשמות האלה.
 * הן משמשות כברירת מחדל לזיהוי "131 הערוצים הישראליים".
 */
export const DEFAULT_ISRAELI_GROUP_HINTS: string[] = [
  'israel',
  'israeli',
  'ישראל',
  'ישראלי',
  'il',
  'hot',
  'yes',
  'reshet',
  'keshet',
  'kan',
  'sport1',
  'sport 1',
  'צפייה ישירה',
]

/**
 * מפתח Football API (api-football) שמגיע כברירת מחדל.
 *
 * הטבלאות של הליגות הגדולות לא תלויות בו כלל — הן נטענות מ-ESPN החינמי
 * (ר' src/sports/espn.ts) — ולכן המפתח הזה משמש רק כליגת העל/Lיגה הישראלית
 * יכולות לקבל טבלה מ-api-football. במסלול החינמי api-football חסומה לעונה
 * הנוכחית ("Free plans do not have access to this season"), ואז הטבלה
 * נופלת ל-snapshot המקומי. אפשר להחליף את המפתח בכל רגע במסך ההגדרות.
 */
export const DEFAULT_FOOTBALL_API_KEY = 'fff28330fcc88e21d77eaecc2c8bc3e3'

/**
 * מפתח TMDB (v3) שמגיע כברירת מחדל, כדי שסרטים וסדרות יקבלו ציון, תקציר
 * בעברית, ז'אנר ופוסטר בלי שום הקלדה בכל מכשיר. אפשר להחליף בכל רגע במסך
 * ההגדרות, ומפתח ריק מחזיר את ברירת המחדל.
 */
export const DEFAULT_TMDB_API_KEY = 'ba32b2e955b99cab08b84df0fccb79a4'

/**
 * מפתח OMDb שמגיע כברירת מחדל. TMDB לא מספק ציוני IMDb/Rotten Tomatoes,
 * ולכן OMDb משלים אותם לכל כותר שיש לו מזהה IMDb.
 */
export const DEFAULT_OMDB_API_KEY = '9621605'

/**
 * כל הענפים שאפשר לסמן כ"מעניינים אותי", בסדר התצוגה בהגדרות.
 * 'other' אינו ברשימה: הוא לא ענף אלא "לא זוהה", ולכן הוא נשאר מוצג תמיד.
 */
export const SPORT_KINDS: readonly SportKind[] = [
  'football',
  'basketball',
  'tennis',
  'hockey',
  'handball',
  'volleyball',
  'american-football',
  'baseball',
  'motorsport',
  'combat',
]

/**
 * ברירת המחדל של "ענפים שמעניינים אותי": כדורגל, כדורסל וטניס — מה שהמשתמש
 * ביקש לראות. שאר הענפים מסוננים מהטאב עד שיסמן אותם בהגדרות, ורשימה ריקה
 * (ביטול כל הסימונים) משמעה בלי סינון בכלל.
 */
export const DEFAULT_SPORT_KINDS: readonly SportKind[] = [
  'football',
  'basketball',
  'tennis',
]

/** סינון בחירת הענפים לרשימה החוקית, בלי כפילויות ובסדר התצוגה. */
export function normalizeSportKinds(raw: unknown): SportKind[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SPORT_KINDS]
  const selected = new Set(raw.filter((entry): entry is string => typeof entry === 'string'))
  return SPORT_KINDS.filter((kind) => selected.has(kind))
}

/**
 * הגירה מהברירת מחדל הישנה: מי ששמר הגדרות כשעוד היו מסומנים **כל** הענפים
 * לא בחר אותם בעצמו — הוא פשוט קיבל את ברירת המחדל של אז, ולכן הוא עובר
 * לברירת המחדל החדשה (כדורגל, כדורסל, טניס). מי שבחר בעצמו — גם רשימה
 * ארוכה — נשאר עם הבחירה שלו.
 */
function migrateSportKinds(kinds: SportKind[]): SportKind[] {
  return kinds.length === SPORT_KINDS.length ? [...DEFAULT_SPORT_KINDS] : kinds
}

export const DEFAULT_SETTINGS: Settings = {
  provider: {
    // אין שרת EPG בפאנל — לוח השידורים נשלף מאתר המדריך.
    mode: 'antifriz',
    antifrizBase: 'https://antifriz.tv',
    // כתובת הפאנל שהמשתמש ציין. אין כאן סודות — רק שם המארח.
    host: 'bethoven.af.stream.com',
    username: '',
    password: '',
    m3uUrl: '',
    xmltvUrl: '',
    israeliOnly: true,
    israeliGroupHints: DEFAULT_ISRAELI_GROUP_HINTS,
    // ברירת מחדל: שני ערוצים בלבד — הסריקה היומית קצרה ולא מפילה את האתר.
    epgChannelIds: [...DEFAULT_EPG_CHANNEL_IDS],
    channelDelaySeconds: DEFAULT_CHANNEL_DELAY_SECONDS,
  },
  api: {
    tmdbApiKey: DEFAULT_TMDB_API_KEY,
    omdbApiKey: DEFAULT_OMDB_API_KEY,
    footballApiKey: DEFAULT_FOOTBALL_API_KEY,
    footballBaseUrl: 'https://v3.football.api-sports.io',
  },
  prefs: {
    favoriteTeam: 'הפועל באר שבע',
    favoriteSeries: [],
    favoriteMovies: [],
    favoriteChannels: [],
    liveSportsOnly: true,
    // ברירת המחדל: כדורגל, כדורסל וטניס — מה שהמשתמש ביקש לראות.
    sportKinds: [...DEFAULT_SPORT_KINDS],
    // ברירת המחדל: סרטים עם ציון 7 ומעלה בלבד.
    minMovieRating: 7,
    // ברירת המחדל: סרט שמסד הנתונים של הסרטים לא הכיר בכלל לא מוצג.
    hideUnratedMovies: true,
    minSeriesRating: 7,
    includeNews: true,
    lookAheadHours: 8,
    // ברירת המחדל: מה שמשודר עכשיו/הכי קרוב בזמן קודם — לא הציון הגבוה ביותר.
    sortMode: 'time',
    // שעון קבוע בפינה הימנית העליונה; אפשר לכבות אותו בהגדרות.
    showClock: true,
  },
}

export const DEFAULT_PREFS: PreferenceSettings = DEFAULT_SETTINGS.prefs

/**
 * ברירת המחדל של פעם לציון הסרטים. מי ששמר הגדרות בגרסה ההיא לא בחר את
 * הערך הזה בעצמו — הוא פשוט קיבל אותו — ולכן מעבירים אותו לסף החדש
 * ("סרטים עם ציון 7 ומעלה"). מי שבחר ציון אחר, גם נמוך יותר, נשאר עם
 * הבחירה שלו.
 */
const LEGACY_MIN_MOVIE_RATING = 6.8

/** ציון בטווח 0-10; ערך לא תקין נופל לברירת המחדל. */
function normalizeRating(value: unknown, fallback: number): number {
  const rating = Number(value)
  if (!Number.isFinite(rating)) return fallback
  return Math.min(10, Math.max(0, rating))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep-merge stored settings over the defaults so new keys always exist. */
function deepMerge<T>(base: T, patch: unknown): T {
  if (!isRecord(patch)) return base
  if (!isRecord(base)) return patch as T
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch)) {
    const current = out[key]
    if (isRecord(value) && isRecord(current)) {
      out[key] = deepMerge(current, value)
    } else if (value !== undefined) {
      out[key] = value
    }
  }
  return out as T
}

/**
 * העתקה עמוקה של ההגדרות. לא משתמשים ב-structuredClone: בחלק מהטלוויזיות
 * (Skyworth/Android TV) מותקן WebView ישן שבו ה-API הזה פשוט לא קיים,
 * והאפליקציה הייתה מתה מיד עם הפתיחה. ההגדרות הן JSON טהור — JSON מספיק.
 */
export function cloneSettings(source: Settings = DEFAULT_SETTINGS): Settings {
  return JSON.parse(JSON.stringify(source)) as Settings
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneSettings()
    return sanitizeSettings(deepMerge(cloneSettings(), JSON.parse(raw)))
  } catch {
    return cloneSettings()
  }
}

/**
 * תיקון הגדרות שנשמרו: בחירת ערוצים מסוננת לקטלוג בלבד לפי סדר הערוצים,
 * ואם לא נשאר כלום (למשל אחרי שינוי שם slug) חוזרים לברירת המחדל — כדי
 * שלאפליקציה תמיד יהיה מה לסרוק. ההשהיה נחתכת לטווח המותר.
 */
export function sanitizeSettings(settings: Settings): Settings {
  const rawIds = Array.isArray(settings.provider.epgChannelIds)
    ? settings.provider.epgChannelIds.filter((id): id is string => typeof id === 'string')
    : []
  const selection = normalizeChannelSelection(rawIds)
  const delay = Number(settings.provider.channelDelaySeconds)
  return {
    ...settings,
    api: {
      ...settings.api,
      // הגדרות שנשמרו לפני שהמפתח נוסף מכילות מחרוזת ריקה — ואז מאמצים את
      // המפתח שמובנה בגרסה, כדי שלא צריך להקליד אותו מחדש בכל מכשיר.
      footballApiKey: settings.api.footballApiKey.trim() || DEFAULT_FOOTBALL_API_KEY,
      tmdbApiKey: settings.api.tmdbApiKey.trim() || DEFAULT_TMDB_API_KEY,
      omdbApiKey: settings.api.omdbApiKey.trim() || DEFAULT_OMDB_API_KEY,
    },
    prefs: {
      ...settings.prefs,
      minMovieRating: (() => {
        const rating = normalizeRating(
          settings.prefs.minMovieRating,
          DEFAULT_SETTINGS.prefs.minMovieRating,
        )
        return rating === LEGACY_MIN_MOVIE_RATING ? DEFAULT_SETTINGS.prefs.minMovieRating : rating
      })(),
      minSeriesRating: normalizeRating(
        settings.prefs.minSeriesRating,
        DEFAULT_SETTINGS.prefs.minSeriesRating,
      ),
      // ערך חסר/לא-בוליאני → ברירת המחדל (true): סרט בלי ציון ובלי ביקורת
      // לא מוצג. מי שכיבה את הסינון במפורש נשאר איתו כבוי.
      hideUnratedMovies: settings.prefs.hideUnratedMovies !== false,
      // ערך חסר/שגוי (למשל הגדרות שנשמרו לפני שהאפשרות נוספה) → לפי הזמן.
      sortMode: settings.prefs.sortMode === 'score' ? 'score' : 'time',
      // ערך חסר (הגדרות מלפני שהשעון נוסף) → מציגים אותו, כמו ברירת המחדל.
      showClock: settings.prefs.showClock !== false,
      // ענף לא מוכר (למשל מהגדרות מלפני שהאפשרות נוספה) נופל, והבחירה
      // נשמרת בסדר התצוגה — כדי שחתימת הסינון לא תתחלף סתם. רשימה שהיא בדיוק
      // ברירת המחדל הישנה (כל הענפים) מוחלפת בברירת המחדל החדשה.
      sportKinds: migrateSportKinds(normalizeSportKinds(settings.prefs.sportKinds)),
    },
    provider: {
      ...settings.provider,
      epgChannelIds: selection.length > 0 ? selection : [...DEFAULT_EPG_CHANNEL_IDS],
      channelDelaySeconds: Number.isFinite(delay)
        ? Math.min(
            MAX_CHANNEL_DELAY_SECONDS,
            Math.max(MIN_CHANNEL_DELAY_SECONDS, Math.round(delay)),
          )
        : DEFAULT_CHANNEL_DELAY_SECONDS,
    },
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // אחסון מקומי לא זמין — ממשיכים בזיכרון בלבד
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // מתעלמים
  }
}

/** האם יש מספיק פרטים כדי לבצע סריקה. */
export function isProviderConfigured(settings: Settings): boolean {
  const p = settings.provider
  if (p.mode === 'antifriz') {
    return Boolean(p.antifrizBase.trim())
  }
  if (p.mode === 'xtream') {
    return Boolean(p.host.trim() && p.username.trim() && p.password.trim())
  }
  return Boolean(p.m3uUrl.trim() && p.xmltvUrl.trim())
}
