import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * מספר הגרסה של האפליקציה נקבע באנדרואיד (versionName/versionCode
 * ב-android/app/build.gradle), ולכן קוראים אותו משם ואופים אותו בחבילה —
 * כך שגם בדפדפן, שאין בו חבילה ילידית לקרוא ממנה, מוצג מספר הגרסה האמיתי,
 * ואין מקור אמת שני לגרסה.
 */
function androidVersion(): { version: string; build: string } {
  try {
    const gradle = readFileSync(new URL('./android/app/build.gradle', import.meta.url), 'utf8')
    const version = /versionName\s+"([^"]+)"/.exec(gradle)?.[1] ?? ''
    const build = /versionCode\s+(\d+)/.exec(gradle)?.[1] ?? ''
    return { version, build }
  } catch {
    // בלי קובץ ה-gradle (למשל בנייה של החבילה לבדה) פשוט לא מוצג מספר גרסה.
    return { version: '', build: '' }
  }
}

const appVersion = androidVersion()

// base: './' so the built bundle loads correctly from file:// or the Capacitor
// WebView origin (capacitor://localhost) inside the Android TV app.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion.version),
    __APP_BUILD__: JSON.stringify(appVersion.build),
  },
  build: {
    // טלוויזיות (Skyworth/Android TV) מגיעות לעיתים עם WebView ישן שאינו
    // מתעדכן. es2018 = Chromium 69 בערך — טווח בטוח שמייצר תחביר מובן.
    target: 'es2018',
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
    port: 5183,
  },
})
