/**
 * מרשם הליגות: איזו מסגרת מה-EPG שייכת לאיזו ליגה, ואיפה מביאים את הטבלה שלה.
 *
 * מקורות הטבלה, לפי סדר העדפה (הסדר עצמו יושב ב-`tableStore`):
 *  1. api-football — המפתח של המשתמש. מחזיר עונה נוכחית רק במסלול בתשלום.
 *  2. ESPN — ציבורי, בלי מפתח, CORS פתוח, ומחזיר את העונה הנוכחית בפועל.
 *  3. ONE / ויקיפדיה — לליגת העל.
 *  4. livetv.sx — גיבוי לליגות שאין להן ב-ESPN (‏`livetv`).
 *  5. snapshot מקומי — לליגת העל כשאין רשת/מפתח.
 */

import { ISRAELI_TEAMS, LEUMIT_TEAMS, canonicalTeam, withDefiniteArticle } from './teams'
import { foldTeamName, findTeamNames } from './teamNames'
import { TEAM_LEAGUES } from './teamLeagues'

/** שנת פתיחת העונה האירופית הנוכחית (עונה אירופית מתחילה בקיץ). */
export function currentSeasonStartYear(now: Date = new Date()): number {
  const year = now.getUTCFullYear()
  return now.getUTCMonth() >= 6 ? year : year - 1
}

/** שם עונת api-football, למשל "2026". */
export function apiFootballSeason(now: Date = new Date()): number {
  return currentSeasonStartYear(now)
}

export interface LeagueRef {
  /** מזהה פנימי, משמש גם כמפתח מטמון. */
  id: string
  /** שם הליגה בעברית, לתצוגה. */
  name: string
  /**
   * המסגרות שה-EPG מדווח עליהן עבור הליגה הזו. ההשוואה היא על טקסט מנורמל
   * (בלי פיסוק ורווחים כפולים), ולכן "סרייה א׳" ו"ליגה איטלקית" מתאימים לאותה ליגה.
   */
  aliases: readonly string[]
  /** קוד הליגה ב-ESPN (מקור חי לעונה הנוכחית). */
  espn?: string
  /** מזהה הליגה ב-api-football (המפתח של המשתמש). */
  apiFootball?: number
  /**
   * מזהה הליגה ב-ONE (one.co.il). אתר הספורט המוביל בישראל, עם API ציבורי
   * שמחזיר CORS פתוח ואת הטבלה בעברית — ולכן הוא המקור של ליגת העל.
   */
  one?: string | number
  /**
   * מזהה הליגה ב-livetv.sx (`/enx/tables/{id}/`) — מקור הגיבוי שמשמש רק
   * כשאין טבלה מ-api-football או מ-ESPN. המיפוי נגזר מהקטלוג של האתר;
   * הטבלה המלאה של מה שיש בכל מזהה: tools/livetv-tables.md.
   */
  livetv?: number
  /**
   * מזהה התחרות ב-365scores (`competitionId`). המקור היחיד היום לטבלת
   * הכדורסל הישראלית — שם היא מגיעה בעברית, עם העונה הנוכחית בפועל.
   */
  scores365?: number
  /**
   * הענף שהטבלה הזו מתארת. ברירת מחדל: כדורגל. משמש כדי שלא תיצמד טבלת
   * כדורגל למשחק כדורסל (ולהפך) — למשל משחק NBA שמזכיר קבוצה אירופית
   * ב-LA ליגה.
   */
  sport?: 'football' | 'basketball'
  /** האם יש טבלה מקומית מובנית (snapshot) לגיבוי. */
  bundled?: boolean
  /**
   * המסגרת היא גביע / מפעל (ולא ליגה). כשהמדריך מצהיר על *ליגה* שאין לה
   * מקור טבלה — זו הליגה של המשחק, ואסור להחליף אותה בליגה אחרת. גביע,
   * לעומת זאת, לא עוצר את הזיהוי: הטבלה של הליגה של הקבוצות עוד מועילה.
   */
  cup?: boolean
  /** כמה קבוצות יורדות ליגה — משמש לחישוב "למה המשחק מעניין". */
  relegationSpots?: number
}

export const LEAGUES: readonly LeagueRef[] = [
  {
    id: 'israel',
    name: 'ליגת העל',
    // "ליגת ווינר סל" שייכת לכדורסל (ר' הרשומה של ליגת Winner סל למטה) —
    // כאן רק הכדורגל, אחרת טבלת הכדורגל הייתה נדבקת למשחק כדורסל.
    aliases: ['ליגת העל', 'הליגה הישראלית'],
    // הטבלה הישראלית ב-ESPN מיושנת (2024) ולכן לא משתמשים בה.
    apiFootball: 383,
    // המקור בפועל לטבלת ליגת העל: ONE מחזיר את העונה הנוכחית בעברית עם CORS.
    one: 1,
    // גיבוי אחרון: ל-livetv יש טבלה ישראלית בעונה הנוכחית (14 קבוצות).
    livetv: 38,
    bundled: true,
    relegationSpots: 2,
  },
  {
    /**
     * הליגה הלאומית — הליגה הישראלית השנייה.
     *
     * הרשומה נועדה לכך שהמשחק ייקרא כמו שהמדריך כתב אותו ("ליגה לאומית")
     * ולא יסומן כליגת העל רק מפני ששם הקבוצה מוכר מעונות קודמות ("מ.ס. אשדוד").
     * הטבלה עצמה מגיעה מ-ONE (‏`/api/league/2`): 16 קבוצות בעברית, העונה
     * הנוכחית, מתעדכן תוך כדי מחזור — אותו מקור שמזין את ליגת העל.
     */
    id: 'israel-national',
    name: 'הליגה הלאומית',
    aliases: ['ליגה לאומית', 'הליגה הלאומית', 'ליגה לאומית בכדורגל'],
    one: 2,
    relegationSpots: 2,
  },
  {
    /**
     * ליגת Winner סל — ליגת הכדורסל הישראלית הראשונה.
     *
     * ל-ESPN אין ליגה ישראלית בכדורסל ול-ONE יש רק טבלאות כדורגל, ולכן
     * הטבלה מגיעה מ-365scores (competitionId 47) עם השמות בעברית.
     * `relegationSpots: 0` — בליגה הזו לא מחשבים מאבק ירידה בהשוואה לכדורגל,
     * והנוסחים במסך הפרטים נגזרים מהמאזן ולא מהמיקום בתחתית.
     */
    id: 'israel-basketball',
    name: 'ליגת Winner סל',
    aliases: [
      'ליגת ווינר סל',
      'ליגת Winner סל',
      'ליגת העל בכדורסל',
      'הליגה הישראלית בכדורסל',
      'winner league',
    ],
    scores365: 47,
    sport: 'basketball',
    relegationSpots: 0,
  },
  {
    id: 'italy',
    name: 'ליגה איטלקית',
    aliases: ['ליגה איטלקית', 'סרייה א', 'serie a', 'איטליה סרייה א'],
    espn: 'ita.1',
    apiFootball: 135,
    one: 8,
    livetv: 11,
    relegationSpots: 3,
  },
  {
    id: 'england',
    name: 'הליגה האנגלית',
    aliases: ['פרמייר ליג', 'הליגה האנגלית', 'ליגה אנגלית', 'premier league', 'epl'],
    espn: 'eng.1',
    apiFootball: 39,
    one: 5,
    livetv: 1,
    relegationSpots: 3,
  },
  {
    id: 'spain',
    name: 'ליגה ספרדית',
    aliases: ['ליגה ספרדית', 'לה ליגה', 'la liga', 'ספרדית לה ליגה'],
    espn: 'esp.1',
    apiFootball: 140,
    // גיבוי בעברית ל-ESPN ("ליגה ספרדית", 20 קבוצות, עונה נוכחית).
    one: 10,
    livetv: 15,
    relegationSpots: 3,
  },
  {
    id: 'germany',
    name: 'ליגה גרמנית',
    aliases: ['ליגה גרמנית', 'בונדסליגה', 'bundesliga'],
    espn: 'ger.1',
    apiFootball: 78,
    one: 7,
    livetv: 36,
    relegationSpots: 2,
  },
  {
    id: 'germany-2',
    name: 'הליגה הגרמנית השנייה',
    aliases: [
      'ליגה גרמנית שנייה',
      'ליגה גרמנית השנייה',
      'הליגה הגרמנית השנייה',
      '2. בונדסליגה',
      'בונדסליגה 2',
    ],
    // הטבלה של הליגה השנייה יושבת ב-ESPN (‏„ger.2”), כמו הליגה הראשונה —
    // עונה נוכחית, בלי מפתח. בלי הרשומה הזו משחק בליגה השנייה היה מסומן
    // כליגה הגרמנית ומושך את הטבלה של הליגה הראשונה.
    espn: 'ger.2',
    relegationSpots: 2,
  },
  {
    id: 'france',
    name: 'ליגה צרפתית',
    aliases: ['ליגה צרפתית', 'ליג 1', 'ligue 1', 'ליגה צרפתית ראשונה'],
    espn: 'fra.1',
    apiFootball: 61,
    // גיבוי בעברית ל-ESPN ("ליגה צרפתית", 18 קבוצות, עונה נוכחית).
    one: 6,
    livetv: 37,
    relegationSpots: 2,
  },
  {
    /**
     * הליגה הצרפתית השנייה (ליג 2). המדריך משדר משם משחקים ("נאנט נגד
     * דנקרק, ליגה צרפתית שנייה") — ובלי הרשומה הזו הם סומנו כליגה הצרפתית
     * הראשונה וקיבלו טבלה שאינה שלהם.
     */
    id: 'france-2',
    name: 'הליגה הצרפתית השנייה',
    aliases: ['ליגה צרפתית שנייה', 'ליגה צרפתית השנייה', 'ליג 2', 'ligue 2'],
    espn: 'fra.2',
    relegationSpots: 3,
  },
  {
    /** הליגה הספרדית השנייה (הסגונדה) — כמו הליגה הצרפתית השנייה. */
    id: 'spain-2',
    name: 'הליגה הספרדית השנייה',
    aliases: ['ליגה ספרדית שנייה', 'ליגה ספרדית השנייה', 'סגונדה', 'laliga 2', 'la liga 2'],
    espn: 'esp.2',
    relegationSpots: 4,
  },
  {
    id: 'denmark',
    name: 'ליגה דנית',
    aliases: ['ליגה דנית', 'סופרליגה', 'superliga'],
    espn: 'den.1',
    apiFootball: 119,
    livetv: 50,
    relegationSpots: 2,
  },
  {
    id: 'champions-league',
    name: 'ליגת האלופות',
    aliases: ['ליגת האלופות', 'צ׳מפיונס', "צ'מפיונס", 'champions league', 'ucl'],
    espn: 'uefa.champions',
    apiFootball: 2,
    // 36 קבוצות בליגה אחת, בעברית ("ליגת האלופות").
    one: 14,
    livetv: 7,
    // בפורמט החדש 36 קבוצות בליגה אחת — ארבע האחרונות מודחות.
    relegationSpots: 4,
  },
  {
    id: 'europa-league',
    name: 'הליגה האירופית',
    aliases: ['הליגה האירופית', 'ליגה אירופית', 'אירופה ליג', 'europa league'],
    espn: 'uefa.europa',
    apiFootball: 3,
    livetv: 265,
    relegationSpots: 4,
  },
  {
    id: 'saudi',
    name: 'ליגה סעודית',
    aliases: ['ליגה סעודית', 'סעודית', 'saudi league'],
    espn: 'ksa.1',
    apiFootball: 307,
    livetv: 66,
    relegationSpots: 3,
  },
  {
    id: 'turkey',
    name: 'ליגה טורקית',
    aliases: ['ליגה טורקית', 'סופר ליג טורקית', 'super lig'],
    espn: 'tur.1',
    apiFootball: 203,
    livetv: 92,
    relegationSpots: 4,
  },
  {
    id: 'greece',
    name: 'ליגה יוונית',
    aliases: ['ליגה יוונית', 'סופר ליג יוון'],
    espn: 'gre.1',
    apiFootball: 197,
    livetv: 26,
    relegationSpots: 2,
  },
  {
    id: 'netherlands',
    name: 'ליגה הולנדית',
    aliases: ['ליגה הולנדית', 'ארדיוויזי', 'eredivisie'],
    espn: 'ned.1',
    apiFootball: 88,
    livetv: 22,
    relegationSpots: 2,
  },
  {
    id: 'portugal',
    name: 'ליגה פורטוגלית',
    aliases: ['ליגה פורטוגלית', 'ליגה פורטוגזית', 'primeira liga'],
    espn: 'por.1',
    apiFootball: 94,
    livetv: 28,
    relegationSpots: 2,
  },
  {
    id: 'scotland',
    name: 'ליגה סקוטית',
    aliases: ['ליגה סקוטית', 'פרמיירשיפ סקוטי'],
    espn: 'sco.1',
    apiFootball: 179,
    one: 9,
    livetv: 47,
    relegationSpots: 2,
  },
  {
    id: 'belgium',
    name: 'ליגה בלגית',
    aliases: ['ליגה בלגית', 'ליגת הפרו בלגית'],
    espn: 'bel.1',
    apiFootball: 144,
    livetv: 163,
    relegationSpots: 2,
  },
  {
    id: 'austria',
    name: 'ליגה אוסטרית',
    aliases: ['ליגה אוסטרית', 'בונדסליגה אוסטרית'],
    espn: 'aut.1',
    apiFootball: 218,
    livetv: 116,
    relegationSpots: 2,
  },
  {
    id: 'england-2',
    name: 'הצ׳מפיונשיפ',
    aliases: ['צ׳מפיונשיפ', 'ליגת המשנה האנגלית', 'championship'],
    espn: 'eng.2',
    apiFootball: 40,
    livetv: 57,
    relegationSpots: 3,
  },
  {
    id: 'afc-champions-league',
    name: 'ליגת האלופות של אסיה',
    aliases: ['ליגת האלופות של אסיה', 'ליגת אלופות אסיה', 'afc champions league'],
    // אין מקור טבלה למפעל הזה — ולכן הזיהוי נופל לטבלה של הליגה של הקבוצות
    // (למשל: אל נאסר -> הליגה הסעודית). זה מפעל, לא ליגה — ולכן cup.
    cup: true,
    relegationSpots: 0,
  },
  {
    id: 'nba',
    name: 'ליגת ה-NBA',
    // הטבלה נשלפת מ-ESPN (basketball/nba) — עונה של 30 קבוצות בשני בתים.
    aliases: ['nba', 'ליגת ה-nba', 'ליגת nba', 'ה-nba', 'ליגת הכדורסל האמריקאית'],
    espn: 'nba',
    // אין `livetv` ל-NBA: העמוד של הליגה הזו לא מחזיר טבלת מיקום בקוד המקור
    // (הנתונים נטענים בצד הלקוח), ולכן אין ממה לגבות.
    sport: 'basketball',
    // ב-NBA אין ירידות ליגה — כל הקבוצות ממשיכות לעונה הבאה.
    relegationSpots: 0,
  },
  {
    id: 'usa',
    name: 'ליגת ה-MLS',
    aliases: ['mls', 'ליגה אמריקאית', 'ליגת ה-mls'],
    espn: 'usa.1',
    apiFootball: 253,
    // אין `livetv` ל-MLS: ב-livetv הטבלה מפוצלת לבית מזרחי ולמערבי כשני
    // עמודים שונים, וטבלה של בית אחד היא חצי ליגה — גרוע מכלום.
    // ב-MLS אין ירידות ליגה.
    relegationSpots: 0,
  },
]

/** ניקוי לטקסט השוואה: בלי גרשיים, פיסוק ורווחים כפולים. */
function foldText(raw: string): string {
  return raw
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/["'`´\u05F3\u05F4\u2018\u2019\u201C\u201D]/g, '')
    .replace(/[.,:;!?()[\]{}_/\\|–—+*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/*
 * כל כינוי נשמר גם עם ה"א הידיעה ("ליגה גרמנית" -> "ליגה הגרמנית"): המדריך
 * כותב את שתי הצורות, ובלעדיה זיהוי לפי טקסט היה מפספס את הצורה הנפוצה.
 */
const FOLDED_ALIASES: ReadonlyArray<{ league: LeagueRef; alias: string }> = LEAGUES.flatMap(
  (league) =>
    league.aliases.flatMap((alias) =>
      [...new Set([alias, withDefiniteArticle(alias)])].map((variant) => ({
        league,
        alias: foldText(variant),
      })),
    ),
).sort((a, b) => b.alias.length - a.alias.length)

export interface LeagueFlagRef {
  /** קוד הדגל ב-flagcdn ("es", "gb-eng"). חסר במפעל בין-לאומי. */
  code?: string
  /** גיבוי כשאין תמונה: אימוג׳י של הדגל, או סמל המפעל (🏆). */
  emoji: string
}

/*
 * דגל המדינה (או סמל המפעל) לכל ליגה — להצגה פעם אחת בתג המסגרת.
 *
 * הדגל נגזר מהמסגרת ולא מהקבוצה: כל קבוצה בליגה ספרדית מקבלת את דגל ספרד,
 * גם אם היא משחקת בליגה השנייה — בדיוק כמו שביקש המשתמש. למפעלים שאינם
 * לאומיים (ליגת האלופות) יש סמל מפעל ולא דגל של מדינה.
 *
 * הטניס לא מופיע כאן: במשחק טניס אין מסגרת ליגה, ולכן גם אין היכן להציג דגל.
 */
const LEAGUE_FLAGS: Readonly<Record<string, LeagueFlagRef>> = {
  israel: { code: 'il', emoji: '🇮🇱' },
  'israel-national': { code: 'il', emoji: '🇮🇱' },
  'israel-basketball': { code: 'il', emoji: '🇮🇱' },
  italy: { code: 'it', emoji: '🇮🇹' },
  england: { code: 'gb-eng', emoji: '🏴' },
  'england-2': { code: 'gb-eng', emoji: '🏴' },
  spain: { code: 'es', emoji: '🇪🇸' },
  'spain-2': { code: 'es', emoji: '🇪🇸' },
  germany: { code: 'de', emoji: '🇩🇪' },
  'germany-2': { code: 'de', emoji: '🇩🇪' },
  france: { code: 'fr', emoji: '🇫🇷' },
  'france-2': { code: 'fr', emoji: '🇫🇷' },
  denmark: { code: 'dk', emoji: '🇩🇰' },
  saudi: { code: 'sa', emoji: '🇸🇦' },
  turkey: { code: 'tr', emoji: '🇹🇷' },
  greece: { code: 'gr', emoji: '🇬🇷' },
  netherlands: { code: 'nl', emoji: '🇳🇱' },
  portugal: { code: 'pt', emoji: '🇵🇹' },
  scotland: { code: 'gb-sct', emoji: '🏴' },
  belgium: { code: 'be', emoji: '🇧🇪' },
  austria: { code: 'at', emoji: '🇦🇹' },
  // מפעלים בין-לאומיים: סמל המסגרת, לא דגל של מדינה.
  'champions-league': { emoji: '🏆' },
  'europa-league': { emoji: '🏆' },
  'afc-champions-league': { emoji: '🏆' },
  // כדורסל וכדורגל אמריקאי
  nba: { code: 'us', emoji: '🇺🇸' },
  usa: { code: 'us', emoji: '🇺🇸' },
}

/** הדגל של הליגה, או undefined כשאין לה דגל (למשל טניס). */
export function leagueFlag(league: LeagueRef | undefined): LeagueFlagRef | undefined {
  return league ? LEAGUE_FLAGS[league.id] : undefined
}

/**
 * כתובת התמונה של הדגל. תמונה ולא אימוג׳י: בחלונות (ובחלק מהמכשירים)
 * אין גליפים לדגלי מדינות בגופן, והאימוג׳י מוצג כצמד אותיות ("ES").
 * התמונות קטנות (פחות מקילו־בייט) וניתנות למטמון הדפדפן.
 */
export function leagueFlagUrl(flag: LeagueFlagRef | undefined): string | undefined {
  return flag?.code ? `https://flagcdn.com/w40/${flag.code}.png` : undefined
}

const LEAGUE_BY_ID = new Map(LEAGUES.map((league) => [league.id, league]))

export function leagueById(id: string): LeagueRef | undefined {
  return LEAGUE_BY_ID.get(id)
}

/**
 * מוצא את הליגה מטקסט חופשי (כותרת ה-EPG, שם המסגרת וכו').
 * ההתאמה הארוכה ביותר מנצחת — כדי ש"ליגת האלופות" לא ייבלע ב"ליגה".
 */
export function findLeague(text: string | undefined): LeagueRef | undefined {
  if (!text) return undefined
  const haystack = foldText(text)
  if (!haystack) return undefined
  for (const entry of FOLDED_ALIASES) {
    if (haystack.includes(entry.alias)) return entry.league
  }
  return undefined
}

/** מתוך כמה טקסטים — הראשון שמזוהה. */
export function findLeagueIn(texts: readonly (string | undefined)[]): LeagueRef | undefined {
  for (const text of texts) {
    const league = findLeague(text)
    if (league) return league
  }
  return undefined
}

/**
 * ליגות שלא נכנסות למדד "ליגה לפי קבוצה": הן מכילות קבוצות מליגות מקומיות
 * אחרות (צ׳לסי בליגת האלופות), ולכן הן היו גוברות על הליגה הנכונה.
 * משחקים בהן מזוהים לפי טקסט המסגרת — וזה עובד.
 */
const CUP_LEAGUE_IDS = new Set(['champions-league', 'europa-league'])

/** מדד שם קבוצה (מנורמל) -> הליגה שלה, לפי הקבוצות שבטבלאות החיות. */
const TEAM_LEAGUE_INDEX: Map<string, LeagueRef> = (() => {
  const index = new Map<string, LeagueRef>()
  for (const [id, names] of Object.entries(TEAM_LEAGUES)) {
    if (CUP_LEAGUE_IDS.has(id)) continue
    const league = leagueById(id)
    if (!league) continue
    for (const name of names) {
      const key = foldTeamName(name)
      if (key && !index.has(key)) index.set(key, league)
    }
  }
  return index
})()

/**
 * הליגה הישראלית של מועדון, אם הוא מהעונה הנוכחית. הליגה הלאומית נבדקת
 * ראשונה: קבוצה שירדה ליגה ("מ.ס. אשדוד") עדיין מוכרת מרשימת ליגת העל,
 * וכל עוד היא מופיעה בטבלה של הליגה הלאומית — שם היא משחקת.
 */
export function israeliLeagueFor(name: string | undefined): LeagueRef | undefined {
  const canonical = canonicalTeam(name ?? '')
  if (!canonical) return undefined
  if (LEUMIT_TEAMS.includes(canonical)) return leagueById('israel-national')
  if (ISRAELI_TEAMS.includes(canonical)) return leagueById('israel')
  return undefined
}

/**
 * הליגה של קבוצה בודדת, לפי השם שלה במדריך. קודם מתרגמים אותו דרך מפת
 * השמות ("לבאנטה" -> "Levante"), אחר כך בודקים את שם הליגה שבטבלה החיה,
 * ואם אין — מועדון ישראלי מזוהה לפי הליגה שלו העונה.
 */
export function leagueForTeam(name: string | undefined): LeagueRef | undefined {
  if (!name?.trim()) return undefined
  const israeli = israeliLeagueFor(name)
  if (israeli) return israeli
  const entry = findTeamNames(name)
  const candidates = [entry?.en, ...(entry?.aliases ?? []), name]
  for (const candidate of candidates) {
    const key = foldTeamName(candidate ?? '')
    if (!key) continue
    const league = TEAM_LEAGUE_INDEX.get(key)
    if (league) return league
  }
  return undefined
}

/** האם שני השמות הם מועדונים ישראליים מהעונה הנוכחית. */
function bothIsraeliClubs(names: readonly (string | undefined)[]): boolean {
  const known = names.filter((name): name is string => Boolean(name && name.trim()))
  if (known.length < 2) return false
  return known.every((name) => israeliLeagueFor(name) !== undefined)
}

/** האם הליגה הזו היא אחת משתי הליגות הישראליות הבכירות. */
function isIsraeliLeague(league: LeagueRef | undefined): boolean {
  return league?.id === 'israel' || league?.id === 'israel-national'
}

/** הענף שהטבלה של הליגה מתארת. ברירת המחדל היא כדורגל. */
export function leagueSport(league: LeagueRef): 'football' | 'basketball' {
  return league.sport ?? 'football'
}

/** האם בכלל יש מאיפה להביא טבלה לליגה הזו. */
export function hasTableSource(league: LeagueRef): boolean {
  return Boolean(
    league.one ||
      league.espn ||
      league.scores365 ||
      league.apiFootball ||
      league.livetv ||
      league.bundled ||
      league.id === 'israel',
  )
}

/**
 * הזיהוי האמיתי של הליגה עבור משחק: קודם לפי טקסט המסגרת (אם יש לה מקור
 * טבלה), ואם אין — לפי שמות הקבוצות. בלי החלק הזה משחק של ליגת העל
 * (שבכותרתו כתוב רק "כדורגל: מכבי תל אביב - הפועל תל אביב") היה נשאר בלי טבלה.
 */
export function findMatchLeague(input: {
  texts: readonly (string | undefined)[]
  home?: string
  away?: string
  sport?: string
}): LeagueRef | undefined {
  // טבלאות יש לשני ענפים בלבד: כדורגל (כל הליגות) וכדורסל (NBA). משחק של ענף
  // אחר (הוקי, טניס…) לא מקבל טבלה — טבלה של ענף אחר היא מידע שגוי.
  const sport = input.sport ?? 'football'
  if (sport !== 'football' && sport !== 'basketball') return undefined
  const compatible = (league: LeagueRef | undefined): league is LeagueRef =>
    Boolean(league && leagueSport(league) === sport)

  const byText = findLeagueIn(input.texts)
  if (compatible(byText)) {
    if (hasTableSource(byText)) return byText
    // קרא את מה שהמדריך כתב לפני שמסיקים לבד:
    //  • מפעל/גביע בלי טבלה (ליגת האלופות של אסיה) — ממשיכים לטבלה של
    //    הליגה של הקבוצות, שעדיפה על "אין נתוני טבלה".
    //  • ליגה שהמדריך מצהיר עליה ("ליגה לאומית") — זו הליגה של המשחק.
    //    בלי העצירה כאן, "מ.ס. אשדוד נגד מכבי קריית גת" סוין כליגת העל רק
    //    מפני שאשדוד מוכרת מהליגה הראשונה, והטבלה שהוצגה הייתה של ליגה אחרת.
    if (!byText.cup) return undefined
  }

  // אין שם מסגרת בטקסט ("ישיר! ארהוס - סונדריסקה") — מזהים לפי הקבוצות.
  const homeLeague = leagueForTeam(input.home)
  const awayLeague = leagueForTeam(input.away)
  if (compatible(homeLeague) && compatible(awayLeague)) {
    // ליגת העל מול הליגה הלאומית: קבוצה מהליגה הלאומית אינה משחקת בליגת
    // העל, ולכן המשחק הוא של הליגה הלאומית ("מ.ס. אשדוד - מ. קריית גת").
    if (isIsraeliLeague(homeLeague) && isIsraeliLeague(awayLeague)) {
      return homeLeague.id === awayLeague.id ? homeLeague : leagueById('israel-national')
    }
    // שתי קבוצות מליגות שונות = משחק בין-לאומי/גביע בלי מסגרת מזוהה.
    return homeLeague.id === awayLeague.id ? homeLeague : undefined
  }
  if (compatible(homeLeague)) return homeLeague
  if (compatible(awayLeague)) return awayLeague

  if (sport !== 'football') return undefined
  if (bothIsraeliClubs([input.home, input.away])) {
    return israeliLeagueFor(input.home) ?? israeliLeagueFor(input.away)
  }
  return undefined
}

/** תרגום אזור הטבלה שסיפק המקור (ESPN) לעברית. */
export function zoneLabel(zone: string | undefined): string {
  if (!zone) return ''
  const normalized = zone.toLowerCase()
  if (normalized.includes('champions league')) return 'ליגת האלופות'
  if (normalized.includes('conference league')) return 'ליגת הכנס'
  if (normalized.includes('europa league')) return 'הליגה האירופית'
  if (normalized.includes('relegation playoff')) return 'פלייאוף ירידה'
  // ESPN משתמשת גם ב"Relegation" וגם ב"Relegated".
  if (/relegat/.test(normalized)) return 'מאבק ירידה'
  if (normalized.includes('promotion playoff')) return 'פלייאוף עלייה'
  if (normalized.includes('promotion')) return 'עלייה'
  if (normalized.includes('championship round')) return 'פלייאוף אליפות'
  if (normalized.includes('qualification') || normalized.includes('qualifying')) {
    return 'מוקדמות'
  }
  if (/win|title|champion/.test(normalized)) return 'מאבק אליפות'
  return zone
}
