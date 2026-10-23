import { he } from '../../i18n/he'

/**
 * שורת הסינון של המסך הראשי.
 *
 *  • all       — „הכל”: כל ההמלצות, בכל הקטגוריות.
 *  • sport / series / movie — הקטגוריות הרגילות.
 *  • kidsMovies — „סרטי ילדים”: סרטים בלבד, בנפרד מסרטי המבוגרים.
 *  • other     — „אחר”: כל מה שלא נכנס לאף אחת מהקטגוריות למעלה (חדשות
 *                חשובות וכו'). השם „אחר” מבטיח שהטאב לא יתיימר להיות רק
 *                חדשות אם יתווספו בעתיד קטגוריות נוספות.
 *
 * טאב „מועדפים שלי” הוסר: המועדפים מוזנים כבר עכשיו לניקוד ולהדגשה
 * בכרטיסים, ולכן טאב נפרד רק הוסיף עוד לחיצה בשלט.
 */
export type TabKey = 'all' | 'sport' | 'series' | 'movie' | 'kidsMovies' | 'other'

export const TAB_ORDER: readonly TabKey[] = [
  'all',
  'sport',
  'series',
  'movie',
  'kidsMovies',
  'other',
]

const TAB_LABELS: Record<TabKey, string> = {
  all: he.tabs.all,
  sport: he.tabs.sport,
  series: he.tabs.series,
  movie: he.tabs.movie,
  kidsMovies: he.tabs.kidsMovies,
  other: he.tabs.other,
}

export interface TabBarProps {
  active: TabKey
  counts: Record<TabKey, number>
  onChange: (tab: TabKey) => void
}

export function TabBar({ active, counts, onChange }: TabBarProps) {
  return (
    <nav className="tabs" aria-label="קטגוריות">
      {TAB_ORDER.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`btn tab ${tab === active ? 'btn--primary tab--active' : ''}`}
          aria-current={tab === active ? 'page' : undefined}
          // בטלוויזיה השלט מתחיל מהטאב הפעיל — כדי שאיפה שנמצאים יהיה תמיד מסומן.
          data-tv-initial-focus={tab === active ? '' : undefined}
          onClick={() => onChange(tab)}
        >
          {TAB_LABELS[tab]}
          <span className="tab__count">{counts[tab] ?? 0}</span>
        </button>
      ))}
    </nav>
  )
}
