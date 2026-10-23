import { useState } from 'react'
import { leagueFlag, leagueFlagUrl, type LeagueRef } from '../../sports/leagues'

/**
 * דגל המדינה (או סמל המפעל) של הליגה — פעם אחת בלבד, בתוך תג המסגרת
 * ("🇮🇱 כדורגל · ליגת העל"). לא לצד שם הקבוצה: שם הדגל חזר פעמיים באותו
 * כרטיס בלי להוסיף מידע, כי הדגל נגזר מהמסגרת ולא מהקבוצה.
 *
 * משתמשים בתמונת PNG מ-flagcdn ולא באימוג׳י: בחלונות ובחלק ממכשירי
 * האנדרואיד אין גליף לדגל בגופן, והאימוג׳י מוצג כצמד אותיות ("ES").
 * אם התמונה לא נטענת (אין רשת) — נופלים בחזרה לאימוג׳י, ובמפעל בין-לאומי
 * נשאר סמל המפעל.
 */
export function LeagueFlag({ league }: { league?: LeagueRef }) {
  const [failed, setFailed] = useState(false)
  const flag = leagueFlag(league)
  if (!flag) return null
  const url = leagueFlagUrl(flag)
  if (!url || failed) {
    return (
      <span className="flag" aria-hidden="true">
        {flag.emoji}
      </span>
    )
  }
  return (
    <img
      className="flag"
      src={url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
