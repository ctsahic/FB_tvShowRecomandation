import { useEffect, useMemo, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { Recommendation, Settings } from './types'
import { isProviderConfigured, loadSettings, saveSettings } from './config/settings'
import { isFavoriteTitle } from './engine/favorites'
import { he } from './i18n/he'
import { useDpadNavigation } from './ui/hooks/useDpadNavigation'
import { backToFilters, currentScrollY, resolveBackAction } from './ui/back'
import { useAppVersion } from './ui/hooks/useAppVersion'
import { useScanner } from './ui/hooks/useScanner'
import { TAB_ORDER, TabBar, type TabKey } from './ui/components/TabBar'
import { buildTabLists } from './ui/tabs'
import { RecommendationCard } from './ui/components/RecommendationCard'
import { ScanProgressBar } from './ui/components/ScanProgressBar'
import { SportMatchCard } from './ui/components/SportMatchCard'
import { MatchDetailsPanel } from './ui/components/MatchDetailsPanel'
import { SettingsPanel } from './ui/components/SettingsPanel'
import { Clock } from './ui/components/Clock'

const TAB_KEYS = TAB_ORDER

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [tab, setTab] = useState<TabKey>('all')
  const [showSettings, setShowSettings] = useState(false)
  // המשחק שנפתח למסך הפרטים (מיקומים בטבלה ולמה המשחק מעניין).
  const [details, setDetails] = useState<Recommendation | null>(null)
  const scanner = useScanner(settings)
  // מספר הגרסה של מה שמותקן — מוצג בכותרת כדי שאפשר יהיה לוודא שהעדכון נכנס.
  const appVersion = useAppVersion()

  // ניווט בשלט רחוק של Android TV.
  useDpadNavigation()

  // כפתור ה-Back של השלט, בסדר הזה: סוגר חלון פתוח (פרטי משחק / הגדרות),
  // ואם אין חלון — מחזיר את המשתמש לראש העמוד, לשורת הסינון, כשהוא גלל
  // למטה ברשימת ההמלצות. רק כשלוחצים שוב כשהוא כבר למעלה האפליקציה ממוזערת
  // (ולא יוצאת): היא ממשיכה לרוץ ברקע, בלי להפסיק סריקה ובלי לאבד נתונים.
  const overlayOpenRef = useRef({ settings: showSettings, details: details !== null })
  overlayOpenRef.current = { settings: showSettings, details: details !== null }
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let remove: (() => void) | undefined
    void CapacitorApp.addListener('backButton', () => {
      const action = resolveBackAction({
        detailsOpen: overlayOpenRef.current.details,
        settingsOpen: overlayOpenRef.current.settings,
        scrollY: currentScrollY(),
      })
      switch (action) {
        case 'close-details':
          setDetails(null)
          return
        case 'close-settings':
          setShowSettings(false)
          return
        case 'top':
          backToFilters()
          return
        // minimizeApp ולא exitApp: האפליקציה נשארת באוויר מאחורי מסך הבית של
        // הטלוויזיה. (בפלטפורמות שאין בהן מזעור התקריות נבלעת בשקט.)
        case 'minimize':
          void CapacitorApp.minimizeApp().catch(() => undefined)
          return
      }
    }).then((handle) => {
      remove = () => void handle.remove()
    })
    return () => remove?.()
  }, [])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const recommendations = scanner.result?.recommendations ?? []

  // כל הטאבים יורשים את הסדר מהמנוע (rankItems) לפי "סדר ההמלצות" שבהגדרות —
  // כברירת מחדל הזמן הקרוב, ואפשר גם הציון הגבוה.
  const lists = useMemo(() => buildTabLists(recommendations), [recommendations])

  const counts = useMemo(() => {
    const out = {} as Record<TabKey, number>
    for (const key of TAB_KEYS) out[key] = lists[key].length
    return out
  }, [lists])

  function handleSave(next: Settings) {
    setSettings(next)
    saveSettings(next)
    setShowSettings(false)
    scanner.scan(next)
  }

  // ערך חסר = מוצג (ברירת המחדל), ורק כיבוי מפורש בהגדרות מסתיר אותו.
  const showClock = settings.prefs.showClock !== false

  const configured = isProviderConfigured(settings)
  const scanning = scanner.status === 'scanning'
  const activeList = lists[tab]
  const warnings = dedupeWarnings(scanner.result?.warnings ?? [])
  const summary = scanner.result
    ? `${scanner.result.channelsScanned} ערוצים · ${scanner.result.programmesScanned} תכניות · ${recommendations.length} המלצות`
    : scanner.message

  return (
    // app--clock משאיר מקום בכותרת לשעון הקבוע, כדי שהוא לא יכסה את הכותרת.
    <div className={`app${showClock ? ' app--clock' : ''}`}>
      {showClock ? <Clock /> : null}
      <header className="app__header">
        <div className="app__brand">
          <h1 className="app__title">{he.app.title}</h1>
          <p className="app__subtitle">{he.app.subtitle}</p>
          {/* הגרסה של מה שמותקן בפועל — כדי שאפשר יהיה לוודא שהעדכון נכנס. */}
          {appVersion ? (
            <p className="app__version">{`${he.app.version} ${appVersion}`}</p>
          ) : null}
        </div>
        <div className="app__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => scanner.fetchNow()}
            disabled={scanning}
          >
            {scanning ? he.app.scanning : he.app.fetchNow}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setShowSettings(true)}>
            {he.app.settings}
          </button>
        </div>
      </header>

      {/* בזמן סריקה: באר התקדמות עם שם הערוץ שנשלף כעת, הספירה לאחור
          של ההשהיה שהוגדרה וההערכה של הזמן שנותר. */}
      {scanning && scanner.progress ? (
        <ScanProgressBar progress={scanner.progress} startedAt={scanner.startedAt} />
      ) : null}

      {/* שורת מידע אחת: סיכום הסריקה ומתי עודכנו הנתונים — כדי לחסוך
          גובה מסך בטלוויזיה ולשמור על כותרת בשורה אחת. */}
      <p className="app__status app__status--line">
        {summary}
        {scanner.result && scanner.durationNote ? ` · ${scanner.durationNote}` : ''}
        {scanner.result ? ` · ${scanner.cacheNote}` : ''}
      </p>

      {scanner.status === 'error' && scanner.error ? (
        <div className="banner banner--error">{scanner.error}</div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="banner banner--warn banner--compact">
          <span className="banner__label">{he.app.warning}</span>
          {warnings.map((warning) => (
            <span className="banner__item" key={warning.code}>
              {warning.message}
            </span>
          ))}
        </div>
      ) : null}

      <TabBar active={tab} counts={counts} onChange={setTab} />

      <main className="app__main">
        {scanner.status === 'scanning' && recommendations.length === 0 ? (
          <div className="empty">
            <div className="spinner" />
            <p className="empty__title">{he.app.scanning}</p>
          </div>
        ) : activeList.length === 0 ? (
          <div className="empty">
            <p className="empty__title">{he.app.noResults}</p>
            <p>                {configured ? he.app.noResultsHint : he.warnings.noSettings}
            </p>
            <p className="field__hint">{he.app.antifrizHintShort ?? ''}</p>
            <div className="app__actions">
              {configured ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => scanner.fetchNow()}
                >
                  {he.app.fetchNow}
                </button>
              ) : null}
              <button
                type="button"
                className={`btn ${configured ? 'btn--ghost' : 'btn--primary'}`}
                onClick={() => scanner.scanDemo()}
              >
                {he.app.demo}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowSettings(true)}
              >
                {he.app.settings}
              </button>
            </div>
            <p className="field__hint">{he.app.demoHint}</p>
          </div>
        ) : (
          <div className="grid">
            {activeList.map((recommendation) =>
              recommendation.category === 'sport' ? (
                <SportMatchCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onOpenDetails={setDetails}
                />
              ) : (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  favorite={
                    recommendation.category === 'movie' ||
                    recommendation.category === 'movie-kids'
                      ? isFavoriteTitle(
                          recommendation.programme.title,
                          settings.prefs.favoriteMovies,
                        )
                      : isFavoriteTitle(
                          recommendation.programme.title,
                          settings.prefs.favoriteSeries,
                        )
                  }
                />
              ),
            )}
          </div>
        )}
      </main>

      {showSettings ? (
        <SettingsPanel
          settings={settings}
          onSave={handleSave}
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      {details ? (
        <MatchDetailsPanel recommendation={details} onClose={() => setDetails(null)} />
      ) : null}
    </div>
  )
}

function dedupeWarnings(
  warnings: readonly { code: string; message: string }[],
): { code: string; message: string }[] {
  const seen = new Set<string>()
  const out: { code: string; message: string }[] = []
  for (const warning of warnings) {
    if (seen.has(warning.code)) continue
    seen.add(warning.code)
    out.push(warning)
  }
  return out
}
