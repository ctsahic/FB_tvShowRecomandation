import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * הגרסה של האפליקציה המותקנת.
 *
 * למה זה קיים: בלי מספר גרסה על המסך אי אפשר לדעת מה מותקן בפועל בטלוויזיה —
 * ובמיוחד אי אפשר להבדיל בין עדכון שהותקן לבין גרסה ישנה שנשארה. המספר הזה
 * הוא הדרך היחידה לוודא שהעדכון נכנס.
 */
export interface AppVersion {
  /** versionName של החבילה, למשל "1.1". */
  version: string
  /** versionCode של החבילה, למשל "2". */
  build?: string
}

/*
 * הגרסה שנאפית לתוך החבילה בזמן הבנייה (ר' define ב-vite.config.ts) —
 * נקראת מ-android/app/build.gradle. היא משמשת כשאין חבילה ילידית לקרוא ממנה
 * (הרצה בדפדפן), כדי שלא יהיה מקור אמת שני לגרסה.
 */
const BUILD_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : ''
const BUILD_NUMBER = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : ''

/** הגרסה שנאפתה בחבילה, אם בכלל. */
export const BUNDLED_VERSION: AppVersion | undefined = BUILD_VERSION
  ? { version: BUILD_VERSION, ...(BUILD_NUMBER ? { build: BUILD_NUMBER } : {}) }
  : undefined

/** "1.1 (2)" — מספר הבנייה מוצג בסוגריים, ואם אין אותו נשאר רק שם הגרסה. */
export function formatAppVersion(info: AppVersion | undefined): string | undefined {
  if (!info?.version) return undefined
  return info.build ? `${info.version} (${info.build})` : info.version
}

/**
 * מה שמותקן בפועל: קוראים את הגרסה מה-shell הילידי (Capacitor) ולא מהקוד,
 * כדי שמה שמוצג על המסך יהיה בדיוק החבילה שרצה שם — גם אם מישהו שינה את
 * מספר הגרסה ובנה רק חצי מהדרך.
 */
export async function readAppVersion(): Promise<AppVersion | undefined> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapacitorApp.getInfo()
      if (info?.version) {
        return { version: info.version, ...(info.build ? { build: info.build } : {}) }
      }
    } catch {
      // אין מידע ילידי (למשל בדפדפן) — נופלים לגרסה שנאפתה בחבילה.
    }
  }
  return BUNDLED_VERSION
}
