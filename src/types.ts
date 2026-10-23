/**
 * Shared domain types for the TV recommender.
 *
 * Everything in the app (data clients, engine, UI) codes against these types.
 * NOTE: this project uses `verbatimModuleSyntax`, so type-only imports must be
 * written as `import type { ... } from '...'`.
 */

/** A live channel from the IPTV provider. */
export interface Channel {
  /** Stable id used to attach EPG programmes to this channel. */
  id: string
  /** Display name, usually Hebrew. */
  name: string
  /** Provider category / group title. */
  group?: string
  /** Channel logo url. */
  icon?: string
  /** tvg-id used to match XMLTV programmes (source mode `m3u+xmltv`). */
  epgId?: string
  /** Channel number as reported by the provider. */
  number?: number
  /** Whether the channel was detected as an Israeli channel. */
  israeli?: boolean
}

/** A single EPG programme on a channel. */
export interface Programme {
  /** Channel.id this programme belongs to. */
  channelId: string
  channelName: string
  title: string
  subTitle?: string
  description?: string
  /** Start time, epoch milliseconds. */
  start: number
  /** End time, epoch milliseconds. */
  stop: number
  /** Raw categories from the EPG source (may be Hebrew, e.g. "סרט"). */
  categories: string[]
  /** Provider supplied rating 0-10 (star-rating / rating tag). */
  rating?: number
  ratingSystem?: string
  /** Provider marks this as a live broadcast. */
  isLive?: boolean
  isNew?: boolean
  isPremiere?: boolean
  /** "S01E04" style episode code when the EPG provides it. */
  episode?: string
  season?: number
  episodeNumber?: number
  year?: number
  /** True when the EPG attached an image (usually a real poster). */
  hasImage?: boolean
  credits?: ProgrammeCredits
}

export interface ProgrammeCredits {
  director?: string[]
  actors?: string[]
}

/**
 * High level bucket a programme is sorted into.
 *
 * `movie-kids` הוא סרט לילדים/משפחה — קטגוריה נפרדת מ„סרטים” (סרטי מבוגרים)
 * ומ„ילדים” (ערוצי ילדים). ההפרדה נעשית לפי הערוץ („סרטי ילדים”), לפי מילות
 * המפתח בכותרת/תקציר, ואחרי ההעשרה גם לפי הז׳אנרים של TMDB (אנימציה / משפחה).
 */
export type Category =
  | 'sport'
  | 'series'
  | 'movie'
  | 'movie-kids'
  | 'news'
  | 'kids'
  | 'other'

/**
 * סוג האירוע הספורטיבי שזוהה מכותרת ה-EPG.
 * התג בכרטיס ובמסך הפרטים מציג את הענף ("כדורגל", "הוקי", "כדורסל"…),
 * ולכן הזיהוי הוא על הענף עצמו ולא רק על "ספורט".
 */
export type SportKind =
  | 'football'
  | 'basketball'
  | 'hockey'
  | 'tennis'
  | 'handball'
  | 'volleyball'
  | 'american-football'
  | 'baseball'
  | 'motorsport'
  | 'combat'
  | 'other'

/** Why a programme was recommended. Rendered as Hebrew chips in the UI. */
export type ReasonKind =
  | 'ratings'
  | 'acclaimed'
  | 'favorite'
  | 'favoriteTeam'
  | 'rivalry'
  | 'stakes'
  | 'competition'
  | 'live'
  | 'newEpisode'
  | 'premiere'
  | 'genre'
  | 'newsPriority'
  | 'freshness'
  | 'alternates'
  | 'info'

export interface Reason {
  kind: ReasonKind
  /** Hebrew explanation shown to the user, e.g. "ציון TMDB 8.4 (12,431 מדרגים)". */
  text: string
  /** How much this reason contributed to the total score. */
  weight: number
}

/** External metadata attached to a movie/series recommendation. */
export interface Enrichment {
  source: 'tmdb' | 'none'
  tmdbId?: number
  tmdbMediaType?: 'movie' | 'tv'
  /** 0-10 average score. */
  tmdbRating?: number
  tmdbVotes?: number
  popularity?: number
  /** Hebrew overview, when TMDB has a he-IL translation. */
  overview?: string
  /** Hebrew genre names. */
  genres?: string[]
  posterPath?: string
  releaseYear?: number
  hebrewTitle?: string
  /** Number of seasons reported by TMDB (series only). */
  numberOfSeasons?: number
  /** True when TMDB flags it as still airing / not ended. */
  stillAiring?: boolean
  /* --- ציוני OMDb (IMDb / Rotten Tomatoes) — משלימים את TMDB --- */
  /** מזהה IMDb, למשל "tt1375666". */
  imdbId?: string
  /** ציון IMDb, 0-10. */
  imdbRating?: number
  /** מספר המצביעים ב-IMDb. */
  imdbVotes?: number
  /** ציון Rotten Tomatoes באחוזים (86 = 86%). */
  rottenTomatoes?: number
  /** ציון Metacritic, 0-100. */
  metascore?: number
}

/** A team involved in a sport broadcast. */
export interface TeamRef {
  /** Canonical Hebrew name. */
  name: string
  /** Official English name, when the table uses one (e.g. "Internazionale"). */
  englishName?: string
  /** Other spellings / provider spellings that map to this team. */
  aliases?: string[]
  /** League the position came from, e.g. "ליגה איטלקית". */
  leagueName?: string
  /** League table position, when known. */
  position?: number
  played?: number
  points?: number
  goalDifference?: number
  /** True when this is the user's favourite team. */
  isFavorite?: boolean
  /** Pre-rendered Hebrew rank text, e.g. "מקום 3 (41 נק')". */
  rankText?: string
}

/** Everything the app knows about a sport broadcast beyond the raw EPG row. */
export interface SportContext {
  sport: string
  competition?: string
  homeTeam?: TeamRef
  awayTeam?: TeamRef
  isDerby?: boolean
  /** e.g. "דרבי תל אביבי", "משחק עונה". */
  rivalryLabel?: string
  /** True when the EPG marks this as a live broadcast. */
  isLive: boolean
  /** 0..100 — כמה המשחק "עסיסי" (דרבי, צמרת, קבוצה אהודה). */
  juice: number
  /** Hebrew label for the juice level, e.g. "ג׳וס מלא". */
  juiceLabel: string
}

export type RecommendationStatus = 'live' | 'starting-soon' | 'upcoming'

export interface Recommendation {
  /** Stable id: `${channel.id}:${programme.start}`. */
  id: string
  category: Category
  programme: Programme
  channel: Channel
  /** 0-100 interest score. */
  score: number
  reasons: Reason[]
  /**
   * Short Hebrew headline, e.g. "משחק גדול — ליגת האלופות".
   * בכרטיסי ספורט היא מוצגת בכותרת; בכרטיסי סרט/סדרה/חדשות היא נשארת כמידע
   * ולא מוצגת, כי הכותרת והתגים כבר אומרים את אותו הדבר — בלי כפילות.
   */
  headline: string
  /** One sentence Hebrew "why you should watch this" — בלי לחזור על הציון. */
  verdict: string
  status: RecommendationStatus
  /** Minutes until start; negative when already live. */
  startsInMinutes: number
  /** Minutes remaining for a live programme. */
  minutesLeft?: number
  /** True when this is one of the user's favourite movies/series. */
  favorite: boolean
  /** True when the user's favourite team is playing. */
  favoriteTeam: boolean
  enrichment?: Enrichment
  sport?: SportContext
}

export interface ScanWarning {
  code: string
  message: string
}

/**
 * שלבי הסריקה, בסדר שבו הם קורים. הבאר של ההתקדמות מצייר אותם אחד-אחד
 * כדי שהמשתמש יראה מה קורה מאחורי הקלעים בזמן ההמתנה הארוכה.
 */
export type ScanPhase =
  /** רשימת הערוצים (בקשה אחת). */
  | 'list'
  /** שליפת לוח השידורים של ערוץ. */
  | 'channels'
  /** ההשהיה שהוגדרה בהגדרות לפני הערוץ הבא. */
  | 'waiting'
  /** העשרה ממקור סרטים (TMDB) — ציונים, ביקורות ופוסטרים. */
  | 'enrich'
  /** חישוב ההמלצות מהנתונים שנאספו. */
  | 'recommend'
  /** קריאה מהמטמון — בלי לפנות לאתר. */
  | 'cache'

export interface ScanProgress {
  phase: ScanPhase
  /** המשפט שמוצג למשתמש, בעברית. */
  message: string
  /** שם השלב בקצרה, לשורת הכותרת של הבאר. */
  label: string
  /** 0..1 — ההתקדמות הכוללת נכון לרגע הפליטה. */
  ratio: number
  /** כמה פריטים הושלמו בשלב הזה. */
  done: number
  /** כמה פריטים יש בשלב הזה (0 = לא ידוע). */
  total: number
  /** הערוץ שנשלף כעת, או זה שממתינים לו. */
  channelName?: string
  /** מספר הערוץ בקטלוג (1..131) — לתצוגה. */
  channelNumber?: number
  /** שם מקור ההעשרה, למשל 'TMDB'. */
  source?: string
  /** שלב המתנה: מתי ההשהיה נגמרת (epoch ms) ויחס ההתקדמות בסופה. */
  waitUntil?: number
  ratioAfterWait?: number
  /** אורך ההשהיה בשניות, כפי שהוגדר. */
  waitSeconds?: number
}

export interface ScanResult {
  generatedAt: number
  channelsScanned: number
  programmesScanned: number
  recommendations: Recommendation[]
  byCategory: Record<Category, Recommendation[]>
  warnings: ScanWarning[]
  /** Catalog used for the "settings" style pickers. */
  channels: Channel[]
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type ProviderMode = 'antifriz' | 'xtream' | 'm3u+xmltv'

export interface ProviderSettings {
  mode: ProviderMode
  /**
   * כתובת אתר לוח השידורים (antifriz.tv). זהו מקור ה-EPG כשאין שרת EPG
   * בפאנל — הרשימה של 131 הערוצים נשלפת מהאתר ומטמון ל-12 שעות.
   */
  antifrizBase: string
  /** Xtream panel base, e.g. "http://bethoven.af.stream.com:8080" or just "bethoven.af.stream.com". */
  host: string
  username: string
  password: string
  /** Used in `m3u+xmltv` mode. */
  m3uUrl: string
  xmltvUrl: string
  /** Only consider channels detected as Israeli. */
  israeliOnly: boolean
  /** Extra group names to treat as Israeli channels. */
  israeliGroupHints: string[]
  /**
   * רק הערוצים האלה נבדקים בסריקת ה-EPG (slug מתוך קטלוג antifriz).
   * הבחירה נשמרת ומשמשת גם לחתימת המטמון — אם היא לא השתנתה, אין קריאה נוספת
   * לאתר באותו יום.
   */
  epgChannelIds: string[]
  /** השהיה בין בקשה לבקשה (בשניות) בזמן שליפת לוח השידורים. */
  channelDelaySeconds: number
}

export interface ApiSettings {
  /** מפתח TMDB — ציונים, פוסטרים ותקצירים בעברית. */
  tmdbApiKey: string
  /** מפתח OMDb — ציוני IMDb ו-Rotten Tomatoes לסרטים. */
  omdbApiKey: string
  /** Football data provider key (api-football compatible). */
  footballApiKey: string
  footballBaseUrl: string
}

/**
 * סדר ההמלצות בתצוגה:
 *  • 'time'  — מה שמשודר עכשיו, ואחריו השידור שהזמן שלו הכי קרוב (ברירת מחדל).
 *              המטרה: לראות משהו מעניין **עכשיו** בלי לחפש.
 *  • 'score' — הציון הגבוה ביותר קודם.
 */
export type SortMode = 'time' | 'score'

export interface PreferenceSettings {
  /** The user's team — always boosted. Default: הפועל באר שבע. */
  favoriteTeam: string
  favoriteSeries: string[]
  favoriteMovies: string[]
  favoriteChannels: string[]
  /** Sports tab shows live broadcasts only. */
  liveSportsOnly: boolean
  /**
   * הענפים שמעניינים את המשתמש ("football", "basketball", "tennis"…).
   * בטאב הספורט מוצג רק משחק מהענפים האלה, ורשימה ריקה = בלי סינון
   * (כל הענפים). ענף שלא זוהה ('other') נשאר בכל מקרה — לא מסתירים משהו
   * רק מפני שלא הצלחנו לתייג אותו.
   */
  sportKinds: SportKind[]
  /**
   * סרט שידוע עליו ציון (TMDB/IMDb/EPG) מתחת לזה לא מוצג בכלל.
   * חריגים: סרט בלי שום ציון ידוע, וסרט מהמועדפים שלי. 0 מכבה את הסינון.
   */
  minMovieRating: number
  /**
   * סרט שמסד הנתונים של הסרטים (TMDB/OMDb) לא הכיר — בלי ציון, בלי תקציר
   * ובלי ביקורת — לא מוצג בכלל: אין על מה להמליץ בכרטיס כזה.
   *
   * שני חריגים: סרט מהמועדפים שלי, וסרט שטרם נשאל עליו (למשל כשההעשרה
   * נעצרה בתקציב הזמן או שהרשת נפלה) — לא מסתירים סרט רק מפני שלא בדקנו.
   */
  hideUnratedMovies: boolean
  /** ציון מתחת לזה מוריד את נקודות הסדרה (קנס), אבל לא מסתיר אותה. */
  minSeriesRating: number
  /** Include an "important news" recommendation bucket. */
  includeNews: boolean
  /** סדר ההמלצות — לפי הזמן הקרוב (ברירת מחדל) או לפי הציון הגבוה. */
  sortMode: SortMode
  /** Look-ahead window in hours for "starting soon". */
  lookAheadHours: number
  /**
   * שעון בפינה הימנית העליונה. ברירת המחדל: מוצג (ערך חסר = מוצג), ורק כיבוי
   * מפורש בהגדרות מסתיר אותו — כדי שגם הגדרות שנשמרו לפני שהשעון נוסף יקבלו
   * אותו בלי שיצטרכו להדליק אותו ידנית בכל מכשיר.
   */
  showClock?: boolean
}

export interface Settings {
  provider: ProviderSettings
  api: ApiSettings
  prefs: PreferenceSettings
}

/** Result of a single IPTV scan, before recommendation. */
export interface EpgSnapshot {
  channels: Channel[]
  programmes: Programme[]
  warnings: ScanWarning[]
}

/* ------------------------------------------------------------------ */
/* Dependency interfaces (implemented by src/data and src/sports)      */
/* ------------------------------------------------------------------ */

export interface TmdbLookupInput {
  title: string
  year?: number
  category: Category
  isSeries: boolean
  signal?: AbortSignal
}

export interface TmdbClient {
  /**
   * מחזיר העשרה, או null כשלא נמצאה התאמה / אין מפתח.
   * **זורק** כשיש כשל ברשת או שגיאת הרשאה (מפתח שגוי) — כדי שהמנוע יוכל
   * לעצור את שלב הביקורות במקום להמשיך לנסות עשרות כותרים שלא יעבדו.
   */
  lookup(input: TmdbLookupInput): Promise<Enrichment | null>
}

export interface TeamStanding {
  /** Display name — Hebrew when the name map knows the team. */
  name: string
  /** Official English name as it appears in the table. */
  englishName?: string
  aliases: string[]
  position: number
  played: number
  points: number
  goalDifference: number
  won?: number
  drawn?: number
  lost?: number
  goalsFor?: number
  goalsAgainst?: number
  /** Recent results string from the source, e.g. "WWDLW". */
  form?: string
  /** Table zone reported by the source, e.g. "Champions League", "Relegation". */
  zone?: string
  /**
   * אחוז ניצחונות 0..100 — הליגות שאין בהן נקודות טבלה (NBA) מדורגות לפיו.
   * קיים רק כשהמקור מדווח עליו.
   */
  winPercent?: number
}

export interface StandingsProvider {
  /** competition label such as "ליגת העל" or "ליגת האלופות". */
  getTable(competition: string, signal?: AbortSignal): Promise<TeamStanding[]>
  /** Resolve one team name against the loaded table (fuzzy, Hebrew aware). */
  resolve(name: string, table: TeamStanding[]): TeamStanding | undefined
}
