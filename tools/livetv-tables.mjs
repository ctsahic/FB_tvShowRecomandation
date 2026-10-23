#!/usr/bin/env node
/*
 * משימת צד (לא חלק מהאפליקציה): סורק את עמודי הטבלאות של livetv.sx ודוחף
 * לסיכום אחד מה רואים בכל URL — כדי לסנן ליגות לא רלוונטיות.
 *
 * הרצה:
 *   node tools/livetv-tables.mjs                 # כל הקטלוג שמופיע בסרגל הצד
 *   node tools/livetv-tables.mjs --ids=7,1       # רק מזהים מפורשים
 *   node tools/livetv-tables.mjs --limit=20      # עצור אחרי 20 עמודים
 *
 * הרצה חוזרת: הסקריפט מדלג על מזהים שכבר נסרקו בקובץ הקיים.
 *   node tools/livetv-tables.mjs --fresh        # התחל מהתחלה
 *
 * משתני סביבה:
 *   LIVETV_DELAY_MS   השהיה בין בקשה לבקשה (ברירת מחדל 5000)
 *   LIVETV_MAX_MISS   כמה עמודים רצופים בלי תוצאה כלל = עצור (ברירת מחדל 5)
 *   LIVETV_BASE       דומיין חלופי (ברירת מחדל https://livetv.sx)
 *   LIVETV_LANG       קידומת שפה (ברירת מחדל enx = אנגלית)
 *
 * הפלט נשמר אחרי כל עמוד (אפשר לעצור באמצע ולהמשיך):
 *   tools/livetv-tables.json  — הנתון הגולמי
 *   tools/livetv-tables.md    — טבלת הסיכום
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_JSON = path.join(ROOT, 'tools', 'livetv-tables.json')
const OUT_MD = path.join(ROOT, 'tools', 'livetv-tables.md')

const BASE = (process.env.LIVETV_BASE || 'https://livetv.sx').replace(/\/+$/, '')
const LANG = process.env.LIVETV_LANG || 'enx'
const DELAY_MS = Number(process.env.LIVETV_DELAY_MS || 5000)
const MAX_MISS = Number(process.env.LIVETV_MAX_MISS || 5)
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const args = process.argv.slice(2)
const argValue = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const IDS = (argValue('ids') || '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
const LIMIT = Number(argValue('limit') || 0)
const FRESH = args.includes('--fresh')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...parts) => console.log(...parts)

/* ------------------------------------------------------------------ */
/* שליפה                                                               */
/* ------------------------------------------------------------------ */

async function fetchPage(id) {
  const url = `${BASE}/${LANG}/tables/${id}/`
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (res.status >= 300 && res.status < 400) {
      return { id, url, status: res.status, location: res.headers.get('location') || '', html: '' }
    }
    const html = res.status === 200 ? await res.text() : ''
    return { id, url, status: res.status, location: '', html }
  } catch (error) {
    return { id, url, status: 0, location: '', html: '', error: String(error?.message || error) }
  }
}

/* ------------------------------------------------------------------ */
/* פענוח                                                               */
/* ------------------------------------------------------------------ */

const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')

const textOf = (s) => decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/** כל הליגות שמופיעות בסרגל הצד: מפתח = מזהה טבלה, ערך = שם הליגה. */
function extractCatalog(html) {
  const out = new Map()
  const re = /<a[^>]+href="\/(?:enx|tables)\/tables?\/(\d+)\/"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    const id = Number(m[1])
    const name = textOf(m[2])
    if (name && !out.has(id)) out.set(id, name)
  }
  return out
}

/** פענוח עמוד ליגה בודד. */
function parseLeague(id, url, html) {
  const one = (re) => (html.match(re) || [])[1] || ''
  const title = textOf(one(/<title[^>]*>([\s\S]*?)<\/title>/i))
  const heading = textOf(one(/class="nwstitle">([\s\S]*?)<\/h1>/i))
  // אחרי הכותרת מופיע <span class="date">Football</date> — הענף.
  const afterHeading = html.slice(html.indexOf('nwstitle'))
  const sport = textOf((afterHeading.match(/class="date">([^<]*)/i) || [])[1] || '')
  const season = (title.match(/\b(\d{2}\/\d{2})\b/) || [])[1] || ''

  const tabs = {
    fixtures: new RegExp(`/enx/calendar/${id}/`).test(html),
    broadcasts: new RegExp(`/enx/competitions/${id}/`).test(html),
    results: new RegExp(`/enx/leagueresults/${id}/`).test(html),
    table: new RegExp(`/enx/tables/${id}/`).test(html),
    video: new RegExp(`/enx/videotourney/${id}/`).test(html),
  }

  // טבלאות מיקום: כל <table> שיש בו לפחות 4 שמות קבוצות מקושרים.
  const blocks = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0])
  const standings = []
  for (const block of blocks) {
    if (!/<a href="\/enx\/team\//.test(block)) continue
    const rows = [...block.matchAll(/<tr[\s\S]*?<\/tr>/gi)]
      .map((m) => m[0])
      .filter((r) => /<a href="\/enx\/team\//.test(r))
    if (rows.length < 4) continue
    const teams = rows
      .map((row) => {
        const cells = [...row.matchAll(/<td[\s\S]*?<\/td>/gi)].map((m) => textOf(m[0]))
        if (cells.length < 3) return null
        const name = textOf((row.match(/\/enx\/team\/[^"]*">([\s\S]*?)<\/a>/) || [])[1] || '')
        if (!name) return null
        const nums = cells.filter((c) => /^\d+$/.test(c)).map(Number)
        return {
          position: Number(cells[0]) || null,
          name,
          played: nums[1] ?? null,
          points: nums[nums.length - 1] ?? null,
        }
      })
      .filter(Boolean)
    if (teams.length >= 4) standings.push(teams)
  }

  const main = standings.sort((a, b) => b.length - a.length)[0] || []
  return {
    id,
    url,
    title,
    league: heading || title.split(' / ')[0].replace(/\s*\d{2}\/\d{2}\s*$/, '').trim(),
    sport,
    season,
    tabs,
    tables: standings.length,
    teamsCount: main.length,
    leader: main[0]?.name || '',
    leaderPoints: main[0]?.points ?? null,
    teams: main.slice(0, 6).map((t) => `${t.position ?? '?'}. ${t.name}`),
    fetchedAt: new Date().toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* פלט                                                                 */
/* ------------------------------------------------------------------ */

function writeMd(rows, meta) {
  const yes = (v) => (v ? '✓' : '—')
  const lines = []
  lines.push('# סיכום עמודי הטבלאות של LiveTV')
  lines.push('')
  lines.push(
    `נסרק: ${new Date(meta.startedAt).toISOString()} · השהיה בין בקשות: ${meta.delayMs}ms · בסיס: ${BASE}/${LANG}/tables/{id}/`,
  )
  lines.push('')
  lines.push(`עמודים שנבדקו: **${rows.length}** · עם טבלת מיקום: **${rows.filter((r) => r.teamsCount).length}** · עם שידורים: **${rows.filter((r) => r.tabs?.broadcasts).length}**`)
  lines.push('')
  lines.push('| # | id | ליגה | עונה | ענף | טבלאות | קבוצות | מובילה | שידורים (ערוצים) | Fixtures | תוצאות | וידאו | הערה |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  rows.forEach((r, i) => {      const note = !r.teamsCount
      ? (r.status === 200 ? 'אין טבלת מיקום' : `שגיאה ${r.status}`)
      : r.sport && !/football/i.test(r.sport)
        ? 'לא כדורגל'
        : !r.tabs?.broadcasts
          ? 'אין ערוץ שידור'
          : ''
    lines.push(
      `| ${i + 1} | ${r.id} | ${r.league} | ${r.season} | ${r.sport} | ${r.tables} | ${r.teamsCount} | ${r.leader} | ${yes(r.tabs?.broadcasts)} | ${yes(r.tabs?.fixtures)} | ${yes(r.tabs?.results)} | ${yes(r.tabs?.video)} | ${note} |`,
    )
  })
  lines.push('')
  lines.push('## הערות')
  lines.push('')
  lines.push('- „שידורים (ערוצים)” = בעמוד הליגה יש טאב `/enx/competitions/{id}/` (Video Broadcasts).')
  lines.push('- „קבוצות” = מספר השורות בטבלת המיקום הגדולה בעמוד.')
  lines.push('- קובץ הנתון הגולמי: `tools/livetv-tables.json`.')
  fs.writeFileSync(OUT_MD, lines.join('\n'), 'utf8')
}

function save(rows, meta) {
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ meta, rows }, null, 2),
    'utf8',
  )
  writeMd(rows, meta)
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

/** תוצאות קודמות — כדי לא לשלוף שוב אותו עמוד. */
function loadPrevious() {
  if (FRESH || !fs.existsSync(OUT_JSON)) return { rows: [], meta: null }
  try {
    const parsed = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'))
    if (parsed?.meta?.base !== BASE || parsed?.meta?.lang !== LANG) return { rows: [], meta: null }
    return { rows: parsed.rows || [], meta: parsed.meta || null }
  } catch {
    return { rows: [], meta: null }
  }
}

async function main() {
  const previous = loadPrevious()
  const byId = new Map(previous.rows.map((r) => [r.id, r]))
  const meta = previous.meta
    ? { ...previous.meta, delayMs: DELAY_MS }
    : { base: BASE, lang: LANG, delayMs: DELAY_MS, maxMiss: MAX_MISS, startedAt: new Date().toISOString() }

  log(`→ סורק ${BASE}/${LANG}/tables/{id}/ בהשהיה של ${DELAY_MS}ms`)
  if (byId.size) log(`→ ממשיך מהקובץ הקיים: ${byId.size} מזהים כבר נסרקו`)

  let ids = IDS
  let catalogNames = new Map()
  if (ids.length === 0) {
    log('→ קורא קטלוג הליגות מהסרגל הצד...')
    const seed = await fetchPage(1)
    if (seed.html) catalogNames = extractCatalog(seed.html)
    if (catalogNames.has(1) || catalogNames.size >= 0) catalogNames.set(1, catalogNames.get(1) || 'England. Premier League')
    ids = [...catalogNames.keys()].sort((a, b) => a - b)
    // עמוד הזרע (1) כבר נשלף — נפענח אותו מחדש בלי לבזבז בקשה נוספת.
    seedCache.set(1, seed)
    log(`→ נמצאו ${ids.length} מזהי ליגות בקטלוג`)
  } else {
    log(`→ מזהים מפורשים: ${ids.join(', ')}`)
  }

  if (LIMIT > 0) ids = ids.slice(0, LIMIT)

  const total = ids.length
  let fetched = 0
  let miss = 0
  let skipped = 0

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]

    // כבר יש שורה טובה מהרצה קודמת — לא שולפים שוב.
    const existing = byId.get(id)
    if (existing && existing.status === 200 && (existing.teamsCount || existing.catalogName)) {
      skipped++
      continue
    }

    if (fetched > 0) await sleep(DELAY_MS)
    fetched++

    const page = seedCache.get(id) || (await fetchPage(id))
    seedCache.delete(id)

    if (!page.html) {
      // אין תוצאה בכלל (הפניה לדף הבית / שגיאה) — זה מה שמפעיל את עצירת הבטיחות.
      byId.set(id, {
        id,
        url: page.url,
        status: page.status,
        league: catalogNames.get(id) || '',
        error: page.error || (page.location ? `redirect → ${page.location}` : 'no body'),
        teamsCount: 0,
        tables: 0,
        tabs: {},
        fetchedAt: new Date().toISOString(),
      })
      miss++
      log(`  [${i + 1}/${total}] ${id} — ✗ ${page.status} ${page.location || page.error || ''}`)
    } else {
      const parsed = parseLeague(id, page.url, page.html)
      parsed.status = page.status
      parsed.catalogName = catalogNames.get(id) || ''
      byId.set(id, parsed)
      miss = 0
      log(
        `  [${i + 1}/${total}] ${id} — ${parsed.teamsCount ? `${parsed.teamsCount} קבוצות` : 'בלי טבלה'} · ${parsed.sport || '?'} · ${parsed.league}`,
      )
    }

    save([...byId.values()], meta)

    if (miss >= MAX_MISS) {
      log(`→ עצירה: ${miss} עמודים רצופים בלי עמוד בכלל (MAX_MISS=${MAX_MISS})`)
      break
    }
  }

  meta.finishedAt = new Date().toISOString()
  const rows = [...byId.values()].sort((a, b) => a.id - b.id)
  save(rows, meta)
  log(`✓ ${rows.length} שורות (${skipped} דולגו כקיימות) → tools/livetv-tables.md`)
}

const seedCache = new Map()

main().catch((error) => {
  console.error('נכשל:', error)
  process.exit(1)
})
