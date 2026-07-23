import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthContext'
import type { WidgetId, WidgetConfig, WidgetWidth } from '../types'

export interface WidgetMeta {
  id:             WidgetId
  label:          string
  defaultVisible: boolean
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  { id: 'overall',             label: 'Overall',                 defaultVisible: true  },
  { id: 'vs_strategies',       label: 'vs. Strategies',          defaultVisible: true  },
  { id: 'strategy_highlights', label: 'Strategy Highlights',     defaultVisible: true  },
  { id: 'my_performance',      label: 'My Pokémon Performance',  defaultVisible: true  },
  { id: 'pick_rate',           label: 'Pick Rate',               defaultVisible: true  },
  { id: 'my_survived',         label: 'My Team — Survived Most', defaultVisible: false },
  { id: 'enemy_survived',      label: 'Enemy — Survived Most',   defaultVisible: false },
  { id: 'enemy_frequency',     label: 'Enemy Frequency',         defaultVisible: true  },
  { id: 'kill_leaders_my',     label: 'Kill Leaders (My Team)',  defaultVisible: false },
  { id: 'kill_leaders_enemy',  label: 'Kill Leaders (Enemy)',    defaultVisible: false },
  { id: 'streak',              label: 'Win/Loss Streak',         defaultVisible: false },
  { id: 'stats_by_rank',       label: 'Stats by Rank',          defaultVisible: false },
  { id: 'move_usage',          label: 'Move Usage',              defaultVisible: false },
  { id: 'enemy_items',         label: 'Enemy Items',             defaultVisible: false },
]

const DEFAULT_CONFIG: WidgetConfig = {
  visibleIds: WIDGET_REGISTRY.filter(w => w.defaultVisible).map(w => w.id),
}

interface WidgetConfigRow {
  visible_ids: string[]
  widths:      Record<string, WidgetWidth>
}

export function useWidgetConfig() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [config, setConfig]   = useState<WidgetConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!userId) { setConfig(DEFAULT_CONFIG); setLoading(false); return }
    setLoading(true)
    supabase
      .from('widget_config')
      .select('visible_ids, widths')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setError(error.message); setLoading(false); return }
        const row = data as WidgetConfigRow | null
        setConfig(row ? { visibleIds: row.visible_ids as WidgetId[], widths: row.widths } : DEFAULT_CONFIG)
        setLoading(false); setError(null)
      })
    return () => { cancelled = true }
  }, [userId])

  // Normalise: strip unknown IDs, preserve stored order (enables user reordering)
  const knownIds = new Set(WIDGET_REGISTRY.map(w => w.id))
  const visibleIds: WidgetId[] = config.visibleIds.filter(id => knownIds.has(id)) as WidgetId[]
  const widths = config.widths ?? {}

  const persist = useCallback(async (next: WidgetConfig) => {
    if (!userId) throw new Error('Not authenticated')
    setSaving(true)
    const { error } = await supabase
      .from('widget_config')
      .upsert({ user_id: userId, visible_ids: next.visibleIds, widths: next.widths ?? {} })
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setConfig(next)
  }, [userId])

  const addWidget = useCallback(async (id: WidgetId) => {
    await persist({ visibleIds: [...visibleIds, id], widths })
  }, [visibleIds, widths, persist])

  const removeWidget = useCallback(async (id: WidgetId) => {
    await persist({ visibleIds: visibleIds.filter(v => v !== id), widths })
  }, [visibleIds, widths, persist])

  const moveWidgetUp = useCallback(async (id: WidgetId) => {
    const idx = visibleIds.indexOf(id)
    if (idx <= 0) return
    const next = [...visibleIds]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    await persist({ visibleIds: next, widths })
  }, [visibleIds, widths, persist])

  const moveWidgetDown = useCallback(async (id: WidgetId) => {
    const idx = visibleIds.indexOf(id)
    if (idx < 0 || idx >= visibleIds.length - 1) return
    const next = [...visibleIds]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    await persist({ visibleIds: next, widths })
  }, [visibleIds, widths, persist])

  const setWidgetWidth = useCallback(async (id: WidgetId, width: WidgetWidth) => {
    await persist({ visibleIds, widths: { ...widths, [id]: width } })
  }, [visibleIds, widths, persist])

  return { visibleIds, widths, loading, saving, error, addWidget, removeWidget, moveWidgetUp, moveWidgetDown, setWidgetWidth }
}
