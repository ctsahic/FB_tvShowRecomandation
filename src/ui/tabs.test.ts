import { describe, expect, it } from 'vitest'
import type { Category, Recommendation } from '../types'
import { buildTabLists } from './tabs'
import { TAB_ORDER } from './components/TabBar'

function recommendation(id: string, category: Category): Recommendation {
  return {
    id,
    category,
    programme: {
      channelId: 'c1',
      channelName: 'ערוץ',
      title: id,
      start: 0,
      stop: 60_000,
      categories: [],
    },
    channel: { id: 'c1', name: 'ערוץ' },
    score: 70,
    reasons: [],
    headline: id,
    verdict: id,
    status: 'upcoming',
    startsInMinutes: 5,
    favorite: false,
    favoriteTeam: false,
  }
}

describe('טאבים במסך הראשי', () => {
  it('הסדר: הכל, ספורט, סדרות, סרטים, סרטי ילדים, אחר', () => {
    expect(TAB_ORDER).toEqual(['all', 'sport', 'series', 'movie', 'kidsMovies', 'other'])
  })

  it('סרט ילדים נכנס לטאב „סרטי ילדים” ולא ל„סרטים”', () => {
    const lists = buildTabLists([
      recommendation('film', 'movie'),
      recommendation('kids-film', 'movie-kids'),
    ])
    expect(lists.movie.map((entry) => entry.id)).toEqual(['film'])
    expect(lists.kidsMovies.map((entry) => entry.id)).toEqual(['kids-film'])
  })

  it('„אחר” אוסף כל מה שאינו ספורט/סדרה/סרט/סרט ילדים', () => {
    const lists = buildTabLists([
      recommendation('news', 'news'),
      recommendation('kids-show', 'kids'),
      recommendation('misc', 'other'),
      recommendation('match', 'sport'),
    ])
    expect(lists.other.map((entry) => entry.id)).toEqual(['news', 'kids-show', 'misc'])
    expect(lists.sport.map((entry) => entry.id)).toEqual(['match'])
    expect(lists.all).toHaveLength(4)
  })
})
