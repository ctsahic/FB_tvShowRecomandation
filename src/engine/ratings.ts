import type { Enrichment } from '../types'

/*
 * ציון אחד משלושה מקורות.
 *
 * לכל מקור סולם אחר (IMDb ‏1–10, TMDB ‏1–10, Rotten Tomatoes ‏0–100%), ולכל
 * מקור גם אמינות אחרת: 7.5 מ-40 אלף מדרגים שווה יותר מ-7.5 מ-12. לכן כל
 * ציון מומר לסולם אחיד של 1–100, וממוצע משוקלל לפי מספר המדרגים קובע את
 * הציון שממנו נגזר סף ההמלצה.
 */

/** ציון בודד אחרי נרמול. */
export interface RatingSource {
  /** המקור כפי שהוא מוצג למשתמש. */
  source: 'IMDb' | 'TMDB' | 'RT'
  /** הציון בסולם 1–10 (RT מומר: 90% → 9.0). */
  rating10: number
  /** אותו ציון בסולם 1–100. */
  score100: number
  /** מספר המדרגים — המשקל של הציון בממוצע. */
  votes: number
}

/** התוצאה של איחוד כל הציונים הידועים של כותר. */
export interface CombinedRating {
  /** הממוצע המשוקלל בסולם 1–100 (הנוסחה של Rotten Tomatoes). */
  score100: number
  /**
   * הממוצע עצמו בסולם 1–10 — מה שמוצג בכרטיס ומה שהסף בהגדרות משווה אליו.
   * שתי ספרות אחרי הנקודה, כדי שהשקלול ("8.13") לא ייעלם בעיגול ל-8.1.
   */
  rating10: number
  /** סכום המשקולות (סך המדרגים) שמאחורי הממוצע. */
  weight: number
  /** המקורות שנכנסו לחישוב, מהחזק לחלש. */
  sources: RatingSource[]
}

/**
 * ל-Rotten Tomatoes אין מספר מדרגים ב-OMDb, רק אחוז. הוא מקבל משקל קבוע
 * בינוני: קונצנזוס של מבקרים שווה משהו, אבל לא יותר מ-10 אלף צופים אמיתיים.
 */
export const RT_WEIGHT = 250

/** מקור בלי מדרגים בכלל עדיין נספר במשקל מינימלי — הוא לא נזרק. */
export const MIN_SOURCE_WEIGHT = 1

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const round1 = (value: number) => Math.round(value * 10) / 10
const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * 1–10 → 1–100, בדיוק כמו ההמרה של Rotten Tomatoes:
 * `(7.5-1)/(10-1)*(100-1)+1 = 72.5`.
 * כלומר 1 נשאר 1, ‏10 נשאר 100, וכל השאר נמתח ביניהם — לא הכפלה ב-10.
 */
export function toScore100(rating10: number): number {
  if (!Number.isFinite(rating10) || rating10 <= 0) return 0
  return round1(((clamp(rating10, 1, 10) - 1) / 9) * 99 + 1)
}

/** 100 → 10: ‏Rotten Tomatoes מציג אחוזים,‏ 70% הוא 7.0 אצלנו. */
export function percentToRating10(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0
  return round1(clamp(percent / 10, 0.1, 10))
}

function source(
  name: RatingSource['source'],
  rating10: number,
  votes: number,
  fallbackWeight: number,
): RatingSource | null {
  if (rating10 <= 0) return null
  const safeVotes = Number.isFinite(votes) && votes > 0 ? Math.floor(votes) : 0
  const normalized = clamp(rating10, 0, 10)
  return {
    source: name,
    rating10: round1(normalized),
    score100: toScore100(normalized),
    votes: safeVotes > 0 ? safeVotes : fallbackWeight,
  }
}

/**
 * ממוצע משוקלל של כל הציונים הידועים, או null כשאין אף ציון.
 *
 * המשקל הוא מספר המדרגים, ולכן סרט עם 8.0 מ-1000 מדרגים ב-IMDb גובר על 9.0
 * מ-TMDB בודד. ‏RT (אחוזים, בלי מונה) נכנס במשקל קבוע. מקור בלי מונה בכלל
 * (למשל TMDB שהחזיר ציון בלי votes) נספר במשקל 1 ולא נעלם.
 */
export function combineRatings(enrichment: Enrichment | null | undefined): CombinedRating | null {
  const raw: Array<RatingSource | null> = [
    source('IMDb', enrichment?.imdbRating ?? 0, enrichment?.imdbVotes ?? 0, MIN_SOURCE_WEIGHT),
    source('TMDB', enrichment?.tmdbRating ?? 0, enrichment?.tmdbVotes ?? 0, MIN_SOURCE_WEIGHT),
    source('RT', percentToRating10(enrichment?.rottenTomatoes ?? 0), 0, RT_WEIGHT),
  ]
  const sources = raw.filter((entry): entry is RatingSource => entry !== null)
  if (sources.length === 0) return null

  let weighted = 0
  let weight = 0
  for (const entry of sources) {
    weighted += entry.rating10 * entry.votes
    weight += entry.votes
  }
  if (weight <= 0) return null

  // הממוצע נשמר בשתי ספרות (8.13 ולא 8.1): השקלול בין 40 אלף מדרגים
  // למדרג בודד חי בדיוק בעשרוניות הזו. ה-1–100 נגזר ממנו רק לתיעוד ולבדיקות.
  const rating10 = round2(clamp(weighted / weight, 1, 10))
  return {
    score100: toScore100(rating10),
    rating10,
    weight,
    sources,
  }
}

/**
 * "8.13", "9.20" → "9.2", "8.00" → "8.0": שתי ספרות תמיד יש מקום, אבל אפס
 * בסוף רק מאריך את הצ'יפ בלי להוסיף מידע.
 */
export function formatRating10(rating: number): string {
  const fixed = rating.toFixed(2)
  return fixed.endsWith('0') ? fixed.slice(0, -1) : fixed
}

/** "IMDb 8.1 · TMDB 7.9 · RT 9.0" — להסבר שאומר ממה נבנה הממוצע. */
export function describeSources(combined: CombinedRating): string {
  return combined.sources.map((entry) => `${entry.source} ${entry.rating10.toFixed(1)}`).join(' · ')
}
