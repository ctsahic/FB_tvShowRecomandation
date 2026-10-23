import type { Enrichment, Programme } from '../../types'
import { ratingChips } from '../format'

export interface RatingsRowProps {
  /** ציוני TMDB / OMDb (IMDb, Rotten Tomatoes) של הכותר. */
  enrichment?: Enrichment | null
  /** התכנית עצמה — ממנה נגזר ציון המדריך כשאין ציון חיצוני. */
  programme?: Programme
}

/**
 * כל הציונים בשורה אחת.
 *
 * במקום ציונים מפוזרים — בכותרת, בשורת ה"למה כדאי" ובתגים — יש כאן מקום אחד:
 * IMDb ראשי ומודגש, ולצידו TMDB ו-Rotten Tomatoes, כל אחד עם מספר המדרגים
 * שלו (7.5 מ-40 אלף איש הוא לא 7.5 מ-12). הרשימה עצמה נבנית ב-format.ts.
 */
export function RatingsRow({ enrichment, programme }: RatingsRowProps) {
  const chips = ratingChips(enrichment, programme)
  if (chips.length === 0) return null

  return (
    <div className="ratings">
      {chips.map((chip) => (
        <span key={chip.key} className={chip.primary ? 'rating rating--primary' : 'rating'}>
          <span className="rating__source">{chip.source}</span>
          <span className="rating__value">{chip.value}</span>
          {chip.votes ? <span className="rating__votes">{chip.votes}</span> : null}
        </span>
      ))}
    </div>
  )
}
