import { useCallback } from 'react'
import { useDriveFile } from '../drive/useDriveFile'
import type { WidgetId, WidgetConfig } from '../types'

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

export function useWidgetConfig() {
  const { data, loading, saving, error, save } = useDriveFile<WidgetConfig>(
    'widgets.json',
    DEFAULT_CONFIG,
  )

  // Normalise: strip unknown IDs, preserve stored order (enables user reordering)
  const raw = data ?? DEFAULT_CONFIG
  const knownIds = new Set(WIDGET_REGISTRY.map(w => w.id))
  const visibleIds: WidgetId[] = raw.visibleIds.filter(id => knownIds.has(id as WidgetId)) as WidgetId[]

  const addWidget = useCallback(async (id: WidgetId) => {
    await save({ visibleIds: [...visibleIds, id] })
  }, [visibleIds, save])

  const removeWidget = useCallback(async (id: WidgetId) => {
    await save({ visibleIds: visibleIds.filter(v => v !== id) })
  }, [visibleIds, save])

  const moveWidgetUp = useCallback(async (id: WidgetId) => {
    const idx = visibleIds.indexOf(id)
    if (idx <= 0) return
    const next = [...visibleIds]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    await save({ visibleIds: next })
  }, [visibleIds, save])

  const moveWidgetDown = useCallback(async (id: WidgetId) => {
    const idx = visibleIds.indexOf(id)
    if (idx < 0 || idx >= visibleIds.length - 1) return
    const next = [...visibleIds]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    await save({ visibleIds: next })
  }, [visibleIds, save])

  return { visibleIds, loading, saving, error, addWidget, removeWidget, moveWidgetUp, moveWidgetDown }
}
