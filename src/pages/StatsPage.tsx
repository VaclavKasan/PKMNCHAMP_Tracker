import { useMemo, useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import { PokemonImage } from '../components/PokemonImage'
import { ArchetypeBadge } from '../components/ArchetypeBadge'
import { WinRateBar } from '../components/WinRateBar'
import { REGULATIONS } from '../utils/regulations'
import type { Match } from '../types'
import { IconShield, IconSkull, IconTrophy, IconSword } from '@tabler/icons-react'

function computeStats(matches: Match[]) {
  if (matches.length === 0) return null

  const total  = matches.length
  const wins   = matches.filter(m => m.result === 'win').length
  const losses = total - wins
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
    .map(([strat, { wins, losses }]) => ({
      strat, wins, losses,
      total: wins + losses,
      rate: Math.round((wins / (wins + losses)) * 100),
    }))
    .sort((a, b) => b.total - a.total)

  const stratMostWon  = [...strategies].sort((a, b) => b.rate - a.rate).filter(s => s.total >= 1)
  const stratMostLost = [...strategies].sort((a, b) => a.rate - b.rate).filter(s => s.total >= 1)

  // My pokemon performance
  const myPokeMap = new Map<string, {
    slug: string; name: string; national: number | null; isForm: boolean;
    wins: number; losses: number; survived: number; total: number;
  }>()
  for (const m of matches) {
    for (const slot of m.myTeam) {
      const key = slot.slug
      const cur = myPokeMap.get(key) ?? {
        slug: slot.slug, name: slot.name, national: slot.national, isForm: slot.isForm,
        wins: 0, losses: 0, survived: 0, total: 0,
      }
      if (m.result === 'win') cur.wins++; else cur.losses++
      if (slot.survived) cur.survived++
      cur.total++
      myPokeMap.set(key, cur)
    }
  }
  const myPokemon = [...myPokeMap.values()]
    .map(p => ({ ...p, rate: Math.round((p.wins / p.total) * 100) }))
    .sort((a, b) => b.total - a.total)

  const mySurvivedMost = [...myPokemon].sort((a, b) => b.survived - a.survived)

  // Enemy pokemon frequency + survival
  const enemyMap = new Map<string, {
    slug: string; name: string; national: number | null; isForm: boolean;
    count: number; survived: number;
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

  return { total, wins, losses, winRate, strategies, stratMostWon, stratMostLost, myPokemon, mySurvivedMost, enemyPokemon, enemySurvivedMost }
}

export function StatsPage() {
  const { matches, loading } = useMatches()
  const [regulation, setRegulation] = useState<'all' | string>('all')

  const filtered = useMemo(() =>
    regulation === 'all' ? matches : matches.filter(m => (m.regulation ?? '') === regulation),
    [matches, regulation]
  )

  const stats = useMemo(() => computeStats(filtered), [filtered])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-6">
      {/* Regulation filter */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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
          {/* Overall */}
          <section className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Overall</h2>
            <div className="flex items-end gap-4 mb-3">
              <div>
                <span className="text-4xl font-bold text-gray-900">{stats.winRate}%</span>
                <span className="text-sm text-gray-400 ml-1">win rate</span>
              </div>
              <div className="text-sm text-gray-500 pb-1">
                <span className="text-green-600 font-medium">{stats.wins}W</span>
                {' – '}
                <span className="text-red-600 font-medium">{stats.losses}L</span>
                {' · '}
                {stats.total} matches
              </div>
            </div>
            <WinRateBar rate={stats.winRate} height={8} />
          </section>

          {/* vs Strategies */}
          {stats.strategies.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">vs. Strategies</h2>
              <div className="space-y-3">
                {stats.strategies.map(s => (
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
          )}

          {/* Strategy highlights */}
          {stats.strategies.length >= 2 && (
            <section className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-2">
                  <IconTrophy size={14} className="text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Best vs.</span>
                </div>
                {stats.stratMostWon.slice(0, 3).map(s => (
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
                {stats.stratMostLost.slice(0, 3).map(s => (
                  <div key={s.strat} className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-gray-700 truncate">{s.strat}</span>
                    <span className="text-xs font-bold text-red-600 ml-1">{s.rate}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* My Pokemon performance */}
          {stats.myPokemon.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">My Pokémon Performance</h2>
              <div className="space-y-3">
                {stats.myPokemon.map(p => (
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
          )}

          {/* My Pokemon: survived most */}
          {stats.mySurvivedMost.some(p => p.survived > 0) && (
            <section className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-1">
                <IconShield size={16} className="text-green-500" /> My Team — Survived Most
              </h2>
              <p className="text-xs text-gray-400 mb-3">How many battles each of your Pokémon survived</p>
              <div className="space-y-2">
                {stats.mySurvivedMost.filter(p => p.survived > 0).map((p, i) => (
                  <div key={p.slug} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4 text-right">{i + 1}.</span>
                    <PokemonImage national={p.national} slug={p.slug} isForm={p.isForm} name={p.name} size="sm" />
                    <span className="text-sm text-gray-800 flex-1">{p.name}</span>
                    <span className="text-sm font-semibold text-green-600">{p.survived}×</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Enemy Pokemon: survived most */}
          {stats.enemySurvivedMost.some(p => p.survived > 0) && (
            <section className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-1">
                <IconSkull size={16} className="text-red-500" /> Enemy — Survived Most
              </h2>
              <p className="text-xs text-gray-400 mb-3">Opponents hardest to knock out</p>
              <div className="space-y-2">
                {stats.enemySurvivedMost.filter(p => p.survived > 0).map((p, i) => (
                  <div key={p.slug || p.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4 text-right">{i + 1}.</span>
                    <PokemonImage national={p.national} slug={p.slug} isForm={p.isForm} name={p.name} size="sm" />
                    <span className="text-sm text-gray-800 flex-1">{p.name}</span>
                    <span className="text-sm font-semibold text-red-500">{p.survived}×</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Enemy frequency */}
          {stats.enemyPokemon.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Enemy Pokémon Frequency</h2>
              <div className="grid grid-cols-2 gap-2">
                {stats.enemyPokemon.map(p => (
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
          )}
        </>
      )}
    </div>
  )
}
