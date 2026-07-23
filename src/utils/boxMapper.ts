import type { BoxPokemon } from '../types'

export interface BoxRow {
  id:          string
  slug:        string
  name:        string
  national:    number | null
  is_form:     boolean
  types:       string[] | null
  moves:       string[]
  ability:     string | null
  item:        string | null
  nature:      string | null
  ev_training: BoxPokemon['evTraining'] | null
  added_at:    string
}

export function rowToBox(row: BoxRow): BoxPokemon {
  return {
    id:         row.id,
    slug:       row.slug,
    name:       row.name,
    national:   row.national,
    isForm:     row.is_form,
    types:      row.types ?? undefined,
    moves:      row.moves ?? [],
    ability:    row.ability ?? '',
    item:       row.item ?? '',
    nature:     row.nature ?? undefined,
    evTraining: row.ev_training ?? undefined,
    addedAt:    row.added_at,
  }
}

export function boxToInsertRow(p: Omit<BoxPokemon, 'id' | 'addedAt'>, userId: string) {
  return {
    user_id:     userId,
    slug:        p.slug,
    name:        p.name,
    national:    p.national,
    is_form:     p.isForm,
    types:       p.types ?? null,
    moves:       p.moves,
    ability:     p.ability,
    item:        p.item,
    nature:      p.nature ?? null,
    ev_training: p.evTraining ?? null,
  }
}

export function boxToUpdateRow(updates: Partial<BoxPokemon>) {
  const row: Record<string, unknown> = {}
  if (updates.slug       !== undefined) row.slug        = updates.slug
  if (updates.name       !== undefined) row.name        = updates.name
  if (updates.national   !== undefined) row.national     = updates.national
  if (updates.isForm     !== undefined) row.is_form      = updates.isForm
  if (updates.types      !== undefined) row.types        = updates.types
  if (updates.moves      !== undefined) row.moves        = updates.moves
  if (updates.ability    !== undefined) row.ability      = updates.ability
  if (updates.item       !== undefined) row.item         = updates.item
  if (updates.nature     !== undefined) row.nature       = updates.nature
  if (updates.evTraining !== undefined) row.ev_training  = updates.evTraining
  return row
}
