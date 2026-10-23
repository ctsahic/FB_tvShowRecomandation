/**
 * קטלוג הערוצים של מדריך השידורים (antifriz.tv) — בקונפיגורציה ולא בקוד המנוע.
 *
 * הרשימה כאן היא הרשימה הרשמית של 131 הערוצים במדריך, עם המזהה (slug)
 * שמשמש לכתובת /tv-guide/<id> באתר.
 * היא משמשת לשני דברים:
 *   1. תצוגת בחירה בהגדרות — המשתמש בוחר לאילו ערוצים לשלוף לוח שידורים.
 *   2. סדר וקטלוג — המספר (channel_number) והקטגוריה של כל ערוץ.
 *
 * רק הערוצים שנבחרו (settings.provider.epgChannelIds) נשלפים בפועל, ולכן
 * סריקה יומית של 2–5 ערוצים לא מפילה את האתר ולא חוסמת את ה-IP.
 */

export type ChannelCategory =
  | 'general'
  | 'movies'
  /**
   * סרטים לילדים ולמשפחה — קטגוריה נפרדת מ„סרטים” וממ„ילדים”.
   *
   * שלושת הערוצים האלה (Yes Movies KIDS, Cinema Family, FreeTV Movies Family)
   * היו מפוזרים בין „סרטים” (סרטי משפחה) ל„ילדים” (ערוץ סרטי הילדים), ולכן
   * בחירת „כל הסרטים” הייתה מערבבת סרטי מבוגרים עם סרטי ילדים. עכשיו אפשר
   * לבחור „כל סרטי הילדים” בנפרד, ומי שרוצה רק סרטים למבוגרים מסיר אותם
   * בלחיצה אחת.
   */
  | 'movies-kids'
  | 'series'
  | 'sport'
  | 'news'
  | 'kids'
  | 'documentary'
  | 'music'

export interface ChannelCategoryDef {
  id: ChannelCategory
  /** תווית בעברית להצגה בהגדרות. */
  label: string
}

export const CHANNEL_CATEGORIES: readonly ChannelCategoryDef[] = [
  { id: 'general', label: 'כללי' },
  { id: 'movies', label: 'סרטים' },
  { id: 'movies-kids', label: 'סרטי ילדים' },
  { id: 'series', label: 'סדרות' },
  { id: 'sport', label: 'ספורט' },
  { id: 'news', label: 'חדשות' },
  { id: 'kids', label: 'ילדים' },
  { id: 'documentary', label: 'תיעודי' },
  { id: 'music', label: 'מוזיקה' },
]

export interface EpgChannelDef {
  /** מספר הערוץ במדריך — גם סדר התצוגה בהגדרות. */
  number: number
  /** מזהה ה-slug באתר antifriz.tv (/tv-guide/<id>). */
  id: string
  name: string
  category: ChannelCategory
}

export const CHANNEL_CATALOG: readonly EpgChannelDef[] = [
  { number: 1, id: '9-kanal-hd-il', name: '9 Канал HD', category: 'general' },
  { number: 2, id: 'channel10-il-hd', name: 'Channel 10 HD', category: 'general' },
  { number: 3, id: '11-kanal-il', name: 'Kan 11 HD', category: 'general' },
  { number: 4, id: '12-kanal-il', name: 'Keshet 12 HD', category: 'general' },
  { number: 5, id: '13-kanal-il', name: 'Reshet 13 HD', category: 'general' },
  { number: 6, id: '14-kanal-il', name: 'Channel 14 HD', category: 'general' },
  { number: 7, id: '16-kanal-il-hd', name: 'Channel 16 HD', category: 'general' },
  { number: 8, id: 'i24-il', name: 'i24 HD', category: 'news' },
  { number: 9, id: 'yes-movies-action-hd-il', name: 'Yes Movies Action HD', category: 'movies' },
  { number: 10, id: 'yes-movies-comedy-il', name: 'Yes Movies Comedy HD', category: 'movies' },
  { number: 11, id: 'yes-movies-drama-il-hd', name: 'Yes Movies Drama HD', category: 'movies' },
  { number: 12, id: 'yes-action-hd-il', name: 'Yes TV Action HD', category: 'series' },
  { number: 13, id: 'yes-comedy-hd-il', name: 'Yes TV Comedy HD', category: 'series' },
  { number: 14, id: 'yes-drama-hd-il', name: 'Yes TV Drama HD', category: 'series' },
  { number: 15, id: 'yes-plus-cinema-il-hd', name: 'Yes+ Cinema HD', category: 'movies' },
  { number: 16, id: 'yes-plus-diamonds-il-hd', name: 'Yes+ Diamonds HD', category: 'movies' },
  { number: 17, id: 'yes-plus-dark-il-hd', name: 'Yes+ Dark HD', category: 'movies' },
  { number: 18, id: 'yes-plus-love-il-hd', name: 'Yes+ Love HD', category: 'movies' },
  { number: 19, id: 'hot-cinema1-il', name: 'HOT Cinema 1 HD', category: 'movies' },
  { number: 20, id: 'hot-cinema2-il', name: 'HOT Cinema 2 HD', category: 'movies' },
  { number: 21, id: 'hot-cinema3-il', name: 'HOT Cinema 3 HD', category: 'movies' },
  { number: 22, id: 'hot-cinema4-il', name: 'HOT Cinema 4 HD', category: 'movies' },
  { number: 23, id: 'hot-cinema5-il', name: 'HOT Cinema 5 HD', category: 'movies' },
  { number: 24, id: 'hot-israeli-cinema-il-hd', name: 'HOT Israeli Cinema HD', category: 'movies' },
  { number: 25, id: 'hot-romantic-cinema-il-hd', name: 'HOT Romantic Cinema HD', category: 'movies' },
  { number: 26, id: 'freetv-movies-10-stars-il-hd', name: 'FreeTV Movies 10 Stars HD', category: 'movies' },
  { number: 27, id: 'freetv-movies-action-il-hd', name: 'FreeTV Movies Action HD', category: 'movies' },
  { number: 28, id: 'freetv-movies-comedy-il-hd', name: 'FreeTV Movies Comedy HD', category: 'movies' },
  { number: 29, id: 'freetv-movies-feel-good-il-hd', name: 'FreeTV Movies Feel Good HD', category: 'movies' },
  { number: 30, id: 'freetv-movies-thriller-il-hd', name: 'FreeTV Movies Thriller HD', category: 'movies' },
  { number: 31, id: 'freetv-movies-horror-il-hd', name: 'FreeTV Movies Horror HD', category: 'movies' },
  { number: 32, id: 'freetv-movies-drama-il-hd', name: 'FreeTV Movies Drama HD', category: 'movies' },
  { number: 33, id: 'freetv-movies-romantic-il-hd', name: 'FreeTV Movies Romantic HD', category: 'movies' },
  { number: 34, id: 'freetv-movies-israeli-il-hd', name: 'FreeTV Movies Israeli HD', category: 'movies' },
  { number: 35, id: 'freetv-series-comedy-il-hd', name: 'FreeTV Series Comedy HD', category: 'series' },
  { number: 36, id: 'freetv-series-comedy2-il-hd', name: 'FreeTV Series Comedy 2 HD', category: 'series' },
  { number: 37, id: 'freetv-series-drama-il-hd', name: 'FreeTV Series Drama HD', category: 'series' },
  { number: 38, id: 'freetv-series-global-il-hd', name: 'FreeTV Series Global HD', category: 'series' },
  { number: 39, id: 'global-action-channel-il-hd', name: 'Global Action Channel 1 HD', category: 'movies' },
  { number: 40, id: 'global-action-channel2-il-hd', name: 'Global Action Channel 2 HD', category: 'movies' },
  { number: 41, id: 'humor-channel-il-hd', name: 'Humor Channel HD', category: 'series' },
  { number: 42, id: 'humor-channel2-il-hd', name: 'Humor channel 2 HD', category: 'series' },
  { number: 43, id: 'classic-comedy-channel-il-hd', name: 'Classic Comedy Channel HD', category: 'series' },
  { number: 44, id: 'freetv-eretz-nehederet-il-hd', name: 'FreeTV Eretz Nehederet HD', category: 'series' },
  { number: 45, id: 'freetv-movies-savri-il-hd', name: 'FreeTV Savri Maranan HD', category: 'series' },
  { number: 46, id: 'hot-comedy-central-il-hd', name: 'HOT Comedy HD', category: 'series' },
  { number: 47, id: 'hot-hbo-il', name: 'HOT Drama HD', category: 'series' },
  { number: 48, id: 'hot-zone-hd-il', name: 'Zone HD', category: 'series' },
  { number: 49, id: 'hot3-hd-il', name: 'HOT 3 HD', category: 'general' },
  { number: 50, id: 'hot-8-il-hd', name: 'HOT 8 HD', category: 'general' },
  { number: 51, id: 'entertainment-il', name: 'HOT Entertainment HD', category: 'general' },
  { number: 52, id: 'yes-israel-il', name: 'Yes Israeli HD', category: 'general' },
  { number: 53, id: 'channel24-il-hd', name: 'Channel 24 HD', category: 'news' },
  { number: 54, id: 'viva-premium-il-hd', name: 'Viva Premium HD', category: 'series' },
  { number: 55, id: 'viva-plus-il', name: 'Viva Istanbul HD', category: 'series' },
  { number: 56, id: 'viva-il', name: 'Viva Telenovelas HD', category: 'series' },
  { number: 57, id: 'viva-vintage-il', name: 'Viva Vintage', category: 'series' },
  { number: 58, id: 'turkish-dramas-plus-il', name: 'Turkish Dramas Plus HD', category: 'series' },
  { number: 59, id: 'turkish-dramas2-il-hd', name: 'Turkish Dramas 2 HD', category: 'series' },
  { number: 60, id: 'turkish-dramas3-il-hd', name: 'Turkish Dramas 3 HD', category: 'series' },
  { number: 61, id: 'yamtihoni-il', name: 'Yam Tichoni HD', category: 'movies' },
  { number: 62, id: 'yam-tichoni-plus-hd', name: 'Yam Tichoni+ HD', category: 'movies' },
  { number: 63, id: 'mediterranean-movie-channel-il-hd', name: 'Mediterranean Movie Channel 1 HD', category: 'movies' },
  { number: 64, id: 'mediterranean-movie-channel2-il-hd', name: 'Mediterranean Movie Channel 2 HD', category: 'movies' },
  /*
   * Vamos HD אינו ערוץ ספורט — הוא יושב ב„כללי” בלבד, ולא ייכלל ב„בחר את כל
   * קטגוריית הספורט”. המספר (65) נשאר כמו במדריך.
   */
  { number: 65, id: 'vamos-il-hd', name: 'Vamos HD', category: 'general' },
  { number: 66, id: 'hot-bollywood-il', name: 'Bollywood Indian Movies HD', category: 'movies' },
  { number: 67, id: 'bollywood-classic-il-hd', name: 'Bollywood Indian Classic Movies HD', category: 'movies' },
  { number: 68, id: 'indian-series-il-hd', name: 'Indian Drama 1 HD', category: 'series' },
  { number: 69, id: 'indian-series2-il-hd', name: 'Indian Drama 2 HD', category: 'series' },
  { number: 70, id: 'sport1-hd-il', name: 'Sport 1 HD', category: 'sport' },
  { number: 71, id: 'sport2-hd-il', name: 'Sport 2 HD', category: 'sport' },
  { number: 72, id: 'sport3-hd-il', name: 'Sport 3 HD', category: 'sport' },
  { number: 73, id: 'sport4-hd-il', name: 'Sport 4 HD', category: 'sport' },
  { number: 74, id: 'sport5-hd-il', name: 'Sport 5 HD', category: 'sport' },
  { number: 75, id: 'yes-sport5-plus-il-hd', name: 'Sport 5+ HD', category: 'sport' },
  { number: 76, id: 'sport5-plus-live-hd-il', name: 'Sport 5 Live HD', category: 'sport' },
  { number: 77, id: 'sport5-stars-il-hd', name: 'Sport 5 Stars HD', category: 'sport' },
  { number: 78, id: 'sport5-gold-il', name: 'Sport 5 Gold HD', category: 'sport' },
  { number: 79, id: 'sport5-max-il-hd', name: 'Sport 5 MAX HD', category: 'sport' },
  { number: 80, id: 'sport6-il-hd', name: 'Sport 6 HD', category: 'sport' },
  { number: 81, id: 'eurosport1-il-hd', name: 'Eurosport 1 HD IL', category: 'sport' },
  { number: 82, id: 'eurosport2-il-hd', name: 'Eurosport 2 HD IL', category: 'sport' },
  { number: 83, id: 'one-hd-il', name: 'One HD', category: 'sport' },
  { number: 84, id: 'one2-hd-il', name: 'One 2 HD', category: 'sport' },
  { number: 85, id: 'ego-total-il', name: 'Ego Channel HD', category: 'general' },
  { number: 86, id: 'animal-planet-il-hd', name: 'Animal Planet HD IL', category: 'documentary' },
  { number: 87, id: 'nature-channel-il-hd', name: 'Nature Channel HD', category: 'documentary' },
  { number: 88, id: 'yes-natgeo-wild-il-hd', name: 'National Geographic Wild HD', category: 'documentary' },
  { number: 89, id: 'yes-natgeo-il-hd', name: 'National Geographic HD IL', category: 'documentary' },
  { number: 90, id: 'discovery-hd-il', name: 'Discovery HD', category: 'documentary' },
  { number: 91, id: 'history-il', name: 'History HD IL', category: 'documentary' },
  { number: 92, id: 'travel-channel-il', name: 'HOT Travel Channel HD', category: 'documentary' },
  { number: 93, id: 'yes-travel-channel-il', name: 'Yes Travel Channel HD', category: 'documentary' },
  { number: 94, id: 'yes-docu-il-hd', name: 'Yes Docu HD', category: 'documentary' },
  { number: 95, id: 'one-doco-il-hd', name: 'One Doco HD', category: 'documentary' },
  { number: 96, id: 'vacation-channel-il-hd', name: 'Vacation Channel HD', category: 'documentary' },
  { number: 97, id: 'hot-mind-il-hd', name: 'HOT Mind HD', category: 'documentary' },
  { number: 98, id: 'home-plus-il', name: 'Home Plus HD', category: 'general' },
  { number: 99, id: 'the-design-channel-il-hd', name: 'Design Channel HD', category: 'general' },
  { number: 100, id: 'tlc-il-hd', name: 'TLC HD IL', category: 'general' },
  { number: 101, id: 'game-show-il-hd', name: 'Game Show HD', category: 'general' },
  { number: 102, id: 'hot-real-il-hd', name: 'HOT Real HD', category: 'general' },
  { number: 103, id: 'love-channel-il-hd', name: 'Love Channel HD', category: 'general' },
  { number: 104, id: 'yes-reality-channel-il-hd', name: 'Reality Channel HD', category: 'general' },
  { number: 105, id: 'good-life-il', name: 'Good Life HD', category: 'general' },
  { number: 106, id: 'freetv-lifestyle-il-hd', name: 'FreeTV LifeStyle HD', category: 'general' },
  { number: 107, id: 'beautyz-il-hd', name: 'Beautyz HD', category: 'general' },
  { number: 108, id: 'e-il', name: 'E! HD', category: 'general' },
  { number: 109, id: 'the-food-channel-il', name: 'Food Channel HD', category: 'general' },
  { number: 110, id: 'food-network-il', name: 'Food Network HD IL', category: 'general' },
  { number: 111, id: 'foody-il-hd', name: 'Foody HD', category: 'general' },
  { number: 112, id: 'health-il', name: 'Healt HD', category: 'general' },
  { number: 113, id: 'yes-movies-kids-hd-il', name: 'Yes Movies KIDS HD', category: 'movies-kids' },
  { number: 114, id: 'cinema-family-il-hd', name: 'Cinema Family HD', category: 'movies-kids' },
  { number: 115, id: 'freetv-movies-family-il-hd', name: 'FreeTV Movies Family HD', category: 'movies-kids' },
  { number: 116, id: 'yes-disney-il-hd', name: 'Disney HD', category: 'kids' },
  { number: 117, id: 'disney-jr-il', name: 'Disney Jr', category: 'kids' },
  { number: 118, id: 'yes-nickelodeon-il', name: 'Nickelodeon HD IL', category: 'kids' },
  { number: 119, id: 'nick-jr-il', name: 'Nick Jr HD IL', category: 'kids' },
  { number: 120, id: 'teennick-il', name: 'TeenNick HD', category: 'kids' },
  { number: 121, id: 'hop-il-hd', name: 'HOP HD', category: 'kids' },
  { number: 122, id: 'hop-childhood-il', name: 'HOP Childhood HD', category: 'kids' },
  { number: 123, id: 'luli-il', name: 'Luli', category: 'kids' },
  { number: 124, id: 'baby-il', name: 'Baby HD', category: 'kids' },
  { number: 125, id: 'zoom-il', name: 'Zoom HD', category: 'kids' },
  { number: 126, id: 'zoom-toon-il-hd', name: 'Zoom Toon HD', category: 'kids' },
  { number: 127, id: 'kan23-il', name: 'Kan23 HD', category: 'kids' },
  { number: 128, id: 'junior-il', name: 'Junior HD', category: 'kids' },
  { number: 129, id: 'music-il-hd', name: 'Music HD', category: 'music' },
  { number: 130, id: 'freetv-music-channel-il-hd', name: 'The Music Channel HD', category: 'music' },
  { number: 131, id: 'hot-senior-il-hd', name: 'HOT Senior HD', category: 'general' },
]

/** מיפוי מהיר מ-slug להגדרת ערוץ (כולל מספר וקטגוריה). */
export const CHANNEL_BY_ID: ReadonlyMap<string, EpgChannelDef> = new Map(
  CHANNEL_CATALOG.map((channel) => [channel.id, channel]),
)

/**
 * ברירת המחדל לבדיקת ה-EPG היומית: כל ערוצי הספורט המרכזיים —
 * Sport 1, 2, 3, 4, 5, 6, 5+ ו-5 Live.
 *
 * הברירת מחדל היא ספורט כי זו הסיבה העיקרית לפתוח את האפליקציה: בלי ערוצי
 * ספורט בסריקה משחקים חיים לא נאספים בכלל — לוח השידורים נשלף רק לערוצים
 * שכאן. מנגד, כל ערוץ הוא בקשת GET אחת ועוד השהיה, ולכן זו ברירת מחדל
 * מאוזנת ולא כל 131 הערוצים.
 *
 * הרשימה כתובה בסדר הקטלוג (5+ ו-5 Live יושבים בין 5 ל-6) — זה גם הסדר שבו
 * היא מוצגת ונסרקת.
 */
export const DEFAULT_EPG_CHANNEL_IDS: readonly string[] = [
  'sport1-hd-il',
  'sport2-hd-il',
  'sport3-hd-il',
  'sport4-hd-il',
  'sport5-hd-il',
  'yes-sport5-plus-il-hd',
  'sport5-plus-live-hd-il',
  'sport6-il-hd',
]

/**
 * השהיה בין בקשה לבקשה (בשניות). אין שרת EPG — כל ערוץ הוא בקשת GET אחת,
 * ולכן ההשהיה נשמרת בהגדרות וניתנת לשינוי.
 */
export const DEFAULT_CHANNEL_DELAY_SECONDS = 10

/** גבולות ההשהיה המותרים בהגדרות. */
export const MIN_CHANNEL_DELAY_SECONDS = 0
export const MAX_CHANNEL_DELAY_SECONDS = 120

/** תווית הקטגוריה בעברית, למשל 'movies' -> 'סרטים'. */
export function categoryLabel(category: ChannelCategory): string {
  return CHANNEL_CATEGORIES.find((entry) => entry.id === category)?.label ?? 'כללי'
}

/** האם מזהה ערוץ מופיע בקטלוג. */
export function isKnownChannelId(id: string): boolean {
  return CHANNEL_BY_ID.has(id)
}

/** רשימת המזהים של הקטלוג, בסדר הערוצים. */
export function catalogChannelIds(): string[] {
  return CHANNEL_CATALOG.map((channel) => channel.id)
}

/** הערוצים של קטגוריה אחת, בסדר הקטלוג (המספרים עולים). */
export function channelsInCategory(category: ChannelCategory): EpgChannelDef[] {
  return CHANNEL_CATALOG.filter((channel) => channel.category === category)
}

/**
 * בחירת כל ערוצי הקטגוריה או ניקוים, מתוך בחירה קיימת.
 *
 * התוצאה תמיד בסדר הקטלוג (ולא בסדר הלחיצות) — כדי שחתימת המטמון תישאר
 * יציבה ולא ייווצר מצב שבו אותה בחירה בדיוק נחשבת אחרת בין סריקות.
 */
export function toggleCategorySelection(
  selected: readonly string[],
  category: ChannelCategory,
  checked: boolean,
): string[] {
  const ids = new Set(channelsInCategory(category).map((channel) => channel.id))
  const current = new Set(selected)
  return CHANNEL_CATALOG.filter((channel) =>
    ids.has(channel.id) ? checked : current.has(channel.id),
  ).map((channel) => channel.id)
}

/**
 * סינון בחירת המשתמש לקטלוג בלבד, בלי כפילויות, לפי סדר הקטלוג.
 * בחירה ריקה מוחזרת כמו שהיא — הקורא מחליט על ברירת מחדל.
 */
export function normalizeChannelSelection(ids: readonly string[]): string[] {
  const wanted = new Set(ids.filter((id) => isKnownChannelId(id)))
  return CHANNEL_CATALOG.filter((channel) => wanted.has(channel.id)).map((channel) => channel.id)
}

/**
 * חתימת הבחירה. היא נשמרת במטמון כדי לדעת אם המשתמש החליף ערוצים —
 * ואם לא, אין צורך לגשת לאתר שוב באותו יום.
 */
export function channelSelectionSignature(ids: readonly string[]): string {
  return normalizeChannelSelection(ids).join(',')
}
