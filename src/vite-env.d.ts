/// <reference types="vite/client" />

/**
 * הגרסה של גרסת האנדרואיד (versionName/versionCode מ-android/app/build.gradle)
 * שנאפית לתוך החבילה בזמן הבנייה. ר' define ב-vite.config.ts.
 */
declare const __APP_VERSION__: string | undefined
declare const __APP_BUILD__: string | undefined
