import type { Enrichment, Programme, Recommendation } from '../types'
import { formatMinutesSpan, formatNumber, formatRelativeMinutes, formatTime, he } from '../i18n/he'
import { combineRatings, formatRating10, percentToRating10 } from '../engine/ratings'

/**
 * טווח השעות, למשל "19:25–21:30".
 *
 * סימני ה-LRM (\u200e) בקצוות אינם קישוט: בלעדיהם, במסך RTL, הדפדפן הופך את
 * סדר הקטעים ומוצג "21:30–19:25" — כאילו התכנית מסתיימת לפני שהתחילה.
 */
export function timeRange(recommendation: Recommendation): string {
  const from = formatTime(recommendation.programme.start)
  const to = formatTime(recommendation.programme.stop)
  return String.fromCharCode(0x200e) + `${from}–${to}` + String.fromCharCode(0x200e)
}

/**
 * הצבע של תג סוג האירוע. כדורסל וטניס מקבלים גוון משלהם כדי שאפשר
 * להבדיל בינם לכדורגל במבט אחד; השאר נשארים בסגול-כחול הרגיל.
 */
export function eventChipClass(kind: string | undefined): string {
  if (kind === 'basketball') return 'chip chip--event chip--event-basketball'
  if (kind === 'tennis') return 'chip chip--event chip--event-tennis'
  return 'chip chip--event'
}

export function statusChipClass(status: Recommendation['status']): string {
  if (status === 'live') return 'chip chip--live'
  if (status === 'starting-soon') return 'chip chip--soon'
  return 'chip chip--upcoming'
}

export function statusText(recommendation: Recommendation): string {
  const { status } = recommendation
  if (status === 'live') {
    // גם כמה זמן נשאר נקרא בשעות מעל שעה: "נותרו שעתיים ו-12 דק׳" ולא 132.
    return `${he.status.live} · ${formatMinutesSpan(recommendation.minutesLeft ?? 0)} נותרו`
  }
  if (status === 'starting-soon') {
    return `${he.status['starting-soon']} · ${formatRelativeMinutes(recommendation.startsInMinutes)}`
  }
  /*
   * שידור שעוד לא התחיל: רק הזמן שנותר. המילה "בהמשך" לא הוסיפה מידע —
   * "בעוד 5 שעות ו-34 דק׳" כבר אומר שהתכנית עוד לפנינו, וכל מילה מיותרת
   * בתג דוחקת את השעות והערוץ בשורה אחת של הטלוויזיה.
   */
  return formatRelativeMinutes(recommendation.startsInMinutes)
}

export function channelLabel(recommendation: Recommendation): string {
  const { channel } = recommendation
  if (!channel.name) return ''
  return channel.number ? `${channel.name} · ערוץ ${channel.number}` : channel.name
}

const SPORT_KIND_LABELS: Record<string, string> = {
  football: he.sport.football,
  basketball: he.sport.basketball,
  hockey: he.sport.hockey,
  tennis: he.sport.tennis,
  handball: he.sport.handball,
  volleyball: he.sport.volleyball,
  'american-football': he.sport.americanFootball,
  baseball: he.sport.baseball,
  motorsport: he.sport.motorsport,
  combat: he.sport.combat,
}

/** התווית של הענף, למשל "כדורסל" או "הוקי". */
export function sportKindLabel(kind: string | undefined): string {
  if (!kind) return he.sport.otherSport
  return SPORT_KIND_LABELS[kind] ?? he.sport.otherSport
}

/** 88 -> "88" (הציון הוא אחוז עניין). */
export function interestPercent(score: number): string {
  return `${Math.round(score)}`
}

/** ציון אחד בכרטיס: מאיזה מקור, מה הערך, וכמה מדרגים. */
export interface RatingChip {
  key: 'weighted' | 'imdb' | 'tmdb' | 'rt' | 'epg'
  /** שם המקור כפי שהמשתמש מכיר, למשל "IMDb". */
  source: string
  /** הציון עצמו: "7.5", ‏"9.0" ל-RT (אחוז מומר לסולם 1–10) ו"8.13" למשוקלל. */
  value: string
  /** "18,894 מדרגים" — רק כשיש מספר מצביעים. */
  votes?: string
  /** הציון הראשי (המשוקלל): מוצג ראשון ומודגש. */
  primary: boolean
}

/** "18,894 מדרגים" — או כלום, כשאין מספר מצביעים. */
function votesLabel(votes: number | undefined): string | undefined {
  return votes && votes > 0 ? `${formatNumber(votes)} ${he.app.votes}` : undefined
}

/**
 * כל הציונים של הכותר במקום אחד: הציון המשוקלל ראשון (הוא הקובע), ואחריו
 * IMDb, TMDB ו-Rotten Tomatoes — כל אחד עם מספר המדרגים שלו, כי 7.5 מ-40
 * אלף איש שווה יותר מ-7.5 מ-12. כשאין אף ציון חיצוני נשאר ציון המדריך (EPG) לבדו, כדי שלא ייעלם מידע.
 *
 * הרשימה יושבת במקום אחד ולא מפוזרת בין הכותרת, שורת ה"למה" והתגים: אותו
 * מספר בכמה מקומות לא מוסיף מידע — רק גובה, ובטלוויזיה הגובה הוא המטבע.
 */
export function ratingChips(
  enrichment?: Enrichment | null,
  programme?: Programme,
): RatingChip[] {
  const chips: RatingChip[] = []
  const imdb = enrichment?.imdbRating ?? 0
  const tmdb = enrichment?.tmdbRating ?? 0
  const rottenTomatoes = enrichment?.rottenTomatoes
  const combined = combineRatings(enrichment)

  /*
   * הציון המשוקלל פותח את השורה: הוא זה שממנו נגזר סף ההמלצה, והמקורות
   * שאחריו רק מסבירים מאיפה הוא בא. אין לו מספר מדרגים משלו — המשקולות
   * מפוזרות בין הצ'יפים שלצידו.
   */
  if (combined) {
    chips.push({
      key: 'weighted',
      source: he.app.weighted,
      value: formatRating10(combined.rating10),
      primary: true,
    })
  }

  if (imdb > 0) {
    chips.push({
      key: 'imdb',
      source: he.app.imdb,
      value: imdb.toFixed(1),
      votes: votesLabel(enrichment?.imdbVotes),
      primary: !combined,
    })
  }
  if (tmdb > 0) {
    chips.push({
      key: 'tmdb',
      source: he.app.tmdb,
      value: tmdb.toFixed(1),
      votes: votesLabel(enrichment?.tmdbVotes),
      primary: !combined && imdb === 0,
    })
  }
  if (rottenTomatoes !== undefined && rottenTomatoes > 0) {
    chips.push({
      key: 'rt',
      source: he.app.rottenTomatoes,
      // אחוזים הופכים לסולם 1–10 כדי שכל הצ'יפים ייקראו באותה שפה.
      value: percentToRating10(rottenTomatoes).toFixed(1),
      primary: false,
    })
  }

  const epgRating = programme?.rating ?? 0
  if (chips.length === 0 && epgRating > 0) {
    chips.push({
      key: 'epg',
      source: programme?.ratingSystem ?? 'EPG',
      value: epgRating.toFixed(1),
      primary: true,
    })
  }
  return chips
}
