/**
 * מאמת את האפליקציה המותקנת על מכשיר/אמולטור Android TV.
 *
 * מתחבר ל-WebView דרך Chrome DevTools Protocol, מפעיל את מצב הדוגמה,
 * קורא את מה שרונדר בפועל, ואז שולח לחיצות שלט רחוק אמיתיות (adb keyevent)
 * כדי לבדוק שניווט הפוקוס עובד.
 *
 * שימוש:
 *   adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 *   node scripts/verify-device.mjs [serial]
 */

import { execFileSync } from 'node:child_process'

const SERIAL = process.argv[2] ?? 'emulator-5554'
const DEVTOOLS = process.env.DEVTOOLS_URL ?? 'http://127.0.0.1:9222/json'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function adb(args) {
  return execFileSync('adb', ['-s', SERIAL, ...args], { encoding: 'utf8' })
}

async function connect() {
  const targets = await (await fetch(DEVTOOLS)).json()
  const page = targets.find((target) => target.type === 'page')
  if (!page) throw new Error('לא נמצא WebView מחובר')
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onerror = reject
  })

  let nextId = 0
  const pending = new Map()
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    const resolve = pending.get(message.id)
    if (resolve) {
      pending.delete(message.id)
      resolve(message)
    }
  }

  function send(method, params) {
    return new Promise((resolve) => {
      const id = ++nextId
      pending.set(id, resolve)
      socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    const result = response.result
    if (result?.exceptionDetails) {
      throw new Error(`שגיאה בהרצה בדף: ${JSON.stringify(result.exceptionDetails)}`)
    }
    return result?.result?.value
  }

  return { evaluate, close: () => socket.close(), page }
}

const READ_STATE = `(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const demo = [...document.querySelectorAll('button')].find(b => b.textContent.includes('הצג דוגמה'));
  if (demo) { demo.click(); await sleep(1200); }
  const cards = [...document.querySelectorAll('article.card')];
  return {
    title: document.title,
    dir: document.documentElement.dir,
    tabCounts: [...document.querySelectorAll('.tab')].map(t => t.textContent),
    cardCount: cards.length,
    sportCards: cards.filter(c => c.querySelector('.match__teams')).map(c => ({
      match: c.querySelector('.card__title')?.textContent,
      chips: [...c.querySelectorAll('.chip')].map(x => x.textContent),
      teams: [...c.querySelectorAll('.team-row')].map(r => r.textContent),
      reasons: [...c.querySelectorAll('.reason')].map(x => x.textContent),
    })),
    firstCardTitle: cards[0]?.querySelector('.card__title')?.textContent ?? null,
  };
})()`

const ACTIVE_ELEMENT = `(() => {
  const el = document.activeElement;
  if (!el) return null;
  return { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), cls: el.className };
})()`

async function main() {
  const session = await connect()
  console.log(`נמצא דף: ${session.page.url}`)

  const state = await session.evaluate(READ_STATE)
  console.log('\n=== מה שרונדר על הטלוויזיה ===')
  console.log(JSON.stringify(state, null, 2))

  // ניווט עם השלט: מקשי D-pad אמיתיים דרך adb.
  const before = await session.evaluate(ACTIVE_ELEMENT)
  adb(['shell', 'input', 'keyevent', '20']) // DPAD_DOWN
  await sleep(400)
  adb(['shell', 'input', 'keyevent', '20'])
  await sleep(400)
  const after = await session.evaluate(ACTIVE_ELEMENT)
  console.log('\n=== ניווט בשלט ===')
  console.log('לפני:', JSON.stringify(before))
  console.log('אחרי:', JSON.stringify(after))
  console.log(after && JSON.stringify(before) !== JSON.stringify(after)
    ? 'הפוקוס זז בהצלחה עם מקשי השלט ✓'
    : 'הפוקוס לא זז ✗')

  // שלב 2: מקש ה-OK. ממקדים את לשונית "סדרות" ואז לוחצים OK בשלט —
  // אמורים לעבור לקטגוריית הסדרות.
  const focused = await session.evaluate(`(() => {
    const tab = [...document.querySelectorAll('.tab')].find(t => t.textContent.includes('סדרות'));
    tab.focus();
    return { focused: document.activeElement.textContent, activeTab: document.querySelector('.tab[aria-current="page"]').textContent };
  })()`)
  console.log('\n=== בחירה במקש ה-OK ===')
  console.log('מוקדם:', JSON.stringify(focused))

  adb(['shell', 'input', 'keyevent', '23']) // DPAD_CENTER = OK
  await sleep(800)

  const afterOk = await session.evaluate(`(() => {
    const active = document.querySelector('.tab[aria-current="page"]');
    const cards = [...document.querySelectorAll('article.card')];
    return {
      activeTab: active ? active.textContent : null,
      cardCount: cards.length,
      firstCard: cards[0] ? cards[0].querySelector('.card__title').textContent : null
    };
  })()`)
  console.log('אחרי:', JSON.stringify(afterOk))
  const switched = afterOk?.activeTab && focused?.activeTab !== afterOk.activeTab
  console.log(switched ? 'מקש ה-OK החליף קטגוריה ✓' : 'מקש ה-OK לא פעל ✗')
  if (!switched) process.exitCode = 1

  session.close()
}

main().catch((error) => {
  console.error('האימות נכשל:', error.message)
  process.exit(1)
})
