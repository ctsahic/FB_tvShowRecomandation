import { useMemo } from 'react'
import {
  CHANNEL_CATALOG,
  CHANNEL_CATEGORIES,
  toggleCategorySelection,
  type EpgChannelDef,
} from '../../config/channels'
import { he, tpl } from '../../i18n/he'

export interface EpgChannelPickerProps {
  /** המזהים הנבחרים (slug של antifriz). */
  selected: readonly string[]
  onChange: (next: string[]) => void
}

/**
 * בחירת הערוצים שנבדקים ב-EPG — מקובצים לפי קטגוריה.
 *
 * כל שורה היא תיבת סימון, ולכן אפשר לעבור עליה עם השלט ולסמן ב-OK. בראש כל
 * קטגוריה יש תיבת סימון משל עצמה: היא בוחרת את **כל** ערוצי הקטגוריה בבת
 * אחת (או מנקה אותם), ומציגה כמה מהם נבחרו בפועל — כדי שלא צריך לגלול בין
 * עשרה ערוצי סרטים רק כדי לבחור את כולם.
 */
export function EpgChannelPicker({ selected, onChange }: EpgChannelPickerProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const grouped = useMemo(() => {
    const byCategory = new Map<string, EpgChannelDef[]>()
    for (const category of CHANNEL_CATEGORIES) byCategory.set(category.id, [])
    for (const channel of CHANNEL_CATALOG) byCategory.get(channel.category)?.push(channel)
    return CHANNEL_CATEGORIES.filter(
      (category) => (byCategory.get(category.id) ?? []).length > 0,
    ).map((category) => ({ category, channels: byCategory.get(category.id) ?? [] }))
  }, [])

  /** סדר הקטלוג נשמר תמיד — כדי שחתימת המטמון תהיה יציבה. */
  function toggle(id: string, checked: boolean) {
    const next = CHANNEL_CATALOG.filter((channel) =>
      channel.id === id ? checked : selectedSet.has(channel.id),
    ).map((channel) => channel.id)
    onChange(next)
  }

  return (
    <div className="picker">
      <div className="picker__header">
        <span className="field__hint">
          {tpl(he.settings.epgSelected, {
            count: selectedSet.size,
            total: CHANNEL_CATALOG.length,
          })}
        </span>
        <div className="picker__actions">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onChange(CHANNEL_CATALOG.map((channel) => channel.id))}
          >
            {he.settings.epgSelectAll}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onChange([])}
          >
            {he.settings.epgClear}
          </button>
        </div>
      </div>

      <div className="picker__list">
        {grouped.map(({ category, channels }) => {
          const chosen = channels.filter((channel) => selectedSet.has(channel.id)).length
          const all = chosen === channels.length
          return (
            <div className="picker__group" key={category.id}>
              {/*
               * הכותרת עצמה היא תיבת סימון: „בחר את כל סרטי הילדים” מבטל את
               * הצורך לעבור ערוץ־ערוץ. במצב חלקי התיבה מסומנת בקו (indeterminate),
               * כדי שיהיה ברור שהקטגוריה לא כולה נבחרה.
               */}
              <label className="picker__group-head">
                <input
                  type="checkbox"
                  checked={all}
                  aria-label={tpl(he.settings.epgCategoryToggle, { category: category.label })}
                  ref={(element) => {
                    if (element) element.indeterminate = chosen > 0 && !all
                  }}
                  onChange={(event) =>
                    onChange(toggleCategorySelection(selected, category.id, event.target.checked))
                  }
                />
                <span className="picker__group-title">{category.label}</span>
                <span className="picker__group-count">
                  {tpl(he.settings.epgCategorySelected, {
                    count: chosen,
                    total: channels.length,
                  })}
                </span>
              </label>
              {channels.map((channel) => (
                <label className="picker__row" key={channel.id}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(channel.id)}
                    onChange={(event) => toggle(channel.id, event.target.checked)}
                  />
                  <span className="picker__number">{channel.number}</span>
                  <span className="picker__name">{channel.name}</span>
                </label>
              ))}
            </div>
          )
        })}
      </div>

      {selectedSet.size === 0 ? (
        <p className="banner banner--warn">{he.settings.epgEmpty}</p>
      ) : null}
    </div>
  )
}
