/**
 * M3U / M3U8 playlist parser.
 *
 * Only the channel catalog is extracted — the stream URL line is used purely to
 * confirm the entry is complete (a trailing `#EXTINF` with no URL is dropped).
 *
 * Playlists in the wild are messy: attribute order varies, values may be quoted
 * with `"` or `'` or not quoted at all, and display names may contain commas.
 * The splitter below therefore looks for the last comma that is *outside*
 * quotes, which is the actual separator between attributes and the name.
 */

import type { Channel } from '../types'
import { looksIsraeliChannel } from './xtream'

/** Build a stable channel id, preferring the XMLTV id. */
export function buildChannelId(epgId: string | undefined, name: string): string {
  const id = (epgId ?? '').trim()
  if (id) return id
  return (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Split `-1 tvg-id="a" group-title="News, HD",Display Name` into its two halves. */
function splitExtinf(body: string): { attributes: string; display: string } | null {
  let quote: string | null = null
  let lastComma = -1
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === ',') lastComma = i
  }
  if (lastComma === -1) return null
  return {
    attributes: body.slice(0, lastComma),
    display: body.slice(lastComma + 1).trim(),
  }
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  const pattern = /([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    const key = match[1].toLowerCase()
    if (key in attributes) continue
    attributes[key] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return attributes
}

function parseExtinfChannel(line: string): Channel | null {
  const body = line.replace(/^#EXTINF\s*:\s*/i, '').trim()
  const split = splitExtinf(body)
  if (!split) return null
  const attrs = parseAttributes(split.attributes)
  const tvgId = (attrs['tvg-id'] ?? '').trim()
  const tvgName = (attrs['tvg-name'] ?? '').trim()
  const logo = (attrs['tvg-logo'] ?? '').trim()
  const group = (attrs['group-title'] ?? '').trim()
  const name = tvgName || split.display
  if (!name) return null

  const channel: Channel = {
    id: buildChannelId(tvgId || undefined, name),
    name,
    israeli: looksIsraeliChannel(name),
  }
  if (tvgId) channel.epgId = tvgId
  if (group) channel.group = group
  if (logo) channel.icon = logo
  return channel
}

/**
 * Parse an M3U playlist into the channel catalog.
 * Never throws — malformed entries are skipped.
 */
export function parseM3u(text: string): Channel[] {
  if (typeof text !== 'string' || text.length === 0) return []
  const channels: Channel[] = []
  const seen = new Set<string>()
  let pending: Channel | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('#')) {
      // `#EXTINF` opens an entry; every other directive (#EXTGRP, #EXTVLCOPT,
      // #EXTM3U …) is ignored and keeps the pending entry alive.
      if (line.toUpperCase().startsWith('#EXTINF')) {
        pending = parseExtinfChannel(line)
      }
      continue
    }

    // First non-comment, non-empty line after #EXTINF is the stream URL.
    if (pending) {
      if (pending.id && !seen.has(pending.id)) {
        seen.add(pending.id)
        channels.push(pending)
      }
      pending = null
    }
  }

  return channels
}
