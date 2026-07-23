import type { Match, MatchTeamSlot, EnemySlot } from '../types'

export interface MatchRow {
  id:             string
  played_at:      string
  match_date:     string | null
  match_time:     string | null
  starred:        boolean
  my_team:        MatchTeamSlot[]
  enemy_team:     EnemySlot[]
  enemy_strategy: string | null
  regulation:     string | null
  season:         string | null
  rank:           string | null
  result:         'win' | 'loss'
  notes:          string | null
}

export function rowToMatch(row: MatchRow): Match {
  return {
    id:            row.id,
    date:          row.played_at,
    matchDate:     row.match_date ?? undefined,
    matchTime:     row.match_time ?? undefined,
    starred:       row.starred,
    myTeam:        row.my_team ?? [],
    enemyTeam:     row.enemy_team ?? [],
    enemyStrategy: row.enemy_strategy ?? '',
    regulation:    row.regulation ?? undefined,
    season:        row.season ?? undefined,
    rank:          row.rank ?? undefined,
    result:        row.result,
    notes:         row.notes ?? '',
  }
}

export function matchToInsertRow(m: Omit<Match, 'id' | 'date'>, userId: string) {
  return {
    user_id:        userId,
    match_date:     m.matchDate ?? null,
    match_time:     m.matchTime ?? null,
    starred:        m.starred ?? false,
    my_team:        m.myTeam,
    enemy_team:     m.enemyTeam,
    enemy_strategy: m.enemyStrategy,
    regulation:     m.regulation ?? null,
    season:         m.season ?? null,
    rank:           m.rank ?? null,
    result:         m.result,
    notes:          m.notes,
  }
}

export function matchToUpdateRow(updates: Partial<Omit<Match, 'id' | 'date'>>) {
  const row: Record<string, unknown> = {}
  if (updates.matchDate     !== undefined) row.match_date     = updates.matchDate
  if (updates.matchTime     !== undefined) row.match_time     = updates.matchTime
  if (updates.starred       !== undefined) row.starred        = updates.starred
  if (updates.myTeam        !== undefined) row.my_team        = updates.myTeam
  if (updates.enemyTeam     !== undefined) row.enemy_team     = updates.enemyTeam
  if (updates.enemyStrategy !== undefined) row.enemy_strategy = updates.enemyStrategy
  if (updates.regulation    !== undefined) row.regulation     = updates.regulation
  if (updates.season        !== undefined) row.season         = updates.season
  if (updates.rank          !== undefined) row.rank           = updates.rank
  if (updates.result        !== undefined) row.result         = updates.result
  if (updates.notes         !== undefined) row.notes          = updates.notes
  return row
}
