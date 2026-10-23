/**
 * מקש ה-Back של השלט — החלטה אחת, במקום אחד.
 *
 * הסדר קובע, ולכן הוא ממומש כפונקציה טהורה שאפשר לבדוק:
 *  1. חלון פתוח (פרטי משחק / הגדרות) — סוגרים אותו.
 *  2. המשתמש גלל למטה — חוזרים למעלה, לשורת הסינון (הטאבים).
 *  3. כבר למעלה — ממוזערים (האפליקציה ממשיכה לרוץ ברקע).
 *
 * למה לא לצאת מהאפליקציה בשלב 3: יציאה הייתה מפסיקה סריקה ומאבדת את
 * ההמלצות. מזעור משאיר אותה באוויר מאחורי מסך הבית של הטלוויזיה.
 */

export type BackAction = 'close-details' | 'close-settings' | 'top' | 'minimize'

/** מרחק הגלילה שממנו והלאה Back חוזר למעלה — ולא ממוזער. */
export const BACK_TOP_THRESHOLD_PX = 24

export interface BackState {
  detailsOpen: boolean
  settingsOpen: boolean
  /** גובה הגלילה הנוכחי של העמוד, בפיקסלים. */
  scrollY: number
}

export function resolveBackAction(state: BackState): BackAction {
  if (state.detailsOpen) return 'close-details'
  if (state.settingsOpen) return 'close-settings'
  if (state.scrollY > BACK_TOP_THRESHOLD_PX) return 'top'
  return 'minimize'
}

/** גובה הגלילה הנוכחי, גם כשהדפדפן מדווח עליו ב-documentElement. */
export function currentScrollY(): number {
  if (typeof window === 'undefined') return 0
  return Math.max(window.scrollY || 0, document.documentElement?.scrollTop || 0)
}

/**
 * חזרה לראש העמוד ולשורת הסינון. הפוקוס עובר לטאב הפעיל (או לטאב הראשון),
 * כך שהשלט נמצא בדיוק על שורת הסינון שהמשתמש ביקש לחזור אליה.
 */
export function backToFilters(): void {
  if (typeof window === 'undefined') return
  window.scrollTo({ top: 0, behavior: 'smooth' })
  const tab =
    document.querySelector<HTMLElement>('.tabs .tab--active') ??
    document.querySelector<HTMLElement>('.tabs .tab')
  tab?.focus({ preventScroll: true })
}
