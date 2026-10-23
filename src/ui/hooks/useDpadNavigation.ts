import { useEffect } from 'react'
import { isVertical, scrollDelta, type Direction, type ScrollMetrics } from '../scroll'

/**
 * ניווט בשלט רחוק (Android TV).
 *
 * ה-WebView של אנדרואיד לא תמיד מעביר את מקשי החיצים לניווט פוקוס בין
 * רכיבי הדף, ולכן מממשים ניווט מרחבי בעצמנו: לפי כיוון הלחיצה בוחרים את
 * הרכיב הקרוב ביותר באותו כיוון ומעבירים אליו פוקוס.
 */

/**
 * כל הרכיבים שאפשר למקד אליהם. מיוצא גם לשימושים אחרים (למשל מוקד התחלתי
 * בתוך חלון ההגדרות) כדי שכל המקומות יסתכלו על אותה הגדרה.
 */
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * מיקום הרכיב ב"קואורדינטות מסמך" ולא ביחס לחלון.
 *
 * זה מה שמונע את התקיעות: אחרי שגוללנו כדי להראות רכיב, המיקום שלו ביחס
 * לחלון משתנה, ואז ייתכן שרכיב שנמצא מעליו "בהיררכיה" כבר לא נחשב מעל
 * במיקום. עם מיקום מוחלט (בלי הזזה של הגלילה) הניווט יציב ותמיד עובד.
 */
interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface Candidate {
  el: HTMLElement
  rect: Rect
}

/** כרטיס המלצה — יחידת ניווט אחת שלמה (הכפתורים שבתוכה אינם עצירת פוקוס). */
const CARD_ATTR = 'data-tv-card'

function layoutRect(el: HTMLElement): Rect {
  const rect = el.getBoundingClientRect()
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  }
}

/** מידות הגלילה של מכל, כפי שהדפדפן מדווח עליהן. */
function metricsOf(el: HTMLElement): ScrollMetrics {
  return {
    scrollTop: el.scrollTop,
    scrollLeft: el.scrollLeft,
    clientHeight: el.clientHeight,
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    scrollWidth: el.scrollWidth,
  }
}

/**
 * המכל שאליו שייכת הגלילה הזו: הקרוב ביותר לרכיב בפוקוס שהוא באמת גולל
 * בציר של הכיוון, ואם אין כזה — הדף עצמו.
 */
function scrollTarget(el: HTMLElement | null, direction: Direction): HTMLElement | undefined {
  const vertical = isVertical(direction)
  let node: HTMLElement | null = el instanceof HTMLElement ? el : null
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node)
    const overflow = vertical ? style.overflowY : style.overflowX
    const scrollable = vertical
      ? node.scrollHeight > node.clientHeight + 1
      : node.scrollWidth > node.clientWidth + 1
    if ((overflow === 'auto' || overflow === 'scroll') && scrollable) return node
    node = node.parentElement
  }
  return (document.scrollingElement as HTMLElement | null) ?? undefined
}

/**
 * גלילת התוכן בלחיצת חץ, כשבכיוון הזה אין שום רכיב להעביר אליו פוקוס.
 *
 * זה מה שמאפשר לקרוא את כל חלון פרטי המשחק: התוכן שלו הוא טקסט וטבלה,
 * ואילו רכיבי הפוקוס היחידים בו הם כפתורי המסילה — בלעדי הגלילה הזו השלט
 * נתקע עליהם והמשך התוכן לא נגיש. מחזיר false כשאין לאן לגלול.
 */
function scrollFocused(direction: Direction): boolean {
  const container = scrollTarget(document.activeElement as HTMLElement | null, direction)
  if (!container) return false
  const delta = scrollDelta(metricsOf(container), direction)
  if (delta.top === 0 && delta.left === 0) return false
  container.scrollBy(delta)
  return true
}

function directionFor(key: string): Direction | undefined {
  switch (key) {
    case 'ArrowUp':
      return 'up'
    case 'ArrowDown':
      return 'down'
    case 'ArrowLeft':
      return 'left'
    case 'ArrowRight':
      return 'right'
    default:
      return undefined
  }
}

/**
 * כל הרכיבים שאפשר למקד אליהם. כשחלון ההגדרות פתוח — רק הרכיבים שבתוכו,
 * כדי שהניווט לא "יברח" למסך שמאחוריו.
 */
function collectCandidates(): Candidate[] {
  const panel = document.querySelector('.panel-backdrop')
  const scope: ParentNode = panel ?? document
  const nodes = scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  const out: Candidate[] = []
  for (const el of nodes) {
    if (el.hasAttribute('aria-hidden') || el.hidden) continue
    // רכיב בתוך כרטיס אינו עצירת פוקוס — הכרטיס עצמו הוא העצירה, ולכן
    // השלט לא "נתקע" פעמיים על אותו כרטיס.
    const card = el.closest<HTMLElement>(`[${CARD_ATTR}]`)
    if (card && card !== el) continue
    const rect = layoutRect(el)
    if (rect.width === 0 || rect.height === 0) continue
    out.push({ el, rect })
  }
  return out
}

function center(rect: Rect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/**
 * האם המועמד "באותה שורה" (לתנועה אופקית) או "באותה עמודה" (לתנועה אנכית).
 *
 * בלי זה, לחיצה שמאלה מכפתור בכותרת הייתה "נופלת" לטאב שנמצא מתחתיו, כי
 * הוא קרוב יותר במרחק אופקי — למרות שיש כפתור אחר באותה שורה ממש. כלל
 * החפיפה הוא הדרך הסטנדרטית של ממשקי טלוויזיה לפתור את זה.
 */
function overlapsPerpendicular(a: Rect, b: Rect, direction: Direction): boolean {
  if (direction === 'left' || direction === 'right') {
    return a.top < b.top + b.height && b.top < a.top + a.height
  }
  return a.left < b.left + b.width && b.left < a.left + a.width
}

function nearest(
  current: Candidate,
  candidates: readonly Candidate[],
  direction: Direction,
): Candidate | undefined {
  const others = candidates.filter((candidate) => {
    if (candidate.el === current.el) return false
    if (current.el.contains(candidate.el) || candidate.el.contains(current.el)) return false
    return true
  })
  // קודם מנסים רק מועמדים באותה שורה/עמודה, ואם אין בכלל כיוון תנועה
  // תקין ביניהם — חוזרים לכל המועמדים (למשל מינוי מלמטה לכותר הלמעלה).
  const sameRow = others.filter((candidate) =>
    overlapsPerpendicular(current.rect, candidate.rect, direction),
  )
  return bestInPool(current, sameRow, direction) ?? bestInPool(current, others, direction)
}

function bestInPool(
  current: Candidate,
  candidates: readonly Candidate[],
  direction: Direction,
): Candidate | undefined {
  const from = center(current.rect)
  let best: Candidate | undefined
  let bestScore = Infinity

  for (const candidate of candidates) {
    if (candidate.el === current.el) continue
    if (current.el.contains(candidate.el) || candidate.el.contains(current.el)) continue
    const to = center(candidate.rect)
    const dx = to.x - from.x
    const dy = to.y - from.y

    let primary: number
    let secondary: number
    if (direction === 'down') {
      primary = dy
      secondary = Math.abs(dx)
    } else if (direction === 'up') {
      primary = -dy
      secondary = Math.abs(dx)
    } else if (direction === 'right') {
      primary = dx
      secondary = Math.abs(dy)
    } else {
      primary = -dx
      secondary = Math.abs(dy)
    }
    if (primary < 8) continue
    // הקרבה בכיוון הלחיצה היא הקובעת; ההיסט הצידי רק שובר שוויון. משקל
    // גבוה מדי גרם לכך שמתגים בקצה השורה היו "בלתי ניתנים להגעה" מהשלט.
    const score = primary + secondary * 0.6
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

/** סוגי input שבהם החצים שייכים לכתיבה/לעריכה ולא לניווט. */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'password',
  'number',
  'search',
  'email',
  'url',
  'tel',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
])

/**
 * שדה הקלדה (input טקסטואלי). תיבות סימון ורשימות נפתחות אינן שדות
 * הקלדה — שם החצים שייכים לניווט.
 */
function isTextField(el: HTMLElement | null): boolean {
  return (
    el?.tagName === 'INPUT' && TEXT_INPUT_TYPES.has((el as HTMLInputElement).type.toLowerCase())
  )
}

/**
 * סימון לשדה שנמצא כרגע במצב הקלדה (המקלדת של הטלוויזיה פתוחה).
 *
 * הבעיה שהסימון פותר: בלווביון של הטלוויזיה, ברגע ששדה הקלדה נמצא בפוקוס
 * נפתחת המקלדת — ומרגע זה המקלדת בולעת את מקשי החצים, כך שהשלט נתקע בשדה
 * ואי אפשר לצאת ממנו. לכן כל שדה הקלדה עולה בפוקוס כ"לקריאה בלבד", והמקלדת
 * נפתחת רק כשלוחצים עליו OK. בשלט זה גם המוסכמה המוכרת בטלוויזיה.
 */
const EDITING_ATTR = 'data-tv-editing'

/** האם השדה בפוקוס נמצא כרגע במצב הקלדה עם המקלדת של הטלוויזיה. */
export function isEditingField(el: HTMLElement | null): boolean {
  return Boolean(el?.hasAttribute(EDITING_ATTR))
}

/**
 * האם המשתמש כבר ניווט עם השלט (חצים). רק במצב כזה שדות ההקלדה נעשים
 * "לקריאה בלבד" — כך שבדפדפן עם עכבר, או במסך מגע, ההקלדה נשארת טבעית.
 */
let remoteMode = false

/** לחיצת עכבר/מסך מגע — מקלדת לא צריכה להיחסם בשבילה. */
let pointerFocus = false

/**
 * "מצב מגע": בטלפון אין שלט — טבעת הפוקוס הגדולה של הטלוויזיה מיותרת שם
 * ואף מפריעה, כי היא נשארת תלויה על הכפתור האחרון שנגעו בו.
 *
 * המחלקה נדלקת בנגיעה הראשונה בטלפון (וגם בעכבר בדפדפן) ונכבית ברגע
 * שמגיע מקש חץ. בטלוויזיה אין נגיעות כלל, ולכן היא לא נדלקת שם לעולם ואפשר
 * להסתמך עליה ב-CSS כדי לשנות רק את מראה מסך המגע.
 */
function setTouchUi(on: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('touch-ui', on)
}

/** סימון כל הטקסט בשדה המקלדת (type=number לא תומך בזה — לא קריטי). */
function selectAll(input: HTMLInputElement): void {
  try {
    input.setSelectionRange(0, input.value.length)
  } catch {
    // input type=number לא תומך במיקום סמן.
  }
}

/** פתיחת הקלדה בשדה — כאן נפתחת המקלדת של הטלוויזיה. */
function startEditing(input: HTMLInputElement): void {
  input.readOnly = false
  input.setAttribute(EDITING_ATTR, '')
  input.focus()
  // כל הטקסט מסומן — בשלט קל להקליד ערך חדש במקום למחוק תו־תו, וזו גם
  // ההתנהגות המוכרת בטלוויזיה (שדה נבחר בשלמותו עם פתיחת המקלדת).
  selectAll(input)
  // ה-WebView מאפס את הסמן כשהמקלדת ננעלת על השדה (לרוב לסוף הטקסט), ולכן
  // מסמנים שוב מיד אחרי כן. ברגע שהמשתמש מקליד — מפסיקים מיד כדי לא למחוק
  // לו את מה שכתב.
  let typed = false
  const markTyped = () => {
    typed = true
    input.removeEventListener('input', markTyped)
  }
  input.addEventListener('input', markTyped)
  for (const delay of [40, 120, 260]) {
    setTimeout(() => {
      if (typed || !input.hasAttribute(EDITING_ATTR)) return
      if (document.activeElement !== input) return
      selectAll(input)
    }, delay)
  }
  input.scrollIntoView({ block: 'nearest' })
}

/** סיום הקלדה — השדה חוזר ל"לקריאה בלבד" והשלט מנווט שוב. */
function stopEditing(input: HTMLElement | null): void {
  if (!input?.hasAttribute(EDITING_ATTR)) return
  input.removeAttribute(EDITING_ATTR)
  ;(input as HTMLInputElement).readOnly = true
}

/**
 * רשימה נפתחת (select) היא מקרה מיוחד.
 *
 * דפדפן מקבל את מקשי החצים כ"שינוי בחירה" כשרכיב select בפוקוס, ולכן
 * המשתמש נתקע על הרשימה הראשונה ולא מצליח לעבור לשורה הבאה. לכן:
 *   • למעלה/למטה — מזיזים פוקוס כרגיל (עם preventDefault כדי שהבחירה לא תשתנה),
 *   • שמאלה/ימינה — משנים את הערך עצמו (כמו בדפדפן),
 *   • OK — פותח את הרשימה (ההתנהגות המקורית).
 */
function isSelect(el: HTMLElement | null): boolean {
  return el?.tagName === 'SELECT'
}

/** שדה רב-שורתי שבו החצים שייכים לכתיבה עצמה. */
function isMultilineEntry(el: HTMLElement | null): boolean {
  return el?.tagName === 'TEXTAREA' || Boolean(el?.isContentEditable)
}

/**
 * מקש ה-OK של השלט. מקבל משמעות רק כשרכיב נמצא בפוקוס, ובשדות טקסט
 * לא מתערבים — כדי שהמקלדת של הטלוויזיה תיפתח.
 */
function activateFocused(event: KeyboardEvent): void {
  const el = document.activeElement as HTMLElement | null
  if (!el || el === document.body) return

  // שדה הקלדה: OK פותח את המקלדת של הטלוויזיה (עד אז הוא לקריאה בלבד,
  // כדי שהמקלדת לא תפתח סתם ותבלע את מקשי השלט).
  if (isTextField(el)) {
    event.preventDefault()
    startEditing(el as HTMLInputElement)
    return
  }

  // כרטיס: OK מפעיל את הפעולה המרכזית של הכרטיס. הסדר קובע —
  //   1. כפתור שמסומן במפורש במחבר ([data-tv-primary]) — הפעולה הנבחרת.
  //   2. הכרטיס עצמו, אם הוא לחיץ (role="button") — למשל כרטיס משחק שפותח
  //      את מסך הפרטים. זה גם מה שמאפשר לכרטיס המשחק בלי כפתור "פרטים":
  //      כל הכרטיס הוא הכפתור.
  //   3. הכפתור הראשון שבתוכו — גיבוי לכרטיס ששכחו לסמן.
  if (el.hasAttribute(CARD_ATTR)) {
    const explicit = el.querySelector<HTMLElement>('[data-tv-primary]')
    const action =
      explicit ??
      (el.getAttribute('role') === 'button'
        ? el
        : el.querySelector<HTMLButtonElement>('button:not([disabled])'))
    if (action) {
      event.preventDefault()
      action.click()
    }
    return
  }

  const tag = el.tagName
  if (tag === 'BUTTON' || tag === 'A' || el.getAttribute('role') === 'button') {
    event.preventDefault()
    el.click()
    return
  }
  // בדפדפן של הטלוויזיה Enter לא מסמן תיבת סימון (רק רווח) — לכן בוחרים בעצמנו,
  // אחרת אי אפשר לבחור ערוצים בבחירת ה-EPG.
  if (tag === 'INPUT') {
    const input = el as HTMLInputElement
    const type = input.type.toLowerCase()
    if (type === 'checkbox' || type === 'radio') {
      event.preventDefault()
      input.click()
    }
  }
}

export function useDpadNavigation(): void {
  // פוקוס התחלתי — בטלוויזיה חייבים לראות מיד איפה השלט נמצא, בלי לחיצה
  // מקדימה. מסומן ב-data-tv-initial-focus, ואם אין — הרכיב הראשון במסך.
  useEffect(() => {
    const timer = setTimeout(() => {
      const active = document.activeElement
      if (active && active !== document.body) return
      const preferred = document.querySelector<HTMLElement>('[data-tv-initial-focus]')
      const target = preferred ?? document.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      target?.focus()
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // לא מפריעים לכתיבה בשדות קלט ולא לקיצורי מערכת.
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const direction = directionFor(event.key)
      if (!direction) {
        if (event.key === 'Enter' || event.key === ' ') activateFocused(event)
        return
      }

      // המשתמש מנווט עם השלט — מכאן שדות ההקלדה נכנסים למצב "לקריאה בלבד".
      // מקש חץ גם מכבה את מצב המגע: אם היו נגיעות קודם (טלפון עם מקלדת),
      // חוזרים להתנהגות של שלט/מקלדת עם טבעת פוקוס.
      remoteMode = true
      setTouchUi(false)

      // שדה רב-שורתי — המשתמש עורך טקסט, לא מנווט.
      const active = document.activeElement as HTMLElement | null
      if (isMultilineEntry(active)) return
      // אם מקש חץ בכלל הגיע לכאן בזמן הקלדה — סימן שהמקלדת כבר סגורה
      // (כשהיא פתוחה הלווביון בולע את המקשים), ולכן מסיימים הקלדה ומנווטים.
      stopEditing(active)
      if (isSelect(active) && direction !== 'up' && direction !== 'down') {
        // רק למעלה/למטה מזיזים פוקוס מרשימה נפתחת; שמאלה/ימינה שייכים לבחירה.
        return
      }
      // שדה קלט חד-שורתי: כל ארבעת החצים מעבירים פוקוס.
      // בטלוויזיה הכתיבה נעשית במקלדת על המסך, והסמן בתוך השדה פחות חשוב
      // מלצאת ממנו — בלעדי זה השלט נתקע בשדה ואי אפשר להגיע לשמור.

      const candidates = collectCandidates()
      if (candidates.length === 0) {
        if (scrollFocused(direction)) event.preventDefault()
        return
      }

      const current =
        active && active !== document.body
          ? candidates.find(
              (candidate) => candidate.el === active || candidate.el.contains(active),
            )
          : undefined

      const target = current ? nearest(current, candidates, direction) : candidates[0]
      if (!target) {
        // אין רכיב בכיוון — מגלגלים את התוכן, אחרת מה שמתחת לקפל לא נגיש.
        if (scrollFocused(direction)) event.preventDefault()
        return
      }

      event.preventDefault()
      target.el.focus()
      target.el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }

    /**
     * שדה הקלדה שמקבל פוקוס בזמן ניווט בשלט נכנס למצב "לקריאה בלבד" — אחרת
     * המקלדת של הטלוויזיה נפתחת ומקשי השלט מפסיקים להגיע לאפליקציה.
     */
    function onFocusIn(event: FocusEvent) {
      const el = event.target as HTMLElement | null
      if (!remoteMode || pointerFocus || !isTextField(el)) return
      if (el!.hasAttribute(EDITING_ATTR)) return
      ;(el as HTMLInputElement).readOnly = true
    }

    /** יציאה מהשדה (למשל מעבר לרכיב אחר) מסיימת את מצב ההקלדה. */
    function onFocusOut(event: FocusEvent) {
      stopEditing(event.target as HTMLElement | null)
    }

    /** לחיצת עכבר: לא נוגעים בשדה — שיהיה אפשר להקליד כרגיל במחשב/מגע. */
    function onPointerDown() {
      pointerFocus = true
      // נגיעה = משתמש במסך מגע (טלפון). בטלוויזיה אין נגיעות בכלל, ולכן
      // המחלקה הזו לא נדלקת שם והמראה נשאר זהה.
      setTouchUi(true)
      setTimeout(() => {
        pointerFocus = false
      }, 300)
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [])
}
