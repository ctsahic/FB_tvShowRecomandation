import { useEffect, useState } from 'react'
import { formatClockTime } from '../../i18n/he'

/**
 * שעון קבוע בפינה הימנית העליונה של האפליקציה.
 *
 * הוא ממוקם `fixed`, ולכן לא זז כשגוללים את רשימת ההמלצות — בדיוק מה שביקש
 * המשתמש: לדעת מה השעה בכל רגע בלי לחזור לראש העמוד.
 *
 * שלוש החלטות קטנות שהן בעצם חשובות:
 *   • אין כאן כפתור ואין tabIndex: השעון לא נתפס בניווט של השלט, ולכן החצים
 *     ממשיכים לעבור בין הכרטיסים בלי לעצור עליו.
 *   • הטיק מיושר לראש השנייה (ולא כל 1000ms מהרכבה), כך שהשעון לא "מפספס"
 *     שנייה ולא מתפצל מהשעון של הטלוויזיה לאורך דקות ארוכות.
 *   • role="timer" ולא role="status": קורא מסך לא יקריא את הזמן כל שנייה.
 */
export function Clock() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let timer = 0
    const tick = () => {
      const current = Date.now()
      setNow(current)
      // 1000 - (current % 1000) = בדיוק עד תחילת השנייה הבאה.
      timer = window.setTimeout(tick, 1000 - (current % 1000))
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="clock" role="timer" data-clock="">
      {formatClockTime(now)}
    </div>
  )
}
