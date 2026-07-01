import { useMemo, useState, type ReactNode } from 'react'
import { useMatches } from '../hooks/useMatches'
import { useWidgetConfig, WIDGET_REGISTRY } from '../hooks/useWidgetConfig'
import { PokemonImage } from '../components/PokemonImage'
import { ArchetypeBadge } from '../components/ArchetypeBadge'
import { WinRateBar } from '../components/WinRateBar'
import { REGULATIONS, RANKS, rankBallUrl } from '../utils/regulations'
import type { Match, WidgetId } from '../types'
import {
  IconShield, IconSkull, IconTrophy, IconSword,
  IconPencil, IconCheck, IconPlus, IconX,
  IconChevronUp, IconChevronDown,
} from '@tabler/icons-react'

// ── Stats computation ─────────────────────────────────────────────────────────

function computeStats(matches: Match[]) {
  if (matches.length === 0) return null

  const total   = matches.length
  const wins    = matches.filter(m => m.result === 'win').length
  const losses  = total - wins
  const winRate = Math.round((wins / total) * 100)

  // vs strategies
  const stratMap = new Map<string, { wins: number; losses: number }>()
  for (const m of matches) {
    const s = m.enemyStrategy || 'Unknown'
    const cur = stratMap.get(s) ?? { wins: 0, losses: 0 }
    if (m.result === 'win') cur.wins++; else cur.losses++
    stratMap.set(s, cur)
  }
  const strategies = [...stratMap.entries()]
    .map(([strat, r]) => ({
      strat, wins: r.wins, losses: r.losses,
      total: r.wins + r.losses,
      rate: Math.round((r.wins / (r.wins + r.losses)) * 100),
    }))
    .sort((a, b) => b.total - a.total)

  const stratMostWon  = [...strategies].sort((a, b) => b.rate - a.rate)
  const stratMostLost = [...strategies].sort((a, b) => a.rate - b.rate)

  // My pokemon
  const myPokeMap = new Map<string, {
    slug: string; name: string; national: number | null; isForm: boolean
    wins: number; losses: number; survived: number; total: number
  }>()
  for (const m of matches) {
    for (const slot of m.myTeam) {
      const cur = myPokeMap.get(slot.slug) ?? {
        slug: slot.slug, name: slot.name, national: slot.national, isForm: slot.isForm,
        wins: 0, losses: 0, survived: 0, total: 0,
      }
      if (m.result === 'win') cur.wins++; else cur.losses++
      if (slot.survived) cur.survived++
      cur.total++
      myPokeMap.set(slot.slug, cur)
    }
  }
  const myPokemon = [...myPokeMap.values()]
    .map(p => ({ ...p, rate: Math.round((p.wins / p.total) * 100) }))
    .sort((a, b) => b.total - a.total)
  const mySurvivedMost = [...myPokemon].sort((a, b) => b.survived - a.survived)

  // Enemy pokemon
  const enemyMap = new Map<string, {
    slug: string; name: string; national: number | null; isForm: boolean
    count: number; survived: number
  }>()
  for (const m of matches) {
    for (const slot of m.enemyTeam) {
      if (!slot.name) continue
      const key = slot.slug || slot.name
      const cur = enemyMap.get(key) ?? {
        slug: slot.slug, name: slot.name, national: slot.national, isForm: slot.isForm,
        count: 0, survived: 0,
      }
      cur.count++
      if (slot.survived) cur.survived++
      enemyMap.set(key, cur)
    }
  }
  const enemyPokemon = [...enemyMap.values()].sort((a, b) => b.count - a.count).slice(0, 20)
  const enemySurvivedMost = [...enemyMap.values()].sort((a, b) => b.survived - a.survived).slice(0, 10)

  // Kill leaders — my team
  const myKillMap = new Map<string, { slug: string; name: string; national: number | null; isForm: boolean; kills: number }>()
  for (const m of matches) {
    for (const slot of m.myTeam) {
      if (!slot.kills) continue
      const cur = myKillMap.get(slot.slug) ?? { slug: slot.slug, name: slot.name, national: slot.national, isForm: slot.isForm, kills: 0 }
      cur.kills += slot.kills
      myKillMap.set(slot.slug, cur)
    }
  }
  const myKillLeaders = [...myKillMap.values()].filter(p => p.kills > 0).sort((a, b) => b.kills - a.kills)

  // Kill leaders — enemy
  const enemyKillMap = new Map<string, { slug: string; name: string; national: number | null; isForm: boolean; kills: number }>()
  for (const m of matches) {
    for (const slot of m.enemyTeam) {
      if (!slot.kills) continue
      const key = slot.slug || slot.name
      const cur = enemyKillMap.get(key) ?? { slug: slot.slug, name: slot.name, national: slot.national, isForm: slot.isForm, kills: 0 }
      cur.kills += slot.kills
      enemyKillMap.set(key, cur)
    }
  }
  const enemyKillLeaders = [...enemyKillMap.values()].filter(p => p.kills > 0).sort((a, b) => b.kills - a.kills)

  // Streak (matches from useMatches are newest-first; reverse for chrono)
  const chrono = [...matches].reverse()
  let bestWin = 0, winRun = 0
  for (const m of chrono) {
    if (m.result === 'win') { winRun++; if (winRun > bestWin) bestWin = winRun }
    else winRun = 0
  }
  let current = 0
  const currentType: 'win' | 'loss' | null = chrono.length > 0 ? chrono[chrono.length - 1].result : null
  if (currentType) {
    for (let i = chrono.length - 1; i >= 0; i--) {
      if (chrono[i].result === currentType) current++
      else break
    }
  }
  const streak = { current, currentType, best: bestWin }

  // Stats by rank
  const rankRecordMap = new Map<string, { wins: number; losses: number }>()
  for (const m of matches) {
    if (!m.rank) continue
    const cur = rankRecordMap.get(m.rank) ?? { wins: 0, losses: 0 }
    if (m.result === 'win') cur.wins++; else cur.losses++
    rankRecordMap.set(m.rank, cur)
  }
  const byRank = RANKS
    .filter(r => rankRecordMap.has(r.id))
    .map(r => {
      const rec = rankRecordMap.get(r.id)!
      return {
        rankId: r.id, label: r.label, ballSlug: r.ballSlug,
        wins: rec.wins, losses: rec.losses,
        rate: Math.round((rec.wins / (rec.wins + rec.losses)) * 100),
      }
    })

  // Move usage (my team)
  const moveCountMap = new Map<string, number>()
  for (const m of matches) {
    for (const slot of m.myTeam) {
      for (const move of slot.movesUsed) {
        if (move.trim()) moveCountMap.set(move, (moveCountMap.get(move) ?? 0) + 1)
      }
    }
  }
  const moveUsage = [...moveCountMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Enemy items
  const itemCountMap = new Map<string, number>()
  for (const m of matches) {
    for (const slot of m.enemyTeam) {
      const item = slot.item?.trim()
      if (!item || item.toLowerCase() === 'not known') continue
      itemCountMap.set(item, (itemCountMap.get(item) ?? 0) + 1)
    }
  }
  const enemyItems = [...itemCountMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    total, wins, losses, winRate,
    strategies, stratMostWon, stratMostLost,
    myPokemon, mySurvivedMost,
    enemyPokemon, enemySurvivedMost,
    myKillLeaders, enemyKillLeaders,
    streak, byRank, moveUsage, enemyItems,
  }
}

type ComputedStats = NonNullable<ReturnType<typeof computeStats>>

// ── Widget renderer ──────────────────────────────────────────────────────────

function renderWidget(id: WidgetId, s: ComputedStats): ReactNode {
  switch (id) {
    case 'overall':
      return <OverallWidget total={s.total} wins={s.wins} losses={s.losses} winRate={s.winRate} />
    case 'vs_strategies':
      if (s.strategies.length === 0) return null
      return <VsStrategiesWidget strategies={s.strategies} />
    case 'strategy_highlights':
      if (s.strategies.length < 2) return null
      return <StrategyHighlightsWidget stratMostWon={s.stratMostWon} stratMostLost={s.stratMostLost} />
    case 'my_performance':
      if (s.myPokemon.length === 0) return null
      return <MyPerformanceWidget myPokemon={s.myPokemon} />
    case 'my_survived':
      if (!s.mySurvivedMost.some(p => p.survived > 0)) return null
      return <MySurvivedWidget mySurvivedMost={s.mySurvivedMost} />
    case 'enemy_survived':
      if (!s.enemySurvivedMost.some(p => p.survived > 0)) return null
      return <EnemySurvivedWidget enemySurvivedMost={s.enemySurvivedMost} />
    case 'enemy_frequency':
      if (s.enemyPokemon.length === 0) return null
      return <EnemyFrequencyWidget enemyPokemon={s.enemyPokemon} />
    case 'kill_leaders_my':
      if (s.myKillLeaders.length === 0) return null
      return <KillLeadersWidget title="Kill Leaders — My Team" icon="sword" leaders={s.myKillLeaders} />
    case 'kill_leaders_enemy':
      if (s.enemyKillLeaders.length === 0) return null
      return <KillLeadersWidget title="Kill Leaders — Enemy" icon="skull" leaders={s.enemyKillLeaders} />
    case 'streak':
      return <StreakWidget streak={s.streak} />
    case 'stats_by_rank':
      if (s.byRank.length === 0) return null
      return <StatsByRankWidget byRank={s.byRank} />
    case 'move_usage':
      if (s.moveUsage.length === 0) return null
      return <MoveUsageWidget moveUsage={s.moveUsage} />
    case 'enemy_items':
      if (s.enemyItems.length === 0) return null
      return <EnemyItemsWidget enemyItems={s.enemyItems} />
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function StatsPage() {
  const { matches, loading: matchesLoading } = useMatches()
  const { visibleIds, loading: configLoading, saving: configSaving, addWidget, removeWidget, moveWidgetUp, moveWidgetDown } = useWidgetConfig()
  const [regulation, setRegulation] = useState<'all' | string>('all')
  const [editMode, setEditMode] = useState(false)

  const filtered = useMemo(() =>
    regulation === 'all' ? matches : matches.filter(m => (m.regulation ?? '') === regulation),
    [matches, regulation]
  )
  const stats = useMemo(() => computeStats(filtered), [filtered])

  if (matchesLoading || configLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-4">

      {/* Regulation filter + edit toggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setRegulation('all')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              regulation === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            All seasons
          </button>
          {REGULATIONS.map(r => (
            <button
              key={r.id}
              onClick={() => setRegulation(r.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                regulation === r.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditMode(e => !e)}
          disabled={configSaving}
          title={editMode ? 'Done' : 'Customize widgets'}
          className={`flex-shrink-0 p-2 rounded-lg border transition-all disabled:opacity-50 ${
            editMode
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
          }`}
        >
          {editMode ? <IconCheck size={16} /> : <IconPencil size={16} />}
        </button>
      </div>

      {!stats ? (
        <div className="text-center py-16 px-4">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-gray-500 mb-2">No match data yet</p>
          <p className="text-sm text-gray-400">
            {regulation !== 'all' ? 'No matches for this regulation.' : 'Log some matches to see your stats.'}
          </p>
        </div>
      ) : (
        <>
          {visibleIds.map((id, idx) => {
            const content = renderWidget(id, stats)
            if (!content) return null
            return (
              <div key={id} className="relative">
                {editMode && (
                  <>
                    <div className="absolute -top-2 left-2 z-10 flex flex-col gap-0.5">
                      <button
                        onClick={() => moveWidgetUp(id)}
                        disabled={configSaving || idx === 0}
                        aria-label="Move widget up"
                        className="w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                      >
                        <IconChevronUp size={11} />
                      </button>
                      <button
                        onClick={() => moveWidgetDown(id)}
                        disabled={configSaving || idx === visibleIds.length - 1}
                        aria-label="Move widget down"
                        className="w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                      >
                        <IconChevronDown size={11} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeWidget(id)}
                      disabled={configSaving}
                      aria-label="Remove widget"
                      className="absolute -top-1.5 -right-1.5 z-10 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50 shadow-sm"
                    >
                      <IconX size={11} />
                    </button>
                  </>
                )}
                {content}
              </div>
            )
          })}

          {editMode && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Widget</p>
              <div className="flex flex-wrap gap-2">
                {WIDGET_REGISTRY.filter(w => !visibleIds.includes(w.id)).map(w => (
                  <button
                    key={w.id}
                    onClick={() => addWidget(w.id)}
                    disabled={configSaving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-all"
                  >
                    <IconPlus size={12} />
                    {w.label}
                  </button>
                ))}
                {WIDGET_REGISTRY.every(w => visibleIds.includes(w.id)) && (
                  <p className="text-xs text-gray-400 italic">All widgets are visible.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Widget sub-components ─────────────────────────────────────────────────────

function OverallWidget({ total, wins, losses, winRate }: { total: number; wins: number; losses: number; winRate: number }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Overall</h2>
      <div className="flex items-end gap-4 mb-3">
        <div>
          <span className="text-4xl font-bold text-gray-900">{winRate}%</span>
          <span className="text-sm text-gray-400 ml-1">win rate</span>
        </div>
        <div className="text-sm text-gray-500 pb-1">
          <span className="text-green-600 font-medium">{wins}W</span>
          {' – '}
          <span className="text-red-600 font-medium">{losses}L</span>
          {' · '}
          {total} matches
        </div>
      </div>
      <WinRateBar rate={winRate} height={8} />
    </section>
  )
}

interface StratEntry { strat: string; wins: number; losses: number; total: number; rate: number }

function VsStrategiesWidget({ strategies }: { strategies: StratEntry[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3">vs. Strategies</h2>
      <div className="space-y-3">
        {strategies.map(s => (
          <div key={s.strat}>
            <div className="flex items-center justify-between mb-1">
              <ArchetypeBadge arch={s.strat} />
              <div className="text-xs text-gray-500">
                <span className="text-green-600 font-medium">{s.wins}W</span>
                {' – '}
                <span className="text-red-600 font-medium">{s.losses}L</span>
                <span className="text-gray-400 ml-1">({s.rate}%)</span>
              </div>
            </div>
            <WinRateBar rate={s.rate} height={5} />
          </div>
        ))}
      </div>
    </section>
  )
}

function StrategyHighlightsWidget({ stratMostWon, stratMostLost }: { stratMostWon: StratEntry[]; stratMostLost: StratEntry[] }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
        <div className="flex items-center gap-1 mb-2">
          <IconTrophy size={14} className="text-green-600" />
          <span className="text-xs font-semibold text-green-700">Best vs.</span>
        </div>
        {stratMostWon.slice(0, 3).map(s => (
          <div key={s.strat} className="flex items-center justify-between py-0.5">
            <span className="text-xs text-gray-700 truncate">{s.strat}</span>
            <span className="text-xs font-bold text-green-600 ml-1">{s.rate}%</span>
          </div>
        ))}
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
        <div className="flex items-center gap-1 mb-2">
          <IconSword size={14} className="text-red-600" />
          <span className="text-xs font-semibold text-red-700">Worst vs.</span>
        </div>
        {stratMostLost.slice(0, 3).map(s => (
          <div key={s.strat} className="flex items-center justify-between py-0.5">
            <span className="text-xs text-gray-700 truncate">{s.strat}</span>
            <span className="text-xs font-bold text-red-600 ml-1">{s.rate}%</span>
          </div>
        ))}
      </div>
    </section>
  )
}

interface MyPokeEntry {
  slug: string; name: string; national: number | null; isForm: boolean
  wins: number; losses: number; survived: number; total: number; rate: number
}

function MyPerformanceWidget({ myPokemon }: { myPokemon: MyPokeEntry[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3">My Pokémon Performance</h2>
      <div className="space-y-3">
        {myPokemon.map(p => (
          <div key={p.slug}>
            <div className="flex items-center gap-2 mb-1">
              <PokemonImage national={p.national} slug={p.slug} isForm={p.isForm} name={p.name} size="sm" />
              <span className="text-sm font-medium text-gray-800 flex-1">{p.name}</span>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-green-600">
                  <IconShield size={11} />{p.survived}
                </span>
                <span>
                  <span className="text-green-600 font-medium">{p.wins}W</span>
                  {' – '}
                  <span className="text-red-600 font-medium">{p.losses}L</span>
                  <span className="text-gray-400 ml-1">({p.rate}%)</span>
                </span>
              </div>
            </div>
            <WinRateBar rate={p.rate} height={4} />
          </div>
        ))}
      </div>
    </section>
  )
}

function MySurvivedWidget({ mySurvivedMost }: { mySurvivedMost: MyPokeEntry[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-1">
        <IconShield size={16} className="text-green-500" /> My Team — Survived Most
      </h2>
      <p className="text-xs text-gray-400 mb-3">How many battles each of your Pokémon survived</p>
      <div className="space-y-2">
        {mySurvivedMost.filter(p => p.survived > 0).map((p, i) => (
          <div key={p.slug} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4 text-right">{i + 1}.</span>
            <PokemonImage national={p.national} slug={p.slug} isForm={p.isForm} name={p.name} size="sm" />
            <span className="text-sm text-gray-800 flex-1">{p.name}</span>
            <span className="text-sm font-semibold text-green-600">{p.survived}×</span>
          </div>
        ))}
      </div>
    </section>
  )
}

interface EnemyPokeEntry {
  slug: string; name: string; national: number | null; isForm: boolean
  count: number; survived: number
}

function EnemySurvivedWidget({ enemySurvivedMost }: { enemySurvivedMost: EnemyPokeEntry[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-1">
        <IconSkull size={16} className="text-red-500" /> Enemy — Survived Most
      </h2>
      <p className="text-xs text-gray-400 mb-3">Opponents hardest to knock out</p>
      <div className="space-y-2">
        {enemySurvivedMost.filter(p => p.survived > 0).map((p, i) => (
          <div key={p.slug || p.name} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4 text-right">{i + 1}.</span>
            <PokemonImage national={p.national} slug={p.slug} isForm={p.isForm} name={p.name} size="sm" />
            <span className="text-sm text-gray-800 flex-1">{p.name}</span>
            <span className="text-sm font-semibold text-red-500">{p.survived}×</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function EnemyFrequencyWidget({ enemyPokemon }: { enemyPokemon: EnemyPokeEntry[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Enemy Pokémon Frequency</h2>
      <div className="grid grid-cols-2 gap-2">
        {enemyPokemon.map(p => (
          <div key={p.slug || p.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <PokemonImage national={p.national} slug={p.slug} isForm={p.isForm} name={p.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-xs text-gray-400">{p.count}×</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

interface KillLeaderEntry { slug: string; name: string; national: number | null; isForm: boolean; kills: number }

function KillLeadersWidget({ title, icon, leaders }: { title: string; icon: 'sword' | 'skull'; leaders: KillLeaderEntry[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
        {icon === 'sword'
          ? <IconSword size={16} className="text-orange-500" />
          : <IconSkull size={16} className="text-orange-500" />
        }
        {title}
      </h2>
      <div className="space-y-2">
        {leaders.map((p, i) => (
          <div key={p.slug} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4 text-right">{i + 1}.</span>
            <PokemonImage national={p.national} slug={p.slug} isForm={p.isForm} name={p.name} size="sm" />
            <span className="text-sm text-gray-800 flex-1">{p.name}</span>
            <span className="text-sm font-bold text-orange-600">{p.kills} KO</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function StreakWidget({ streak }: { streak: { current: number; currentType: 'win' | 'loss' | null; best: number } }) {
  const isWin  = streak.currentType === 'win'
  const isLoss = streak.currentType === 'loss'
  return (
    <section className="grid grid-cols-2 gap-3">
      <div className={`border rounded-xl p-3 ${
        isWin  ? 'bg-green-50 border-green-200' :
        isLoss ? 'bg-red-50 border-red-200'     :
                 'bg-gray-50 border-gray-200'
      }`}>
        <p className="text-xs font-semibold text-gray-500 mb-2">Current streak</p>
        <p className={`text-3xl font-bold ${
          isWin ? 'text-green-700' : isLoss ? 'text-red-600' : 'text-gray-400'
        }`}>
          {streak.current > 0 ? streak.current : '–'}
        </p>
        {streak.currentType && (
          <p className={`text-xs font-medium mt-0.5 ${isWin ? 'text-green-600' : 'text-red-500'}`}>
            {isWin ? 'wins' : 'losses'} in a row
          </p>
        )}
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
        <div className="flex items-center gap-1 mb-2">
          <IconTrophy size={14} className="text-yellow-600" />
          <p className="text-xs font-semibold text-gray-500">Best win streak</p>
        </div>
        <p className="text-3xl font-bold text-yellow-700">{streak.best > 0 ? streak.best : '–'}</p>
        {streak.best > 0 && <p className="text-xs font-medium text-yellow-600 mt-0.5">wins in a row</p>}
      </div>
    </section>
  )
}

function StatsByRankWidget({ byRank }: { byRank: { rankId: string; label: string; ballSlug: string; wins: number; losses: number; rate: number }[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Stats by Rank</h2>
      <div className="space-y-3">
        {byRank.map(r => (
          <div key={r.rankId}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <img src={rankBallUrl(r.ballSlug)} className="w-5 h-5 object-contain" alt="" />
                <span className="text-sm font-medium text-gray-700">{r.label}</span>
              </div>
              <div className="text-xs text-gray-500">
                <span className="text-green-600 font-medium">{r.wins}W</span>
                {' – '}
                <span className="text-red-600 font-medium">{r.losses}L</span>
                <span className="text-gray-400 ml-1">({r.rate}%)</span>
              </div>
            </div>
            <WinRateBar rate={r.rate} height={5} />
          </div>
        ))}
      </div>
    </section>
  )
}

function MoveUsageWidget({ moveUsage }: { moveUsage: { name: string; count: number }[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Move Usage</h2>
      <div className="space-y-1.5">
        {moveUsage.map(m => (
          <div key={m.name} className="flex items-center justify-between">
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{m.name}</span>
            <span className="text-xs text-gray-500 font-semibold">{m.count}×</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function EnemyItemsWidget({ enemyItems }: { enemyItems: { name: string; count: number }[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Enemy Items</h2>
      <div className="space-y-1.5">
        {enemyItems.map(item => (
          <div key={item.name} className="flex items-center justify-between">
            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-medium">{item.name}</span>
            <span className="text-xs text-gray-500 font-semibold">{item.count}×</span>
          </div>
        ))}
      </div>
    </section>
  )
}
