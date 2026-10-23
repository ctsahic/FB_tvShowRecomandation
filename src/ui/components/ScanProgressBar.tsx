import { useEffect, useState } from 'react'
import type { ScanProgress } from '../../types'
import { formatDuration, he, tpl } from '../../i18n/he'

export interface ScanProgressBarProps {
  progress: ScanProgress
  /** חותמת הזמן שבה החלה הסריקה (לשעון "עברו 0:12"). */
  startedAt: number
}

/**
 * באר ההתקדמות של הסריקה לטלוויזיה.
 *
 * המשתמש ממתין כאן דקות ארוכות, ולכן הבאר מציגה בדיוק מה קורה מאחורי הקלעים:
 *   • שם השלב (רשימת ערוצים / לוח שידורים / ביקורות וציונים).
 *   • שם הערוץ שנשלף כעת ומספרו.
 *   • בזמן ההשהיה שהוגדרה בהגדרות — ספירה לאחור בשניות בזמן אמת.
 *   • זמן שחלף והערכה של הזמן שנותר.
 *
 * בזמן ההשהיה הבאר עצמה ממשיכה לזוז (ינטרפולציה ליחס של סוף ההמתנה), כדי
 * שהמסך לא ייראה תקוע — בדיוק התלונה שעליה הרכיב הזה נבנה.
 */
export function ScanProgressBar({ progress, startedAt }: ScanProgressBarProps) {
  const waiting = progress.phase === 'waiting' && progress.waitUntil !== undefined
  const [now, setNow] = useState(() => Date.now())

  // הספירה לאחור מתעדכנת 4 פעמים בשנייה — מספיק חלק כדי שהבאר תזוז, ובלי
  // להעמיס על המעבד של הטלוויזיה.
  useEffect(() => {
    setNow(Date.now())
    if (!waiting) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [waiting, progress.waitUntil, progress.phase])

  let ratio = progress.ratio
  let secondsLeft = 0
  if (waiting) {
    const until = progress.waitUntil ?? now
    const totalMs = Math.max(1, (progress.waitSeconds ?? 0) * 1000)
    const remainingMs = Math.max(0, until - now)
    secondsLeft = Math.ceil(remainingMs / 1000)
    const elapsedShare = Math.min(1, Math.max(0, 1 - remainingMs / totalMs))
    const target = progress.ratioAfterWait ?? progress.ratio
    ratio = progress.ratio + (target - progress.ratio) * elapsedShare
  }

  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)))
  const elapsedMs = Math.max(0, now - startedAt)
  const remainingMs = ratio > 0.01 ? (elapsedMs / ratio) * (1 - ratio) : 0
  const showEta = ratio > 0.02 && ratio < 0.995 && remainingMs > 1000

  // ל-role="progressbar" אסור להכיל טקסט: כל הצאצאים שלו מוצגים כ-presentational,
  // ואז קורא מסך (וגם עץ הנגישות של הטלוויזיה) לא רואה את שם הערוץ והספירה.
  // לכן התפקיד יושב על הפס עצמו בלבד, והטקסטים בחוץ.
  return (
    <div className="progress" data-scan-progress="">
      <div className="progress__head">
        <span className="progress__label">{progress.label}</span>
        <span className="progress__percent">{percent}%</span>
      </div>

      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progress.label}
      >
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>

      <p className="progress__message" aria-live="polite">
        {progress.message}
      </p>

      <div className="progress__meta">
        {waiting ? (
          <span className="chip chip--count">
            {secondsLeft === 1
              ? he.app.progressCountdownOne
              : tpl(he.app.progressCountdown, { seconds: secondsLeft })}
          </span>
        ) : null}
        {progress.total > 0 ? (
          <span className="chip">{tpl(he.app.progressChannel, { done: progress.done, total: progress.total })}</span>
        ) : null}
        {progress.source ? <span className="chip">{progress.source}</span> : null}
        <span className="progress__time">{tpl(he.app.progressElapsed, { time: formatDuration(elapsedMs) })}</span>
        {showEta ? (
          <span className="progress__time">
            {tpl(he.app.progressEta, { time: formatDuration(remainingMs) })}
          </span>
        ) : null}
      </div>
    </div>
  )
}
