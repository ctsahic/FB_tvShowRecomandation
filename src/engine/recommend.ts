import type {
  Category,
  Channel,
  Enrichment,
  EpgSnapshot,
  Programme,
  Recommendation,
  RecommendationStatus,
  ScanProgress,
  ScanResult,
  ScanWarning,
  Settings,
  SortMode,
  TeamStanding,
} from '../types'
import { delayMs, fetchResponse, fetchText, mapLimit } from '../data/http'
import { getAllLiveStreams, getShortEpg, israeliGroupScore, testConnection } from '../data/xtream'
import {
  ANTIFRIZ_BASE,
  antifrizChannelGroup,
  fetchAntifrizChannels,
  fetchAntifrizSchedule,
  hasLiveMarker,
  type AntifrizScheduleItem,
} from '../data/antifriz'
import {
  channelCacheKey,
  channelsToFetch,
  loadEpgCache,
  mergeEpgCache,
  saveEpgCache,
  type EpgCacheEntry,
} from '../data/epgCache'
import {
  CHANNEL_BY_ID,
  DEFAULT_EPG_CHANNEL_IDS,
  categoryLabel,
  normalizeChannelSelection,
} from '../config/channels'
import { jerusalemDateString } from '../data/jerusalem'
import { parseM3u } from '../data/m3u'
import { createXmltvStreamParser } from '../data/xmltv'
import { cleanTitle, createTmdbClient, isTmdbAuthError, isTmdbConfigured } from '../data/tmdb'
import { createOmdbClient, isOmdbConfigured } from '../data/omdb'
import { bundledTable } from '../sports/standings'
import { findMatchLeague, type LeagueRef } from '../sports/leagues'
import { loadLeagueTables, type LeagueTable } from '../sports/tableStore'
import { classifyProgramme, isKidsMovieGenre, type Classification } from './classify'
import { ratedScore, scoreProgramme, type ScoreInput, type ScoreOutcome } from './score'
import { normalizeTitleKey } from './favorites'
import { formatTime, he, tpl } from '../i18n/he'
import { isProviderConfigured } from '../config/settings'

/*
 * אין תקרת העשרה. בעבר הוגבל השלב ל-28 סרטים ו-28 סדרות מחשש למכסה, אבל
 * בפועל המכסה אינה צוואר הבקבוק: OMDb נשלף פעם אחת לכל כותר ש-TMDB כבר זיהה
 * (1,000 בקשות ביום בחינם) ו-TMDB חסום בקצב בלבד, לא במכסה יומית. לכן כל סרט
 * וכל סדרה מועשרים, והמחיר — עוד כמה שניות — אינו משולם על ידי המשתמש: שלב
 * ההעשרה מדווח תוצאות ביניים, והמסך מוצג עוד לפניו.

/**
 * כמה המלצות מוצגות בסופו של דבר בכל קטגוריה.
 *
 * ספורט אינו מוגבל: המשתמש ביקש לראות את **כל** המשחקים החיים שנאספו
 * מהערוצים שנבחרו, ולכן אין שם תקרת כרטיסים.
 */
const MAX_PER_CATEGORY: Record<Category, number> = {
  sport: Number.POSITIVE_INFINITY,
  series: 20,
  movie: 20,
  'movie-kids': 20,
  news: 4,
  kids: 0,
  other: 0,
}

/** חלון זמן שממנו נאספות תכניות שעדיין באוויר. */
const LIVE_LOOKBACK_MS = 6 * 60 * 60 * 1000

/**
 * מתחת לסף הזה לא מציגים המלצה. זמן הצפייה של המשתמש מוגבל, ולכן עדיף
 * להראות פחות כרטיסים אבל רק כאלה שבאמת שווים צפייה.
 */
const MIN_SCORE = 46

/**
 * סף הציון שמתחתיו לא מציגים המלצה. בספורט אין סף: כל משחק חי מוצג,
 * גם אם הוא בין שתי קבוצות תחתית — המשתמש ביקש לראות את כולם.
 */
function minScoreFor(category: Category): number {
  return category === 'sport' ? 0 : MIN_SCORE
}

const STARTING_SOON_MINUTES = 30

/**
 * תקציב הזמן של שלב חיפוש הביקורות. שלב ההעשרה הוא "נחמד שיש": אם TMDB
 * איטי או לא זמין — לא מחכים לו. בלי התקרה הזו, כשל רשת גרם לכך שסריקה של
 * שני ערוצים לקחה דקה וחצי במקום 15 שניות.
 *
 * 6 שניות מכוון לתקרה שהמשתמש ביקש: שליפת שני הערוצים (כולל ההשהיה של 10
 * שניות) נמדדה בכ-11 שניות, ועוד 6 שניות של ביקורות = כ-17 שניות — מתחת ל-20.
 */
const ENRICH_BUDGET_MS = 6_000

/**
 * אותה תקרה, אבל כשיש מי שמקבל תוצאות ביניים: המסך כבר מוצג והציונים נכנסים
 * לכרטיסים בזמן אמת, ולכן אין סיבה לקצץ באמצע. שלוש דקות הן רק שומר מפני
 * ריצה אינסופית (למשל ספק שמחזיר תשובה חלקית בלי לזרוק שגיאה) — לא תקציב שימושי.
 */
const ENRICH_BACKGROUND_BUDGET_MS = 180_000

/** אחרי כמה כשלים רצופים מפסיקים לבקש — כנראה שהמפתח שגוי או שאין רשת. */
const MAX_ENRICH_FAILURES = 3

export interface ScanOptions {
  settings: Settings
  /** לשם בדיקות — ברירת מחדל Date.now(). */
  now?: number
  signal?: AbortSignal
  /** דיווח התקדמות מפורט: שלב, ערוץ נוכחי, ספירה לאחור והערכה של הזמן שנותר. */
  onProgress?: (progress: ScanProgress) => void
  /** מתעלם מהמטמון ומוריד מחדש מהאתר (הכפתור "הבא נתונים עכשיו"). */
  forceRefresh?: boolean
  /**
   * נקרא כאשר מהדורה שלמה של ההמלצות מוכנה — כולל מיד עם סיום הערוצים,
   * לפני שהציונים נשלפו. זה מה שמאפשר להציג את המסך מיד ולמלא ציונים בהמשך.
   */
  onResult?: (result: ScanResult) => void
}

/**
 * משקלי השלבים בבאר ההתקדמות (הסכום 1). כמעט כל ההמתנה היא לערוצים — כל
 * דקה של השהיה בין ערוץ לערוץ — ולכן הם מקבלים 90% מהבאר, וההשהיה של 10
 * שניות נכנסת לתוכם. חיפוש הביקורות והציונים (TMDB/OMDb) נשאר 5%, כדי
 * שהבאר לא תיתקע על 80% בזמן שהסריקה כבר מזמן נגמרה.
 */
const PROGRESS_LIST_WEIGHT = 0.05
const PROGRESS_CHANNELS_WEIGHT = 0.9
const PROGRESS_ENRICH_WEIGHT = 0.05

/** נקודת ההתקדמות שבה מסתיימים הערוצים ומתחיל חיפוש הביקורות. */
export const CHANNELS_END_RATIO = PROGRESS_LIST_WEIGHT + PROGRESS_CHANNELS_WEIGHT

/*
 * כל ערוץ מקבל פרוסה משלו בבאר: 30% ממנה על בקשת לוח השידורים, ו-70% על
 * ההשהיה שאחריה. החלוקה הזו היא מה שמונע קפיצה אחורה — בזמן ההשהיה הבאר
 * מתקדמת בדיוק עד הנקודה שבה מתחילה הבקשה של הערוץ הבא, ולא מעבר לה.
 * (בלי זה, הבאר עלתה ל-79% בזמן ההשהיה וצנחה ל-43% כשהבקשה הבאה החלה.)
 */
const FETCH_SHARE_OF_CHANNEL = 0.3

/** יחס ההתקדמות בתוך הפרוסה של ערוץ שמספרו `index` (0-based), לשבר `fraction`. */
function channelSlice(index: number, total: number, fraction: number): number {
  if (total <= 0) return PROGRESS_LIST_WEIGHT
  const share = Math.min(1, Math.max(0, (index + fraction) / total))
  return PROGRESS_LIST_WEIGHT + PROGRESS_CHANNELS_WEIGHT * share
}

interface Candidates {
  items: ScoredItem[]
  table: readonly TeamStanding[]
  warnings: ScanWarning[]
}

interface ScoredItem {
  programme: Programme
  channel: Channel
  classification: Classification
  outcome: ScoreOutcome
  enrichment?: Enrichment | null
  /**
   * כן = באמת שאלנו את מסד הנתונים של הסרטים על הכותר הזה, והוא לא החזיר
   * כלום. התשובה הזו היא מה שמבדיל בין "אין מידע על הסרט" לבין "לא הספקנו
   * לבדוק" — ורק במקרה הראשון מסתירים את הכרטיס.
   */
  enrichmentChecked?: boolean
}

/* ------------------------------------------------------------------ */
/* שלב 1 — הבאת הערוצים ולוח השידורים                                  */
/* ------------------------------------------------------------------ */

function selectIsraeliChannels(channels: readonly Channel[], settings: Settings): Channel[] {
  const hints = settings.provider.israeliGroupHints
  const scored = channels.map((channel) => ({
    channel,
    score: israeliGroupScore(channel, hints),
  }))
  const flagged = scored.map(({ channel, score }) => ({ ...channel, israeli: score > 0 }))

  if (!settings.provider.israeliOnly) return flagged

  const israeli = flagged.filter((channel) => channel.israeli)
  // הגנה: אם הסינון התוקפני מחזיר מעט מדי, מחזירים את כולם.
  if (israeli.length >= 5) return israeli
  return flagged
}

async function loadChannels(
  settings: Settings,
  signal: AbortSignal | undefined,
  warnings: ScanWarning[],
  onProgress?: (progress: ScanProgress) => void,
): Promise<Channel[]> {
  const provider = settings.provider
  onProgress?.({
    phase: 'list',
    label: he.app.progressListLabel,
    message: he.app.fetchingList,
    ratio: 0,
    done: 0,
    total: 0,
  })
  let channels: Channel[]
  if (provider.mode === 'xtream') {
    channels = await getAllLiveStreams(
      { host: provider.host, username: provider.username, password: provider.password },
      signal,
    )
  } else {
    const text = await fetchText(provider.m3uUrl, { signal, timeoutMs: 90_000 })
    channels = parseM3u(text)
  }
  const selected = selectIsraeliChannels(channels, settings)
  if (selected.length === 0) {
    warnings.push({ code: 'noChannels', message: he.warnings.noChannels })
  }
  return selected
}

async function loadProgrammes(
  settings: Settings,
  channels: readonly Channel[],
  window: { from: number; to: number; lookAheadHours: number },
  signal: AbortSignal | undefined,
  warnings: ScanWarning[],
): Promise<Programme[]> {
  const provider = settings.provider

  if (provider.mode === 'xtream') {
    const creds = {
      host: provider.host,
      username: provider.username,
      password: provider.password,
    }
    // get_short_epg מחזיר רשימה רציפה; מספיק כדי לכסות את חלון החיפוש.
    const listings = Math.min(16, Math.max(4, Math.ceil(window.lookAheadHours / 1.5)))
    let failures = 0
    const chunks = await mapLimit(channels, 6, async (channel) => {
      try {
        return await getShortEpg(creds, channel, listings, signal)
      } catch {
        failures += 1
        return [] as Programme[]
      }
    })
    if (failures > 0) {
      warnings.push({
        code: 'partialEpg',
        message: `${he.warnings.partialEpg} (${failures}/${channels.length})`,
      })
    }
    return chunks.flat()
  }

  // מצב XMLTV — ניתוח זורם כדי לא להחזיק עשרות מגה-בייט בזיכרון.
  const epgIdToChannel = new Map<string, Channel>()
  for (const channel of channels) {
    const key = (channel.epgId ?? channel.id).toLowerCase()
    epgIdToChannel.set(key, channel)
  }
  const parser = createXmltvStreamParser({
    channelIds: new Set(epgIdToChannel.keys()),
    from: window.from,
    to: window.to,
  })
  const response = await fetchResponse(provider.xmltvUrl, { signal, timeoutMs: 240_000 })
  if (response.body) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      parser.push(decoder.decode(value, { stream: true }))
    }
  } else {
    parser.push(await response.text())
  }

  const parsed = parser.finish()
  const out: Programme[] = []
  for (const programme of parsed.programmes) {
    const channel = epgIdToChannel.get(programme.channelId.toLowerCase())
    if (!channel) continue
    out.push({ ...programme, channelId: channel.id, channelName: channel.name })
  }
  if (out.length === 0) {
    warnings.push({ code: 'noChannels', message: he.warnings.noChannels })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* מקור האתר (antifriz) — אין שרת EPG בפאנל                            */
/* ------------------------------------------------------------------ */

function antifrizProgramme(item: AntifrizScheduleItem, channel: Channel): Programme {
  const title = item.title.trim()
  const description = item.description ?? ''
  const programme: Programme = {
    channelId: channel.id,
    channelName: channel.name,
    title,
    start: item.start,
    stop: item.stop,
    categories: [],
    // הלוח מסמן שידור ישיר במילה "ישיר" בכותרת ("ישיר!") ובתקציר ("שידור ישיר:").
    isLive: hasLiveMarker(title) || hasLiveMarker(description),
  }
  if (description) programme.description = description
  return programme
}

/**
 * הערוצים שייבדקו ב-EPG — מתוך הבחירה שנשמרה בהגדרות.
 * בחירה ריקה נופלת לברירת המחדל (שני ערוצים), כדי שלא נסרוק בטעות את כל 131.
 */
export function resolveEpgSelection(settings: Settings): string[] {
  const normalized = normalizeChannelSelection(settings.provider.epgChannelIds ?? [])
  return normalized.length > 0 ? normalized : [...DEFAULT_EPG_CHANNEL_IDS]
}

/**
 * שולף את לוח השידורים היומי של הערוצים שנבחרו **וחסרים במטמון**.
 *
 * `pending` הוא בדיוק רשימת הערוצים שאין להם נתון טרי להיום; ערוץ שכבר ירד
 * היום לא נשלף שוב — הוא מגיע מהמטמון בחזרה ל-scanEpg. זה מה שמונע הורדות
 * חוזרות כשמשתמשים רק מוסיפים או מסירים ערוץ אחד.
 *
 * הבקשות יוצאות אחת-אחת (לא במקביליות) עם השהיה מוגדרת ביניהן — בדיוק
 * כמו בסקריפט הייחוס, כדי לא להציף את האתר ולא להיחסם.
 */
async function scrapeAntifriz(
  settings: Settings,
  now: number,
  signal: AbortSignal | undefined,
  warnings: ScanWarning[],
  onProgress: ((progress: ScanProgress) => void) | undefined,
  selection: readonly string[],
  pending: readonly string[],
  /**
   * נקרא מיד אחרי שכל ערוץ ירד. הסריקה שומרת את התוצאה לדיסק כאן ולא רק
   * בסוף — כדי שערוץ שכבר ירד לא יירד שוב אם הסריקה נקטעת באמצע.
   */
  onChannelFetched?: (channel: Channel, programmes: Programme[]) => void,
  /** כמה ערוצים מהבחירה כבר שמורים מהיום — מדלגים עליהם. */
  reused = 0,
): Promise<EpgSnapshot> {
  const base = settings.provider.antifrizBase.trim() || ANTIFRIZ_BASE
  const selected = selection.length > 0 ? selection : resolveEpgSelection(settings)
  const pendingSet = new Set(pending.length > 0 ? pending : selected)
  // שומרים על סדר הבחירה, ומורידים רק את מה שחסר.
  const targets = selected.filter((slug) => pendingSet.has(slug))
  const delaySeconds = Math.max(0, Number(settings.provider.channelDelaySeconds) || 0)

  // בקשה אחת שמביאה לוגואים ולשמות הרשמיים של האתר לכל הערוצים.
  onProgress?.({
    phase: 'list',
    label: he.app.progressListLabel,
    message: he.app.progressList,
    ratio: 0,
    done: 0,
    total: targets.length,
  })
  const refs = await fetchAntifrizChannels(base, signal)
  const refById = new Map(refs.map((ref) => [ref.slug, ref]))

  /*
   * ההודעה על מה שמדלגים חייבת לבוא **אחרי** הודעת רשימת הערוצים — אחרת היא
   * נדרסת מיד ואיש לא רואה אותה. היא זו שמסבירה למשתמש למה הסריקה ממשיכה
   * מהמקום שבו נעצרה ולא מתחילה מאפס.
   */
  if (reused > 0) {
    onProgress?.({
      phase: 'list',
      label: he.app.progressListLabel,
      message: tpl(he.app.progressReusingCache, { count: reused }),
      ratio: 0,
      done: 0,
      total: targets.length,
    })
  }

  const channels: Channel[] = targets.map((slug) => {
    const def = CHANNEL_BY_ID.get(slug)
    const ref = refById.get(slug)
    const name = def?.name ?? ref?.name ?? slug
    const channel: Channel = {
      id: `antifriz:${slug}`,
      name,
      group: def ? categoryLabel(def.category) : antifrizChannelGroup(name),
      epgId: slug,
      israeli: true,
    }
    if (def) channel.number = def.number
    if (ref?.logo) channel.icon = ref.logo
    return channel
  })

  // אין מה להוריד: או שהכל כבר במטמון, או שהאתר לא החזיר כלום.
  if (channels.length === 0) {
    if (refs.length === 0) {
      warnings.push({ code: 'noChannels', message: he.warnings.noGuideChannels })
    }
    return { channels: [], programmes: [], warnings }
  }
  // ערוץ שנבחר ולא נמצא באתר — זה לא כשל, אבל כדאי לדעת.
  const missing = selected
    .filter((slug) => !refById.has(slug))
    .map((slug) => CHANNEL_BY_ID.get(slug)?.name ?? slug)
  if (missing.length > 0) {
    warnings.push({
      code: 'missingGuideChannels',
      message: `${he.warnings.missingGuideChannels}: ${missing.join(', ')}`,
    })
  }

  const date = jerusalemDateString(now)
  const total = channels.length
  /*
   * כשחלק מהערוצים כבר שמורים מהסריקה הקודמת, זה כתוב בקבועה של השלב ולא
   * רק בהודעה חולפת: המשתמש רואה "ממשיכים מאותה נקודה" לאורך כל ההורדה.
   */
  const channelsLabel =
    reused > 0
      ? `${he.app.progressChannelsLabel} · ${tpl(he.app.progressReusingCacheShort, { count: reused })}`
      : he.app.progressChannelsLabel
  const programmes: Programme[] = []
  /*
   * רק הערוצים שבאמת ירדו. ערוץ שנכשל או שהסריקה נעצרה לפניו **לא** נחשב
   * כאילו יש לו לוח שידורים — אחרת הוא היה מסומן כטרי במטמון בלי שום תכנית,
   * ובסריקה הבאה לא היו מנסים להוריד אותו שוב.
   */
  const fetched: Channel[] = []
  let done = 0
  let failed = 0

  for (const [index, channel] of channels.entries()) {
    if (signal?.aborted) break
    const slug = channel.epgId ?? ''
    // שם הערוץ מוצג למשתמש לפני תחילת הבקשה — כך רואים בשביל מה ממתינים.
    const channelNumber = channel.number ?? index + 1
    onProgress?.({
      phase: 'channels',
      label: channelsLabel,
      message: `${tpl(he.app.progressChannelFetchNum, {
        channel: channel.name,
        number: channelNumber,
      })} · ${tpl(he.app.progressChannel, { done: index + 1, total })}`,
      ratio: channelSlice(index, total, 0),
      done: index + 1,
      total,
      channelName: channel.name,
      channelNumber,
    })
    try {
      const items = await fetchAntifrizSchedule(base, slug, date, signal)
      const fresh = items.map((item) => antifrizProgramme(item, channel))
      programmes.push(...fresh)
      fetched.push(channel)
      /*
       * שמירה מצטברת: לוח השידורים של הערוץ הזה עודכן במטמון **מיד**, ולא
       * רק בסוף הסריקה. בלי זה, יציאה מהאפליקציה (או מעבר להגדרות, או הריגה
       * של ה-WebView ברקע) באמצע סריקה של 30 ערוצים מוחקת את כל מה שירד —
       * והסריקה מתחילה מאפס בפעם הבאה. בזכות השמירה כאן הסריקה ממשיכה
       * מהמקום שבו נעצרה.
       */
      onChannelFetched?.(channel, fresh)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      failed += 1
    }
    done += 1
    onProgress?.({
      phase: 'channels',
      label: channelsLabel,
      message: tpl(he.app.fetchingChannels, { done, total }),
      ratio: channelSlice(done - 1, total, FETCH_SHARE_OF_CHANNEL),
      done,
      total,
      channelName: channel.name,
      channelNumber,
    })

    // השהיה בין ערוץ לערוץ — לא אחרי האחרון.
    if (index < channels.length - 1 && delaySeconds > 0) {
      const next = channels[index + 1]
      const nextNumber = next.number ?? index + 2
      const waitUntil = Date.now() + delaySeconds * 1000
      onProgress?.({
        phase: 'waiting',
        label: he.app.progressWaitingLabel,
        message: `${tpl(
          delaySeconds === 1 ? he.app.waitingBetweenOne : he.app.waitingBetween,
          { done, total, seconds: delaySeconds },
        )} · ${tpl(he.app.progressWaitingNext, { channel: next.name })}`,
        ratio: channelSlice(done - 1, total, FETCH_SHARE_OF_CHANNEL),
        ratioAfterWait: channelSlice(done - 1, total, 1),
        waitUntil,
        waitSeconds: delaySeconds,
        done,
        total,
        channelName: next.name,
        channelNumber: nextNumber,
      })
      await delayMs(delaySeconds * 1000, signal)
    }
  }

  if (failed > 0) {
    warnings.push({
      code: 'partialEpg',
      message: `${he.warnings.partialEpg} (${failed}/${total})`,
    })
  }
  return { channels: fetched, programmes, warnings }
}

/**
 * מרכיב סנפשוט מהמטמון עבור הבחירה הנוכחית בלבד.
 * ערוץ שהוסר מהבחירה לא נכנס לתוצאה, גם אם הנתון שלו עוד שמור במטמון.
 */
function snapshotFromCache(
  entry: EpgCacheEntry,
  selection: readonly string[],
): EpgSnapshot {
  const order = new Map(selection.map((key, index) => [key, index]))
  const channels = entry.channels
    .filter((channel) => order.has(channelCacheKey(channel)))
    .sort(
      (a, b) =>
        (order.get(channelCacheKey(a)) ?? 0) - (order.get(channelCacheKey(b)) ?? 0),
    )
  const ids = new Set(channels.map((channel) => channel.id))
  const programmes = entry.programmes.filter((programme) => ids.has(programme.channelId))
  return { channels, programmes, warnings: [] }
}

/** מוריד את הקטלוג ולוח השידורים, מסונן לחלון הזמן הרלוונטי. */
export async function scanEpg(options: ScanOptions): Promise<EpgSnapshot> {
  const { settings, signal, onProgress } = options
  const now = options.now ?? Date.now()
  const warnings: ScanWarning[] = []

  if (!isProviderConfigured(settings)) {
    warnings.push({ code: 'noSettings', message: he.warnings.noSettings })
    return { channels: [], programmes: [], warnings }
  }

  if (settings.provider.mode === 'antifriz') {
    const selection = resolveEpgSelection(settings)
    const cached = loadEpgCache()
    /*
     * מה שכבר ירד היום לא יורד שוב. "הבא נתונים עכשיו" הוא הדרך היחידה
     * לכפות שליפה מחדש — ואז כל הערוצים הנבחרים נחשבים חסרים.
     */
    const pending = options.forceRefresh
      ? [...selection]
      : channelsToFetch(cached, selection, now)

    // כל הערוצים הנבחרים כבר כאן => אין בכלל פנייה לאתר.
    if (cached && pending.length === 0) {
      onProgress?.({
        phase: 'cache',
        label: he.app.progressCacheLabel,
        message: he.app.usingCache,
        ratio: PROGRESS_LIST_WEIGHT,
        done: 0,
        total: 0,
      })
      const fromCache = snapshotFromCache(cached, selection)
      return { ...fromCache, warnings }
    }

    // כמה ערוצים כבר שמורים מהיום — החישוב כאן כדי ש-scrapeAntifriz יוכל
    // להודיע עליהם לסירוגין מיד אחרי שליפת רשימת הערוצים.
    const reused = selection.length - pending.length

    /*
     * המטמון נבנה תוך כדי הסריקה, ערוץ-ערוץ. `accumulated` הוא הסנפשוט
     * שנשמר, ולכן כל ערוץ שמצטרף מונח על גבי מה שכבר נשמר ולא דורס אותו.
     */
    let accumulated = cached
    const persistChannel = (channel: Channel, programmes: Programme[]) => {
      accumulated = mergeEpgCache(
        accumulated,
        { channels: [channel], programmes, selection, source: 'antifriz' },
        Date.now(),
      )
      saveEpgCache(accumulated)
    }

    const snapshot = await scrapeAntifriz(
      settings,
      now,
      signal,
      warnings,
      onProgress,
      selection,
      pending,
      persistChannel,
      reused,
    )

    if (snapshot.channels.length > 0) {
      const merged = mergeEpgCache(
        cached,
        {
          channels: snapshot.channels,
          programmes: snapshot.programmes,
          selection,
          source: 'antifriz',
        },
        now,
      )
      if (!saveEpgCache(merged)) {
        warnings.push({ code: 'cacheFull', message: he.warnings.cacheFull })
      }
      // מחזירים את הבחירה המלאה: הישן מהמטמון + מה שירד עכשיו.
      const fromCache = snapshotFromCache(merged, selection)
      return { ...fromCache, warnings }
    }

    // לא הצלחנו להוריד כלום — מחזירים את מה שיש במטמון (אם יש).
    if (cached) return { ...snapshotFromCache(cached, selection), warnings }
    return snapshot
  }

  const channels = await loadChannels(settings, signal, warnings, onProgress)
  if (channels.length === 0) return { channels, programmes: [], warnings }

  const window = {
    from: now - LIVE_LOOKBACK_MS,
    to: now + settings.prefs.lookAheadHours * 60 * 60 * 1000,
    lookAheadHours: settings.prefs.lookAheadHours,
  }
  const programmes = await loadProgrammes(settings, channels, window, signal, warnings)
  return { channels, programmes, warnings }
}

/* ------------------------------------------------------------------ */
/* שלב 2 — ניקוד, העשרה, איחוד כפילויות                                 */
/* ------------------------------------------------------------------ */

function statusOf(programme: Programme, now: number): RecommendationStatus {
  if (programme.start <= now && now < programme.stop) return 'live'
  const startsInMinutes = (programme.start - now) / 60_000
  if (startsInMinutes <= STARTING_SOON_MINUTES) return 'starting-soon'
  return 'upcoming'
}

function itemId(programme: Programme): string {
  return `${programme.channelId}:${programme.start}`
}

async function collectCandidates(
  snapshot: EpgSnapshot,
  settings: Settings,
  now: number,
  signal: AbortSignal | undefined,
  onProgress?: (progress: ScanProgress) => void,
  /** מקבל מהדורת המלצות מוכנה לתצוגה — לפני ההעשרה ואחרי כל מנת העשרה. */
  onPartial?: (recommendations: Recommendation[]) => void,
): Promise<Candidates> {
  const warnings: ScanWarning[] = []
  const channelById = new Map(snapshot.channels.map((channel) => [channel.id, channel]))
  const horizon = now + settings.prefs.lookAheadHours * 60 * 60 * 1000

  // סינון ראשון: רק מה שנכנס לקטגוריות המומלצות.
  const prepared: Array<{ programme: Programme; channel: Channel; classification: Classification }> =
    []
  for (const programme of snapshot.programmes) {
    if (programme.stop <= now) continue
    if (programme.start >= horizon) continue
    const channel = channelById.get(programme.channelId)
    if (!channel) continue
    const classification = classifyProgramme(programme, channel)
    if (classification.category === 'kids' || classification.category === 'other') continue
    prepared.push({ programme, channel, classification })
  }

  // טבלאות הליגה: בקשה אחת לכל ליגה שמופיעה בסריקה (לא לכל משחק), והן
  // נשמרות ב-localStorage — כך שסריקה נוספת באותו יום לא נוגעת ברשת בכלל.
  const sportLeagues: LeagueRef[] = []
  /** מתי הסתיים המשחק האחרון בכל ליגה — לרענון הטבלה אחרי משחק ששוחק. */
  const finishedByLeague = new Map<string, number>()
  for (const item of prepared) {
    if (item.classification.category !== 'sport') continue
    const league = findMatchLeague({
      texts: [
        item.classification.competition,
        item.programme.title,
        item.programme.description,
      ],
      home: item.classification.homeTeam,
      away: item.classification.awayTeam,
      sport: item.classification.sport,
    })
    if (!league) continue
    if (!sportLeagues.some((entry) => entry.id === league.id)) sportLeagues.push(league)
    /*
     * טבלה שנשלפה לפני שמשחק בליגה הסתיים לא יכולה לשקף את התוצאה שלו —
     * ולכן היא נחשבת מיושנת ונשלפת מחדש. זה מה שמרענן את הטבלה מיד אחרי כל
     * משחק ששוחק, במקום להמתין עד שש שעות לפקיעת המטמון.
     */
    if (item.programme.stop <= now) {
      const previous = finishedByLeague.get(league.id) ?? 0
      if (item.programme.stop > previous) finishedByLeague.set(league.id, item.programme.stop)
    }
  }
  const tables =
    sportLeagues.length > 0
      ? await loadLeagueTables(sportLeagues, {
          signal,
          config: {
            apiKey: settings.api.footballApiKey,
            baseUrl: settings.api.footballBaseUrl,
          },
          finishedAt: (league) => finishedByLeague.get(league.id),
        })
      : new Map<string, LeagueTable>()

  const base: ScoreInput = {
    now,
    settings,
    table: bundledTable,
    tableFor: (leagueId) => tables.get(leagueId)?.teams ?? [],
  }
  const candidates: ScoredItem[] = []
  for (const item of prepared) {
    candidates.push({
      ...item,
      outcome: scoreProgramme(item.programme, item.channel, item.classification, base),
    })
  }

  /*
   * המסך הראשון: ההמלצות מדורגות ומוצגות **לפני** שנשלף ציון אחד. חיפוש
   * הזכויות הוא תוספת — אין סיבה שהמשתמש ימתין לו כדי לראות מה באוויר.
   */
  onPartial?.(rankItems(candidates, settings, now))

  /*
   * כל סרט וכל סדרה מועשרים — אין תקרה. המיון לפי ציון נועד לכך שהציונים
   * החשובים יגיעו ראשונים במהדורות הביניים.
   *
   * כותרות חוזרות מקובצות לפי כותרת מנורמלת: אותו סרט שמשודר בחמישה ערוצים
   * נשלף פעם אחת, והתוצאה מוחלת על כל המופעים שלו.
   */
  const enrichGroups = new Map<string, ScoredItem[]>()
  for (const item of [...candidates].sort((a, b) => b.outcome.score - a.outcome.score)) {
    const category = item.classification.category
    if (category !== 'movie' && category !== 'movie-kids' && category !== 'series') continue
    const key = normalizeTitleKey(cleanTitle(item.programme.title)) || itemId(item.programme)
    const group = enrichGroups.get(key)
    if (group) group.push(item)
    else enrichGroups.set(key, [item])
  }

  if (enrichGroups.size > 0) {
    if (isTmdbConfigured(settings.api.tmdbApiKey)) {
      const omdbKey = settings.api.omdbApiKey
      const client = createTmdbClient(settings.api.tmdbApiKey, createOmdbClient(omdbKey))
      const groups = [...enrichGroups.values()]
      const total = groups.length
      // כשיש מי שמקבל תוצאות ביניים אין צורך לקצץ — רק שומר מפני ריצה אינסופית.
      const budget = onPartial ? ENRICH_BACKGROUND_BUDGET_MS : ENRICH_BUDGET_MS
      // כשגם OMDb מוגדר, ההודעה מציינת את שניהם — כי IMDb ו-Rotten Tomatoes
      // מגיעים ממנו ולא מ-TMDB.
      const source = isOmdbConfigured(omdbKey) ? 'TMDB + OMDb' : 'TMDB'
      let enriched = 0
      let completed = 0
      let failures = 0
      let stopped: 'auth' | 'failures' | 'budget' | undefined
      const enrichStartedAt = Date.now()
      // ההודעה שהמשתמש ביקש: סיימנו עם הערוצים, מכאן זה חיפוש ביקורות וציונים.
      onProgress?.({
        phase: 'enrich',
        label: he.app.progressEnrichLabel,
        message: tpl(he.app.progressEnrichStart, { total, source }),
        ratio: CHANNELS_END_RATIO,
        done: 0,
        total,
        source,
      })
      await mapLimit(groups, 5, async (group) => {
        const lead = group[0]
        const category = lead.classification.category
        // שלוש דרכים לעצור את השלב: מפתח שנדחה, שרשרת כשלים, או תקציב הזמן.
        if (!stopped && Date.now() - enrichStartedAt > budget) stopped = 'budget'
        if (!stopped) {
          try {
            const result = await client.lookup({
              title: cleanTitle(lead.programme.title),
              year: lead.programme.year,
              category,
              isSeries: category === 'series',
              signal,
            })
            // שאלנו וקיבלנו תשובה — גם אם היא "לא מכיר את הכותר".
            for (const item of group) item.enrichmentChecked = true
            if (result) {
              // כל מופע של אותו כותר מקבל את אותה העשרה — ודורג מחדש מיד.
              //
              // כאן גם נקבע אם הסרט הוא סרט ילדים: הז׳אנרים של TMDB
              // (אנימציה / משפחה) מדויקים יותר מכל מילת מפתח בכותרת, ולכן
              // הסרט עובר לקטגוריית „סרטי ילדים” רק אחרי שהגיעו הז׳אנרים.
              for (const item of group) {
                const kidsMovie =
                  item.classification.category === 'movie' && isKidsMovieGenre(result.genres)
                const classification = kidsMovie
                  ? { ...item.classification, category: 'movie-kids' as const }
                  : item.classification
                item.classification = classification
                item.enrichment = result
                item.outcome = scoreProgramme(item.programme, item.channel, classification, {
                  ...base,
                  enrichment: result,
                })
              }
              enriched += group.length
            }
          } catch (error) {
            failures += 1
            if (isTmdbAuthError(error)) stopped = 'auth'
            else if (failures >= MAX_ENRICH_FAILURES) stopped = 'failures'
          }
        }
        completed += 1
        onProgress?.({
          phase: 'enrich',
          label: he.app.progressEnrichLabel,
          message: tpl(he.app.progressEnrich, { done: completed, total, source }),
          ratio: CHANNELS_END_RATIO + PROGRESS_ENRICH_WEIGHT * (completed / total),
          done: completed,
          total,
          source,
        })
        // מהדורת ביניים: הכרטיסים כבר על המסך, והציונים נכנסים אליהם תוך כדי.
        if (onPartial && (completed === total || completed % 4 === 0)) {
          onPartial(rankItems(candidates, settings, now))
        }
      })
      // המפתח הוגדר, היו בקשות, ואף אחת מהן לא החזירה כלום. "לא נמצא" אינו
      // כשל (כותר לא מוכר הוא תקין), ולכן מדווחים רק כשהיו שגיאות אמיתיות.
      if (enriched === 0 && failures > 0) {
        warnings.push(
          stopped === 'auth'
            ? { code: 'tmdbKeyRejected', message: he.warnings.tmdbKeyRejected }
            : { code: 'tmdbUnreachable', message: he.warnings.tmdbUnreachable },
        )
      } else if (stopped === 'budget' || stopped === 'failures') {
        // יש תוצאות, אבל עצרנו באמצע — חלק מהתכניות יוצגו בלי ציון.
        warnings.push({
          code: 'tmdbPartial',
          message: tpl(he.warnings.tmdbPartial, {
            seconds: Math.round(budget / 1000),
          }),
        })
      }
    } else {
      warnings.push({ code: 'noTmdbKey', message: he.warnings.noTmdbKey })
    }
  }

  // בלי מפתח Football API המיקומים עדיין מגיעים — ESPN לעונה הנוכחית
  // וטבלה מקומית לליגת העל — אבל יש טעם להזכיר שזה המצב.
  if (!settings.api.footballApiKey.trim() && sportLeagues.length > 0) {
    warnings.push({ code: 'offlineTable', message: he.warnings.noFootballKey })
  }

  return { items: candidates, table: bundledTable, warnings }
}

function addAlternates(
  recommendation: Recommendation,
  alternates: { channel: string; start: number }[],
): Recommendation {
  if (alternates.length === 0) return recommendation
  const unique = new Map<string, number>()
  for (const alternate of alternates) {
    if (alternate.channel === recommendation.channel.name) continue
    if (!unique.has(alternate.channel)) unique.set(alternate.channel, alternate.start)
  }
  if (unique.size === 0) return recommendation
  const text = [...unique.entries()]
    .slice(0, 3)
    .map(([channel, start]) => `${channel} (${formatTime(start)})`)
    .join(' · ')
  return {
    ...recommendation,
    reasons: [
      ...recommendation.reasons,
      { kind: 'alternates', text: tpl(he.why.alternates, { channels: text }), weight: 0 },
    ],
  }
}

/**
 * סדר "הזמן הקרוב ביותר" — ברירת המחדל של האפליקציה, בכל הקטגוריות
 * (ספורט, סרטים, סדרות):
 *
 * 1. קודם כל מה שבאוויר עכשיו (אפשר לצפות מיד), ובתוכו השידור שהתחיל הכי
 *    קרוב לעכשיו קודם — הוא הטרי ביותר ועוד נשאר ממנו הכי הרבה.
 * 2. אחריהם מה שעומד להתחיל, לפי שעת ההתחלה הקרובה ביותר.
 *
 * בשוויון זמן — השידור המעניין יותר (ציון גבוה יותר) קודם.
 */
function compareByNearestTime(now: number): (a: Recommendation, b: Recommendation) => number {
  return (a, b) => {
    const liveA = statusOf(a.programme, now) === 'live'
    const liveB = statusOf(b.programme, now) === 'live'
    if (liveA !== liveB) return liveA ? -1 : 1
    if (liveA) {
      const startedLater = b.programme.start - a.programme.start
      if (startedLater !== 0) return startedLater
    } else {
      const startsSooner = a.programme.start - b.programme.start
      if (startsSooner !== 0) return startsSooner
    }
    return b.score - a.score
  }
}

/** סדר "הציון הגבוה ביותר" — מה שמעניין יותר קודם, בלי קשר לשעה. */
function compareByScore(a: Recommendation, b: Recommendation): number {
  if (b.score !== a.score) return b.score - a.score
  const order: Record<RecommendationStatus, number> = { live: 0, 'starting-soon': 1, upcoming: 2 }
  if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
  return a.programme.start - b.programme.start
}

/**
 * המשווה לפי מצב המיון שנבחר בהגדרות. 'time' הוא ברירת המחדל: המטרה היא
 * לראות עכשיו משהו מעניין, ולכן השידור הקרוב בזמן גובר על הציון הגבוה.
 */
function comparatorFor(
  mode: SortMode,
  now: number,
): (a: Recommendation, b: Recommendation) => number {
  return mode === 'score' ? compareByScore : compareByNearestTime(now)
}

function toRecommendation(item: ScoredItem, now: number): Recommendation {
  const { programme, channel, outcome } = item
  const status = statusOf(programme, now)
  const recommendation: Recommendation = {
    id: itemId(programme),
    category: outcome.category,
    programme,
    channel,
    score: outcome.score,
    reasons: outcome.reasons,
    headline: outcome.headline,
    verdict: outcome.verdict,
    status,
    startsInMinutes: Math.round((programme.start - now) / 60_000),
    favorite: outcome.favorite,
    favoriteTeam: outcome.favoriteTeam,
  }
  if (status === 'live') {
    recommendation.minutesLeft = Math.max(0, Math.round((programme.stop - now) / 60_000))
  }
  if (item.enrichment) recommendation.enrichment = item.enrichment
  if (outcome.sport) recommendation.sport = outcome.sport
  return recommendation
}

/** האם ההמלצה עוברת את הסינון של הקטגוריה שלה. */
function passesFilters(item: ScoredItem, settings: Settings, now: number): boolean {
  const category = item.classification.category
  if (category === 'news' && !settings.prefs.includeNews) return false
  // סף הציון ובלי־ציון חלים גם על סרטי ילדים — הם סרטים לכל דבר.
  if (category === 'movie' || category === 'movie-kids') {
    // "ציון מינימלי לסרט" הוא סינון אמיתי ולא רק קנס: סרט שידוע עליו
    // ציון מתחת לסף לא מוצג בכלל. עד כה הוא רק איבד נקודות — ולכן סרט
    // עם ציון 5.8 עדיין הופיע כשהיו לו מספיק נקודות אחרות.
    //
    // שני חריגים מכוונים:
    //   • סרט בלי ציון ידוע בכלל לא נשפט לפי הסף — הוא מטופל בהמשך
    //     ("הסתר סרטים בלי ציון או ביקורת"), ולא נזרק רק מפני שאין ציון.
    //   • סרט מהמועדפים שלי תמיד נשאר, גם אם הציון נמוך.
    // סף 0 מכבה את הסינון כליל.
    const threshold = settings.prefs.minMovieRating
    if (threshold > 0 && !item.outcome.favorite) {
      const rating = ratedScore(item.programme, item.enrichment ?? null)
      if (rating > 0 && rating < threshold) return false
    }
    // "סרטים בלי ציון ובלי ביקורת — אין טעם להציג": כששאלנו את מסד הנתונים
    // של הסרטים על הכותר והוא לא הכיר אותו, אין לכרטיס שום דבר חוץ משם ושעה.
    //
    // שלושה חריגים מכוונים:
    //   • סרט מהמועדפים שלי נשאר תמיד — הוא לא זקוק להמלצה שלנו.
    //   • סרט שטרם נשאל עליו (`enrichmentChecked` ריק) נשאר: כשההעשרה נעצרת
    //     בתקציב הזמן או שהרשת נפלה, לא מפילים על המשתמש טאב סרטים ריק.
    if (
      settings.prefs.hideUnratedMovies &&
      item.enrichmentChecked &&
      !item.enrichment &&
      !item.outcome.favorite
    ) {
      return false
    }
  }
  if (category === 'sport') {
    // "ענפים שמעניינים אותי": משחק מהענף שלא סומן לא מוצג בכלל. ענף שלא
    // זוהה ('other') נשאר — לא מסתירים משהו רק מפני שלא הצלחנו לתייג אותו,
    // ורשימה ריקה (המשתמש לא סימן כלום) משמעה בלי סינון.
    const kinds = settings.prefs.sportKinds ?? []
    if (
      kinds.length > 0 &&
      item.classification.sport !== 'other' &&
      !kinds.includes(item.classification.sport)
    ) {
      return false
    }
    // "בספורט — רק שידורים ישירים": בלי שידורי חוזר ובלי תכניות אולפן/מגזין.
    //
    // שידור ישיר הוא מה שמשודר כרגע **או** מה שעומד להתחיל בחלון הסריקה —
    // בדיוק כמו במדריך השידורים, שבו "ישיר! אטאלנטה - ונציה" ב-19:25 הוא
    // שידור ישיר גם ב-19:11. בלי זה משחק שמתחיל בעוד 14 דקות נעלם מהמסך.
    if (settings.prefs.liveSportsOnly) {
      // בטיחות: תכנית שהסתיימה לא מוצגת (בדרך כלל מסוננת כבר בשלב האיסוף).
      if (item.programme.stop <= now) return false
      if (item.classification.isReplay) return false
      if (!item.classification.isMatch) return false
      // ורק שידור שמסומן כחי. הספק מסמן שידור ישיר במילה "ישיר" בכותרת או
      // בתקציר, וזה הסימן היחיד שמבדיל משחק חי ממשחק מלא של שידור חוזר
      // שהכותרת שלו נראית בדיוק כמו משחק ("מכבי תל אביב - הפועל תל אביב").
      if (
        !item.programme.isLive &&
        !hasLiveMarker(item.programme.title) &&
        !hasLiveMarker(item.programme.description)
      ) {
        return false
      }
    }
  }
  return true
}

export async function buildRecommendations(
  snapshot: EpgSnapshot,
  settings: Settings,
  now: number,
  signal: AbortSignal | undefined,
  warnings: ScanWarning[],
  onProgress?: (progress: ScanProgress) => void,
  /** מהדורות ביניים: המסך יכול להיות מוצג לפני שהציונים נשלפו. */
  onPartial?: (recommendations: Recommendation[]) => void,
): Promise<Recommendation[]> {
  const { items, warnings: localWarnings } = await collectCandidates(
    snapshot,
    settings,
    now,
    signal,
    onProgress,
    onPartial,
  )
  warnings.push(...localWarnings)

  // ההעשרה רצה בתוך collectCandidates ומוציאה מהדורות ביניים; כאן מדורגות
  // ההמלצות פעם אחרונה, על המצב הסופי.
  return rankItems(items, settings, now)
}

/**
 * דירוג טהור: מהפריטים המדורגים להמלצות מוכנות לתצוגה. כאן אין רשת בכלל,
 * ולכן אפשר להריץ אותו שוב ושוב — פעם אחת בלי שום ציון, ופעם נוספת אחרי כל
 * מנת העשרה שהגיעה.
 */
function rankItems(
  items: readonly ScoredItem[],
  settings: Settings,
  now: number,
): Recommendation[] {
  const buckets = new Map<
    Category,
    Map<string, { recommendation: Recommendation; alternates: { channel: string; start: number }[] }>
  >()

  for (const item of items) {
    const category = item.classification.category
    if ((MAX_PER_CATEGORY[category] ?? 0) === 0) continue
    if (item.outcome.score < minScoreFor(category)) continue
    if (!passesFilters(item, settings, now)) continue

    const key = normalizeTitleKey(item.programme.title) || item.programme.title
    let bucket = buckets.get(category)
    if (!bucket) {
      bucket = new Map()
      buckets.set(category, bucket)
    }
    const recommendation = toRecommendation(item, now)
    const existing = bucket.get(key)
    if (!existing) {
      bucket.set(key, { recommendation, alternates: [] })
      continue
    }
    if (recommendation.score > existing.recommendation.score) {
      bucket.set(key, {
        recommendation,
        alternates: [
          ...existing.alternates,
          { channel: existing.recommendation.channel.name, start: existing.recommendation.programme.start },
        ],
      })
    } else {
      existing.alternates.push({
        channel: recommendation.channel.name,
        start: recommendation.programme.start,
      })
    }
  }

  const comparator = comparatorFor(settings.prefs.sortMode, now)
  const recommendations: Recommendation[] = []
  for (const [category, bucket] of buckets) {
    const limit = MAX_PER_CATEGORY[category] ?? 0
    const list = [...bucket.values()]
      .map((entry) => addAlternates(entry.recommendation, entry.alternates))
      .sort(comparator)
      .slice(0, limit)
    recommendations.push(...list)
  }

  // המיון הגלובלי קובע גם את סדר "כל ההמלצות" וגם — דרך byCategory — את סדר
  // כל טאב בנפרד: כל תת-קבוצה שומרת על אותם יחסי סדר.
  recommendations.sort(comparator)
  return recommendations
}

/* ------------------------------------------------------------------ */
/* נקודת כניסה מלאה                                                    */
/* ------------------------------------------------------------------ */

/** אוסף המלצות ScanResult אחיד — משותף לסריקה אמיתית ולתצוגת הדוגמה. */
export function buildScanResult(
  snapshot: EpgSnapshot,
  recommendations: Recommendation[],
  now: number,
  warnings: ScanWarning[],
): ScanResult {
  const byCategory: Record<Category, Recommendation[]> = {
    sport: [],
    series: [],
    movie: [],
    'movie-kids': [],
    news: [],
    kids: [],
    other: [],
  }
  // הסדר נקבע כבר במנוע (rankItems) לפי מצב המיון שבהגדרות; כאן רק מפצלים
  // לקטגוריות, וכל קטגוריה שומרת על אותו סדר יחסי.
  for (const recommendation of recommendations) {
    byCategory[recommendation.category].push(recommendation)
  }
  return {
    generatedAt: now,
    channelsScanned: snapshot.channels.length,
    programmesScanned: snapshot.programmes.length,
    recommendations,
    byCategory,
    warnings,
    channels: snapshot.channels,
  }
}

export async function scanAndRecommend(options: ScanOptions): Promise<ScanResult> {
  const now = options.now ?? Date.now()
  const snapshot = await scanEpg(options)
  const warnings = [...snapshot.warnings]
  options.onProgress?.({
    phase: 'recommend',
    label: he.app.progressRecommendLabel,
    message: he.app.progressRecommend,
    ratio: CHANNELS_END_RATIO,
    done: 0,
    total: 0,
  })
  // כל מהדורת ביניים שה-engine מחזיר הופכת ל-ScanResult שלם ונשלחת למסך מיד —
  // כך ההמלצות מוצגות עוד לפני שנשלף ציון אחד, והציונים מתווספים בהמשך.
  const onResult = options.onResult
  const recommendations = await buildRecommendations(
    snapshot,
    options.settings,
    now,
    options.signal,
    warnings,
    options.onProgress,
    onResult
      ? (partial) => onResult(buildScanResult(snapshot, partial, now, warnings))
      : undefined,
  )
  return buildScanResult(snapshot, recommendations, now, warnings)
}

/** בדיקת חיבור מהירה להגדרות. */
export async function testProvider(settings: Settings): Promise<{ ok: boolean; channels: number; message?: string }> {
  const provider = settings.provider
  if (provider.mode === 'antifriz') {
    try {
      const base = provider.antifrizBase.trim() || ANTIFRIZ_BASE
      const refs = await fetchAntifrizChannels(base)
      if (refs.length === 0) return { ok: false, channels: 0 }
      // בודקים שהערוצים שנבחרו קיימים באתר — כדי שלא נגלה זאת רק בסריקה.
      const known = new Set(refs.map((ref) => ref.slug))
      const missing = resolveEpgSelection(settings).filter((slug) => !known.has(slug))
      if (missing.length === 0) return { ok: true, channels: refs.length }
      return {
        ok: true,
        channels: refs.length,
        message: `${he.settings.missingChannels}: ${missing.join(', ')}`,
      }
    } catch (error) {
      return {
        ok: false,
        channels: 0,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }
  if (provider.mode === 'xtream') {
    return testConnection({
      host: provider.host,
      username: provider.username,
      password: provider.password,
    })
  }
  try {
    const text = await fetchText(provider.m3uUrl, { timeoutMs: 60_000 })
    const channels = parseM3u(text)
    return { ok: channels.length > 0, channels: channels.length }
  } catch (error) {
    return {
      ok: false,
      channels: 0,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
