/**
 * Scraper for the antifriz.tv TV guide — the app's EPG source (there is no
 * Xtream/XMLTV EPG endpoint for this provider).
 *
 * The site is server-rendered, so a single GET per channel is enough. The
 * caller caches the result for 12 hours, therefore nothing in this module
 * issues extra requests.
 *
 * Verified markup:
 *   channels: <a class="dropdown-item" href="/tv-guide/<slug>"><img src="..."> NAME </a>
 *   schedule: <li class="list-group-item"><strong class="mr-2">HH:MM</strong>
 *               TITLE <p class="mt-2">DESCRIPTION</p></li>
 * Day tabs look like /tv-guide/<slug>?date=... but carry class "nav-link", so
 * only "dropdown-item" anchors are treated as channels.
 */

import { fetchText } from './http'
import { jerusalemTimeToEpoch } from './jerusalem'

export const ANTIFRIZ_BASE = 'https://antifriz.tv'
export const ANTIFRIZ_SEED_SLUG = 'yes-israel-il'

const USER_AGENT = 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36'

const MAX_DESCRIPTION = 600
const LAST_ROW_DURATION_MS = 120 * 60 * 1000

/**
 * סימן השידור הישיר במדריך: המילה "ישיר".
 *
 * הספק מסמן שידור חי בכותרת ("ישיר! אטאלנטה - ונציה") ובתקציר
 * ("שידור ישיר: כדורגל. ..."), ולכן מחפשים את המילה בכל אחד מהם — ולא רק
 * בפתח הכותרת. אחרי "ישיר" אסורה אות עברית נוספת, כדי לא לתפוס מילים כמו
 * "ישירות" או "ישירים" שהן לא הסימון של הספק.
 *
 * זו הבדיקה שקובעת אם תכנית ספורט היא שידור חי — ובלעדיה משחק מלא משידור
 * חוזר (שלא סומן ב"שידור חוזר") נראה כמו משחק חי.
 */
const LIVE_MARKER_RE = /ישיר(?![\u0590-\u05FF])/

/** האם הטקסט מכיל את סימן השידור הישיר של המדריך. */
export function hasLiveMarker(text: string | undefined): boolean {
  if (!text) return false
  return LIVE_MARKER_RE.test(text)
}

export interface AntifrizChannelRef {
  slug: string
  name: string
  logo?: string
}

export interface AntifrizScheduleItem {
  title: string
  description?: string
  /** Epoch ms. */
  start: number
  /** Epoch ms. */
  stop: number
}

/* ------------------------------------------------------------------ */
/* Entities and tags                                                   */
/* ------------------------------------------------------------------ */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  hellip: '\u2026',
  mdash: '\u2014',
  ndash: '\u2013',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  laquo: '\u00ab',
  raquo: '\u00bb',
  times: '\u00d7',
}

const ENTITY_RE = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g

/** Decode named, decimal and hex HTML entities. Never throws. */
export function decodeHtmlEntities(text: string): string {
  if (!text) return ''
  return text.replace(ENTITY_RE, (whole, body: string) => {
    if (body.charAt(0) === '#') {
      const isHex = body.charAt(1) === 'x' || body.charAt(1) === 'X'
      const digits = isHex ? body.slice(2) : body.slice(1)
      const code = Number.parseInt(digits, isHex ? 16 : 10)
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole
      try {
        return String.fromCodePoint(code)
      } catch {
        return whole
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()]
    return named === undefined ? whole : named
  })
}

/** Remove markup, collapse whitespace and decode entities. */
export function stripTags(html: string): string {
  if (!html) return ''
  const withoutBlocks = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
  const spaced = withoutBlocks
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|div|tr|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
  return decodeHtmlEntities(spaced).replace(/\s+/g, ' ').trim()
}

/* ------------------------------------------------------------------ */
/* URLs                                                                */
/* ------------------------------------------------------------------ */

/** Normalise the base without downgrading to http — the site is https only. */
function antifrizOrigin(base: string): string {
  const trimmed = (base || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ANTIFRIZ_BASE
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function antifrizAbsoluteUrl(base: string, path: string): string {
  const value = (path || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const origin = antifrizOrigin(base)
  if (value.startsWith('//')) return `https:${value}`
  return value.startsWith('/') ? `${origin}${value}` : `${origin}/${value}`
}

export function antifrizGuideUrl(base: string, slug: string, date?: string): string {
  const origin = antifrizOrigin(base)
  const cleanSlug = (slug || '').trim().replace(/^\/+|\/+$/g, '')
  const path = cleanSlug ? `${origin}/tv-guide/${cleanSlug}` : `${origin}/tv-guide`
  if (!date || !date.trim()) return path
  return `${path}?date=${encodeURIComponent(date.trim())}`
}

/* ------------------------------------------------------------------ */
/* Channel list                                                        */
/* ------------------------------------------------------------------ */

const ANCHOR_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi

function attrValue(attributes: string, name: string): string | undefined {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const match = pattern.exec(attributes)
  if (!match) return undefined
  const value = match[1] ?? match[2] ?? match[3]
  return value === undefined ? undefined : value.trim()
}

function slugFromHref(href: string): string | undefined {
  const match = /\/tv-guide\/([^/?#]+)/i.exec(href)
  if (!match) return undefined
  try {
    const slug = decodeURIComponent(match[1]).trim()
    return slug === '' ? undefined : slug
  } catch {
    const slug = match[1].trim()
    return slug === '' ? undefined : slug
  }
}

/**
 * Parse the 131-channel dropdown. Only `dropdown-item` anchors count so the
 * Вчера/Сегодня/Завтра day tabs (class `nav-link`) are never picked up.
 */
export function parseAntifrizChannelList(html: string): AntifrizChannelRef[] {
  if (!html) return []
  const out: AntifrizChannelRef[] = []
  const seen = new Set<string>()

  const anchorRe = new RegExp(ANCHOR_RE.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = anchorRe.exec(html)) !== null) {
    const attributes = match[1]
    const inner = match[2]

    const className = attrValue(attributes, 'class') ?? ''
    if (!className.includes('dropdown-item')) continue

    const href = attrValue(attributes, 'href')
    if (!href) continue
    const slug = slugFromHref(href)
    if (!slug || seen.has(slug)) continue

    const name = stripTags(inner)
    if (!name) continue

    const imageMatch = /<img\b([^>]*)>/i.exec(inner)
    const logo = imageMatch ? attrValue(imageMatch[1], 'src') : undefined

    seen.add(slug)
    const ref: AntifrizChannelRef = { slug, name }
    if (logo) ref.logo = logo
    out.push(ref)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */

const ROW_RE =
  /<li\b[^>]*class\s*=\s*(?:"[^"]*list-group-item[^"]*"|'[^']*list-group-item[^']*')[^>]*>([\s\S]*?)<\/li>/gi
const TIME_RE = /<strong\b[^>]*>\s*(\d{1,2}):(\d{2})\s*<\/strong>/i
const PARAGRAPH_RE = /<p\b[^>]*>([\s\S]*?)<\/p>/i

interface RawRow {
  title: string
  description?: string
  start: number
}

/**
 * Parse one day of a channel page.
 * The page carries only `HH:MM`; the date comes from the request, and each
 * programme ends where the next one starts (the last row gets 2 hours).
 */
export function parseAntifrizSchedule(html: string, date: string): AntifrizScheduleItem[] {
  if (!html || !date) return []

  const rows: RawRow[] = []
  const rowRe = new RegExp(ROW_RE.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = rowRe.exec(html)) !== null) {
    const row = match[1]
    const timeMatch = TIME_RE.exec(row)
    if (!timeMatch) continue

    const afterTime = row.slice(timeMatch.index + timeMatch[0].length)
    const paragraph = PARAGRAPH_RE.exec(afterTime)
    const title = stripTags(paragraph ? afterTime.slice(0, paragraph.index) : afterTime)
    if (!title) continue

    const start = jerusalemTimeToEpoch(date, Number(timeMatch[1]), Number(timeMatch[2]))
    if (!Number.isFinite(start)) continue

    const raw: RawRow = { title, start }
    if (paragraph) {
      const description = stripTags(paragraph[1]).slice(0, MAX_DESCRIPTION)
      if (description) raw.description = description
    }
    rows.push(raw)
  }

  if (rows.length === 0) return []
  rows.sort((a, b) => a.start - b.start)

  const out: AntifrizScheduleItem[] = []
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    const next = rows[index + 1]
    const stop = next ? next.start : row.start + LAST_ROW_DURATION_MS
    if (!Number.isFinite(stop) || stop <= row.start) continue
    const item: AntifrizScheduleItem = { title: row.title, start: row.start, stop }
    if (row.description) item.description = row.description
    out.push(item)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Hebrew group label from the channel name                            */
/* ------------------------------------------------------------------ */

const GROUP_SPORT = 'ספורט'
const GROUP_MOVIES = 'סרטים'
const GROUP_SERIES = 'סדרות'
const GROUP_KIDS = 'ילדים'
const GROUP_NEWS = 'חדשות'
const GROUP_DOCU = 'תיעודי'
const GROUP_GENERAL = 'כללי'

/**
 * Map a channel name to a Hebrew group label.
 * Precedence matters: "Yes Movies KIDS" is kids, "One Doco" is documentary
 * (not sport), "Cinema Family" is kids.
 */
export function antifrizChannelGroup(channelName: string): string {
  const name = (channelName || '').toLowerCase()
  if (!name.trim()) return GROUP_GENERAL
  const has = (...needles: string[]) => needles.some((needle) => name.includes(needle))

  // 1. Kids beats everything: "Yes Movies KIDS", "Cinema Family", "FreeTV Movies Family".
  if (
    has(
      'kids',
      'nick jr',
      'nickelodeon',
      'teennick',
      'disney',
      'hop',
      'luli',
      'baby',
      'zoom',
      'junior',
      'kan23',
      'cinema family',
      'family',
    )
  ) {
    return GROUP_KIDS
  }

  // 2. Movies. "global action" and the Yes+ premium movie channels are films,
  //    while "yes tv action" below is a series channel — hence the full names.
  if (
    has(
      'movies',
      'cinema',
      'movie channel',
      'film',
      'bollywood',
      'diamonds',
      'yes+ dark',
      'yes+ love',
      'global action',
      'yam tichoni',
    )
  ) {
    return GROUP_MOVIES
  }

  // 3. Series and telenovelas.
  if (
    has(
      'series',
      'drama',
      'telenovelas',
      'viva',
      'turkish',
      'indian',
      'humor',
      'comedy',
      'eretz nehederet',
      'savri maranan',
      'zone',
      'yes tv action',
    )
  ) {
    return GROUP_SERIES
  }

  // 4. Sport. "one hd"/"one 2" are the Israeli ONE sport channels, but bare
  //    "one" is omitted so "One Doco HD" falls through to documentary.
  if (has('sport', 'eurosport', 'vamos', 'one hd', 'one 2')) {
    return GROUP_SPORT
  }

  // 5. News.
  if (has('channel 24', 'i24')) return GROUP_NEWS

  // 6. Documentary and factual.
  if (
    has(
      'docu',
      // "One Doco HD" — הספק כותב doco ולא docu.
      'doco',
      'animal planet',
      'nature',
      'national geographic',
      'natgeo',
      'discovery',
      'history',
      'travel',
      'vacation',
    )
  ) {
    return GROUP_DOCU
  }

  // 7. Everything else, including the general broadcasters (Kan 11, Keshet 12,
  //    Reshet 13, Channel 14, HOT 3/8, Entertainment, lifestyle channels).
  return GROUP_GENERAL
}

/* ------------------------------------------------------------------ */
/* Fetching                                                            */
/* ------------------------------------------------------------------ */

/** The dropdown is present on every guide page, so one request is enough. */
export async function fetchAntifrizChannels(
  base: string,
  signal?: AbortSignal,
): Promise<AntifrizChannelRef[]> {
  const origin = antifrizOrigin(base)
  const url = antifrizGuideUrl(origin, ANTIFRIZ_SEED_SLUG)
  const html = await fetchText(url, {
    signal,
    headers: { 'user-agent': USER_AGENT },
    timeoutMs: 30_000,
  })
  return parseAntifrizChannelList(html).map((ref) =>
    ref.logo ? { ...ref, logo: antifrizAbsoluteUrl(origin, ref.logo) } : ref,
  )
}

export async function fetchAntifrizSchedule(
  base: string,
  slug: string,
  date: string,
  signal?: AbortSignal,
): Promise<AntifrizScheduleItem[]> {
  const url = antifrizGuideUrl(base, slug, date)
  const html = await fetchText(url, {
    signal,
    headers: { 'user-agent': USER_AGENT },
    timeoutMs: 30_000,
  })
  return parseAntifrizSchedule(html, date)
}
