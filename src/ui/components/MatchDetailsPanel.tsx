import { useEffect, useMemo, useRef, useState } from 'react'
import type { Recommendation, TeamStanding } from '../../types'
import { he } from '../../i18n/he'
import { findMatchLeague, leagueSport, zoneLabel, type LeagueRef } from '../../sports/leagues'
import { LeagueFlag } from './LeagueFlag'
import { matchInsight } from '../../sports/insight'
import { loadLeagueTable, peekLeagueTable, type LeagueTable } from '../../sports/tableStore'
import { isSameTeam } from '../../sports/teams'
import {
  channelLabel,
  eventChipClass,
  interestPercent,
  sportKindLabel,
  statusChipClass,
  statusText,
  timeRange,
} from '../format'

export interface MatchDetailsPanelProps {
  recommendation: Recommendation
  onClose: () => void
}

/** "5-1-0" — רק כשיש נתוני ניצחונות (סנאפשוט ליגת העל לא מביא אותם). */
function recordText(standing: TeamStanding | undefined): string {
  if (!standing) return '—'
  if (standing.won === undefined || standing.drawn === undefined || standing.lost === undefined) {
    return '—'
  }
  return `${standing.won}-${standing.drawn}-${standing.lost}`
}

function goalsText(standing: TeamStanding | undefined): string {
  if (standing?.goalsFor === undefined || standing.goalsAgainst === undefined) return '—'
  return `${standing.goalsFor}:${standing.goalsAgainst}`
}

/** "9-3" — המאזן בכדורסל. */
function basketballRecord(standing: TeamStanding): string {
  if (standing.won === undefined || standing.lost === undefined) return '—'
  return `${standing.won}-${standing.lost}`
}

export function MatchDetailsPanel({ recommendation, onClose }: MatchDetailsPanelProps) {
  const sport = recommendation.sport
  const programme = recommendation.programme
  const homeName = sport?.homeTeam?.name
  const awayName = sport?.awayTeam?.name
  // סוג האירוע (כדורגל / כדורסל / הוקי…) — מוצג בתג נפרד ומודגש, כי זה מה
  // שהמשתמש מחפש לפני שהוא קורא את שם הקבוצות.
  const sportKind = sport?.sport
  const eventLabel = sportKind ? sportKindLabel(sportKind) : undefined

  // הליגה מזוהה בדיוק כמו במנוע: קודם לפי טקסט המסגרת, ואם אין — לפי הקבוצות.
  const league: LeagueRef | undefined = useMemo(
    () =>
      findMatchLeague({
        texts: [sport?.competition, programme.title, programme.description],
        home: homeName,
        away: awayName,
        sport: sport?.sport,
      }),
    [sport?.competition, sport?.sport, programme.title, programme.description, homeName, awayName],
  )

  const [table, setTable] = useState<LeagueTable | null>(() => peekLeagueTable(league))
  const [loading, setLoading] = useState(false)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  // הטבלה כמעט תמיד כבר במטמון מהסריקה — ואם לא, היא נטענת כאן לבד.
  useEffect(() => {
    const cached = peekLeagueTable(league)
    if (cached) {
      setTable(cached)
      return
    }
    if (!league) {
      setTable(null)
      return
    }
    let cancelled = false
    setLoading(true)
    // משחק שכבר נגמר: טבלה שנשלפה לפני סיומו מיושנת, ולכן נשלפת מחדש.
    const finishedAt = programme.stop <= Date.now() ? programme.stop : undefined
    void loadLeagueTable(league, finishedAt === undefined ? {} : { finishedAt })
      .then((loaded) => {
        if (!cancelled) setTable(loaded)
      })
      .catch(() => {
        if (!cancelled) setTable(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [league])

  // הפוקוס עובר לכפתור הסגירה — כך שהשלט עובד מיד בתוך החלון.
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // הטבלה מוצגת כטבלת כדורסל כשהענף הוא כדורסל — ה-NBA מדורג לפי אחוז
  // ניצחונות ולא לפי נקודות, ולכן גם כותרות העמודות מתחלפות.
  const basketball = sportKind === 'basketball' || (league ? leagueSport(league) === 'basketball' : false)

  const insight = useMemo(
    () =>
      matchInsight({
        ...(league ? { league } : {}),
        table: table?.teams ?? [],
        ...(sport?.homeTeam ? { home: sport.homeTeam } : {}),
        ...(sport?.awayTeam ? { away: sport.awayTeam } : {}),
        ...(sport?.rivalryLabel ? { rivalryLabel: sport.rivalryLabel } : {}),
        ...(sportKind ? { sport: sportKind } : {}),
      }),
    [league, table, sport, sportKind],
  )

  return (
    <div
      className="panel-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={he.sport.detailsTitle}
    >
      <div className="panel panel--match">
        <div className="panel__content">
          <h2 className="panel__title">{he.sport.detailsTitle}</h2>

          <div className="match-detail__head">
            <h3 className="match-detail__teams">
              {homeName ?? programme.title}
              {awayName ? ` — ${awayName}` : ''}
            </h3>
            <div className="card__meta">
              <span className={statusChipClass(recommendation.status)}>
                {statusText(recommendation)}
              </span>
              {eventLabel ? (
                <span className={eventChipClass(sportKind)}>
                  {/* הדגל מוצג פעם אחת, בתג המסגרת — לא לצד כל קבוצה. */}
                  <LeagueFlag league={league} />
                  {`${he.sport.eventType}: ${eventLabel}`}
                </span>
              ) : null}
              {sport?.competition ? <span className="chip">{sport.competition}</span> : null}
              {league && league.name !== sport?.competition ? (
                <span className="chip">{league.name}</span>
              ) : null}
              <span className="chip">{timeRange(recommendation)}</span>
              {/* שם הערוץ מודגש — זה מה שמחפשים כשמחליטים איפה לראות. */}
              <span className="chip chip--channel">
                {`${he.sport.channel}: ${channelLabel(recommendation)}`}
              </span>
              <span className="chip">
                {he.sport.interest} {interestPercent(recommendation.score)}%
              </span>
            </div>
          </div>

          {/*
           * אין כאן אזור "פיקנטריה" ("למה המשחק מעניין"): המשתמש מבין לבד למה
           * המשחק חשוב מהמיקומים ומהנקודות שמוצגים מיד למטה, ולא צריך שורה
           * שמסבירה לו אותם. נשארו רק הנתונים עצמם — מיקום, מאזן וטבלה.
           */}
          <section className="panel__section">
            <h3>{he.sport.table}</h3>
            <div className="detail-teams">
              {insight.rows.map((row) => (
                <div className="detail-team" key={row.rankText + row.team.name}>
                  <span className="detail-team__name">{row.team.name}</span>
                  {row.team.englishName && row.team.englishName !== row.team.name ? (
                    <span className="detail-team__en">{row.team.englishName}</span>
                  ) : null}
                  <span className="detail-team__rank">
                    {row.rankText || he.sport.teamNotFound}
                  </span>
                  {row.detail ? <span className="detail-team__detail">{row.detail}</span> : null}
                  {row.zone ? <span className="chip chip--zone">{row.zone}</span> : null}
                  {row.isFavorite ? <span className="chip">{he.sport.yourTeam}</span> : null}
                </div>
              ))}
            </div>

            {loading ? <p className="field__hint">{he.sport.loadingTable}</p> : null}
            {!loading && !table ? (
              <p className="field__hint">{he.sport.noTableForLeague}</p>
            ) : null}

            {table ? (
              <>
                <table className="league-table">
                  <thead>
                    <tr>
                      <th scope="col">{he.sport.rank}</th>
                      <th scope="col">{he.sport.team}</th>
                      <th scope="col">{he.sport.played}</th>
                      <th scope="col">{basketball ? 'נ-ה' : 'נ-ת-ה'}</th>
                      <th scope="col">{basketball ? he.sport.baskets : 'שערים'}</th>
                      <th scope="col">
                        {basketball ? he.sport.winPercent : he.sport.points}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.teams.map((row) => {
                      // שורת הקבוצה שמשחקת במשחק הזה מודגשת — כדי למצוא אותה
                      // מיד בטבלה של 20 או 36 קבוצות.
                      const highlighted = Boolean(
                        (homeName &&
                          (row.name === homeName ||
                            Boolean(row.englishName && isSameTeam(row.englishName, homeName)))) ||
                          (awayName &&
                            (row.name === awayName ||
                              Boolean(
                                row.englishName && isSameTeam(row.englishName, awayName),
                              ))),
                      )
                      return (
                        <tr
                          key={`${row.position}-${row.name}`}
                          className={highlighted ? 'league-table__row--hit' : undefined}
                        >
                          <td>{row.position}</td>
                          <td>
                            {row.name}
                            {row.englishName && row.englishName !== row.name ? (
                              <span className="league-table__en"> ({row.englishName})</span>
                            ) : null}
                            {row.zone ? (
                              <span className="league-table__zone">{zoneLabel(row.zone)}</span>
                            ) : null}
                          </td>
                          <td>{row.played}</td>
                          <td>{basketball ? basketballRecord(row) : recordText(row)}</td>
                          <td>{goalsText(row)}</td>
                          <td>
                            {basketball
                              ? row.winPercent !== undefined
                                ? `${row.winPercent}%`
                                : goalsText(row)
                              : row.points}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="field__hint">
                  {`${he.sport.source}: ${table.sourceLabel}`}
                </p>
              </>
            ) : null}
          </section>
        </div>

        <aside className="panel__rail">
          <button type="button" className="btn btn--primary" ref={closeRef} onClick={onClose}>
            {he.sport.close}
          </button>
        </aside>
      </div>
    </div>
  )
}
