/**
 * חישוב הגלילה בלחיצת חץ כשאין רכיב שאפשר להעביר אליו פוקוס.
 *
 * למה זה נדרש: יש חלונות שכל התוכן שלהם הוא טקסט, רשימות וטבלאות בלי אף
 * רכיב שאפשר למקד עליו — למשל חלון פרטי המשחק. הניווט המרחבי לא מוצא לשם
 * לאן לעבור, ואם לא מגלגלים בעצמנו, כל מה שמתחת לקפל פשוט לא נגיש לשלט.
 *
 * כל החישוב הוא פונקציה טהורה של מידות המכל, כדי שאפשר יהיה לבדוק אותו
 * בלי דפדפן.
 */

export type Direction = 'up' | 'down' | 'left' | 'right'

/** מידות הגלילה של מכל — בדיוק השדות שהדפדפן מספק. */
export interface ScrollMetrics {
  scrollTop: number
  scrollLeft: number
  clientHeight: number
  clientWidth: number
  scrollHeight: number
  scrollWidth: number
}

/** האם הכיוון הזה אנכי (למעלה/למטה) ולא אופקי. */
export function isVertical(direction: Direction): boolean {
  return direction === 'up' || direction === 'down'
}

/** "מקטע" הגלילה בחצים — כ-60% מהחלון, ולא פחות מ-120px גם במסך קטן. */
export function scrollStep(size: number): number {
  if (!Number.isFinite(size) || size <= 0) return 120
  return Math.max(Math.round(size * 0.6), 120)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** כמה עוד אפשר להיגלל בכיוון הזה (0 = כבר בקצה). */
export function scrollRemaining(metrics: ScrollMetrics, direction: Direction): number {
  if (direction === 'down') {
    return clamp(metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop, 0, Infinity)
  }
  if (direction === 'up') {
    return clamp(metrics.scrollTop, 0, Infinity)
  }
  if (direction === 'right') {
    return clamp(metrics.scrollWidth - metrics.clientWidth - metrics.scrollLeft, 0, Infinity)
  }
  return clamp(metrics.scrollLeft, 0, Infinity)
}

/**
 * ההיסט שייווצר בלחיצה בכיוון הזה — קצוץ לגבולות המכל, ולכן אפס כשכבר
 * הגענו לקצה. אפס = אין טעם לבזבז את הלחיצה על גלילה שלא תזוז, ואפשר
 * לתת לדפדפן לטפל במקש כרגיל.
 */
export function scrollDelta(
  metrics: ScrollMetrics,
  direction: Direction,
): { top: number; left: number } {
  const size = isVertical(direction) ? metrics.clientHeight : metrics.clientWidth
  const remaining = scrollRemaining(metrics, direction)
  // מינוס אפס הוא עדיין אפס — מנרמלים כדי שלא "ידביק" סימן שלילי לקצה.
  const distance = Math.min(scrollStep(size), remaining)
  const offset = remaining === 0 ? 0 : distance
  const forward = direction === 'down' || direction === 'right'
  const step = forward ? offset : offset === 0 ? 0 : -offset
  return isVertical(direction) ? { top: step, left: 0 } : { top: 0, left: step }
}
