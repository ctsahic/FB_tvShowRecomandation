import type { Recommendation } from '../../types'
import { tmdbImageUrl } from '../../data/tmdb'
import { he } from '../../i18n/he'
import { RatingsRow } from './RatingsRow'
import { ReasonsList } from './ReasonsList'
import { channelLabel, interestPercent, statusChipClass, statusText, timeRange } from '../format'

export interface RecommendationCardProps {
  recommendation: Recommendation
  /** האם הכותר נכלל במועדפים שלי (מסומן בהגדרות) — לתצוגת התג בלבד. */
  favorite: boolean
}

export function RecommendationCard({ recommendation, favorite }: RecommendationCardProps) {
  const { enrichment, programme } = recommendation
  const poster = tmdbImageUrl(enrichment?.posterPath, 'w342')
  // כל הציונים מוצגים במקום אחד (RatingsRow) — כולל מספר המדרגים. לכן שורת
  // ה"למה כדאי" לא חוזרת על הציון: היא מוסיפה את הסיבות האחרות בלבד.
  const reasons = recommendation.reasons.filter((reason) => reason.kind !== 'ratings')

  return (
    <article className="card" tabIndex={0} data-tv-card="">
      <div className="card__top">
        {poster ? <img className="poster" src={poster} alt="" loading="lazy" /> : null}
        <div className="card__body">
          <h3 className="card__title">{programme.title}</h3>
          <div className="card__meta">
            <span className={statusChipClass(recommendation.status)}>
              {statusText(recommendation)}
            </span>
            <span className="chip">{timeRange(recommendation)}</span>
            {/* שם הערוץ מודגש גם בסרטים ובסדרות — אותו תג צהוב שיש בכרטיסי הספורט. */}
            <span className="chip chip--channel">{channelLabel(recommendation)}</span>
            {favorite ? <span className="chip chip--fav">{he.app.favorite}</span> : null}
          </div>
          <RatingsRow enrichment={enrichment} programme={programme} />
        </div>
      </div>

      <p className="card__verdict">{recommendation.verdict}</p>

      <div className="score">
        <span className="score__label">{he.sport.interest}</span>
        <span className="score__value">{interestPercent(recommendation.score)}%</span>
        <div
          className="score__bar"
          role="progressbar"
          aria-valuenow={Math.round(recommendation.score)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="score__fill" style={{ width: `${Math.round(recommendation.score)}%` }} />
        </div>
      </div>

      {enrichment?.overview ? (
        <p className="card__overview">{enrichment.overview}</p>
      ) : null}

      <ReasonsList reasons={reasons} />
    </article>
  )
}
