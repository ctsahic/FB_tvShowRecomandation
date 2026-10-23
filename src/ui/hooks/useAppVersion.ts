import { useEffect, useState } from 'react'
import { BUNDLED_VERSION, formatAppVersion, readAppVersion } from '../version'

/**
 * מספר הגרסה להצגה, או undefined כשאין מה להציג.
 *
 * מתחילים מהגרסה שנאפתה בחבילה (זמינה מיד, בלי הבזק ריק) ומעדכנים למה
 * שמותקן בפועל ברגע שזיהוי החבילה הילידית מסתיים.
 */
export function useAppVersion(): string | undefined {
  const [label, setLabel] = useState<string | undefined>(() => formatAppVersion(BUNDLED_VERSION))

  useEffect(() => {
    let cancelled = false
    void readAppVersion().then((info) => {
      if (!cancelled) setLabel(formatAppVersion(info))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return label
}
