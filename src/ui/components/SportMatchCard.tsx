import { useMemo } from 'react'
import type { Recommendation, TeamRef } from '../../types'
import { he } from '../../i18n/he'
import { findMatchLeague } from '../../sports/leagues'
import { LeagueFlag } from './LeagueFlag'
import { ReasonsList } from './ReasonsList'
import {
  channelLabel,
  eventChipClass,
  interestPercent,
  sportKindLabel,
  statusChipClass,
  statusText,
  timeRange,
} from '../format'

export interface SportMatchCardProps {
  recommendation: Recommendation
  /** פתיחת מסך פרטי המשחק (מיקומים בטבלה + למה המשחק מעניין). */
  onOpenDetails?: (recommendation: Recommendation) => void
}

function TeamRow({ team, side, label }: { team: TeamRef; side: string; label: string }) {
  const classes = team.isFavorite ? 'team-row team-row--favorite' : 'team-row'
  return (
    <li className={classes}>
      <span className="team-row__name">
        {team.name}
        <span className="team-row__side">
          {side}
          {team.isFavorite ? ` · ${label}` : ''}
        </span>
      </span>
      <span className="team-row__rank">{team.rankText ?? he.sport.noTable}</span>
    </li>
  )
}

export function SportMatchCard({ recommendation, onOpenDetails }: SportMatchCardProps) {
  const sport = recommendation.sport
  const home = sport?.homeTeam
  const away = sport?.awayTeam

  // איזו קבוצה מהמשחק (אם בכלל) היא הקבוצה שלי — ואם אין, אפשר לסמן אחת.
  // סוג האירוע ושם הליגה בתג אחד: "כדורגל · ליגת העל".
  const kindLabel = sportKindLabel(sport?.sport)
  const eventLabel = sport?.competition ? `${kindLabel} · ${sport.competition}` : kindLabel

  // הדגל נגזר מהליגה של המשחק ("ליגה ספרדית" -> דגל ספרד), ולא מהקבוצה —
  // כך גם קבוצה קטלונית בליגה הספרדית מקבלת את הדגל הנכון. הוא מוצג פעם
  // אחת, בתג המסגרת למטה — ולא לצד שם כל קבוצה.
  const league = useMemo(
    () =>
      findMatchLeague({
        texts: [sport?.competition, recommendation.programme.title, recommendation.programme.description],
        ...(home?.name ? { home: home.name } : {}),
        ...(away?.name ? { away: away.name } : {}),
        ...(sport?.sport ? { sport: sport.sport } : {}),
      }),
    [sport?.competition, sport?.sport, home?.name, away?.name, recommendation.programme.title, recommendation.programme.description],
  )


  // כל הכרטיס הוא הפעולה: לחיצה במגע/עכבר ו-OK בשלט — שניהם פותחים את מסך
  // פרטי המשחק. אין כאן כפתור "פרטים" נפרד: בטלוויזיה הוא רק בזבז עצירת
  // פוקוס אחת ואת מקש ה-OK, בעוד שהכרטיס כולו עושה בדיוק אותו דבר.
  const openDetails = onOpenDetails
    ? () => onOpenDetails(recommendation)
    : undefined

  return (
    <article
      className="card card--actionable"
      tabIndex={0}
      data-tv-card=""
      onClick={openDetails}
      /* role="button" הוא מה שהופך את לחיצת ה-OK על הכרטיס לפתיחת הפרטים
         (ר' activateFocused ב-useDpadNavigation). */
      role={openDetails ? 'button' : undefined}
      aria-label={he.sport.tapForDetails}
    >
      <div className="match__header match__header--title">
        {/*
         * שם הקבוצות הוא השורה הראשונה של הכרטיס — לא הכותרת "משחק גדול",
         * שחזרה על שם הליגה שכבר מופיע בתג למטה. אם השם ארוך מכדי לשבת
         * לצד השעות והערוץ, הוא לא נדחס: הוא יורד שורה שלמה משלו (flex-wrap).
         */}
        <h4 className="card__title match__title">
          {sport?.homeTeam?.name ?? recommendation.programme.title}
          {sport?.awayTeam ? ` — ${sport.awayTeam.name}` : ''}
        </h4>
        <div className="card__meta">
          {/*
           * תג אחד שמאחד את המצב (משודר עכשיו / בעוד X דק׳) עם שעות השידור —
           * עם מפריד ברור באמצע, כדי שיהיה ברור איפה נגמר המצב ומתחילות
           * השעות. תוויות כמו "דרבי תל אביבי" ירדו מכאן — הן כבר מופיעות
           * בכותרות ובפיקנטריה, והן רק דחקו את הנתונים החשובים.
           */}
          <span className={statusChipClass(recommendation.status)}>
            {statusText(recommendation)}
            <span className="chip__sep" aria-hidden="true">
              |
            </span>
            {timeRange(recommendation)}
          </span>
          {/* שם הערוץ מודגש — הוא הנתון שמחפשים כשמחליטים איפה לראות. */}
          <span className="chip chip--channel">{channelLabel(recommendation)}</span>
        </div>
      </div>

      <div className="match__header">
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
            <div
              className="score__fill"
              style={{ width: `${Math.round(recommendation.score)}%` }}
            />
          </div>
        </div>
        {/*
         * סוג האירוע ובה"ל שם הליגה יחד — "כדורגל · ליגת העל", עם דגל
         * המדינה של המסגרת. כאן מקומו היחיד: בשורות הקבוצות הוא היה
         * מוכפל פעמיים בלי להוסיף מידע.
         */}
        <span className={eventChipClass(sport?.sport)}>
          <LeagueFlag league={league} />
          {eventLabel}
        </span>
      </div>

      {home || away ? (
        <ul className="match__teams">
          {home ? (
            <TeamRow team={home} side={he.sport.home} label={he.sport.yourTeam} />
          ) : null}
          {away ? (
            <TeamRow team={away} side={he.sport.away} label={he.sport.yourTeam} />
          ) : null}
        </ul>
      ) : null}

      <ReasonsList reasons={recommendation.reasons} />
    </article>
  )
}
