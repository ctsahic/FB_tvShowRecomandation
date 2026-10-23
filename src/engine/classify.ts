import type { Category, Channel, Programme, SportKind } from '../types'
import {
  ISRAELI_TEAMS,
  canonicalTeam,
  detectCompetition,
  detectSport,
  normalizeTeamName,
} from '../sports/teams'
import { hebrewNameFor } from '../sports/teamNames'

export type { SportKind }


export interface Classification {
  category: Category
  /** 0..1 — כמה בטוחים בסיווג. */
  confidence: number
  sport: SportKind
  competition?: string
  homeTeam?: string
  awayTeam?: string
  /** שידור חוזר ולא שידור ישיר. */
  isReplay: boolean
  /**
   * האם זו תכנית ספורט שהיא באמת משחק — שני צדדים ("מכבי חיפה - הפועל חיפה").
   * תכניות אולפן ומגזין ("אולפן ליגת העל", "סיכום המחזור") אינן משחק, גם
   * כשהן משודרות בשידור ישיר. רלוונטי רק לקטגוריית `sport`.
   */
  isMatch: boolean
}

interface KeywordRule {
  category: Category
  weight: number
  words: readonly string[]
}

/**
 * מילות מפתח לסיווג. העברית של ספקי ה-EPG בישראל אינה אחידה
 * (למשל "סרט" / "סרטים" / "קולנוע"), ולכן כל קטגוריה מחזיקה כמה מילים.
 */
const CATEGORY_RULES: readonly KeywordRule[] = [
  {
    category: 'sport',
    weight: 3,
    words: [
      'ספורט',
      'כדורגל',
      'כדורסל',
      'טניס',
      'שחייה',
      'מרוץ',
      'פורמולה',
      'הוקי',
      'כדוריד',
      'כדורעף',
      'פוטבול',
      'בייסבול',
      'nhl',
      'mlb',
      'atp',
      'wta',
      'אופניים',
      'אולימפי',
      'מונדיאל',
      'ליגת',
      'גביע',
      'מכבי',
      'הפועל',
      'בית"ר',
      'משחק',
      'sport',
      'football',
      'soccer',
      'basketball',
      'nba',
      'euroleague',
      'ufc',
      'nfl',
      'eurosport',
      'vamos',
    ],
  },
  {
    category: 'movie',
    weight: 3,
    words: [
      'סרט',
      'סרטים',
      'קולנוע',
      'film',
      'movie',
      'סרט תיעודי',
      'סרט ישראלי',
      'הוליוודי',
      'סרט אימה',
      'סרט פעולה',
      'סרט דרמה',
      'movies',
      'cinema',
      'movie channel',
    ],
  },
  {
    category: 'series',
    weight: 3,
    words: [
      'סדרה',
      'סדרות',
      'episode',
      'series',
      'עונה',
      'פרק',
      'טלנובלה',
      'אופרת סבון',
      'ריאליטי',
      'תוכנית מציאות',
      'soap',
      'sitcom',
      'drama',
      'telenovela',
      'דרמה',
      'קומדיה',
      'מותחן',
      'מדע בדיוני',
      'פנטזיה',
      'פשע',
      'מתח',
    ],
  },
  {
    category: 'news',
    weight: 3,
    words: [
      'חדשות',
      'אקטואליה',
      'אקטואלי',
      'מבזק',
      'news',
      'כלכלה',
      'תחקיר',
      'עיתונות',
      'ראיון',
      'מהדורה',
      'יומן',
      'כותרות',
      'i24',
    ],
  },
  {
    category: 'kids',
    weight: 3,
    words: [
      'ילדים',
      'ילד',
      'נוער',
      'אנימציה',
      'מצויר',
      'kids',
      'cartoon',
      'אנימה',
      'משפחה',
      'disney',
      'nickelodeon',
      'nick jr',
      'teennick',
      'junior',
    ],
  },
]

const REPLAY_MARKERS: readonly string[] = [
  'שידור חוזר',
  'שידור חוזרת',
  'משחק חוזר',
  'הקלטה',
  'replay',
  'rerun',
  // "ש.ח." = שידור חוזר — הסימון של ספק ה-EPG בסוף התקציר.
  'ש.ח.',
  'ש"ח',
]

/**
 * קבוצת הערוץ היא הרמז החוזק ביותר כשהיא קיימת. ערוץ שמוגדר "סרטים" משדר
 * סרטים גם אם הכותרת לא מכילה את המילה "סרט" — בדיוק המקרה של לוח השידורים
 * של antifriz, שמספק רק כותרת ותקציר בלי קטגוריה.
 */
const GROUP_CATEGORY: ReadonlyArray<{ label: string; category: Category }> = [
  // "סרטי ילדים" לפני "ילדים": קבוצת הערוץ הזו מכילה את שתי המילות, והערוץ
  // הוא ערוץ סרטים לילדים — לא ערוץ ילדים כללי.
  { label: 'סרטי ילדים', category: 'movie-kids' },
  { label: 'ספורט', category: 'sport' },
  { label: 'סרטים', category: 'movie' },
  { label: 'סדרות', category: 'series' },
  { label: 'ילדים', category: 'kids' },
  { label: 'חדשות', category: 'news' },
]

const GROUP_WEIGHT = 9

/** תקציר סרט מכיל קרדיטים ("בימוי:", "במאית:") — סימן כמעט ודאי לסרט. */
const MOVIE_CREDIT_MARKERS: readonly string[] = ['בימוי', 'במאית', 'פרסי אופיר']
const MOVIE_CREDIT_WEIGHT = 7

/**
 * סימנים של תוכן לילדים/משפחה. "סרט ילדים" = סרט (movie) שיש בו את הסימנים
 * האלה — ולכן הוא לא נבלע ב„סרטים” של המבוגרים.
 */
const KIDS_MOVIE_MARKERS: readonly string[] = [
  'ילדים',
  'ילד',
  'אנימציה',
  'מצויר',
  'cartoon',
  'animation',
  'animated',
  'pixar',
  'dreamworks',
  'disney',
  'משפחה',
  'family',
]

/**
 * האם הסרט הוא לילדים/משפחה — לפי הז׳אנרים מ-TMDB.
 *
 * זה הזיהוי המדויק ביותר: כותרת כמו „מואנה” או „שרק” לא אומרת כלום לבד, אבל
 * TMDB מסמן אותן כאנימציה/משפחה. הז׳אנרים מגיעים בעברית.
 */
export function isKidsMovieGenre(genres: readonly string[] | undefined): boolean {
  if (!genres || genres.length === 0) return false
  const text = normalizeForMatch(genres.join(' '))
  return KIDS_MOVIE_MARKERS.some((marker) => containsKeyword(text, normalizeForMatch(marker)))
}

const EPISODE_CODE_RE = /\bS\s?\d{1,2}\s?[\s.x-]?\s?E\s?\d{1,3}\b/i
const SEASON_WORD_RE = /(?:עונה|season)\s*\d+/i

/** Lowercase, drop quotes/geresh and collapse whitespace for keyword tests. */
export function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .replace(/["'׳״]/g, '')
    .replace(/[\u200e\u200f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Splits a title on the separators Israeli EPGs use between two teams. */
const TEAM_SEPARATOR_RE = /\s+(?:-|–|—|נגד|מול|vs\.?|v\.?)\s+/gi

/**
 * תוויות הפתיחה של המדריך. "ישיר!" הוא התווית הנפוצה של antisraz לשידורים
 * ישירים ("ישיר! אטאלנטה - ונציה") — ובלעדיה הכותרת נכנסת לפיצול *כולל*
 * המילה "ישיר", ואז אף קבוצה לא מזוהה.
 */
const TITLE_PREFIX_RE =
  /^(?:כדורגל|כדורסל|ספורט|שידור ישיר|בשידור ישיר|ישיר|שידור חוזר|ליגת העל|ליגת האלופות|הליגה האירופית|גביע המדינה|משחק|live|replay)\s*[:•\-–!]\s*/i

/**
 * ניקוי צד של משחק מתוויות וסוגריים: "אל נאסר (רונאלדו)" -> "אל נאסר".
 * הסוגריים במדריך מחזיקים הערות ("(כדורסל)", "(שידור ישיר)") ולא חלק מהשם.
 */
function cleanTeamSide(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    // מילת פתיחה של תכנית שנדבקה לצד ("לקראת מ. פ''ת - מכבי חיפה") — בלעדיה
    // שם הקבוצה לא מזוהה והכרטיס מציג "אין נתוני טבלה".
    .replace(/^(?:לקראת|משחק|שידור ישיר|ישיר)\s+/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** תוויות שאינן שם של קבוצה אלא של תכנית/מחזור. */
const SIDE_REJECT_RE = /^(?:מחזור|שעה|יום|עונה|לוח|תקציר|שידור|ישיר|live|replay)\b/i

/** האם הצד הזה נראה כמו שם של קבוצה (ולא תכנית אולפן או מספר). */
function isPlausibleTeamSide(side: string): boolean {
  if (!side) return false
  if (SIDE_REJECT_RE.test(side)) return false
  if (SPORT_SHOW_MARKERS.some((marker) => containsKeyword(side.toLowerCase(), marker))) {
    return false
  }
  const letters = side.replace(/[^\p{L}\p{N}]/gu, '')
  return letters.length >= 2 && letters.length <= 40
}

/** All canonical Israeli clubs whose name appears in the text. */
export function extractTeams(text: string): string[] {
  const normalized = normalizeTeamName(text)
  if (!normalized) return []
  const found: string[] = []
  for (const team of ISRAELI_TEAMS) {
    const needle = normalizeTeamName(team)
    if (!needle) continue
    if (normalized.includes(needle) && !found.includes(team)) found.push(team)
  }
  return found
}

/**
 * זיהוי שתי הקבוצות מתוך כותרת המשחק. מנסה קודם פיצול לפי מפרידים
 * (הפורמט הנפוץ: "מכבי תל אביב - מכבי חיפה"), ואם לא הצליח — סריקה
 * של שמות קבוצות מוכרות בתוך הטקסט.
 *
 * `sport` נחוץ כדי לא להלביש שם של מועדון כדורגל על משחק בענף אחר
 * ("מ. אשדוד" בכדורעף אינה "מ.ס. אשדוד" של הכדורגל).
 */
export function parseMatchTeams(
  title: string,
  sport?: SportKind,
): { home: string; away: string } | null {
  const cleaned = title.replace(TITLE_PREFIX_RE, '')
  const sides = cleaned
    .split(TEAM_SEPARATOR_RE)
    .map(cleanTeamSide)
    .filter((side) => side.length > 0)

  if (sides.length >= 2) {
    const home = sides[0]
    const away = sides[1]
    if (!isPlausibleTeamSide(home) || !isPlausibleTeamSide(away)) return null
    // קבוצה מוכרת מקבלת את השם הקנוני, ואחר כך את השם מהמפה (כדי ש"ה. י-ם"
    // יהיה "הפועל ירושלים"). קבוצה בלתי מוכרת נשארת בשם מהמדריך — ומשם מפת
    // השמות מוצאת את השורה בטבלה שבאנגלית.
    return { home: canonicalHebrew(home, sport), away: canonicalHebrew(away, sport) }
  }

  const scanned = extractTeams(cleaned)
  if (scanned.length >= 2) return { home: scanned[0], away: scanned[1] }
  return null
}

/**
 * שם תקני לקבוצה: קודם הרשימות הישראליות, ואם לא — מפת ההמרה עברית↔אנגלית.
 *
 * הרשימות האלה הן של מועדוני כדורגל וכדורסל ישראליים בלבד, ולכן בענף אחר
 * לא נוגעים בשם: "מכבי אשדוד" בכדורעף היא קבוצת כדורעף, ואילו "מ.ס. אשדוד"
 * היא מועדון כדורגל — החלפה ביניהן היא פשוט טעות.
 */
function canonicalHebrew(name: string, sport?: SportKind): string {
  if (sport && sport !== 'football' && sport !== 'basketball') return name
  return canonicalTeam(name) ?? hebrewNameFor(name) ?? name
}

/*
 * תכניות אולפן/מגזין — לא משחק. בלעדי הרשימה הזו "אולפן ליגת העל - סיכום
 * המחזור" היה נראה כמו משחק, כי גם לו יש שני צדדים משני עברי המפריד.
 */
const SPORT_SHOW_MARKERS: readonly string[] = [
  'אולפן',
  'מגזין',
  'סיכום',
  'פינת',
  'תכנית',
  'תוכנית',
  'משדר',
  'פאנל',
  'דיון',
  'ראיון',
  // "ONE Podcasts - ברצלונה" הוא פודקאסט על המשחק, לא המשחק עצמו.
  // (ההתאמה דורשת גבול מילה, ולכן שתי הצורות — יחיד ורבים.)
  'podcast',
  'podcasts',
  'פודקאסט',
  'studio',
  'magazine',
  'highlights',
]

/**
 * האם הכותרת היא משחק: שני צדדים משני עברי מפריד ("א - ב", "א נגד ב").
 *
 * קודם מנסים לזהות שתי קבוצות מוכרות; אם לא (למשל משחק בליגת האלופות בין
 * קבוצות חוץ) — מסתפקים בכך שהכותרת מפוצלת לשני צדדים של ממש. תכנית בעלת
 * צד אחד ("אולפן ליגת העל") אינה עוברת את הבדיקה הזו.
 */
export function hasMatchShape(title: string): boolean {
  if (parseMatchTeams(title)) return true
  const cleaned = title.replace(TITLE_PREFIX_RE, '')
  const sides = cleaned
    .split(TEAM_SEPARATOR_RE)
    .map((side) => side.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((side) => side.length >= 2)
  return sides.length >= 2
}

/**
 * פרומו למשחק — "ישיר! לקראת מ. פ''ת - מכבי חיפה".
 *
 * המדריך משדר הקדמה קצרה רגע לפני המשחק עצמו, והמשחק עצמו משודר אחר כך
 * כשידור נפרד. הכותרת של הפרומו נפתחת ב„לקראת” (ופעמים רבות גם ב„ישיר!”),
 * ואם היא מכילה זוג קבוצות היא נראית בדיוק כמו משחק — ולכן אותו משחק הופיע
 * פעמיים ברשימת ההמלצות. השורה הזו מסוננת ולא מומלצת.
 */
const MATCH_PREVIEW_RE = /^לקראת\s/u

export function isMatchPreview(title: string): boolean {
  return MATCH_PREVIEW_RE.test(title.replace(TITLE_PREFIX_RE, '').trim())
}

/** האם הכותרת היא תכנית אולפן/מגזין ולא משחק. */
function isSportShow(titleText: string): boolean {
  return SPORT_SHOW_MARKERS.some((marker) => containsKeyword(titleText, marker))
}

function addScores(scores: Record<Category, number>, category: Category, amount: number): void {
  scores[category] += amount
}

const HEBREW_LETTER = /[\u0590-\u05FF]/
const LATIN_WORD = /^[a-z0-9 ]+$/

/**
 * התאמת מילת מפתח בגבולות מילה.
 * הסיבה: `includes('סרט')` תופס גם "סרטון" ו-`includes('משחק')` תופס
 * גם "משחקי הכס". לכן דורשים שההתאמה לא תיגע באות עברית נוספת,
 * ובמילים לטיניות — בגבול מילה רגיל.
 */
function containsKeyword(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    const before = index > 0 ? haystack[index - 1] : ''
    const after = index + needle.length < haystack.length ? haystack[index + needle.length] : ''
    const touchesHebrew = HEBREW_LETTER.test(before) || HEBREW_LETTER.test(after)
    if (!touchesHebrew) {
      if (LATIN_WORD.test(needle)) {
        if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true
      } else {
        return true
      }
    }
    index = haystack.indexOf(needle, index + 1)
  }
  return false
}

export function classifyProgramme(programme: Programme, channel?: Channel): Classification {
  const titleText = normalizeForMatch(programme.title)
  const descText = normalizeForMatch(programme.description ?? '')
  const categoryText = normalizeForMatch(programme.categories.join(' '))
  const channelText = normalizeForMatch(`${programme.channelName} ${channel?.group ?? ''}`)
  const fullText = `${titleText} ${categoryText} ${descText}`

  const scores: Record<Category, number> = {
    sport: 0,
    movie: 0,
    'movie-kids': 0,
    series: 0,
    news: 0,
    kids: 0,
    other: 0,
  }

  for (const rule of CATEGORY_RULES) {
    for (const word of rule.words) {
      const needle = normalizeForMatch(word)
      if (!needle) continue
      if (containsKeyword(categoryText, needle)) addScores(scores, rule.category, rule.weight * 1.5)
      if (containsKeyword(titleText, needle)) addScores(scores, rule.category, rule.weight)
      else if (containsKeyword(descText, needle)) {
        addScores(scores, rule.category, rule.weight * 0.5)
      }
      if (containsKeyword(channelText, needle)) {
        addScores(scores, rule.category, rule.weight * 0.5)
      }
    }
  }

  // קבוצת הערוץ — הרמז החזק ביותר.
  const groupText = normalizeForMatch(channel?.group ?? '')
  // רק ההתאמה הראשונה (הספציפית ביותר) נספרת: „סרטי ילדים” מכיל גם את
  // „ילדים”, ובלי העצירה הזו ערוץ סרטי ילדים קיבל נקודות גם לסרטי ילדים וגם
  // לערוץ ילדים — ואז סווג כ„ילדים” לפי מילות המפתח של שם הערוץ.
  for (const entry of GROUP_CATEGORY) {
    if (groupText.includes(entry.label)) {
      addScores(scores, entry.category, GROUP_WEIGHT)
      break
    }
  }

  // תקציר עם קרדיטים של בימוי הוא סרט, גם בלי המילה "סרט".
  if (MOVIE_CREDIT_MARKERS.some((marker) => containsKeyword(descText, marker))) {
    addScores(scores, 'movie', MOVIE_CREDIT_WEIGHT)
  }

  // תוויות מפורשות בכותרת הן הרמז החזק ביותר.
  // הערה: \b של JS לא עובד אחרי אות עברית (היא לא \w), לכן בודקים במפורש
  // שאין אות עברית מיד אחרי התווית — כדי לא לתפוס "סרטון".
  if (/^סרט(?![\u0590-\u05FF])/.test(titleText)) addScores(scores, 'movie', 6)
  if (/^סדרה(?![\u0590-\u05FF])/.test(titleText)) addScores(scores, 'series', 6)
  if (/^בכורה(?![\u0590-\u05FF])/.test(titleText)) addScores(scores, 'movie', 2)

  if (programme.episode || (programme.season ?? 0) > 0 || EPISODE_CODE_RE.test(titleText)) {
    addScores(scores, 'series', 8)
  } else if (SEASON_WORD_RE.test(titleText)) {
    addScores(scores, 'series', 4)
  }

  const sport = detectSport(fullText)
  if (sport !== 'other') {
    addScores(scores, 'sport', 8)
    // קבוצה מזוההת בכותרת = כמעט בוודאות משחק
    if (extractTeams(programme.title).length >= 1) addScores(scores, 'sport', 6)
  }

  const isReplay = REPLAY_MARKERS.some(
    (marker) => titleText.includes(marker) || descText.includes(marker),
  )

  const priority: Category[] = [
    'sport',
    'series',
    'movie',
    'movie-kids',
    'news',
    'kids',
    'other',
  ]
  let best: Category = 'other'
  let bestScore = 0
  for (const category of priority) {
    if (scores[category] > bestScore) {
      bestScore = scores[category]
      best = category
    }
  }

  const matchTeams = best === 'sport' ? parseMatchTeams(programme.title, sport) : null
  const confidence = Math.max(0, Math.min(1, bestScore / 14))
  // פרומו למשחק אינו המלצה: המשחק עצמו מומלץ בנפרד.
  const preview = best === 'sport' && isMatchPreview(programme.title)

  /*
   * סרט ילדים: מספיק אחד מהשניים — ערוץ שמוגדר „סרטי ילדים”, או סרט עם
   * סימן ילדים בטקסט. סדרת אנימציה אינה סרט, ולכן עונה/פרק מבטלים את הסיווג.
   * ספורט וחדשות לא נכנסים לכאן בכלל.
   */
  const hasEpisode = Boolean(
    programme.episode || (programme.season ?? 0) > 0 || EPISODE_CODE_RE.test(titleText),
  )
  const kidsMovieText = `${titleText} ${descText} ${categoryText} ${groupText}`
  const kidsMarker = KIDS_MOVIE_MARKERS.some((marker) =>
    containsKeyword(kidsMovieText, normalizeForMatch(marker)),
  )
  const movieTone =
    best === 'movie' ||
    best === 'movie-kids' ||
    scores.movie >= 6 ||
    /^סרט(?![\u0590-\u05FF])/.test(titleText) ||
    MOVIE_CREDIT_MARKERS.some((marker) => containsKeyword(descText, marker))
  const kidsMovie =
    best === 'movie-kids' ||
    (!hasEpisode && best !== 'series' && best !== 'sport' && best !== 'news' && movieTone && kidsMarker)

  const classification: Classification = {
    category: preview
      ? 'other'
      : kidsMovie
        ? 'movie-kids'
        : bestScore > 0
          ? best
          : 'other',
    confidence,
    sport,
    isReplay,
    isMatch:
      best === 'sport' && !preview && !isSportShow(titleText) && hasMatchShape(programme.title),
  }
  const competition = detectCompetition(fullText)
  if (competition) classification.competition = competition
  if (matchTeams) {
    classification.homeTeam = matchTeams.home
    classification.awayTeam = matchTeams.away
  }
  return classification
}

/** האם התכנית משודרת כרגע. */
export function isOnAir(programme: Programme, now: number): boolean {
  return programme.start <= now && now < programme.stop
}
