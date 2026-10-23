import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'il.tv.recommender',
  appName: 'מה כדאי לראות',
  webDir: 'dist',
  android: {
    // פאנלי IPTV בישראל הם לרוב HTTP בלבד; בלי זה אנדרואיד חוסם את הבקשות.
    allowMixedContent: true,
  },
  plugins: {
    // ה-fetch עובר דרך השכבה הילידית של אנדרואיד: אין CORS מול פאנל ה-IPTV
    // ומול TMDB, והבקשות ממשיכות לעבוד גם כשהדף רץ מ-capacitor://localhost.
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
