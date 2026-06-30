import type { BaseStats, StatSpread } from '../types'
import { getNature, natureModifier } from './natures'

// Level 50, max IVs (31), training points map to 8 EVs each.
// 1 training point → 8 EVs → floor(8/4) = 2 bonus points before halving → +1 to final stat per point.
// Max 32 training = +32 to HP, ≈+32 to other stats (may vary ±1 with nature rounding).

const LEVEL = 50
const IV    = 31

export function calcStat(base: number, stat: string, training: number, natureSlug?: string): number {
  const ev = training * 8
  const evBonus = Math.floor(ev / 4)
  const nature = getNature(natureSlug ?? '')

  if (stat === 'hp') {
    return Math.floor((2 * base + IV + evBonus) * LEVEL / 100) + LEVEL + 10
  }
  const raw = Math.floor((2 * base + IV + evBonus) * LEVEL / 100) + 5
  return Math.floor(raw * natureModifier(nature, stat))
}

export function calcAllStats(
  baseStats: BaseStats,
  evTraining?: Partial<StatSpread>,
  natureSlug?: string,
): StatSpread {
  const ev = evTraining ?? {}
  return {
    hp:  calcStat(baseStats.hp,  'hp',  ev.hp  ?? 0, natureSlug),
    atk: calcStat(baseStats.atk, 'atk', ev.atk ?? 0, natureSlug),
    def: calcStat(baseStats.def, 'def', ev.def ?? 0, natureSlug),
    spa: calcStat(baseStats.spa, 'spa', ev.spa ?? 0, natureSlug),
    spd: calcStat(baseStats.spd, 'spd', ev.spd ?? 0, natureSlug),
    spe: calcStat(baseStats.spe, 'spe', ev.spe ?? 0, natureSlug),
  }
}

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const
export type  StatKey   = typeof STAT_KEYS[number]

export const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SPA', spd: 'SPD', spe: 'SPE',
}

export const STAT_COLORS: Record<StatKey, string> = {
  hp:  '#4ade80',
  atk: '#f87171',
  def: '#fbbf24',
  spa: '#60a5fa',
  spd: '#a78bfa',
  spe: '#f472b6',
}

export const MAX_EV_TOTAL  = 66
export const MAX_EV_SINGLE = 32
