import { supabase } from '../lib/supabaseClient'
import { boxToInsertRow } from './boxMapper'
import { matchToInsertRow } from './matchMapper'
import type { BoxPokemon, Match, WidgetConfig } from '../types'

export interface BackupFile {
  exportedAt: string
  box:        BoxPokemon[]
  matches:    Match[]
  widgets:    WidgetConfig
}

export function parseBackupFile(raw: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  if (
    !data || typeof data !== 'object' ||
    !Array.isArray((data as BackupFile).box) ||
    !Array.isArray((data as BackupFile).matches)
  ) {
    throw new Error('This doesn’t look like a PKMNCHAMP Tracker backup file.')
  }
  const d = data as BackupFile
  return {
    exportedAt: d.exportedAt ?? '',
    box:        d.box,
    matches:    d.matches,
    widgets:    d.widgets ?? { visibleIds: [] },
  }
}

export interface ExistingCounts { box: number; matches: number }

export async function countExistingData(userId: string): Promise<ExistingCounts> {
  const [boxRes, matchesRes] = await Promise.all([
    supabase.from('box_pokemon').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  if (boxRes.error)     throw boxRes.error
  if (matchesRes.error) throw matchesRes.error
  return { box: boxRes.count ?? 0, matches: matchesRes.count ?? 0 }
}

export interface ImportResult { boxCount: number; matchCount: number }

// boxId on a MatchTeamSlot isn't a DB foreign key — it's only used as a React
// key / convenience lookup into the *current* box array when rendering
// history, so a stray unmatched id (e.g. that Pokémon was deleted before
// export) is harmless, not a blocker.
export async function importBackup(userId: string, backup: BackupFile): Promise<ImportResult> {
  const { error: widgetError } = await supabase.from('widget_config').upsert({
    user_id:     userId,
    visible_ids: backup.widgets.visibleIds,
    widths:      backup.widgets.widths ?? {},
  })
  if (widgetError) throw widgetError

  const idMap = new Map<string, string>()
  if (backup.box.length > 0) {
    const { data, error } = await supabase
      .from('box_pokemon')
      .insert(backup.box.map(({ id: _id, addedAt: _addedAt, ...p }) => boxToInsertRow(p, userId)))
      .select('id')
    if (error) throw error
    data!.forEach((row, i) => idMap.set(backup.box[i].id, row.id))
  }

  if (backup.matches.length > 0) {
    const rows = backup.matches.map(({ id: _id, date: _date, ...m }) =>
      matchToInsertRow(
        { ...m, myTeam: m.myTeam.map(slot => ({ ...slot, boxId: idMap.get(slot.boxId) ?? slot.boxId })) },
        userId,
      )
    )
    const { error } = await supabase.from('matches').insert(rows)
    if (error) throw error
  }

  return { boxCount: backup.box.length, matchCount: backup.matches.length }
}
