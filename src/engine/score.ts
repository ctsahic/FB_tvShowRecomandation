import type {
  Category,
  Channel,
  Enrichment,
  Programme,
  Reason,
  ReasonKind,
  Settings,
  SportContext,
  TeamRef,
  TeamStanding,
} from '../types'
import { he, tpl } from '../i18n/he'
import { classifyProgramme, isOnAir, type Classification } from './classify'
import {
  IMPORTANT_NEWS_CHANNELS,
  IMPORTANT_NEWS_PROGRAMS,
  KNOWN_GOOD_MOVIES,
  KNOWN_GOOD_SERIES,
  isFavoriteChannel,
  isFavoriteTitle,
  matchesContentList,
} from './favorites'
import { competitionImportance, findRivalry, isFavoriteTeam } from '../sports/teams'
import { findMatchLeague, leagueSport } from '../sports/leagues'
import { englishNameFor, hebrewNameFor } from '../sports/teamNames'
import { rankText, resolveTeam } from '../sports/standings'
import { combineRatings, describeSources, formatRating10 } from './ratings'

/** ז׳אנרים שמזוהים עם קהל רחב — בונוס קטן כש-TMDB מחזיר אותם. */
const CROWD_PLEASER_GENRES: readonly string[] = [
  'פעולה',
  'הרפתקאות',
  'מדע בדיוני',
  'פנטזיה',
  'מתח',
  'קומדיה',
  'פשע',
  'מסתורין',
]

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000

export interface ScoreInput {
  now: number
  settings: Settings
  /** טבלת הליגה הנוכחית (בדרך כלל bundledTable או טבלה מה-API). */
  table: readonly TeamStanding[]
  /**
   * הטבלה של הליגה שאליה שייך המשחק. כל ליגה נטענת מהמקור שלה (api-football /
   * ESPN / snapshot), ולכן משחק איטלקי מקבל את הטבלה האיטלקית ולא את הישראלית.
   * מחזיר מערך ריק כשאין טבלה לליגה הזו.
   */
  tableFor?: (leagueId: string) => readonly TeamStanding[]
  enrichment?: Enrichment | null
}

export interface ScoreOutcome {
  category: Category
  score: number
  reasons: Reason[]
  headline: string
  verdict: string
  favorite: boolean
  favoriteTeam: boolean
  sport?: SportContext
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/** צובר ניקוד + הסברים יחד, כדי שכל נקודה תהיה תמיד מוסברת. */
function makeAccumulator(base: number) {
  const reasons: Reason[] = []
  let score = base
  return {
    reasons,
    add(kind: ReasonKind, text: string, weight: number): void {
      if (weight === 0) return
      reasons.push({ kind, text, weight: round(weight) })
      score += weight
    },
    /** הפחתה ללא הצגת הסבר (למשל חוסר התאמה להעדפות). */
    penalize(amount: number): void {
      score -= amount
    },
    finish(): { score: number; reasons: Reason[] } {
      return { score: clamp(Math.round(score), 0, 100), reasons }
    },
  }
}

function yearOf(now: number): number {
  return new Date(now).getFullYear()
}

/* ------------------------------------------------------------------ */
/* סרטים                                                              */
/* ------------------------------------------------------------------ */

/**
 * הציון שממנו נגזר סף ההמלצה: הממוצע המשוקלל של כל המקורות הידועים
 * (IMDb, TMDB, Rotten Tomatoes), ואם אין אף ציון חיצוני — ציון ה-EPG.
 * 0 = אין שום ציון ידוע.
 *
 * הפונקציה מיוצאת כי גם סינון ההמלצות (recommend.ts) משתמש בה: הסף של
 * "ציון מינימלי לסרט" חייב להישפט בדיוק על אותו מספר שהמנוע מדרג לפיו.
 */
export function ratedScore(programme: Programme, enrichment: Enrichment | null): number {
  const combined = combineRatings(enrichment)
  if (combined) return combined.rating10
  return programme.rating ?? 0
}

function scoreMovie(
  programme: Programme,
  channel: Channel,
  input: ScoreInput,
): ScoreOutcome {
  const { prefs } = input.settings
  const acc = makeAccumulator(40)
  const enrichment = input.enrichment ?? null
  const favorite = isFavoriteTitle(programme.title, prefs.favoriteMovies)
  const combined = combineRatings(enrichment)
  const rating = combined?.rating10 ?? 0
  const votes = combined?.weight ?? 0
  // כשאין ציון חיצוני — ציון ה-EPG הוא המידע הטוב ביותר שיש להציג למשתמש.
  const displayRating = ratedScore(programme, enrichment)

  if (favorite) acc.add('favorite', he.why.favoriteMovie, 45)

  // 40 מדרגים ומעלה = מספיק קולות כדי שהציון המשוקלל ייחשב אמין.
  if (combined && votes >= 40) {
    acc.add(
      'ratings',
      tpl(he.why.weightedRating, {
        score: formatRating10(combined.rating10),
        sources: describeSources(combined),
      }),
      clamp((rating - 5.5) * 11, 0, 42),
    )
    if (rating >= 8 && votes >= 800) {
      acc.add('acclaimed', tpl(he.why.acclaimedMovie, { rating: rating.toFixed(1) }), 5)
    }
  } else if ((programme.rating ?? 0) > 0) {
    const epgRating = programme.rating ?? 0
    acc.add(
      'ratings',
      tpl(he.why.ratingsNoVotes, {
        source: programme.ratingSystem ?? 'EPG',
        rating: epgRating.toFixed(1),
      }),
      clamp((epgRating - 5.5) * 9, 0, 34),
    )
  } else if (matchesContentList(programme.title, KNOWN_GOOD_MOVIES)) {
    acc.add('acclaimed', he.why.knownGoodMovie, 14)
  }

  // סינון "סרט לא טוב" — אלא אם זה מועדף אישי.
  if (displayRating > 0 && displayRating < prefs.minMovieRating && !favorite) {
    acc.penalize((prefs.minMovieRating - displayRating) * 9)
  }

  const genreHits = (enrichment?.genres ?? []).filter((genre) =>
    CROWD_PLEASER_GENRES.some((pleaser) => genre.includes(pleaser)),
  )
  if (genreHits.length > 0) {
    acc.add('genre', tpl(he.why.genreStrong, { genres: genreHits.slice(0, 3).join(', ') }), 4)
  }

  const releaseYear = enrichment?.releaseYear
  if (releaseYear && yearOf(input.now) - releaseYear <= 3) {
    acc.add('freshness', tpl(he.why.freshMovie, { year: releaseYear }), 3)
  }

  if (isFavoriteChannel(channel.name, prefs.favoriteChannels)) {
    acc.add('favorite', tpl(he.why.favoriteChannel, { channel: channel.name }), 6)
  }
  if (isOnAir(programme, input.now)) {
    acc.add('live', he.why.onAirNow, 6)
  }

  const { score, reasons } = acc.finish()
  const headline = favorite
    ? he.headline.favoriteMovie
    : displayRating > 0
      ? he.headline.movieRated
      : tpl(he.headline.moviePlain, { channel: channel.name })
  // ה"למה" לא חוזרת על הציון: הוא מוצג פעם אחת בשורת הציונים שבכרטיס,
  // וכפילות שלו היא רק גובה מיותר על המסך.
  const verdict = favorite
    ? he.verdict.favorite
    : displayRating >= 8
      ? he.verdict.movieAcclaimed
      : displayRating > 0
        ? he.verdict.movie
        : he.verdict.solid

  return {
    category: 'movie',
    score: favorite ? Math.max(score, 82) : score,
    reasons,
    headline,
    verdict,
    favorite,
    favoriteTeam: false,
  }
}

/* ------------------------------------------------------------------ */
/* סדרות                                                              */
/* ------------------------------------------------------------------ */

function scoreSeries(
  programme: Programme,
  channel: Channel,
  input: ScoreInput,
): ScoreOutcome {
  const { prefs } = input.settings
  const acc = makeAccumulator(40)
  const enrichment = input.enrichment ?? null
  const favorite = isFavoriteTitle(programme.title, prefs.favoriteSeries)
  const combined = combineRatings(enrichment)
  const rating = combined?.rating10 ?? 0
  const votes = combined?.weight ?? 0
  const displayRating = ratedScore(programme, enrichment)

  if (favorite) acc.add('favorite', he.why.favoriteSeries, 45)

  if (combined && votes >= 30) {
    acc.add(
      'ratings',
      tpl(he.why.weightedRating, {
        score: formatRating10(combined.rating10),
        sources: describeSources(combined),
      }),
      clamp((rating - 6) * 12, 0, 44),
    )
    const seasons = enrichment?.numberOfSeasons ?? 0
    if (rating >= 8) {
      acc.add(
        'acclaimed',
        seasons > 0
          ? tpl(he.why.acclaimedSeries, { rating: rating.toFixed(1), seasons })
          : tpl(he.why.acclaimedSeriesNoSeasons, { rating: rating.toFixed(1) }),
        5,
      )
    } else if (rating >= 7.2) {
      acc.add('acclaimed', tpl(he.why.strongSeries, { rating: rating.toFixed(1) }), 3)
    }
  } else if (matchesContentList(programme.title, KNOWN_GOOD_SERIES)) {
    acc.add('acclaimed', he.why.knownGoodSeries, 16)
  }

  if (displayRating > 0 && displayRating < prefs.minSeriesRating && !favorite) {
    acc.penalize((prefs.minSeriesRating - displayRating) * 9)
  }

  if (programme.isNew || programme.isPremiere) {
    const season = programme.season
    const episode = programme.episodeNumber
    acc.add(
      'newEpisode',
      season && episode
        ? tpl(he.why.newEpisode, { season, episode })
        : he.why.newEpisodePlain,
      5,
    )
  }
  if (programme.isPremiere) acc.add('premiere', he.why.premiere, 4)

  const genreHits = (enrichment?.genres ?? []).filter((genre) =>
    CROWD_PLEASER_GENRES.some((pleaser) => genre.includes(pleaser)),
  )
  if (genreHits.length > 0) {
    acc.add('genre', tpl(he.why.genreStrong, { genres: genreHits.slice(0, 3).join(', ') }), 3)
  }

  if (isFavoriteChannel(channel.name, prefs.favoriteChannels)) {
    acc.add('favorite', tpl(he.why.favoriteChannel, { channel: channel.name }), 6)
  }
  if (isOnAir(programme, input.now)) {
    acc.add('live', he.why.onAirNow, 5)
  }

  const { score, reasons } = acc.finish()
  const headline = favorite
    ? he.headline.favoriteSeries
    : displayRating > 0
      ? he.headline.seriesRated
      : tpl(he.headline.seriesPlain, { channel: channel.name })
  const verdict = favorite
    ? he.verdict.favorite
    : displayRating >= 7.5
      ? he.verdict.series
      : he.verdict.solid

  return {
    category: 'series',
    score: favorite ? Math.max(score, 82) : score,
    reasons,
    headline,
    verdict,
    favorite,
    favoriteTeam: false,
  }
}

/* ------------------------------------------------------------------ */
/* ספורט                                                              */
/* ------------------------------------------------------------------ */

function buildTeamRef(
  name: string,
  table: readonly TeamStanding[],
  favoriteTeamName: string,
  leagueName?: string,
  /** הענף — קובע איך מנסחים את המיקום (נקודות טבלה מול מאזן). */
  sport?: string,
): TeamRef {
  const standing = resolveTeam(name, table)
  // מפות השמות (עברית↔אנגלית) מכירות מועדוני כדורגל וכדורסל ישראליים בלבד.
  // בענף אחר הן היו מלבישות שם של מועדון כדורגל על הקבוצה שבמדריך — למשל
  // "מ. אשדוד" בכדורעף הופכת ל"מ.ס. אשדוד", וזה מועדון אחר לגמרי.
  const mapped = sport === undefined || sport === 'football' || sport === 'basketball'
  // כשאין טבלה (כדורסל, ליגה בלי מקור) עדיין מתרגמים את השם מהמדריך לעברית
  // תקנית — "ה. י-ם" הוא "הפועל ירושלים" גם בלי מיקום בטבלה.
  const display = standing?.name ?? (mapped ? hebrewNameFor(name) : undefined) ?? name
  const ref: TeamRef = {
    name: display,
    // השם המקורי מה-EPG נשמר, כדי שמסך הפרטים יוכל לזהות את הקבוצה גם בטבלה
    // שנטענה מאוחרית (שם בעברית מול שם באנגלית).
    aliases: display !== name ? [name] : [],
    isFavorite: isFavoriteTeam(name, favoriteTeamName),
  }
  const mappedEnglish = standing?.englishName ?? (mapped ? englishNameFor(name) : undefined)
  if (mappedEnglish) ref.englishName = mappedEnglish
  if (leagueName) ref.leagueName = leagueName
  if (standing) {
    ref.position = standing.position
    ref.played = standing.played
    ref.points = standing.points
    ref.goalDifference = standing.goalDifference
    const rank = rankText(standing, sport)
    if (rank) ref.rankText = rank
  }
  return ref
}

function scoreSport(
  programme: Programme,
  classification: Classification,
  input: ScoreInput,
): ScoreOutcome {
  const { prefs } = input.settings
  const acc = makeAccumulator(45)
  const home = classification.homeTeam
  const away = classification.awayTeam

  const competition = classification.competition
  const importance = competitionImportance(competition)
  if (competition && importance >= 0.6) {
    acc.add('competition', tpl(he.why.knownCompetition, { competition }), importance * 15)
  }

  const rivalry = home && away ? findRivalry(home, away) : null
  if (rivalry) {
    acc.add(
      'rivalry',
      tpl(he.why.derby, { label: rivalry.label, note: rivalry.note }),
      rivalry.intensity * 28,
    )
  }

  const favoriteTeamName = prefs.favoriteTeam
  const favoriteTeam =
    (home ? isFavoriteTeam(home, favoriteTeamName) : false) ||
    (away ? isFavoriteTeam(away, favoriteTeamName) : false)

  // הטבלה נבחרת לפי הליגה של המשחק הזה. בכדורסל אין טבלת כדורגל — ולכן
  // לא מציגים מיקום שלא שייך לענף.
  const league = findMatchLeague({
    texts: [competition, programme.title, programme.description],
    home,
    away,
    sport: classification.sport,
  })
  // הטבלה נטענת לכל משחק שיש לו ליגה מזוהה. findMatchLeague כבר מחזיר רק
  // ליגה של אותו ענף (כדורגל או ה-NBA) — ולכן משחק כדורסל מקבל את טבלת
  // ה-NBA ולא טבלת כדורגל בטעות.
  const basketball = league ? leagueSport(league) === 'basketball' : classification.sport === 'basketball'
  const table = league ? (input.tableFor?.(league.id) ?? (league.bundled ? input.table : [])) : []
  const leagueName = league?.name

  const homeRef = home
    ? buildTeamRef(home, table, favoriteTeamName, leagueName, classification.sport)
    : undefined
  const awayRef = away
    ? buildTeamRef(away, table, favoriteTeamName, leagueName, classification.sport)
    : undefined

  if (favoriteTeam) {
    const teamName = home && isFavoriteTeam(home, favoriteTeamName) ? home : (away ?? favoriteTeamName)
    acc.add('favoriteTeam', tpl(he.why.favoriteTeam, { team: teamName }), 36)
  }

  // דירוג הקבוצות בטבלה — הלב של "אחוז העניין".
  const homePos = homeRef?.position
  const awayPos = awayRef?.position
  if (homeRef?.rankText && awayRef?.rankText) {
    const gap = Math.abs((homePos ?? 0) - (awayPos ?? 0))
    const bothTop = (homePos ?? 99) <= 4 && (awayPos ?? 99) <= 4
    // קו התחתית נגזר מגודל הטבלה (ליגת העל: 14 קבוצות -> מקום 11 ומטה).
    // בכדורסל אין ירידות ובכלל אין "תחתית" — וכברירת מחדל bottomLine יוצאת
    // מהמשחק לגמרי, כדי שלא ייכתב "מאבק ירידה" על קבוצת NBA.
    const bottomLine = basketball
      ? Number.POSITIVE_INFINITY
      : table.length > 4
        ? Math.max(2, table.length - 3)
        : 11
    const anyBottom = (homePos ?? 0) >= bottomLine || (awayPos ?? 0) >= bottomLine
    const bothBottom = (homePos ?? 0) >= bottomLine && (awayPos ?? 0) >= bottomLine

    if (bothTop) {
      acc.add('stakes', he.why.titleRace, 10)
    } else if (gap <= 3 && !bothBottom) {
      // פער קטן הוא עניין רק כשהמשחק לא בתחתית. 13 נגד 14 הוא גם פער של
      // מקום אחד, אבל הוא אינו "מאבק צמרת" — ולכן אין בונוס כזה.
      acc.add(
        'stakes',
        tpl(he.why.tableClash, {
          home: homeRef.name,
          homeRank: homeRef.rankText,
          away: awayRef.name,
          awayRank: awayRef.rankText,
        }),
        8,
      )
    } else if (gap >= 9) {
      acc.add('stakes', he.why.bigGap, -9)
    }
    if (bothBottom) {
      acc.add('stakes', he.why.lowSeed, -5)
    } else if (anyBottom) {
      acc.add('stakes', he.why.tableBottom, 5)
    }
    // מקום שמוביל לאירופה הוא מושג של ליגות כדורגל — ב-NBA אין לו משמעות.
    if (!basketball && (homePos ?? 99) <= 6 && (awayPos ?? 99) <= 6 && !bothTop) {
      acc.add('stakes', he.why.euroSpot, 4)
    }
  }

  if (programme.isLive) {
    acc.add('live', he.why.liveNow, 10)
  } else if (classification.isReplay) {
    acc.add('freshness', he.why.replay, -4)
  }

  const { score, reasons } = acc.finish()
  // ה"ג׳וס" נגזר מהציון: משחק טעון = עניין גבוה.
  const juice = clamp(Math.round((score - 38) * 1.45), 0, 100)
  const juiceLabel =
    juice >= 70 ? he.sport.juiceFull : juice >= 45 ? he.sport.juiceSome : he.sport.juiceLow

  const sportContext: SportContext = {
    sport: classification.sport,
    isLive: Boolean(programme.isLive),
    juice,
    juiceLabel,
  }
  // התג על הכרטיס מציג את הליגה שממנה באמת נלקחה הטבלה ("ליגה איטלקית"),
  // ולא רק את מה שזוהה בטקסט — כדי שתמיד יהיה כתוב באיזו ליגה המשחק.
  const competitionLabel = leagueName ?? competition
  if (competitionLabel) sportContext.competition = competitionLabel
  if (homeRef) sportContext.homeTeam = homeRef
  if (awayRef) sportContext.awayTeam = awayRef
  if (rivalry) {
    sportContext.isDerby = true
    sportContext.rivalryLabel = rivalry.label
  }

  // כותרת רק כשיש בה מידע שאין במקום אחר. משחק "רגיל" לא מקבל כותרת:
  // "שידור ספורט בערוץ X" הוא בדיוק אותו דבר שכתוב בתג הערוץ, ולכן רק
  // מוסיף שורה לגובה.
  const headline = favoriteTeam
    ? tpl(he.headline.sportFavoriteTeam, { team: favoriteTeamName })
    : rivalry
      ? tpl(he.headline.sportDerby, { label: rivalry.label })
      : competition && importance >= 0.6
        ? tpl(he.headline.sportBigMatch, { competition })
        : ''

  const verdict = favoriteTeam
    ? tpl(he.verdict.favoriteTeam, { team: favoriteTeamName })
    : rivalry
      ? he.verdict.derby
      : bothTop(score)
        ? he.verdict.bigMatch
        : he.verdict.solid

  return {
    category: 'sport',
    score: favoriteTeam ? Math.max(score, 85) : score,
    reasons,
    headline,
    verdict,
    favorite: false,
    favoriteTeam,
    sport: sportContext,
  }
}

/** משחק "גדול" מבחינת עניין — משמש לבחירת הניסוח. */
function bothTop(score: number): boolean {
  return score >= 62
}

/* ------------------------------------------------------------------ */
/* חדשות                                                              */
/* ------------------------------------------------------------------ */

function scoreNews(programme: Programme, channel: Channel, input: ScoreInput): ScoreOutcome {
  const acc = makeAccumulator(38)
  const channelName = channel.name

  const isMainProgram = matchesContentList(programme.title, IMPORTANT_NEWS_PROGRAMS)
  const isMainChannel = IMPORTANT_NEWS_CHANNELS.some((entry) =>
    channelName.toLowerCase().includes(entry.toLowerCase()),
  )

  if (isMainProgram) {
    acc.add('newsPriority', tpl(he.why.newsPriority, { channel: channelName }), 18)
  }
  if (isMainChannel) {
    acc.add('newsPriority', he.why.newsBreaking, 10)
  }
  if (isOnAir(programme, input.now)) {
    acc.add('live', he.why.liveNow, 8)
  }

  const { score, reasons } = acc.finish()
  const headline = isMainProgram
    ? tpl(he.headline.newsMain, { program: programme.title, channel: channelName })
    : tpl(he.headline.newsPlain, { channel: channelName })

  return {
    category: 'news',
    score,
    reasons,
    headline,
    verdict: he.verdict.news,
    favorite: false,
    favoriteTeam: false,
  }
}

/* ------------------------------------------------------------------ */
/* נקודת כניסה                                                        */
/* ------------------------------------------------------------------ */

function computeOutcome(
  programme: Programme,
  channel: Channel,
  classification: Classification,
  input: ScoreInput,
): ScoreOutcome {
  switch (classification.category) {
    case 'movie':
      return scoreMovie(programme, channel, input)
    case 'movie-kids': {
      // אותו ניקוד בדיוק כמו סרט רגיל — ההבדל הוא רק בטאב שבו הוא מוצג.
      const outcome = scoreMovie(programme, channel, input)
      return { ...outcome, category: 'movie-kids' }
    }
    case 'series':
      return scoreSeries(programme, channel, input)
    case 'sport':
      return scoreSport(programme, classification, input)
    case 'news':
      return scoreNews(programme, channel, input)
    default: {
      const acc = makeAccumulator(20)
      const { score, reasons } = acc.finish()
      return {
        category: classification.category,
        score,
        reasons,
        headline: programme.title,
        verdict: he.verdict.solid,
        favorite: false,
        favoriteTeam: false,
      }
    }
  }
}

/**
 * נקודת הכניסה לניקוד. תמיד מחזירה לפחות הסבר אחד, כדי שהממשק לא יציג
 * כרטיס המלצה בלי שורת "למה מומלץ".
 */
export function scoreProgramme(
  programme: Programme,
  channel: Channel,
  classification: Classification,
  input: ScoreInput,
): ScoreOutcome {
  const outcome = computeOutcome(programme, channel, classification, input)
  if (outcome.reasons.length === 0) {
    outcome.reasons.push({
      kind: 'info',
      text: tpl(he.why.plainProgramme, { channel: channel.name }),
      weight: 0,
    })
  }
  return outcome
}

/** ציון גולמי ללא העשרה — לסינון מועמדים לפני קריאות TMDB. */
export function preScore(
  programme: Programme,
  channel: Channel,
  input: { now: number; settings: Settings; table: readonly TeamStanding[] },
): number {
  const classification = classifyProgramme(programme, channel)
  return scoreProgramme(programme, channel, classification, input).score
}

export { YEAR_MS }
