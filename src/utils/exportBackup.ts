import { supabase } from '../lib/supabaseClient'
import { rowToBox, type BoxRow } from './boxMapper'
import { rowToMatch, type MatchRow } from './matchMapper'
import type { WidgetId, WidgetWidth } from '../types'

// Disaster-recovery / migration escape hatch: lets you get your data out as a
// plain JSON file, independent of whichever backend is currently in use.
export async function exportBackup(userId: string): Promise<void> {
  const [boxRes, matchesRes, widgetsRes] = await Promise.all([
    supabase.from('box_pokemon').select('*').eq('user_id', userId).order('added_at', { ascending: true }),
    supabase.from('matches').select('*').eq('user_id', userId).order('played_at', { ascending: false }),
    supabase.from('widget_config').select('visible_ids, widths').eq('user_id', userId).maybeSingle(),
  ])

  if (boxRes.error)     throw boxRes.error
  if (matchesRes.error) throw matchesRes.error
  if (widgetsRes.error) throw widgetsRes.error

  const widgetsRow = widgetsRes.data as { visible_ids: WidgetId[]; widths: Partial<Record<WidgetId, WidgetWidth>> } | null

  const exportedAt = new Date().toISOString()
  const backup = {
    exportedAt,
    box:     (boxRes.data     as BoxRow[]  ).map(rowToBox),
    matches: (matchesRes.data as MatchRow[]).map(rowToMatch),
    widgets: widgetsRow
      ? { visibleIds: widgetsRow.visible_ids, widths: widgetsRow.widths }
      : { visibleIds: [] },
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `pkmnchamp-backup-${exportedAt.split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
