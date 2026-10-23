/**
 * Small fetch helper used by every data client.
 * Handles: base-URL normalisation, timeouts, retries with backoff, JSON parsing
 * and bounded-concurrency mapping. Works both in the browser and inside the
 * Capacitor WebView (native HTTP).
 */

export interface FetchOptions {
  signal?: AbortSignal
  /** Per-attempt timeout. Default 15000ms. */
  timeoutMs?: number
  /** Number of retries after the first attempt. Default 2. */
  retries?: number
  headers?: Record<string, string>
}

const DEFAULT_TIMEOUT = 15_000
const DEFAULT_RETRIES = 2

export class HttpError extends Error {
  readonly status: number
  readonly url: string
  constructor(message: string, status: number, url: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.url = url
  }
}

/** השהיה שמכבדת AbortSignal — משמשת להשהיה בין בקשות לאותו אתר. */
export function delayMs(ms: number, signal?: AbortSignal): Promise<void> {
  return sleep(ms, signal)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** Turn "bethoven.af.stream.com" or "bethoven.af.stream.com:8080" into a full origin. */
export function normalizeHost(host: string): string {
  const trimmed = host.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

/** Append query params, skipping undefined/empty values. */
export function buildUrl(
  base: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
): string {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function fetchWithPolicy(url: string, opts: FetchOptions, as: 'text'): Promise<string>
async function fetchWithPolicy(url: string, opts: FetchOptions, as: 'response'): Promise<Response>
async function fetchWithPolicy(
  url: string,
  opts: FetchOptions,
  as: 'text' | 'response',
): Promise<string | Response> {
  const retries = opts.retries ?? DEFAULT_RETRIES
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const controller = new AbortController()
    const onAbort = () => controller.abort()
    opts.signal?.addEventListener('abort', onAbort, { once: true })
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: opts.headers,
        // IPTV panels are frequently HTTP-only; credentials go in the query string.
        redirect: 'follow',
      })
      if (!res.ok && res.status >= 500 && attempt < retries) {
        lastError = new HttpError(`HTTP ${res.status}`, res.status, url)
        continue
      }
      if (!res.ok) throw new HttpError(`HTTP ${res.status} ${res.statusText}`, res.status, url)
      return as === 'text' ? await res.text() : res
    } catch (error) {
      lastError = error
      if (error instanceof DOMException && error.name === 'AbortError' && opts.signal?.aborted) {
        throw error
      }
      if (error instanceof HttpError && error.status < 500) throw error
      if (attempt >= retries) break
      await sleep(400 * 2 ** attempt, opts.signal)
    } finally {
      clearTimeout(timer)
      opts.signal?.removeEventListener('abort', onAbort)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  return fetchWithPolicy(url, opts, 'text')
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const body = await fetchWithPolicy(url, opts, 'text')
  try {
    return JSON.parse(body) as T
  } catch {
    throw new HttpError('התקבלה תשובה שאינה JSON תקין מהשרת', 0, url)
  }
}

/** Response handle for callers that need to stream (large XMLTV files). */
export async function fetchResponse(url: string, opts: FetchOptions = {}): Promise<Response> {
  return fetchWithPolicy(url, opts, 'response')
}

/** Run `fn` over `items` with at most `limit` promises in flight, preserving order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  if (items.length === 0) return results
  const size = Math.max(1, Math.min(limit, items.length))
  let cursor = 0
  const workers = Array.from({ length: size }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

/** Run `fn` and return a fallback value instead of throwing. */
export async function attempt<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}
