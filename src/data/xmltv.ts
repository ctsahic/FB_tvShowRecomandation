/**
 * Hand-rolled XMLTV (EPG) parser.
 *
 * Real IPTV XMLTV feeds are tens of megabytes, so this module never keeps the
 * raw XML around: scanning works on element slices and `createXmltvStreamParser`
 * consumes decoded chunks with a bounded internal buffer. The same element
 * helpers back both `parseXmltv` and the streaming parser so they agree.
 *
 * Nothing here throws on malformed input — a broken element is simply skipped.
 */
import type { Programme, ProgrammeCredits } from '../types'

export interface XmltvChannel {
  id: string
  displayNames: string[]
  icon?: string
}

export interface XmltvParseOptions {
  /** When set, programmes for other channels are skipped as early as possible. */
  channelIds?: ReadonlySet<string>
  /** Keep a programme when `stop > from`. Epoch ms. */
  from?: number
  /** Keep a programme when `start < to`. Epoch ms. */
  to?: number
}

export interface XmltvParseResult {
  channels: XmltvChannel[]
  programmes: Programme[]
}

export interface XmltvStreamParser {
  push(chunk: string): void
  finish(): XmltvParseResult
}

/**
 * Upper bound for the pending (unparsed) tail of the streaming parser. A single
 * XMLTV element this large means something is wrong, so the tail is dropped
 * rather than growing without limit.
 */
const MAX_PENDING_BUFFER = 256 * 1024

/** Longest element name we may have to wait for. */
const MAX_PARTIAL_TAG = '<programme'.length

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

const ENTITY_RE = /&(#x[0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);/g

export function decodeXmlEntities(input: string): string {
  if (!input || input.indexOf('&') < 0) return input
  return input.replace(ENTITY_RE, (match, entity: string) => {
    if (entity.charAt(0) === '#') {
      const isHex = entity.charAt(1) === 'x' || entity.charAt(1) === 'X'
      const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match
      try {
        return String.fromCodePoint(code)
      } catch {
        return match
      }
    }
    const named = NAMED_ENTITIES[entity]
    return named === undefined ? match : named
  })
}

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

function zoneOffsetMinutes(zone: string): number | null {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(zone)
  if (!m) return null
  const sign = m[1] === '-' ? -1 : 1
  return sign * (Number(m[2]) * 60 + Number(m[3]))
}

function assemble(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  zone?: string,
): number {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second)
  ) {
    return NaN
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return NaN
  if (hour > 23 || minute > 59 || second > 60) return NaN
  const sec = Math.min(second, 59)

  if (zone) {
    const offset = zone.toUpperCase() === 'Z' ? 0 : zoneOffsetMinutes(zone)
    if (offset === null) return NaN
    const utc = Date.UTC(year, month - 1, day, hour, minute, sec)
    // Reject overflowed calendar dates such as 20260231.
    const shifted = new Date(utc - offset * 60_000)
    if (
      shifted.getUTCFullYear() !== year ||
      shifted.getUTCMonth() !== month - 1 ||
      shifted.getUTCDate() !== day
    ) {
      return NaN
    }
    return utc - offset * 60_000
  }

  // No offset in the feed: XMLTV times are wall-clock, so read them in the local
  // (Israeli) timezone rather than assuming UTC.
  const local = new Date(year, month - 1, day, hour, minute, sec)
  if (local.getFullYear() !== year || local.getMonth() !== month - 1 || local.getDate() !== day) {
    return NaN
  }
  return local.getTime()
}

/** `'20261010183000 +0300'` | `'202610101830'` | `'2026-10-10T18:30:00Z'` → epoch ms. */
export function parseXmltvTime(value: string): number {
  if (typeof value !== 'string') return NaN
  const s = value.trim()
  if (!s) return NaN

  const iso =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/i.exec(
      s,
    )
  if (iso) {
    return assemble(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      Number(iso[4]),
      Number(iso[5]),
      Number(iso[6] ?? '0'),
      iso[7],
    )
  }

  const compact = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*(Z|[+-]\d{4})?$/i.exec(s)
  if (compact) {
    return assemble(
      Number(compact[1]),
      Number(compact[2]),
      Number(compact[3]),
      Number(compact[4]),
      Number(compact[5]),
      Number(compact[6] ?? '0'),
      compact[7],
    )
  }

  return NaN
}

/* ------------------------------------------------------------------ */
/* Low level XML scanning                                              */
/* ------------------------------------------------------------------ */

/** Index of the `>` closing the tag that starts at `from`, respecting quotes. */
function findTagEnd(text: string, from: number): number {
  let quote = ''
  for (let i = from + 1; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) quote = ''
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === '>') {
      return i
    }
  }
  return -1
}

/**
 * Single forward scan for the next thing we care about. Comments are matched
 * here too, so the scan never re-walks the text (important for 30MB feeds).
 */
const SCAN_TOKEN_RE = /<!--|<(channel|programme)\b/g

type ScanToken =
  | { index: number; comment: true }
  | { index: number; comment: false; kind: 'channel' | 'programme' }

function findNextToken(text: string, from: number): ScanToken | null {
  SCAN_TOKEN_RE.lastIndex = from
  const m = SCAN_TOKEN_RE.exec(text)
  if (!m) return null
  if (m[0] === '<!--') return { index: m.index, comment: true }
  return { index: m.index, comment: false, kind: m[1] as 'channel' | 'programme' }
}

/**
 * Keep a trailing fragment that could be the beginning of a `<channel` or
 * `<programme` tag split across two chunks.
 */
function partialTagTail(text: string): string {
  const lt = text.lastIndexOf('<')
  if (lt < 0) return ''
  const tail = text.slice(lt)
  if (tail.length > MAX_PARTIAL_TAG || tail.indexOf('>') >= 0) return ''
  if ('<channel'.startsWith(tail) || '<programme'.startsWith(tail)) return tail
  return ''
}

interface ScanState {
  /** Index in `text` from which unconsumed data starts (an incomplete element). */
  next: number
  /** True when nothing is pending and the buffer can be released. */
  complete: boolean
}

/**
 * Walk `text` from `startAt`, handing every complete `<channel>` / `<programme>`
 * element to `handle` as a raw slice. Stops before an element that is still
 * incomplete so a streaming caller can wait for more input.
 */
function scanElements(
  text: string,
  startAt: number,
  handle: (kind: 'channel' | 'programme', raw: string) => void,
): ScanState {
  let i = startAt
  for (;;) {
    const token = findNextToken(text, i)
    if (token === null) return { next: text.length, complete: true }

    if (token.comment) {
      const commentEnd = text.indexOf('-->', token.index + 4)
      if (commentEnd < 0) return { next: token.index, complete: false }
      i = commentEnd + 3
      continue
    }

    const openStart = token.index
    const tagEnd = findTagEnd(text, openStart)
    if (tagEnd < 0) return { next: openStart, complete: false }

    if (text.charAt(tagEnd - 1) === '/') {
      handle(token.kind, text.slice(openStart, tagEnd + 1))
      i = tagEnd + 1
      continue
    }

    const closeTag = token.kind === 'channel' ? '</channel' : '</programme'
    const closeStart = text.indexOf(closeTag, tagEnd + 1)
    if (closeStart < 0) return { next: openStart, complete: false }
    const closeEnd = text.indexOf('>', closeStart)
    if (closeEnd < 0) return { next: openStart, complete: false }

    handle(token.kind, text.slice(openStart, closeEnd + 1))
    i = closeEnd + 1
  }
}

const ATTR_SOURCE = '((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)'

function parseAttrs(source: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  for (let m = re.exec(source); m; m = re.exec(source)) {
    out[m[1].toLowerCase()] = decodeXmlEntities(m[2] ?? m[3] ?? '')
  }
  return out
}

function splitElement(
  raw: string,
): { name: string; attrs: Record<string, string>; inner: string } | null {
  if (!raw || raw.charAt(0) !== '<') return null
  const nameMatch = /^<\s*([A-Za-z_][\w:.-]*)/.exec(raw)
  if (!nameMatch) return null
  const tagEnd = findTagEnd(raw, 0)
  if (tagEnd < 0) return null
  const attrs = parseAttrs(raw.slice(nameMatch[0].length, tagEnd))
  let inner = ''
  if (raw.charAt(tagEnd - 1) !== '/') {
    const close = raw.lastIndexOf('</')
    if (close > tagEnd) inner = raw.slice(tagEnd + 1, close)
  }
  return { name: nameMatch[1].toLowerCase(), attrs, inner }
}

/** Flatten text content: drop inline markup, decode entities, collapse spaces. */
function normalizeText(input: string): string {
  if (!input) return ''
  const stripped = input.replace(/<[^>]*>/g, ' ')
  return decodeXmlEntities(stripped).replace(/\s+/g, ' ').trim()
}

interface TagBlock {
  attrs: Record<string, string>
  text: string
}

/** All `<tag ...>text</tag>` blocks found inside `inner`. */
function collectTagBlocks(inner: string, tag: string): TagBlock[] {
  const out: TagBlock[] = []
  if (!inner) return out
  const re = new RegExp(`<${tag}(?![\\w:.-])${ATTR_SOURCE}>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi')
  for (let m = re.exec(inner); m; m = re.exec(inner)) {
    out.push({ attrs: parseAttrs(m[1]), text: m[2] })
    // Guard against a zero-length match loop on pathological input.
    if (m.index === re.lastIndex) re.lastIndex++
  }
  return out
}

/** All `<tag .../>` (or bare `<tag>`) occurrences found inside `inner`. */
function collectSelfClosing(inner: string, tag: string): TagBlock[] {
  const out: TagBlock[] = []
  if (!inner) return out
  const re = new RegExp(`<${tag}(?![\\w:.-])((?:"[^"]*"|'[^']*'|[^>"'])*?)\\s*\\/?>`, 'gi')
  for (let m = re.exec(inner); m; m = re.exec(inner)) {
    out.push({ attrs: parseAttrs(m[1]), text: '' })
    if (m.index === re.lastIndex) re.lastIndex++
  }
  return out
}

function hasFlag(inner: string, tag: string): boolean {
  if (!inner) return false
  return new RegExp(`<${tag}(?![\\w:.-])(?:"[^"]*"|'[^']*'|[^>"'])*?\\s*\\/?>`, 'i').test(inner)
}

/* ------------------------------------------------------------------ */
/* Localisation helpers                                                */
/* ------------------------------------------------------------------ */

interface LocalizedText {
  lang?: string
  text: string
}

/** Lower rank wins: Hebrew, then the legacy `iw`, then anything else. */
function langRank(lang: string | undefined): number {
  if (!lang) return 2
  const base = lang.toLowerCase().split(/[-_]/)[0]
  if (base === 'he' || base === 'heb') return 0
  if (base === 'iw') return 1
  return 2
}

function langOf(attrs: Record<string, string>): string | undefined {
  return attrs.lang ?? attrs['xml:lang']
}

/** Prefer the Hebrew variant, else the legacy `iw`, else the first one. */
function pickLocalized(items: readonly LocalizedText[]): string {
  let best: LocalizedText | undefined
  let bestRank = Number.POSITIVE_INFINITY
  for (const item of items) {
    const rank = langRank(item.lang)
    if (best === undefined || rank < bestRank) {
      best = item
      bestRank = rank
    }
  }
  return best ? normalizeText(best.text) : ''
}

/** Collect `<tag>` blocks as localised candidates, most-Hebrew first. */
function localizedFrom(inner: string, tag: string): LocalizedText[] {
  return collectTagBlocks(inner, tag)
    .map((block) => ({ lang: langOf(block.attrs), text: block.text }))
    .sort((a, b) => langRank(a.lang) - langRank(b.lang))
}

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */

/** `'7.5'` | `'7.5/10'` | `'8'` → number; `'PG'` | `''` → undefined. */
function parseRatingValue(text: string): number | undefined {
  const s = normalizeText(text).replace(',', '.')
  if (!s) return undefined
  const m = /^(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?$/.exec(s)
  if (!m) return undefined
  let value = Number(m[1])
  if (m[2]) {
    const denominator = Number(m[2])
    if (!Number.isFinite(denominator) || denominator <= 0) return undefined
    value = (value / denominator) * 10
  }
  if (!Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(10, value))
}

function parseOrdinal(raw: string): number | undefined {
  const first = raw.trim().split('/')[0].trim()
  if (!/^\d+$/.test(first)) return undefined
  const value = Number(first) + 1
  return Number.isFinite(value) ? value : undefined
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

interface EpisodeInfo {
  season?: number
  episode?: number
  code?: string
}

function parseXmltvNs(text: string): EpisodeInfo {
  const parts = text.trim().split('.')
  const season = parseOrdinal(parts[0] ?? '')
  const episode = parseOrdinal(parts[1] ?? '')
  const info: EpisodeInfo = {}
  if (season !== undefined) info.season = season
  if (episode !== undefined) info.episode = episode
  return info
}

function parseOnscreen(text: string): EpisodeInfo {
  const s = normalizeText(text)
  const se = /[Ss](\d{1,3})\s*[Ee](\d{1,3})/.exec(s)
  if (se) {
    const season = Number(se[1])
    const episode = Number(se[2])
    return { season, episode, code: `S${pad2(season)}E${pad2(episode)}` }
  }
  const alt = /^(\d{1,3})\s*[xX](\d{1,3})$/.exec(s)
  if (alt) {
    const season = Number(alt[1])
    const episode = Number(alt[2])
    return { season, episode, code: `S${pad2(season)}E${pad2(episode)}` }
  }
  return {}
}

/* ------------------------------------------------------------------ */
/* Element parsing                                                     */
/* ------------------------------------------------------------------ */

function parseChannelElement(raw: string): XmltvChannel | null {
  const parsed = splitElement(raw)
  if (!parsed) return null
  const id = parsed.attrs.id
  if (!id) return null

  const displayNames = localizedFrom(parsed.inner, 'display-name')
    .map((item) => normalizeText(item.text))
    .filter((name) => name.length > 0)

  const iconBlocks = collectSelfClosing(parsed.inner, 'icon')
  const icon = iconBlocks.length > 0 ? iconBlocks[0].attrs.src : undefined

  const channel: XmltvChannel = { id, displayNames }
  if (icon) channel.icon = icon
  return channel
}

function parseProgrammeElement(raw: string, options: XmltvParseOptions): Programme | null {
  const parsed = splitElement(raw)
  if (!parsed) return null
  const { attrs, inner } = parsed

  const channelId = attrs.channel ?? ''
  if (!channelId) return null

  // Apply the channel and time filters before touching any child element.
  const allowed = options.channelIds
  if (allowed && !allowed.has(channelId)) return null

  const start = parseXmltvTime(attrs.start ?? '')
  const stop = parseXmltvTime(attrs.stop ?? '')
  if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) return null
  if (options.from !== undefined && stop <= options.from) return null
  if (options.to !== undefined && start >= options.to) return null

  const title = pickLocalized(localizedFrom(inner, 'title'))
  if (!title) return null

  const programme: Programme = {
    channelId,
    channelName: '',
    title,
    start,
    stop,
    categories: collectTagBlocks(inner, 'category')
      .map((block) => normalizeText(block.text))
      .filter((value) => value.length > 0),
  }

  const subTitle = pickLocalized(localizedFrom(inner, 'sub-title'))
  if (subTitle) programme.subTitle = subTitle

  const description = pickLocalized(localizedFrom(inner, 'desc'))
  if (description) programme.description = description

  // Rating: prefer a numeric <rating>, fall back to <star-rating>.
  let rating: number | undefined
  let ratingSystem: string | undefined
  for (const block of collectTagBlocks(inner, 'rating')) {
    const value = collectTagBlocks(block.text, 'value')[0]
    const parsedValue = value ? parseRatingValue(value.text) : undefined
    if (parsedValue !== undefined) {
      rating = parsedValue
      ratingSystem = block.attrs.system || undefined
      break
    }
  }
  if (rating === undefined) {
    for (const block of collectTagBlocks(inner, 'star-rating')) {
      const value = collectTagBlocks(block.text, 'value')[0]
      const parsedValue = value ? parseRatingValue(value.text) : undefined
      if (parsedValue !== undefined) {
        rating = parsedValue
        ratingSystem = block.attrs.system || undefined
        break
      }
    }
  }
  if (rating !== undefined) {
    programme.rating = rating
    if (ratingSystem) programme.ratingSystem = ratingSystem
  }

  // Episode numbering: the on-screen code wins for display, xmltv_ns fills gaps.
  let ns: EpisodeInfo = {}
  let onscreen: EpisodeInfo = {}
  for (const block of collectTagBlocks(inner, 'episode-num')) {
    const system = (block.attrs.system ?? '').toLowerCase()
    if (system.indexOf('xmltv_ns') === 0) {
      ns = parseXmltvNs(block.text)
    } else if (system === 'onscreen' || system === '') {
      onscreen = parseOnscreen(block.text)
    }
  }

  const season = onscreen.season ?? ns.season
  const episodeNumber = onscreen.episode ?? ns.episode
  if (season !== undefined) programme.season = season
  if (episodeNumber !== undefined) programme.episodeNumber = episodeNumber
  if (onscreen.code) {
    programme.episode = onscreen.code
  } else if (season !== undefined && episodeNumber !== undefined) {
    programme.episode = `S${pad2(season)}E${pad2(episodeNumber)}`
  }

  if (hasFlag(inner, 'new')) programme.isNew = true
  if (hasFlag(inner, 'premiere')) programme.isPremiere = true
  if (hasFlag(inner, 'live')) programme.isLive = true

  if (collectSelfClosing(inner, 'icon').length > 0) programme.hasImage = true

  const yearBlock = collectTagBlocks(inner, 'year')[0]
  const dateBlock = collectTagBlocks(inner, 'date')[0]
  const yearSource = yearBlock ? normalizeText(yearBlock.text) : dateBlock ? normalizeText(dateBlock.text) : ''
  const yearMatch = /^(\d{4})/.exec(yearSource)
  if (yearMatch) programme.year = Number(yearMatch[1])

  const creditsBlock = collectTagBlocks(inner, 'credits')[0]
  if (creditsBlock) {
    const director = collectTagBlocks(creditsBlock.text, 'director')
      .map((block) => normalizeText(block.text))
      .filter((value) => value.length > 0)
    const actors = collectTagBlocks(creditsBlock.text, 'actor')
      .map((block) => normalizeText(block.text))
      .filter((value) => value.length > 0)
    const credits: ProgrammeCredits = {}
    if (director.length > 0) credits.director = director
    if (actors.length > 0) credits.actors = actors
    if (credits.director || credits.actors) programme.credits = credits
  }

  return programme
}

/* ------------------------------------------------------------------ */
/* Accumulator shared by parseXmltv and the streaming parser           */
/* ------------------------------------------------------------------ */

class XmltvAccumulator {
  readonly channels: XmltvChannel[] = []
  readonly programmes: Programme[] = []
  private readonly channelMap = new Map<string, XmltvChannel>()
  private readonly options: XmltvParseOptions

  constructor(options: XmltvParseOptions) {
    this.options = options
  }

  readonly handle = (kind: 'channel' | 'programme', raw: string): void => {
    if (kind === 'channel') {
      const channel = parseChannelElement(raw)
      if (!channel) return
      if (this.channelMap.has(channel.id)) return
      this.channelMap.set(channel.id, channel)
      this.channels.push(channel)
      return
    }

    const programme = parseProgrammeElement(raw, this.options)
    if (!programme) return
    const known = this.channelMap.get(programme.channelId)
    if (known && known.displayNames.length > 0) programme.channelName = known.displayNames[0]
    this.programmes.push(programme)
  }

  result(): XmltvParseResult {
    // Channels may appear after the programmes that reference them.
    for (const programme of this.programmes) {
      if (programme.channelName) continue
      const known = this.channelMap.get(programme.channelId)
      if (known && known.displayNames.length > 0) programme.channelName = known.displayNames[0]
    }
    return { channels: this.channels, programmes: this.programmes }
  }
}

/* ------------------------------------------------------------------ */
/* Public entry points                                                 */
/* ------------------------------------------------------------------ */

/** Parse a complete XMLTV document already held in memory. */
export function parseXmltv(text: string, options: XmltvParseOptions = {}): XmltvParseResult {
  const accumulator = new XmltvAccumulator(options)
  if (text) scanElements(text, 0, accumulator.handle)
  return accumulator.result()
}

/** Incremental parser for large feeds read from a stream. */
export function createXmltvStreamParser(options: XmltvParseOptions = {}): XmltvStreamParser {
  const accumulator = new XmltvAccumulator(options)
  let buffer = ''

  return {
    push(chunk: string): void {
      if (!chunk) return
      buffer = buffer ? buffer + chunk : chunk
      const state = scanElements(buffer, 0, accumulator.handle)
      if (state.complete) {
        buffer = partialTagTail(buffer)
        return
      }
      buffer = buffer.slice(state.next)
      if (buffer.length > MAX_PENDING_BUFFER) {
        // A single element bigger than the cap means the feed is broken; drop it
        // and resynchronise on the next element start instead of growing forever.
        buffer = ''
      }
    },

    finish(): XmltvParseResult {
      if (buffer) {
        scanElements(buffer, 0, accumulator.handle)
        buffer = ''
      }
      return accumulator.result()
    },
  }
}
