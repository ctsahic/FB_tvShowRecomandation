import type { Recommendation } from '../types'
import type { TabKey } from './components/TabBar'

/**
 * פיצול ההמלצות לטאבים של המסך הראשי.
 *
 * פונקציה טהורה כדי שאפשר יהיה לבדוק אותה בלי לרנדר את האפליקציה —
 * וגם כדי שכל הטאבים ייגזרו מאותו מקור (רשימת ההמלצות הממוינת של המנוע)
 * ולא ייווצר מצב שבו טאב אחד מקבל סדר שונה.
 *
 * „אחר” = כל מה שאינו ספורט, סדרה, סרט או סרט ילדים. בפועל זה בעיקר חדשות
 * חשובות, אבל ההגדרה נשארת פתוחה כך שקטגוריה עתידית תיכנס אליו לבד.
 */
export function buildTabLists(
  recommendations: readonly Recommendation[],
): Record<TabKey, Recommendation[]> {
  const lists: Record<TabKey, Recommendation[]> = {
    all: [...recommendations],
    sport: [],
    series: [],
    movie: [],
    kidsMovies: [],
    other: [],
  }
  for (const entry of recommendations) {
    switch (entry.category) {
      case 'sport':
        lists.sport.push(entry)
        break
      case 'series':
        lists.series.push(entry)
        break
      case 'movie':
        lists.movie.push(entry)
        break
      case 'movie-kids':
        lists.kidsMovies.push(entry)
        break
      default:
        lists.other.push(entry)
    }
  }
  return lists
}
