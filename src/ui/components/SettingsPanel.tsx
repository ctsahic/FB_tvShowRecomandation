import { useEffect, useRef, useState } from 'react'
import type { ProviderSettings, Settings, SortMode, SportKind } from '../../types'
import { SPORT_KINDS, cloneSettings } from '../../config/settings'
import { testProvider } from '../../engine/recommend'
import { parseListInput } from '../../engine/favorites'
import { he, tpl } from '../../i18n/he'
import { EpgChannelPicker } from './EpgChannelPicker'
import { MAX_CHANNEL_DELAY_SECONDS, MIN_CHANNEL_DELAY_SECONDS } from '../../config/channels'
import { FOCUSABLE_SELECTOR } from '../hooks/useDpadNavigation'
import { sportKindLabel } from '../format'

export interface SettingsPanelProps {
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
}

type TestState = { status: 'idle' | 'testing' | 'ok' | 'fail'; message?: string }

/** סוגי החיבור — כפתורים במקום select, כדי שהשלט יעבוד כמו שצריך. */
const PROVIDER_MODES: { value: ProviderSettings['mode']; label: string }[] = [
  { value: 'antifriz', label: he.settings.modeAntifriz },
  { value: 'xtream', label: he.settings.modeXtream },
  { value: 'm3u+xmltv', label: he.settings.modeM3u },
]

/** סדר ההמלצות — כפתורי בחירה כמו סוג החיבור, מאותה סיבה טלוויזיונית. */
const SORT_MODES: { value: SortMode; label: string }[] = [
  { value: 'time', label: he.settings.sortModeTime },
  { value: 'score', label: he.settings.sortModeScore },
]

export function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [draft, setDraft] = useState<Settings>(settings)
  const [test, setTest] = useState<TestState>({ status: 'idle' })
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  /**
   * בטלוויזיה חלון חייב לתפוס את הפוקוס מיד עם פתיחתו — אחרת הסימון נשאר
   * על הכפתור שמאחוריו, והמשתמש לא יודע איפה השלט נמצא. בסגירה מחזירים את
   * הפוקוס בדיוק למקום שממנו פתחנו.
   */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const preferred = panelRef.current?.querySelector<HTMLElement>('[data-tv-initial-focus]')
    const first = preferred ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    first?.focus()
    return () => {
      if (previous && previous !== document.body) previous.focus()
    }
  }, [])

  const updateProvider = (patch: Partial<ProviderSettings>) =>
    setDraft((prev) => ({ ...prev, provider: { ...prev.provider, ...patch } }))

  const updateApi = (patch: Partial<Settings['api']>) =>
    setDraft((prev) => ({ ...prev, api: { ...prev.api, ...patch } }))

  const updatePrefs = (patch: Partial<Settings['prefs']>) =>
    setDraft((prev) => ({ ...prev, prefs: { ...prev.prefs, ...patch } }))

  /**
   * סימון/ביטול של ענף. הרשימה נשמרת בסדר התצוגה של SPORT_KINDS (כמו בחירת
   * הערוצים) — כדי שחתימת ההגדרה תהיה יציבה ולא תיגרר הפעלה מחדש של הסריקה.
   */
  const toggleSportKind = (kind: SportKind) => {
    const selected = new Set(draft.prefs.sportKinds)
    if (selected.has(kind)) selected.delete(kind)
    else selected.add(kind)
    return SPORT_KINDS.filter((entry) => selected.has(entry))
  }

  async function handleTest() {
    setTest({ status: 'testing' })
    const result = await testProvider(draft)
    if (result.ok) {
      setTest({ status: 'ok', message: tpl(he.settings.connected, { count: result.channels }) })
    } else {
      setTest({
        status: 'fail',
        message: tpl(he.settings.connectionFailed, { message: result.message ?? '' }),
      })
    }
  }

  const isXtream = draft.provider.mode === 'xtream'
  const isAntifriz = draft.provider.mode === 'antifriz'

  return (
    <div className="panel-backdrop" role="dialog" aria-modal="true" aria-label={he.app.settings}>
      <div className="panel" ref={panelRef}>
        <div className="panel__content">
        <h2 className="panel__title">{he.app.settings}</h2>
        <p className="field__hint">{he.settings.tvKeyboardHint}</p>

        <section className="panel__section">
          <h3>{he.settings.provider}</h3>
          <p className="field__hint">{he.settings.providerHint}</p>

          {/*
           * בחירת סוג החיבור היא רשימת כפתורים ולא <select> מקורי.
           * בלווביון של הטלוויזיה מקשי החצים על select משנים את הערך במקום
           * להעביר פוקוס — כך המשתמש "נתקע" על השורה הראשונה וסוג החיבור
           * מתחלף בטעות. כפתורים נותנים שליטה מלאה לשלט.
           */}
          <div className="field">
            <span className="field__label">{he.settings.mode}</span>
            <div className="choices" role="radiogroup" aria-label={he.settings.mode}>
              {PROVIDER_MODES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={draft.provider.mode === option.value}
                  className={`btn choices__option ${
                    draft.provider.mode === option.value ? 'btn--primary' : 'btn--ghost'
                  }`}
                  data-tv-initial-focus={
                    draft.provider.mode === option.value ? '' : undefined
                  }
                  onClick={() => updateProvider({ mode: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isAntifriz ? (
            <>
              <div className="field-row">
                <div className="field">
                  <label className="field__label" htmlFor="provider-antifriz">
                    {he.settings.antifrizBase}
                  </label>
                  <input
                    id="provider-antifriz"
                    className="field__input"
                    value={draft.provider.antifrizBase}
                    onChange={(event) => updateProvider({ antifrizBase: event.target.value })}
                  />
                  <span className="field__hint">{he.settings.antifrizHint}</span>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="provider-delay">
                    {he.settings.delaySeconds}
                  </label>
                  <input
                    id="provider-delay"
                    className="field__input"
                    type="number"
                    min={MIN_CHANNEL_DELAY_SECONDS}
                    max={MAX_CHANNEL_DELAY_SECONDS}
                    step={1}
                    value={draft.provider.channelDelaySeconds}
                    onChange={(event) =>
                      updateProvider({ channelDelaySeconds: Number(event.target.value) || 0 })
                    }
                  />
                  <span className="field__hint">{he.settings.delayHint}</span>
                </div>
              </div>

            </>
          ) : isXtream ? (
            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="provider-host">
                  {he.settings.host}
                </label>
                <input
                  id="provider-host"
                  className="field__input"
                  value={draft.provider.host}
                  placeholder="bethoven.af.stream.com:8080"
                  onChange={(event) => updateProvider({ host: event.target.value })}
                />
                <span className="field__hint">{he.settings.hostHint}</span>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="provider-user">
                  {he.settings.username}
                </label>
                <input
                  id="provider-user"
                  className="field__input"
                  value={draft.provider.username}
                  onChange={(event) => updateProvider({ username: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="provider-pass">
                  {he.settings.password}
                </label>
                <input
                  id="provider-pass"
                  className="field__input"
                  type="password"
                  value={draft.provider.password}
                  onChange={(event) => updateProvider({ password: event.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="provider-m3u">
                  {he.settings.m3uUrl}
                </label>
                <input
                  id="provider-m3u"
                  className="field__input"
                  value={draft.provider.m3uUrl}
                  onChange={(event) => updateProvider({ m3uUrl: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="provider-xmltv">
                  {he.settings.xmltvUrl}
                </label>
                <input
                  id="provider-xmltv"
                  className="field__input"
                  value={draft.provider.xmltvUrl}
                  onChange={(event) => updateProvider({ xmltvUrl: event.target.value })}
                />
              </div>
            </div>
          )}

          {isAntifriz ? null : (
            <label className="switch">
              <input
                type="checkbox"
                checked={draft.provider.israeliOnly}
                onChange={(event) => updateProvider({ israeliOnly: event.target.checked })}
              />
              {he.settings.israeliOnly}
            </label>
          )}

          <div className="panel__footer">
            <button type="button" className="btn btn--ghost" onClick={handleTest}>
              {test.status === 'testing' ? he.settings.testing : he.settings.testConnection}
            </button>
            {test.message ? (
              <span className={test.status === 'ok' ? 'app__status' : 'banner banner--warn'}>
                {test.message}
              </span>
            ) : null}
          </div>
        </section>

        <section className="panel__section">
          <h3>{he.settings.api}</h3>
          {/* המפתחות מוצגים כמו שהם (לא כמסומנות) — כדי שאפשר יהיה לוודא
              שהעתקה מהאתר לא הכניסה תו שגוי. המפתחות האלה אינם סיסמאות
              להתחברות שלנו לשום מקום; הם רק מזהים את המשתמש מול ה-API. */}
          <p className="field__hint">{he.settings.apiKeyVisibleHint}</p>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor="api-tmdb">
                {he.settings.tmdbKey}
              </label>
              <input
                id="api-tmdb"
                className="field__input"
                type="text"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                value={draft.api.tmdbApiKey}
                onChange={(event) => updateApi({ tmdbApiKey: event.target.value })}
              />
              <span className="field__hint">{he.settings.tmdbHint}</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="api-omdb">
                {he.settings.omdbKey}
              </label>
              <input
                id="api-omdb"
                className="field__input"
                type="text"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                value={draft.api.omdbApiKey}
                onChange={(event) => updateApi({ omdbApiKey: event.target.value })}
              />
              <span className="field__hint">{he.settings.omdbHint}</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="api-football">
                {he.settings.footballKey}
              </label>
              <input
                id="api-football"
                className="field__input"
                type="text"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                value={draft.api.footballApiKey}
                onChange={(event) => updateApi({ footballApiKey: event.target.value })}
              />
              <span className="field__hint">{he.settings.footballHint}</span>
            </div>
          </div>
        </section>

        <section className="panel__section">
          <h3>{he.settings.prefs}</h3>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor="prefs-team">
                {he.settings.favoriteTeam}
              </label>
              <input
                id="prefs-team"
                className="field__input"
                value={draft.prefs.favoriteTeam}
                onChange={(event) => updatePrefs({ favoriteTeam: event.target.value })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="prefs-series">
                {he.settings.favoriteSeries}
              </label>
              <input
                id="prefs-series"
                className="field__input"
                value={draft.prefs.favoriteSeries.join(', ')}
                onChange={(event) =>
                  updatePrefs({ favoriteSeries: parseListInput(event.target.value) })
                }
              />
              <span className="field__hint">{he.settings.listHint}</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="prefs-movies">
                {he.settings.favoriteMovies}
              </label>
              <input
                id="prefs-movies"
                className="field__input"
                value={draft.prefs.favoriteMovies.join(', ')}
                onChange={(event) =>
                  updatePrefs({ favoriteMovies: parseListInput(event.target.value) })
                }
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="prefs-channels">
                {he.settings.favoriteChannels}
              </label>
              <input
                id="prefs-channels"
                className="field__input"
                value={draft.prefs.favoriteChannels.join(', ')}
                onChange={(event) =>
                  updatePrefs({ favoriteChannels: parseListInput(event.target.value) })
                }
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor="prefs-movie-rating">
                {he.settings.minMovieRating}
              </label>
              <input
                id="prefs-movie-rating"
                className="field__input"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={draft.prefs.minMovieRating}
                onChange={(event) =>
                  updatePrefs({ minMovieRating: Number(event.target.value) || 0 })
                }
              />
              <p className="field__hint">{he.settings.minMovieRatingHint}</p>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="prefs-series-rating">
                {he.settings.minSeriesRating}
              </label>
              <input
                id="prefs-series-rating"
                className="field__input"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={draft.prefs.minSeriesRating}
                onChange={(event) =>
                  updatePrefs({ minSeriesRating: Number(event.target.value) || 0 })
                }
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="prefs-lookahead">
                {he.settings.lookAhead}
              </label>
              <input
                id="prefs-lookahead"
                className="field__input"
                type="number"
                min={1}
                max={48}
                step={1}
                value={draft.prefs.lookAheadHours}
                onChange={(event) =>
                  updatePrefs({ lookAheadHours: Number(event.target.value) || 1 })
                }
              />
            </div>
          </div>

          {/* סרט בלי ציון ובלי ביקורת מהשרתים — לא מוצג בכלל. */}
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.prefs.hideUnratedMovies}
              onChange={(event) => updatePrefs({ hideUnratedMovies: event.target.checked })}
            />
            {he.settings.hideUnratedMovies}
          </label>
          <p className="field__hint">{he.settings.hideUnratedMoviesHint}</p>

          <div className="field">
            <span className="field__label">{he.settings.sortMode}</span>
            <div className="choices" role="radiogroup" aria-label={he.settings.sortMode}>
              {SORT_MODES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={draft.prefs.sortMode === option.value}
                  className={`btn choices__option ${
                    draft.prefs.sortMode === option.value ? 'btn--primary' : 'btn--ghost'
                  }`}
                  onClick={() => updatePrefs({ sortMode: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="field__hint">{he.settings.sortModeHint}</p>
          </div>

          {/* שעון קבוע בפינה הימנית העליונה — אפשר להסתיר אותו מכאן. */}
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.prefs.showClock !== false}
              onChange={(event) => updatePrefs({ showClock: event.target.checked })}
            />
            {he.settings.showClock}
          </label>
          <p className="field__hint">{he.settings.showClockHint}</p>

          {/* "ענפים שמעניינים אותי" — בחירה מרובה בצ׳יפים: בטאב הספורט יוצג
              רק משחק מהענפים המסומנים. לחיצה חוזרת מורידה סימון. */}
          <div className="field">
            <span className="field__label">{he.settings.sportKinds}</span>
            <div className="choices choices--chips" role="group" aria-label={he.settings.sportKinds}>
              {SPORT_KINDS.map((kind) => {
                const selected = draft.prefs.sportKinds.includes(kind)
                return (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={selected}
                    className={`btn choices__option ${
                      selected ? 'btn--primary' : 'btn--ghost'
                    }`}
                    onClick={() => updatePrefs({ sportKinds: toggleSportKind(kind) })}
                  >
                    {sportKindLabel(kind)}
                  </button>
                )
              })}
            </div>
            <span className="field__hint">{he.settings.sportKindsHint}</span>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={draft.prefs.liveSportsOnly}
              onChange={(event) => updatePrefs({ liveSportsOnly: event.target.checked })}
            />
            {he.settings.liveSportsOnly}
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.prefs.includeNews}
              onChange={(event) => updatePrefs({ includeNews: event.target.checked })}
            />
            {he.settings.includeNews}
          </label>
        </section>

        {/*
         * בחירת הערוצים היא **האחרונה** במסך. כל השאר — חיבור, מפתחות
         * ומקורות מידע, העדפות — מוגדר לפניה, כדי שלא צריך לעבור את כל 131
         * הערוצים כדי להגיע להגדרה פשוטה. גם מבחינת השלט: מהרשימה הארוכה
         * יוצאים החוצה למסילה שליד הפעולות, ולא מגלים באמצע שהיא בכלל לא
         * הסוף של החלון.
         *
         * היא מוצגת רק במצב antifriz: ביתר המצבים רשימת הערוצים מגיעה מהספק.
         */}
        {isAntifriz ? (
          <section className="panel__section">
            <h3>{he.settings.epgChannels}</h3>
            <p className="field__hint">{he.settings.epgChannelsHint}</p>
            <EpgChannelPicker
              selected={draft.provider.epgChannelIds}
              onChange={(epgChannelIds) => updateProvider({ epgChannelIds })}
            />
          </section>
        ) : null}

        </div>

        {/*
         * פעולות החלון ב"מסילה" בצד — לא בתחתית.
         * הסיבה טלוויזיונית טהורה: רשימת 131 הערוצים ארוכה מאוד, וכפתור שמור
         * בתחתית היה דורש עשרות לחיצות בשלט. מהמסילה אפשר לחצות עם שמאלה
         * אחת מכל מקום בחלון ולשמור.
         */}
        <aside className="panel__rail">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {he.app.cancel}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setDraft(cloneSettings())}
          >
            {he.settings.clearData}
          </button>
          {/*
           * שמור חייב להיות האחרון במסילה (התחתון): מהשלט מדובר בכפתור
           * הקרוב ביותר לתוכן, ולכן שמאלה/ימינה מהשדות או מרשימת הערוצים
           * נוחתת עליו — ולא בטעות על "אפס הכל".
           */}
          <button type="button" className="btn btn--primary" onClick={() => onSave(draft)}>
            {he.app.save}
          </button>
        </aside>
      </div>
    </div>
  )
}
