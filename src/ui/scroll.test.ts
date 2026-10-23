import { describe, expect, it } from 'vitest'
import {
  isVertical,
  scrollDelta,
  scrollRemaining,
  scrollStep,
  type ScrollMetrics,
} from './scroll'

/** מכל לדוגמה: חלון של 800px שגולל 1600px (כלומר יש בדיוק מסך אחד למטה). */
function box(over: Partial<ScrollMetrics> = {}): ScrollMetrics {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    clientHeight: 800,
    clientWidth: 1200,
    scrollHeight: 1600,
    scrollWidth: 1200,
    ...over,
  }
}

describe('גלילת החצים כשאין רכיב להעביר אליו פוקוס', () => {
  it('המקטע הוא 60% מהחלון, ובכל מקרה לא פחות מ-120px', () => {
    expect(scrollStep(800)).toBe(480)
    expect(scrollStep(200)).toBe(120)
    expect(scrollStep(50)).toBe(120)
    // מידה לא הגיונית (מכל שלא הוצג עדיין) לא מפילה את החישוב.
    expect(scrollStep(0)).toBe(120)
    expect(scrollStep(Number.NaN)).toBe(120)
  })

  it('למטה: מקטע שלם כל עוד נשאר מקום', () => {
    expect(scrollDelta(box(), 'down')).toEqual({ top: 480, left: 0 })
  })

  it('למטה בקצה: אפס — כדי לא לבזבז את הלחיצה על גלילה שלא תזוז', () => {
    expect(scrollRemaining(box({ scrollTop: 800 }), 'down')).toBe(0)
    expect(scrollDelta(box({ scrollTop: 800 }), 'down')).toEqual({ top: 0, left: 0 })
  })

  it('למטה לפני הקצה: נקצץ למה שנשאר ולא "גולש" מעבר לסוף', () => {
    expect(scrollDelta(box({ scrollTop: 700 }), 'down')).toEqual({ top: 100, left: 0 })
  })

  it('למעלה: מקטע בכיוון ההפוך, ונעצר בראש החלון', () => {
    expect(scrollDelta(box({ scrollTop: 700 }), 'up')).toEqual({ top: -480, left: 0 })
    expect(scrollDelta(box({ scrollTop: 100 }), 'up')).toEqual({ top: -100, left: 0 })
    expect(scrollDelta(box(), 'up')).toEqual({ top: 0, left: 0 })
  })

  it('ימינה/שמאלה: גולל בציר האופקי לפי רוחב החלון', () => {
    const wide = box({ scrollWidth: 2400 })
    expect(scrollDelta(wide, 'right')).toEqual({ top: 0, left: 720 })
    expect(scrollDelta({ ...wide, scrollLeft: 1200 }, 'right')).toEqual({ top: 0, left: 0 })
    expect(scrollDelta({ ...wide, scrollLeft: 500 }, 'left')).toEqual({ top: 0, left: -500 })
  })

  it('כשאין בכלל מה לגלול אין שום תזוזה', () => {
    const fixed = box({ scrollHeight: 800, scrollWidth: 1200 })
    expect(scrollDelta(fixed, 'down')).toEqual({ top: 0, left: 0 })
    expect(scrollDelta(fixed, 'right')).toEqual({ top: 0, left: 0 })
  })

  it('isVertical מפריד בין הציר האנכי לאופקי', () => {
    expect([isVertical('up'), isVertical('down')]).toEqual([true, true])
    expect([isVertical('left'), isVertical('right')]).toEqual([false, false])
  })
})
