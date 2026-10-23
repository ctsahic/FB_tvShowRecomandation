/**
 * "למה המשחק מעניין" — נגזר מהטבלה עצמה.
 *
 * הכל מחושב מהנתונים של המשחק: פער הנקודות בין הקבוצות, המרחק מהמוליכה,
 * המרחק מקו הירידה, אזור הטבלה שהמקור סימן, התקפה/הגנה, כושר והקבוצה האהודה.
 * אין כאן טקסטים קבועים לכל משחק — ולכן הפירוט תקף גם לליגה האיטלקית וגם לליגת העל.
 */

import { he, tpl } from '../i18n/he'
import type { TeamRef, TeamStanding } from '../types'
import { zoneLabel, type LeagueRef } from './leagues'
import { resolveTeam, standingSummary, rankText } from './standings'

export interface MatchInsightRow {
  team: TeamRef
  standing?: TeamStanding
  /** "מקום 3 · 41 נק׳" */
  rankText: string
  /** "8 מש׳ · 5-1-2 · 18:8 · 16 נק׳" */
  detail: string
  /** אזור הטבלה בעברית — "ליגת האלופות" / "מאבק ירידה". */
  zone: string
  isFavorite: boolean
}

export interface MatchInsight {
  bullets: string[]
  rows: MatchInsightRow[]
  /** האם בכלל יש מיקומים להציג. */
  hasPositions: boolean
}

export interface MatchInsightInput {
  league?: LeagueRef
  table?: readonly TeamStanding[]
  home?: TeamRef
  away?: TeamRef
  rivalryLabel?: string
  favoriteTeam?: string
  /** הענף — בכדורסל הניסוחים שונים (אין שערים ונקודות טבלה אלא מאזן). */
  sport?: string
}

/** "9-3" — המאזן, לניסוחי הכדורסל. */
function recordOf(standing: TeamStanding): string {
  if (standing.won === undefined || standing.lost === undefined) return `${standing.points}`
  return `${standing.won}-${standing.lost}`
}

function findStanding(
  team: TeamRef | undefined,
  table: readonly TeamStanding[],
): TeamStanding | undefined {
  if (!team || table.length === 0) return undefined
  const candidates = [team.name, team.englishName, ...(team.aliases ?? [])].filter(
    (value): value is string => Boolean(value && value.trim()),
  )
  for (const candidate of candidates) {
    const found = resolveTeam(candidate, table)
    if (found) return found
  }
  return undefined
}

/** האם הקבוצה נמצאת באזור שיורד ליגה. */
function isBottom(position: number, total: number, spots: number): boolean {
  if (!position || total < 6) return false
  return position > total - spots
}

export function matchInsight(input: MatchInsightInput): MatchInsight {
  const table = input.table ?? []
  const league = input.league
  const basketball = input.sport === 'basketball'
  const writeSummary = (standing: TeamStanding | undefined) =>
    standingSummary(standing, input.sport)
  const writeRank = (standing: TeamStanding | undefined) => rankText(standing, input.sport)
  const relegationSpots = league?.relegationSpots ?? 3
  const total = table.length
  const leader = total > 0 ? table[0] : undefined

  const homeStanding = findStanding(input.home, table)
  const awayStanding = findStanding(input.away, table)
  const rows: MatchInsightRow[] = []
  const bullets: string[] = []

  if (input.rivalryLabel) bullets.push(input.rivalryLabel)

  const sides: Array<{ team?: TeamRef; standing?: TeamStanding; side: 'home' | 'away' }> = [
    { team: input.home, standing: homeStanding, side: 'home' },
    { team: input.away, standing: awayStanding, side: 'away' },
  ]

  const goalStats = {
    bestAttack: Math.max(0, ...table.map((row) => row.goalsFor ?? -1)),
    worstDefense: Math.max(0, ...table.map((row) => row.goalsAgainst ?? -1)),
  }

  const anyFound = Boolean(homeStanding || awayStanding)

  for (const { team, standing } of sides) {
    if (!team) continue
    const zoneText = zoneLabel(standing?.zone)
    rows.push({
      team,
      ...(standing ? { standing } : {}),
      rankText: writeRank(standing),
      detail: writeSummary(standing),
      zone: zoneText,
      isFavorite: Boolean(team.isFavorite),
    })

    // כשאף אחת מהקבוצות לא נמצאה אין טעם בשתי הודעות "לא נמצאה" —
    // הטבלה עצמה מוצגת, והמשתמש רואה בעצמו שאין להן שורה.
    if (!standing) {
      if (anyFound) bullets.push(tpl(he.insight.teamMissing, { team: team.name }))
      continue
    }

    if (league?.id === 'champions-league') {
      if (standing.position <= 8) {
        bullets.push(
          tpl(he.insight.uclDirect, { team: team.name, position: standing.position }),
        )
      } else if (standing.position <= 24) {
        bullets.push(
          tpl(he.insight.uclPlayoff, { team: team.name, position: standing.position }),
        )
      } else {
        bullets.push(tpl(he.insight.uclOut, { team: team.name, position: standing.position }))
      }
    } else if (basketball) {
      // כדורסל: המאזן (ניצחונות-הפסדים) מול המוליכה, בלי ירידות ואירופה.
      if (standing.position === 1) {
        bullets.push(
          tpl(he.insight.leaderBasketball, { team: team.name, record: recordOf(standing) }),
        )
      } else if (leader && leader.points - standing.points <= 3) {
        const behind = Math.max(1, leader.points - standing.points)
        bullets.push(
          tpl(
            behind === 1
              ? he.insight.titleRaceBasketballOne
              : he.insight.titleRaceBasketball,
            {
              team: team.name,
              record: recordOf(standing),
              gap: behind,
              leader: leader.name,
            },
          ),
        )
      }
    } else {
      if (standing.position === 1) {
        bullets.push(tpl(he.insight.leader, { team: team.name, points: standing.points }))
      } else if (leader && standing.position <= 6 && leader.points - standing.points <= 4) {
        bullets.push(
          tpl(he.insight.titleRace, {
            team: team.name,
            gap: leader.points - standing.points,
            leader: leader.name,
          }),
        )
      }

      if (zoneText && /אלופות|אירופית|הכנס/.test(zoneText)) {
        bullets.push(tpl(he.insight.europe, { team: team.name, zone: zoneText }))
      } else if (
        zoneText === 'מאבק ירידה' ||
        isBottom(standing.position, total, relegationSpots)
      ) {
        bullets.push(tpl(he.insight.relegation, { team: team.name }))
      }
    }

    if (standing.goalsFor !== undefined && standing.goalsFor === goalStats.bestAttack) {
      bullets.push(
        basketball
          ? tpl(he.insight.bestOffenseBasketball, { team: team.name, points: standing.goalsFor })
          : tpl(he.insight.bestAttack, { team: team.name, goals: standing.goalsFor }),
      )
    }
    if (standing.goalsAgainst !== undefined && standing.goalsAgainst === goalStats.worstDefense) {
      bullets.push(
        basketball
          ? tpl(he.insight.worstDefenseBasketball, {
              team: team.name,
              points: standing.goalsAgainst,
            })
          : tpl(he.insight.worstDefense, { team: team.name, goals: standing.goalsAgainst }),
      )
    }
    if (
      standing.won !== undefined &&
      standing.played >= 4 &&
      standing.won >= standing.played - 2
    ) {
      bullets.push(
        tpl(he.insight.hotStreak, {
          team: team.name,
          won: standing.won,
          played: standing.played,
        }),
      )
    }
    if (Math.abs(standing.goalDifference) >= 12) {
      bullets.push(
        tpl(basketball ? he.insight.diffBasketball : he.insight.goalDiff, {
          team: team.name,
          diff: standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference,
        }),
      )
    }
  }

  if (homeStanding && awayStanding) {
    const gap = Math.abs(homeStanding.points - awayStanding.points)
    if (gap === 0) {
      bullets.push(
        basketball
          ? tpl(he.insight.levelOnWins, { points: homeStanding.points })
          : tpl(he.insight.levelOnPoints, { points: homeStanding.points }),
      )
    } else if (gap === 1) {
      // בכדורסל אין "משחק של שש נקודות" — יש פער של ניצחון אחד.
      bullets.push(basketball ? he.insight.gapOneWin : he.insight.sixPointerOne)
    } else if (gap <= 3) {
      bullets.push(
        basketball ? tpl(he.insight.gapWins, { gap }) : tpl(he.insight.sixPointer, { gap }),
      )
    } else if (basketball) {
      bullets.push(
        tpl(he.insight.pointsGapBasketball, {
          gap,
          home: homeStanding.name,
          homePoints: homeStanding.points,
          away: awayStanding.name,
          awayPoints: awayStanding.points,
        }),
      )
    } else {
      // פער גדול מדי ל"משחק של שש נקודות" — אבל הפער עצמו הוא הנתון
      // שהמשתמש הכי רוצה לראות (למשל 11 נגד 20).
      bullets.push(
        tpl(he.insight.pointsGap, {
          gap,
          home: homeStanding.name,
          homePoints: homeStanding.points,
          away: awayStanding.name,
          awayPoints: awayStanding.points,
        }),
      )
    }
    if (
      isBottom(homeStanding.position, total, relegationSpots) &&
      isBottom(awayStanding.position, total, relegationSpots)
    ) {
      bullets.push(he.insight.bottomBattle)
    }
  }

  if (input.favoriteTeam && (input.home?.isFavorite || input.away?.isFavorite)) {
    bullets.unshift(tpl(he.why.favoriteTeam, { team: input.favoriteTeam }))
  }

  if (total === 0) bullets.push(he.insight.noTable)

  return {
    bullets: [...new Set(bullets)].slice(0, 8),
    rows,
    hasPositions: Boolean(homeStanding || awayStanding),
  }
}
