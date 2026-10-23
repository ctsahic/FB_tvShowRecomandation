/**
 * ידע תחום על הכדורגל הישראלי: שמות קבוצות, כינויים, דרביים ויריבויות,
 * וזיהוי מסגרות וענפי ספורט מתוך טקסט חופשי של ה-EPG.
 *
 * כל הידע כאן סטטי ומקומי — הוא עובד גם בלי שום מפתח API.
 */

import type { SportKind } from '../types'

/** הקבוצות בליגת העל (snapshot של 14 קבוצות). */
export const ISRAELI_TEAMS: readonly string[] = [
  'מכבי תל אביב',
  'הפועל באר שבע',
  'מכבי חיפה',
  'בית"ר ירושלים',
  'מכבי נתניה',
  'הפועל תל אביב',
  'הפועל חיפה',
  'מכבי פתח תקווה',
  'בני סכנין',
  'עירוני קריית שמונה',
  'מ.ס. אשדוד',
  'מכבי בני ריינה',
  'הפועל חדרה',
  'עירוני טבריה',
]

/**
 * הקבוצות שמשחקות העונה בליגה הלאומית (הליגה השנייה) — לפי הטבלה החיה של
 * ONE. הרשימה נחוצה כדי שקבוצה מהליגה השנייה לא תיחשב לקבוצת ליגת העל רק
 * מפני שהיא מוכרת ("מ.ס. אשדוד" שירדה ליגה), וכדי שטבלת הליגה הלאומית
 * תוצג למשחק שלה.
 */
export const LEUMIT_TEAMS: readonly string[] = [
  'מ.ס. אשדוד',
  'בני יהודה תל אביב',
  'הפועל ראשון לציון',
  'עירוני קריית ים',
  'הפועל עפולה',
  'הפועל כפר שלם',
  'הפועל רעננה',
  'מ.ס. כפר קאסם',
  'מכבי בני ריינה',
  'עירוני מודיעין',
  'מכבי קריית גת',
  'מכבי אחי נצרת',
  'מכבי הרצליה',
  'הפועל כפר סבא',
  'מכבי יפו',
  'הפועל עכו',
]

export const NATIONAL_TEAM = 'נבחרת ישראל'

interface ClubRecord {
  name: string
  aliases: string[]
}

/**
 * 14 קבוצות ליגת העל. שאר המועדונים נמצאים ב-OTHER_CLUBS כדי שכינויים
 * שלהם יזוהו גם כשלא מדובר בליגת העל (גביע, ליגה לאומית, יריבות).
 */
const LEAGUE_CLUBS: ClubRecord[] = [
  {
    name: 'מכבי תל אביב',
    aliases: ['מכבי ת"א', 'מכבי תא', 'מכבי תל-אביב', 'maccabi tel aviv', 'maccabi tlv', 'maccabi tel-aviv'],
  },
  {
    name: 'הפועל באר שבע',
    aliases: [
      'הפועל ב"ש',
      'הפועל בש',
      'ה. ב״ש',
      'ב"ש',
      'באר שבע',
      'הפועל באר-שבע',
      "hapoel be'er sheva",
      'hapoel beer sheva',
      'hapoel beer-sheva',
      "hapoel be'er-sheva",
    ],
  },
  {
    name: 'מכבי חיפה',
    aliases: ['מכבי חיפה', 'חיפה', 'maccabi haifa', 'maccabi haifa fc'],
  },
  {
    name: 'בית"ר ירושלים',
    aliases: ['בית"ר', 'ביתר', 'בית"ר י-ם', 'beitar jerusalem', 'beitar', 'beit tar jerusalem'],
  },
  {
    name: 'מכבי נתניה',
    aliases: ['נתניה', 'maccabi netanya', 'netanya'],
  },
  {
    name: 'הפועל תל אביב',
    aliases: ['הפועל ת"א', 'הפועל תא', 'הפועל תל-אביב', 'hapoel tel aviv', 'hapoel tlv'],
  },
  {
    name: 'הפועל חיפה',
    aliases: ['הפועל חיפה', 'hapoel haifa'],
  },
  {
    name: 'מכבי פתח תקווה',
    aliases: ['מכבי פ"ת', 'מכבי פת', 'פתח תקווה', 'maccabi petah tikva', 'maccabi petach tikva'],
  },
  {
    name: 'בני סכנין',
    aliases: ['סכנין', 'bnei sakhnin', 'bnei saknin', 'sakhnin'],
  },
  {
    name: 'עירוני קריית שמונה',
    aliases: [
      'קריית שמונה',
      'קרית שמונה',
      'עירוני קרית שמונה',
      // הקיצור שמופיע בטבלה של ONE ("עירוני ק\"ש").
      'עירוני ק"ש',
      'ק"ש',
      'ironi kiryat shmona',
      'kiryat shmona',
    ],
  },
  {
    name: 'מ.ס. אשדוד',
    aliases: ['אשדוד', 'מכבי אשדוד', 'מ.ס אשדוד', 'fc ashdod', 'ashdod'],
  },
  {
    name: 'מכבי בני ריינה',
    aliases: ['בני ריינה', 'ריינה', 'maccabi bnei reineh', 'bnei reineh', 'reineh'],
  },
  {
    name: 'הפועל חדרה',
    aliases: ['חדרה', 'hapoel hadera', 'hadera'],
  },
  {
    name: 'עירוני טבריה',
    aliases: ['טבריה', 'ironi tiberias', 'tiberias'],
  },
]

/** מועדונים נוספים (ליגה לאומית / היסטוריים) — כדי שכינויים שלהם יזוהו. */
const OTHER_CLUBS: ClubRecord[] = [
  { name: 'הפועל ירושלים', aliases: ['הפועל י-ם', 'הפועל ירושלים', 'hapoel jerusalem'] },
  { name: 'מכבי ירושלים', aliases: ['מכבי י-ם', 'maccabi jerusalem'] },
  { name: 'עירוני נוף הגליל', aliases: ['נוף הגליל', 'ironi nof hagalil'] },
  { name: 'הפועל פתח תקווה', aliases: ['הפועל פ"ת', 'hapoel petah tikva', 'hapoel petach tikva'] },
  {
    name: 'הפועל ראשון לציון',
    aliases: ['הפועל ר"ל', 'הפועל ראשל"צ', 'ראשל"צ', 'hapoel rishon lezion'],
  },
  { name: 'סקציה נס ציונה', aliases: ['נס ציונה', 'sectzia ness ziona'] },
  { name: 'הפועל עכו', aliases: ['עכו', 'hapoel acre'] },
  {
    name: 'מכבי הרצליה',
    aliases: ['הרצליה', 'מ. הרצליה', 'maccabi herzliya'],
    // מ.ס. הרצליה מהטבלה של ONE
  },
  { name: 'הפועל רמת גן', aliases: ['רמת גן', 'הפועל ר"ג', 'hapoel ramat gan'] },
  {
    name: 'הפועל רעננה',
    aliases: ['רעננה', 'ה. רעננה', 'hapoel raanana'],
    // ONE כותב "הפועל רעננה", המדריך כותב גם "ה. רעננה".
  },
  { name: 'מכבי יבנה', aliases: ['יבנה', 'maccabi yavne'] },

  /* ------------------ הליגה הלאומית (הליגה השנייה) ------------------ */
  { name: 'בני יהודה תל אביב', aliases: ['בני יהודה', 'bnei yehuda', 'bnei yehuda tel aviv'] },
  {
    name: 'עירוני קריית ים',
    aliases: ['קריית ים', 'קרית ים', 'מ.ס קריית ים', 'מ.ס. קריית ים', 'kiryat yam'],
  },
  { name: 'הפועל עפולה', aliases: ['עפולה', 'hapoel afula'] },
  {
    name: 'הפועל כפר שלם',
    aliases: ['כפר שלם', 'הפועל כ. שלם', 'hapoel kfar shalem'],
  },
  {
    name: 'מ.ס. כפר קאסם',
    aliases: ['כפר קאסם', 'מ.ס כפר קאסם', 'ms kafr qasim', 'kafr qasim'],
  },
  { name: 'עירוני מודיעין', aliases: ['מודיעין', 'ironi modiin'] },
  {
    name: 'מכבי קריית גת',
    aliases: ['מ. קריית גת', 'קריית גת', 'קרית גת', 'kiryat gat'],
  },
  {
    name: 'מכבי אחי נצרת',
    aliases: ['מכבי נצרת', 'מ. נצרת', 'maccabi ahi nazareth', 'm. nazareth'],
  },
  { name: 'הפועל כפר סבא', aliases: ['כפר סבא', 'הפועל כפ"ס', 'hapoel kfar saba'] },
  { name: 'מכבי יפו', aliases: ['יפו', 'maccabi jaffa'] },
]

const ALL_CLUBS: ClubRecord[] = [...LEAGUE_CLUBS, ...OTHER_CLUBS]

/** ניקוי שם קבוצה: הסרת גרשיים, פיסוק ורווחים כפולים. */
export function normalizeTeamName(raw: string): string {
  return raw
    .replace(/["'\u05F3\u05F4`´]/g, '')
    .replace(/[.,:;!?()\[\]{}_\/\\|–—+*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** מפת כינויים מנורמלים -> שם קנוני. */
const ALIAS_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>()
  for (const club of ALL_CLUBS) {
    index.set(normalizeTeamName(club.name), club.name)
    for (const alias of club.aliases) {
      const key = normalizeTeamName(alias)
      // כינוי ראשון מנצח — מונע דריסה בין קבוצות שונות בעלות כינוי זהה.
      if (key && !index.has(key)) index.set(key, club.name)
    }
  }
  // 'חיפה' הוא כינוי דו-משמעי (מכבי חיפה / הפועל חיפה) — ברירת המחדל היא מכבי חיפה.
  index.set('חיפה', 'מכבי חיפה')
  return index
})()

/** מחזיר את השם הקנוני של הקבוצה, או null אם לא זוהתה. */
export function canonicalTeam(raw: string): string | null {
  if (!raw || !raw.trim()) return null
  const normalized = normalizeTeamName(raw)
  if (!normalized) return null
  const direct = ALIAS_INDEX.get(normalized)
  if (direct) return direct

  // ניסיון שני: השם מכיל כינוי מוכר (למשל "הפועל באר שבע (כדורגל)").
  if (normalized.length >= 6) {
    let best: { name: string; length: number } | null = null
    for (const [alias, name] of ALIAS_INDEX) {
      if (alias.length < 5) continue
      if (!normalized.includes(alias)) continue
      if (!best || alias.length > best.length) best = { name, length: alias.length }
    }
    if (best) return best.name
  }
  return null
}

/** האם מדובר באותה קבוצה (סובלני לשמות ולכינויים). */
export function isSameTeam(a: string, b: string): boolean {
  if (!a || !b) return false
  const canonA = canonicalTeam(a)
  const canonB = canonicalTeam(b)
  if (canonA && canonB) return canonA === canonB
  const na = normalizeTeamName(a)
  const nb = normalizeTeamName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  // אם רק צד אחד זוהה — לא משלימים לפי "מכיל", כדי לא להתבלבל בין קבוצות.
  if (canonA || canonB) return false
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na]
  return short.length >= 4 && long.includes(short)
}

export interface Rivalry {
  label: string
  teams: readonly [string, string]
  /** 0..1 — 1 הוא המשחק הכי טעון. */
  intensity: number
  note: string
}

/** הדרביים והיריבויות המרכזיות בכדורגל הישראלי. */
export const RIVALRIES: readonly Rivalry[] = [
  {
    label: 'דרבי תל אביבי',
    teams: ['מכבי תל אביב', 'הפועל תל אביב'],
    intensity: 0.95,
    note: 'היריבות הגדולה בכדורגל הישראלי — אווירה חשמלית ועימותים ביציעים',
  },
  {
    label: 'הקלאסיקו הישראלי',
    teams: ['מכבי תל אביב', 'מכבי חיפה'],
    intensity: 0.9,
    note: 'מפגש שתי הקבוצות הגדולות — כמעט תמיד מכריע מאבקי אליפות',
  },
  {
    label: 'דרבי ירושלים',
    teams: ['בית"ר ירושלים', 'הפועל ירושלים'],
    intensity: 0.85,
    note: 'דרבי בירתי טעון עם יציעים מלאים וקהל לוהט',
  },
  {
    label: 'משחק העונה',
    teams: ['הפועל באר שבע', 'מכבי תל אביב'],
    intensity: 0.85,
    note: 'היריבות הכי חמה של השנים האחרונות — שני מועדונים בקצב אליפות',
  },
  {
    label: 'דרבי חיפה',
    teams: ['מכבי חיפה', 'הפועל חיפה'],
    intensity: 0.8,
    note: 'דרבי עירוני בצפון — גאווה מקומית בין הירוקים לאדומים',
  },
  {
    label: 'יריבות הצמרת',
    teams: ['בית"ר ירושלים', 'מכבי תל אביב'],
    intensity: 0.8,
    note: 'שתי אימפריות עם עבר טעון ומפגשים חמים במיוחד',
  },
  {
    label: 'מאבק פסגה',
    teams: ['מכבי חיפה', 'הפועל באר שבע'],
    intensity: 0.75,
    note: 'מפגש בין שתי קבוצות צמרת שמתחרות על מקום באירופה',
  },
  {
    label: 'דרבי הצפון',
    teams: ['בני סכנין', 'מכבי חיפה'],
    intensity: 0.65,
    note: 'משחק עם מטען רגשי וקהל רב מהמגזר',
  },
  {
    label: 'דרבי הדרום',
    teams: ['הפועל באר שבע', 'מ.ס. אשדוד'],
    intensity: 0.6,
    note: 'יריבות דרומית בין שתי ערים שכנות',
  },
]

/** האם המשחק הוא דרבי/יריבות מוכרת, ואם כן — הפרטים. */
export function findRivalry(home: string, away: string): Rivalry | null {
  const h = canonicalTeam(home)
  const a = canonicalTeam(away)
  if (!h || !a) return null
  for (const rivalry of RIVALRIES) {
    const [x, y] = rivalry.teams
    if ((x === h && y === a) || (x === a && y === h)) return rivalry
  }
  return null
}

export function isDerby(home: string, away: string): boolean {
  return findRivalry(home, away) !== null
}

/** האם הקבוצה היא הקבוצה האהודה על המשתמש (סובלני לשמות). */
export function isFavoriteTeam(name: string, favorite: string): boolean {
  if (!name || !name.trim() || !favorite || !favorite.trim()) return false
  if (isSameTeam(name, favorite)) return true
  const n = normalizeTeamName(name)
  const f = normalizeTeamName(favorite)
  if (!n || !f) return false
  if (n === f) return true
  const [short, long] = n.length <= f.length ? [n, f] : [f, n]
  return short.length >= 4 && long.includes(short)
}

export const EUROPEAN_COMPETITIONS: readonly string[] = [
  'ליגת האלופות',
  'הליגה האירופית',
  'ליגת הכנס',
  'מוקדמות ליגת האלופות',
  'הסופר קאפ האירופי',
]

const HEBREW_LETTER = /[\u0590-\u05FF]/
const LATIN_ONLY = /^[a-z0-9 .']+$/i

/**
 * אותיות השימוש בעברית שנדבקות למילה בלי רווח: ב, ל, מ, ה, כ, ו, ש.
 *
 * למה זה נחוץ: המדריך כותב "ליגת העל בכדורעף נשים" — כלומר המילה "כדורעף"
 * מופיעה שם כ"בכדורעף". בלי ההתחשבות באותיות האלה הסימון של הכדורעף לא היה
 * נתפס, ההתאמה היחידה שנשארה הייתה "ליגת העל" — והמשחק היה מסווג ככדורגל
 * בליגת העל ומושך טבלת כדורגל שאינה שייכת לו. אותו דבר קורה ל"בכדוריד",
 * ל"בטניס", ל"במרוץ" ולכל שאר הסימונים.
 */
const HEBREW_PREFIX_LETTERS = /[בלמהכוש]/

/**
 * האם האותיות שלפני ההתאמה הן אותיות שימוש בלבד — כלומר חלק מאותה מילה
 * ולא סוף של מילה אחרת. יותר משתי אותיות שימוש ברצף ("שב", "ומה") כבר
 * נדירות, ולכן התקרה הזו מספיקה כדי לתפוס עברית טבעית בלי לאפשר התאמה
 * בתוך מילה זרה.
 */
function hebrewPrefixOnly(haystack: string, index: number, maxLetters = 2): boolean {
  let cursor = index - 1
  let letters = 0
  while (cursor >= 0 && HEBREW_LETTER.test(haystack[cursor])) {
    if (!HEBREW_PREFIX_LETTERS.test(haystack[cursor])) return false
    letters += 1
    if (letters > maxLetters) return false
    cursor -= 1
  }
  return true
}

/**
 * התאמת ביטוי בגבולות מילה.
 * חובה בעברית: `includes('יורו')` תופס גם "יורוליג" ו-`includes('גביע')`
 * תופס גם "גביע המדינה" באמצע מילה אחרת. לכן דורשים שההתאמה לא תיגע
 * באות עברית נוספת *מאחור*, ובביטויים לטיניים — בגבול מילה רגיל.
 *
 * לפנים מקילים: מותרות שם אותיות שימוש ("בכדורעף", "בליגת העל", "ממרוץ"),
 * כי הן לא הופכות את המילה למילה אחרת. רק אות שאינה מאותיות השימוש חוסמת.
 */
function includesPhrase(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    const before = index > 0 ? haystack[index - 1] : ''
    const after = index + needle.length < haystack.length ? haystack[index + needle.length] : ''
    const continuesWord = HEBREW_LETTER.test(after)
    if (!continuesWord) {
      if (LATIN_ONLY.test(needle)) {
        if (!/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after)) return true
      } else if (hebrewPrefixOnly(haystack, index)) {
        return true
      }
    }
    index = haystack.indexOf(needle, index + 1)
  }
  return false
}

/** מפות חיפוש: תבנית -> שם קנוני. */
const COMPETITION_PATTERNS: ReadonlyArray<{ pattern: string; name: string }> = [
  // "ליגת האלופות של אסיה" היא מפעל אחר לגמרי — ולכן מופיעה לפני הכלל הכללי
  // (ההתאמה הארוכה ביותר מנצחת בכל מקרה).
  { pattern: 'ליגת האלופות של אסיה', name: 'ליגת האלופות של אסיה' },
  { pattern: 'ליגת אלופות אסיה', name: 'ליגת האלופות של אסיה' },
  { pattern: 'afc champions league', name: 'ליגת האלופות של אסיה' },
  { pattern: 'ליגת האלופות', name: 'ליגת האלופות' },
  { pattern: 'צ׳מפיונס', name: 'ליגת האלופות' },
  { pattern: "צ'מפיונס", name: 'ליגת האלופות' },
  { pattern: 'champions league', name: 'ליגת האלופות' },
  { pattern: 'ucl', name: 'ליגת האלופות' },
  { pattern: 'הליגה האירופית', name: 'הליגה האירופית' },
  { pattern: 'ליגה אירופית', name: 'הליגה האירופית' },
  { pattern: 'אירופה ליג', name: 'הליגה האירופית' },
  { pattern: 'europa league', name: 'הליגה האירופית' },
  { pattern: 'ליגת הכנס', name: 'ליגת הכנס' },
  { pattern: 'קונפרנס', name: 'ליגת הכנס' },
  { pattern: 'conference league', name: 'ליגת הכנס' },
  { pattern: 'מוקדמות', name: 'מוקדמות' },
  { pattern: 'ליגת העל', name: 'ליגת העל' },
  { pattern: 'ליגת העל לנוער', name: 'ליגת העל' },
  { pattern: 'הליגה הלאומית', name: 'הליגה הלאומית' },
  // המדריך כותב גם "ליגה לאומית" בלי ה"א ("ליגה לאומית, מחזור 10"). בלי
  // התבנית הזו אותו טקסט בדיוק היה מתעלם מהליגה שהמדריך מצהיר עליה.
  { pattern: 'ליגה לאומית', name: 'הליגה הלאומית' },
  { pattern: 'גביע המדינה', name: 'גביע המדינה' },
  { pattern: 'גביע הטוטו', name: 'גביע הטוטו' },
  { pattern: 'גביע', name: 'גביע המדינה' },
  { pattern: 'נבחרת ישראל', name: 'נבחרת ישראל' },
  { pattern: 'מונדיאל', name: 'מונדיאל' },
  { pattern: 'world cup', name: 'מונדיאל' },
  { pattern: 'יורו', name: 'יורו' },
  { pattern: 'ליגת האומות', name: 'ליגת האומות' },
  { pattern: 'פרמייר ליג', name: 'פרמייר ליג' },
  { pattern: 'רה"ל', name: 'פרמייר ליג' },
  { pattern: 'לה ליגה', name: 'לה ליגה' },
  { pattern: 'סרייה א', name: 'סרייה א' },
  { pattern: 'בונדסליגה', name: 'בונדסליגה' },
  // הליגות הזרות בשמות שבהם המדריך משתמש ("ליגה איטלקית: ...").
  { pattern: 'ליגה איטלקית', name: 'ליגה איטלקית' },
  { pattern: 'הליגה האנגלית', name: 'הליגה האנגלית' },
  { pattern: 'ליגה אנגלית', name: 'הליגה האנגלית' },
  { pattern: 'ליגה ספרדית', name: 'ליגה ספרדית' },
  // הליגה הגרמנית השנייה — לפני הליגה הראשונה, כי ההתאמה הארוכה ביותר
  // מנצחת ו"ליגה גרמנית שנייה" מכיל גם את "ליגה גרמנית".
  // "השנייה" היא מילה ולא שם תואר, ולכן ה"א שלה לא מיוצרת לבד — היא
  // נכתבת הן כאן והן בצורות שלה ("ליגה גרמנית שנייה" / "... השניה").
  { pattern: 'ליגה גרמנית השנייה', name: 'הליגה הגרמנית השנייה' },
  { pattern: 'ליגה גרמנית שנייה', name: 'הליגה הגרמנית השנייה' },
  { pattern: 'ליגה גרמנית השניה', name: 'הליגה הגרמנית השנייה' },
  { pattern: 'בונדסליגה השנייה', name: 'הליגה הגרמנית השנייה' },
  { pattern: 'בונדסליגה 2', name: 'הליגה הגרמנית השנייה' },
  { pattern: '2. בונדסליגה', name: 'הליגה הגרמנית השנייה' },
  { pattern: 'ליגה גרמנית', name: 'ליגה גרמנית' },
  // הליגות השנייה של צרפת וספרד — לפני הליגה הראשונה (התבנית הארוכה מנצחת),
  // כדי ש"ליגה צרפתית שנייה" לא ייקרא "ליגה צרפתית".
  { pattern: 'ליגה צרפתית השנייה', name: 'הליגה הצרפתית השנייה' },
  { pattern: 'ליגה צרפתית שנייה', name: 'הליגה הצרפתית השנייה' },
  { pattern: 'ליג 2', name: 'הליגה הצרפתית השנייה' },
  { pattern: 'ליגה ספרדית השנייה', name: 'הליגה הספרדית השנייה' },
  { pattern: 'ליגה ספרדית שנייה', name: 'הליגה הספרדית השנייה' },
  { pattern: 'סגונדה', name: 'הליגה הספרדית השנייה' },
  { pattern: 'ליגה צרפתית', name: 'ליגה צרפתית' },
  { pattern: 'ליגה דנית', name: 'ליגה דנית' },
  { pattern: 'ליגה סעודית', name: 'ליגה סעודית' },
  { pattern: 'ליגה טורקית', name: 'ליגה טורקית' },
  { pattern: 'כדורסל טורקי', name: 'כדורסל טורקי' },
  { pattern: 'ליגה יוונית', name: 'ליגה יוונית' },
  { pattern: 'ליגה הולנדית', name: 'ליגה הולנדית' },
  { pattern: 'ליגה פורטוגלית', name: 'ליגה פורטוגלית' },
  { pattern: 'ליגה סקוטית', name: 'ליגה סקוטית' },
  { pattern: 'ליגה בלגית', name: 'ליגה בלגית' },
  { pattern: 'ליגה אוסטרית', name: 'ליגה אוסטרית' },
  { pattern: 'ליגת ה-mls', name: 'ליגת ה-MLS' },
  { pattern: 'mls', name: 'ליגת ה-MLS' },
  { pattern: 'ליגת האלופות בכדורסל', name: 'ליגת האלופות בכדורסל' },
  { pattern: 'יורוליג', name: 'יורוליג' },
  { pattern: 'euroleague', name: 'יורוליג' },
  { pattern: 'יורוקאפ', name: 'יורוקאפ' },
  { pattern: 'ליגת Winner', name: 'ליגת Winner' },
  { pattern: 'ליגת ווינר', name: 'ליגת Winner' },
  { pattern: 'nba', name: 'NBA' },
]

/** חשיבות המסגרת 0..1 — משמשת לחישוב אחוז העניין במשחק. */
const IMPORTANCE: ReadonlyArray<{ pattern: string; value: number }> = [
  { pattern: 'ליגת האלופות', value: 1 },
  { pattern: 'מוקדמות ליגת האלופות', value: 0.9 },
  { pattern: 'נבחרת ישראל', value: 0.95 },
  { pattern: 'מונדיאל', value: 1 },
  { pattern: 'יורו', value: 0.9 },
  { pattern: 'הליגה האירופית', value: 0.85 },
  { pattern: 'ליגת האומות', value: 0.8 },
  { pattern: 'ליגת הכנס', value: 0.7 },
  { pattern: 'ליגת העל', value: 0.65 },
  { pattern: 'גביע המדינה', value: 0.6 },
  { pattern: 'גביע הטוטו', value: 0.45 },
  { pattern: 'הליגה הלאומית', value: 0.4 },
  // הליגה הגרמנית השנייה: ליגה שנייה היא עניין נמוך — כמו הליגה הלאומית.
  { pattern: 'גרמנית השנייה', value: 0.4 },
  { pattern: 'יורוליג', value: 0.9 },
  { pattern: 'יורוקאפ', value: 0.7 },
  { pattern: 'ליגת Winner', value: 0.6 },
  { pattern: 'nba', value: 0.7 },
  { pattern: 'ליגת האלופות של אסיה', value: 0.7 },
  { pattern: 'ליגה איטלקית', value: 0.7 },
  { pattern: 'הליגה האנגלית', value: 0.8 },
  { pattern: 'ליגה אנגלית', value: 0.8 },
  { pattern: 'ליגה ספרדית', value: 0.75 },
  { pattern: 'ליגה גרמנית', value: 0.7 },
  { pattern: 'ליגה צרפתית', value: 0.7 },
  // ליגות שניות — עניין נמוך, כמו הליגה הלאומית והליגה הגרמנית השנייה.
  { pattern: 'צרפתית השנייה', value: 0.4 },
  { pattern: 'ספרדית השנייה', value: 0.4 },
  { pattern: 'ליגת ה-mls', value: 0.6 },
  { pattern: 'ליגה דנית', value: 0.5 },
  { pattern: 'ליגה סעודית', value: 0.6 },
  { pattern: 'ליגה טורקית', value: 0.6 },
  { pattern: 'כדורסל טורקי', value: 0.5 },
  { pattern: 'ליגה יוונית', value: 0.5 },
  { pattern: 'ליגה הולנדית', value: 0.6 },
  { pattern: 'ליגה פורטוגלית', value: 0.6 },
  { pattern: 'ליגה סקוטית', value: 0.5 },
  { pattern: 'ליגה בלגית', value: 0.5 },
  { pattern: 'ליגה אוסטרית', value: 0.5 },
  { pattern: 'פרמייר ליג', value: 0.8 },
  { pattern: 'לה ליגה', value: 0.75 },
  { pattern: 'סרייה א', value: 0.7 },
  { pattern: 'בונדסליגה', value: 0.7 },
  { pattern: 'ידידות', value: 0.3 },
]

/**
 * מזהה את המסגרת מתוך טקסט חופשי (עברית או אנגלית).
 * כשכמה תבניות מתאימות, התבנית הארוכה (הספציפית) קובעת — כך "גביע המדינה"
 * לא נבלע על ידי "גביע".
 */
/**
 * אותה תבנית עם ה"א הידיעה בכל מילה: "ליגה גרמנית" -> "ליגה הגרמנית".
 *
 * המדריך כותב את שתי הצורות ("ליגה גרמנית" וגם "הליגה הגרמנית"), ובעברית
 * הה"א נוספת לכל המילים — לא רק לראשונה. במקום לרשום כל ליגה פעמיים,
 * הצורה השנייה מיוצרת. ה"א מתווספת רק למילים שהן שם תואר ("גרמנית",
 * "איטלקית") — "נבחרת ישראל" היה נהפך אחרת ל"נבחרת הישראל".
 */
export function withDefiniteArticle(pattern: string): string {
  return pattern
    .split(' ')
    .map((word) => (word.length > 2 && /ית$/.test(word) ? `ה${word}` : word))
    .join(' ')
}

/** כל התבניות פעם אחת, עם הצורה שמוסיפה ה"א — כדי שלא לחשב בכל קריאה. */
const COMPETITION_VARIANTS: ReadonlyArray<{ needle: string; name: string }> =
  COMPETITION_PATTERNS.flatMap((entry) =>
    [...new Set([entry.pattern, withDefiniteArticle(entry.pattern)])].map((pattern) => ({
      needle: pattern.toLowerCase(),
      name: entry.name,
    })),
  )

export function detectCompetition(text: string | undefined): string | undefined {
  if (!text) return undefined
  const haystack = text.toLowerCase()
  let best: { name: string; length: number } | undefined
  for (const entry of COMPETITION_VARIANTS) {
    if (!includesPhrase(haystack, entry.needle)) continue
    if (!best || entry.needle.length > best.length) {
      best = { name: entry.name, length: entry.needle.length }
    }
  }
  return best?.name
}

/**
 * חשיבות המסגרת: 0..1. ברירת מחדל 0.4 כשלא ידוע.
 * כשמספר תבניות מתאימות, התבנית הארוכה (הספציפית) היא שקובעת —
 * למשל "מוקדמות ליגת האלופות" ולא "ליגת האלופות".
 */
export function competitionImportance(competition: string | undefined): number {
  if (!competition) return 0.4
  const haystack = competition.toLowerCase()
  let bestPatternLength = -1
  let best = 0.4
  for (const entry of IMPORTANCE) {
    const pattern = entry.pattern.toLowerCase()
    if (!haystack.includes(pattern)) continue
    if (pattern.length > bestPatternLength) {
      bestPatternLength = pattern.length
      best = entry.value
    }
  }
  return best
}

/**
 * סימני הענף לשאר ענפי הספורט — הסדר קובע: הענף הראשון שיש עליו סימן מנצח.
 * כדורסל ובעיקר כדורגל נבדקים לפניו (למשל "גביע המדינה בכדורסל" מכיל
 * גם את הסימן של הכדורגל), ולכן הם נשארים בבלוקים שלהם למטה.
 */
const OTHER_SPORT_MARKERS: ReadonlyArray<{ kind: SportKind; markers: readonly string[] }> = [
  {
    kind: 'hockey',
    markers: ['הוקי', 'הוקי קרח', 'nhl', 'hockey', 'ice hockey', 'צ׳מפיונס הוקי'],
  },
  {
    kind: 'tennis',
    markers: [
      'טניס',
      'tennis',
      'atp',
      'wta',
      'ווימבלדון',
      'wimbledon',
      'רולאן גארוס',
      'אליפות אוסטרליה',
      'us open',
      'גראנד סלאם',
    ],
  },
  { kind: 'handball', markers: ['כדוריד', 'handball', 'ליגת הכדוריד'] },
  { kind: 'volleyball', markers: ['כדורעף', 'volleyball', 'ליגת הכדורעף'] },
  {
    kind: 'american-football',
    markers: ['פוטבול', 'nfl', 'american football', 'פוטבול אמריקאי', 'סופרבול', 'super bowl'],
  },
  { kind: 'baseball', markers: ['בייסבול', 'baseball', 'mlb'] },
  {
    kind: 'combat',
    markers: ['איגרוף', 'אגרוף', 'boxing', 'mma', 'ufc', 'קיקבוקס', 'היאבקות', 'ג׳ודו', 'judo'],
  },
]

/**
 * סימני המרוצים — נבדקים אחרונים בין הענפים: "מרוץ" ו"פורמולה" מופיעים גם
 * בתקציר של משחק כדורגל ("מרוץ האליפות"), ולכן הם לא רשאים לגבור על כדורגל.
 */
const MOTORSPORT_MARKERS: readonly string[] = [
  'פורמולה',
  'formula',
  'f1',
  'מרוץ',
  'מירוץ',
  'מוטו gp',
  'moto gp',
  'moto2',
  'moto3',
  'nascar',
]

const BASKETBALL_MARKERS: readonly string[] = [
  'כדורסל',
  'יורוליג',
  'euroleague',
  'יורוקאפ',
  'eurocup',
  'nba',
  'ליגת Winner',
  'ליגת ווינר',
  'גביע המדינה בכדורסל',
  'basketball',
  'הפועל ירושלים בכדורסל',
  'מכבי תל אביב בכדורסל',
  'הפועל תל אביב בכדורסל',
  'מכבי ראשון לציון',
  'הפועל גליל עליון',
  'בני הרצליה',
]

const FOOTBALL_MARKERS: readonly string[] = [
  'כדורגל',
  'ליגת העל',
  /*
   * שמות הליגות הזרות. לא כל תקציר פותח ב"כדורגל": המדריך כותב למשל
   * "שידור ישיר: ליגה ספרדית 2026/27, מחזור 9: אספניול מארחת את אתלטיקו מדריד"
   * — בלי המילה הזו המשחק סווג כ"ספורט" כללי, ומכיוון שטבלאות קיימות רק
   * לכדורגל ולכדורסל הוא נשאר בלי טבלה ("אין נתוני טבלה" בכרטיס).
   */
  'ליגה ספרדית',
  'ליגה איטלקית',
  'ליגה צרפתית',
  'ליגה גרמנית',
  'ליגה אנגלית',
  'ליגה פורטוגלית',
  'ליגה הולנדית',
  'ליגה טורקית',
  'ליגה יוונית',
  'ליגה דנית',
  'ליגה סקוטית',
  'ליגה בלגית',
  'ליגה אוסטרית',
  'ליגה סעודית',
  'ליגה לאומית',
  'סגונדה',
  'ליג 1',
  'ליג 2',
  'ליגת האלופות',
  'הליגה האירופית',
  'ליגת הכנס',
  'מוקדמות',
  'מונדיאל',
  'גביע המדינה',
  'גביע הטוטו',
  'ליגת האומות',
  'פרמייר ליג',
  'לה ליגה',
  'סרייה א',
  'בונדסליגה',
  'ריאל מדריד',
  'ברצלונה',
  'מנצ׳סטר',
  'ליברפול',
  'ארסנל',
  'צ׳לסי',
  'יובנטוס',
  'באיירן',
  'פריז סן ז׳רמן',
]

/**
 * זיהוי הענף מתוך טקסט חופשי.
 *
 * המילה המפורשת "כדורגל"/"כדורסל" (שהספק שם בפתיחת התקציר: "שידור ישיר:
 * כדורגל. הפועל ירושלים נגד מכבי חיפה, ליגת ווינר") קובעת, והמוקדמת מביניהן
 * מנצחת. בלי הכלל הזה משחק כדורגל של הפועל ירושלים נחשב לכדורסל רק מפני
 * ששם המסגרת שלנו ("ליגת ווינר") מופיע אצל הכדורסל.
 */
export function detectSport(text: string): SportKind {
  if (!text) return 'other'
  const haystack = text.toLowerCase()
  const footballIndex = haystack.indexOf('כדורגל')
  const basketballIndex = haystack.indexOf('כדורסל')
  if (footballIndex !== -1 && (basketballIndex === -1 || footballIndex < basketballIndex)) {
    return 'football'
  }
  if (basketballIndex !== -1 && (footballIndex === -1 || basketballIndex < footballIndex)) {
    return 'basketball'
  }
  // הענפים שסימניהם חד-משמעיים (הוקי, טניס, NFL…). "מרוץ" יושב אחרי הכדורגל
  // כדי ש"מרוץ האליפות" בתקציר משחק לא יהפוך למרוץ פורמולה.
  for (const entry of OTHER_SPORT_MARKERS) {
    for (const marker of entry.markers) {
      if (includesPhrase(haystack, marker.toLowerCase())) return entry.kind
    }
  }
  for (const marker of BASKETBALL_MARKERS) {
    if (includesPhrase(haystack, marker.toLowerCase())) return 'basketball'
  }
  for (const marker of FOOTBALL_MARKERS) {
    if (includesPhrase(haystack, marker.toLowerCase())) return 'football'
  }
  for (const marker of MOTORSPORT_MARKERS) {
    if (includesPhrase(haystack, marker)) return 'motorsport'
  }
  // זיהוי לפי שם קבוצה ישראלית — ברירת המחדל היא כדורגל.
  if (canonicalTeam(text)) return 'football'
  return 'other'
}
