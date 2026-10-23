import { useCallback, useEffect, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { ScanProgress, ScanResult, ScanWarning, Settings } from '../../types'
import {
  CHANNELS_END_RATIO,
  buildRecommendations,
  buildScanResult,
  resolveEpgSelection,
  scanAndRecommend,
} from '../../engine/recommend'
import { buildDemoSnapshot } from '../../engine/demo'
import { describeCacheAge, loadEpgCache, shouldScanOnOpen } from '../../data/epgCache'
import { isProviderConfigured } from '../../config/settings'
import { formatDuration, he, tpl } from '../../i18n/he'

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error'

export interface ScannerState {
  status: ScanStatus
  result?: ScanResult
  message: string
  error?: string
  /** התקדמות מפורטת של הסריקה שרצה כעת (undefined כשאין סריקה). */
  progress?: ScanProgress
  /** חותמת הזמן שבה החלה הסריקה הנוכחית — לשעון "עברו 0:12". */
  startedAt: number
  /** כמה זמן ארכה הסריקה שהסתיימה לאחרונה. */
  durationNote?: string
  /** מחשב המלצות מהמטמון (או מוריד אם אין מטמון תקף). */
  scan: (override?: Settings) => void
  /** מוריד מחדש מהאתר ומתעלם מהמטמון — "הבא נתונים עכשיו". */
  fetchNow: (override?: Settings) => void
  /** טוען את מערך הדוגמה — לתצוגה מקדימה בלי ספק. */
  scanDemo: () => void
  /** מתי עודכנו הנתונים בפעם האחרונה (בעברית). */
  cacheNote: string
}

export function useScanner(settings: Settings): ScannerState {
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [result, setResult] = useState<ScanResult | undefined>(undefined)
  const [message, setMessage] = useState<string>(he.app.never)
  const [error, setError] = useState<string | undefined>(undefined)
  const [progress, setProgress] = useState<ScanProgress | undefined>(undefined)
  const [startedAt, setStartedAt] = useState(0)
  const [durationNote, setDurationNote] = useState<string | undefined>(undefined)
  const [cacheNote, setCacheNote] = useState<string>(() =>
    describeCacheAge(loadEpgCache(), Date.now(), resolveEpgSelection(settings)),
  )

  const controllerRef = useRef<AbortController | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const startedRef = useRef(false)
  const lastScanAtRef = useRef(0)

  const scan = useCallback(async (override?: Settings, options?: { forceRefresh?: boolean }) => {
    const current = override ?? settingsRef.current
    if (!isProviderConfigured(current)) {
      setStatus('error')
      setError(he.warnings.noSettings)
      return
    }
    lastScanAtRef.current = Date.now()
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    const startAt = Date.now()
    setStatus('scanning')
    setError(undefined)
    setMessage(he.app.scanning)
    setStartedAt(startAt)
    setDurationNote(undefined)
    setProgress({
      phase: 'list',
      label: he.app.progressListLabel,
      message: he.app.scanning,
      ratio: 0,
      done: 0,
      total: 0,
    })

    // ברגע שהמהדורה הראשונה מגיעה המסך מוצג. מכאן ההעשרה רצה ברקע, ולכן
    // באר ההתקדמות נעלמת ולא חוזרת, והזמן שנמדד הוא הזמן עד שהמסך הופיע.
    let partialShown = false
    try {
      const scanResult = await scanAndRecommend({
        settings: current,
        signal: controller.signal,
        onProgress: (next) => {
          if (partialShown && next.phase === 'enrich') return
          setProgress(next)
          setMessage(next.message)
        },
        onResult: (partial) => {
          if (controller.signal.aborted) return
          if (!partialShown) {
            partialShown = true
            setProgress(undefined)
            setStatus('done')
            setDurationNote(
              tpl(he.app.progressTook, { time: formatDuration(Date.now() - startAt) }),
            )
          }
          setResult(partial)
          setMessage(he.app.enriching)
        },
        forceRefresh: options?.forceRefresh ?? false,
      })
      if (controller.signal.aborted) return
      setResult(scanResult)
      setStatus('done')
      setProgress(undefined)
      // כשהמסך כבר הוצג לא דורסים את זמן ההופעה בזמן המלא של ההעשרה.
      if (!partialShown) {
        setDurationNote(tpl(he.app.progressTook, { time: formatDuration(Date.now() - startAt) }))
      }
      setMessage(he.app.lastScan)
      setCacheNote(describeCacheAge(loadEpgCache(), Date.now(), resolveEpgSelection(current)))
    } catch (caught) {
      if (controller.signal.aborted) return
      setStatus('error')
      setProgress(undefined)
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [])

  const fetchNow = useCallback(
    (override?: Settings) => scan(override, { forceRefresh: true }),
    [scan],
  )

  const scanDemo = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const startAt = Date.now()
    setStatus('scanning')
    setError(undefined)
    setMessage(he.app.scanning)
    setStartedAt(startAt)
    setDurationNote(undefined)
    setProgress({
      phase: 'recommend',
      label: he.app.progressRecommendLabel,
      message: he.app.progressRecommend,
      ratio: CHANNELS_END_RATIO,
      done: 0,
      total: 0,
    })
    try {
      const now = Date.now()
      const snapshot = buildDemoSnapshot(now)
      const warnings: ScanWarning[] = []
      const recommendations = await buildRecommendations(
        snapshot,
        settingsRef.current,
        now,
        controller.signal,
        warnings,
        (next) => {
          setProgress(next)
          setMessage(next.message)
        },
      )
      if (controller.signal.aborted) return
      setResult(buildScanResult(snapshot, recommendations, now, warnings))
      setStatus('done')
      setProgress(undefined)
      setDurationNote(tpl(he.app.progressTook, { time: formatDuration(Date.now() - startAt) }))
      setMessage(he.app.lastScan)
    } catch (caught) {
      if (controller.signal.aborted) return
      setStatus('error')
      setProgress(undefined)
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [])

  /*
   * פתיחת האפליקציה: **לא** שולפים נתונים מהאתר לבד.
   *
   *  • מטמון של הבחירה הנוכחית וטרי — מציגים ממנו, בלי שום בקשת רשת
   *    למדריך (ההמלצות מחושבות מהנתונים השמורים).
   *  • המשתמש החליף ערוצים מאז הסריקה האחרונה — זו הסיבה היחידה
   *    לשליפה אוטומטית, כי בלעדיה חסרים הערוצים החדשים.
   *  • אין מטמון, או שהוא של יום קודם — ממתינים ל„הבא נתונים עכשיו”.
   */
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const current = settingsRef.current
    if (!isProviderConfigured(current)) return
    const decision = shouldScanOnOpen(loadEpgCache(), resolveEpgSelection(current), Date.now())
    if (decision !== 'wait') void scan()
  }, [scan])

  // חזרה לאפליקציה (השלט לחץ HOME ואז חזר) — אותה מדיניות בדיוק כמו בפתיחה:
  // מטמון טרי נטען ממקום בלי רשת, בחירת ערוצים שהשתנתה מפעילה שליפה,
  // ויום חדש ממתין ל„הבא נתונים עכשיו”.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let remove: (() => void) | undefined
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      // התעלמות מהאירוע שנשלח מיד עם ההרמה, כשלמעשה הסריקה כבר בדרך.
      if (Date.now() - lastScanAtRef.current < 30_000) return
      const current = settingsRef.current
      if (!isProviderConfigured(current)) return
      const decision = shouldScanOnOpen(loadEpgCache(), resolveEpgSelection(current), Date.now())
      if (decision !== 'wait') void scan()
    }).then((handle) => {
      remove = () => void handle.remove()
    })
    return () => remove?.()
  }, [scan])

  // בכוונה לא מבטלים את הסריקה בעזיבת הרכיב: ב-dev React מריץ את
  // ה-effect פעמיים (mount → cleanup → mount), וביטול כאן היה משאיר את
  // המסך תקוע על "סורק…" לנצח בלי סריקה חדשה. בסריקה חדשה בכל מקרה
  // מתבטלת הקודמת (controllerRef.current?.abort() בתוך scan).

  return {
    status,
    result,
    message,
    error,
    progress,
    startedAt,
    durationNote,
    scan,
    fetchNow,
    scanDemo,
    cacheNote,
  }
}
