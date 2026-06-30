import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBox } from '../hooks/useBox'
import { useMatches } from '../hooks/useMatches'
import { Autocomplete } from '../components/Autocomplete'
import { PokemonImage } from '../components/PokemonImage'
import { ArchetypeBadge } from '../components/ArchetypeBadge'
import { DatePicker } from '../components/DatePicker'
import { RegulationPicker } from '../components/RegulationPicker'
import { searchPokemon, searchMoves, megaCapableSet } from '../utils/gameData'
import { PRESET_ARCHETYPES } from '../utils/archetypes'
import { DEFAULT_REGULATION } from '../utils/regulations'
import type { PokemonEntry, MoveEntry, EnemySlot, MatchTeamSlot } from '../types'
import { IconPlus, IconX, IconCheck, IconLoader, IconSkull, IconShield, IconStar, IconStarFilled } from '@tabler/icons-react'

interface MyTeamSelection {
  boxId:    string
  slug:     string
  name:     string
  national: number | null
  isForm:   boolean
  availableMoves: string[]
  movesUsed: string[]
  survived:  boolean
  isMega:    boolean
}

interface EnemySlotForm {
  id:              string
  name:            string
  slug:            string
  national:        number | null
  isForm:          boolean
  nameQuery:       string
  nameSuggestions: PokemonEntry[]
  moveQueries:     [string, string, string, string]
  moveSuggestions: [MoveEntry[], MoveEntry[], MoveEntry[], MoveEntry[]]
  survived:        boolean
}

function newEnemySlot(): EnemySlotForm {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: '', slug: '', national: null, isForm: false,
    nameQuery: '', nameSuggestions: [],
    moveQueries: ['', '', '', ''],
    moveSuggestions: [[], [], [], []],
    survived: false,
  }
}

export function LogPage() {
  const navigate = useNavigate()
  const { box, loading: boxLoading } = useBox()
  const { matches, addMatch, saving } = useMatches()

  // ── Match meta ────────────────────────────────────────────────────────────
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0])
  const [matchTime, setMatchTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [regulation, setRegulation] = useState(DEFAULT_REGULATION)
  const [starred, setStarred] = useState(false)

  // ── My team ───────────────────────────────────────────────────────────────
  const [myTeam, setMyTeam] = useState<MyTeamSelection[]>([])

  // ── Enemy team ────────────────────────────────────────────────────────────
  const [enemySlots, setEnemySlots] = useState<EnemySlotForm[]>([newEnemySlot()])

  // ── Strategy ──────────────────────────────────────────────────────────────
  const [stratQuery, setStratQuery] = useState('')
  const [stratOpen, setStratOpen] = useState(false)

  const usedArchetypes = [...new Set(matches.map(m => m.enemyStrategy).filter(Boolean))]
  const allArchetypes  = [...new Set([...PRESET_ARCHETYPES, ...usedArchetypes])]
  const stratSuggestions = stratQuery
    ? allArchetypes.filter(a => a.toLowerCase().includes(stratQuery.toLowerCase())).slice(0, 8)
    : []

  // ── Result ────────────────────────────────────────────────────────────────
  const [result, setResult] = useState<'win' | 'loss' | null>(null)
  const [notes, setNotes] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── My team logic ─────────────────────────────────────────────────────────
  const megaUsedBy = myTeam.find(s => s.isMega)?.boxId ?? null

  function toggleMyMon(boxId: string) {
    const exists = myTeam.find(s => s.boxId === boxId)
    if (exists) {
      setMyTeam(t => t.filter(s => s.boxId !== boxId))
    } else if (myTeam.length < 4) {
      const poke = box.find(p => p.id === boxId)!
      setMyTeam(t => [...t, {
        boxId: poke.id, slug: poke.slug, name: poke.name,
        national: poke.national, isForm: poke.isForm,
        availableMoves: poke.moves,
        movesUsed: [], survived: false, isMega: false,
      }])
    }
  }

  function toggleMoveUsed(boxId: string, move: string) {
    setMyTeam(t => t.map(s => s.boxId !== boxId ? s : {
      ...s,
      movesUsed: s.movesUsed.includes(move)
        ? s.movesUsed.filter(m => m !== move)
        : [...s.movesUsed, move],
    }))
  }

  function toggleSurvived(boxId: string) {
    setMyTeam(t => t.map(s => s.boxId !== boxId ? s : { ...s, survived: !s.survived }))
  }

  function toggleMega(boxId: string) {
    setMyTeam(t => t.map(s => {
      if (s.boxId !== boxId) return s
      // If this mon is already mega, toggle off. Otherwise only allow if no other mega.
      if (s.isMega) return { ...s, isMega: false }
      if (megaUsedBy && megaUsedBy !== boxId) return s  // already taken
      return { ...s, isMega: true }
    }))
  }

  // ── Enemy team logic ──────────────────────────────────────────────────────
  function addEnemySlot() {
    if (enemySlots.length >= 4) return
    setEnemySlots(s => [...s, newEnemySlot()])
  }

  function removeEnemySlot(id: string) {
    setEnemySlots(s => s.filter(slot => slot.id !== id))
  }

  function updateEnemyName(id: string, query: string) {
    setEnemySlots(s => s.map(slot => slot.id !== id ? slot : {
      ...slot, nameQuery: query, nameSuggestions: searchPokemon(query),
      name: query, slug: '', national: null,
    }))
  }

  function selectEnemyPokemon(id: string, entry: PokemonEntry) {
    setEnemySlots(s => s.map(slot => slot.id !== id ? slot : {
      ...slot,
      nameQuery: entry.name, nameSuggestions: [],
      name: entry.name, slug: entry.slug,
      national: entry.national ?? null, isForm: entry.isForm,
    }))
  }

  function updateEnemyMove(slotId: string, moveIdx: number, query: string) {
    setEnemySlots(s => s.map(slot => {
      if (slot.id !== slotId) return slot
      const moveQueries = [...slot.moveQueries] as typeof slot.moveQueries
      const moveSuggestions = [...slot.moveSuggestions] as typeof slot.moveSuggestions
      moveQueries[moveIdx] = query
      moveSuggestions[moveIdx] = searchMoves(query)
      return { ...slot, moveQueries, moveSuggestions }
    }))
  }

  function selectEnemyMove(slotId: string, moveIdx: number, entry: MoveEntry) {
    setEnemySlots(s => s.map(slot => {
      if (slot.id !== slotId) return slot
      const moveQueries = [...slot.moveQueries] as typeof slot.moveQueries
      const moveSuggestions = [...slot.moveSuggestions] as typeof slot.moveSuggestions
      moveQueries[moveIdx] = entry.name
      moveSuggestions[moveIdx] = []
      return { ...slot, moveQueries, moveSuggestions }
    }))
  }

  function toggleEnemySurvived(id: string) {
    setEnemySlots(s => s.map(slot => slot.id !== id ? slot : { ...slot, survived: !slot.survived }))
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const canSave = myTeam.length >= 1 && result !== null && stratQuery.trim() !== ''

  async function handleSave() {
    if (!canSave) return
    setSaveError(null)
    try {
      const myTeamSlots: MatchTeamSlot[] = myTeam.map(s => ({
        boxId: s.boxId, slug: s.slug, name: s.name,
        national: s.national, isForm: s.isForm,
        movesUsed: s.movesUsed,
        survived: s.survived,
        isMega: s.isMega,
      }))
      const enemyTeam: EnemySlot[] = enemySlots
        .filter(s => s.name.trim())
        .map(s => ({
          slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-'),
          name: s.name, national: s.national, isForm: s.isForm,
          movesUsed: s.moveQueries.filter(m => m.trim()),
          survived: s.survived,
        }))
      await addMatch({
        matchDate,
        matchTime,
        regulation,
        starred,
        myTeam: myTeamSlots,
        enemyTeam,
        enemyStrategy: stratQuery.trim(),
        result: result!,
        notes,
      })
      navigate('/history')
    } catch (err) {
      setSaveError((err as Error).message)
    }
  }

  if (boxLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-6">

      {/* ── Match meta ────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <DatePicker value={matchDate} onChange={setMatchDate} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
            <input
              type="time"
              value={matchTime}
              onChange={e => setMatchTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Regulation</label>
          <RegulationPicker value={regulation} onChange={setRegulation} />
        </div>
      </section>

      {/* ── Section 1: My team ────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">My Team</h2>
        <p className="text-xs text-gray-400 mb-3">Select up to 4 Pokémon you used</p>

        {box.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            Your box is empty.{' '}
            <a href="#/box" className="underline font-medium">Add Pokémon to your box</a> first.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {box.map(poke => {
              const sel = myTeam.find(s => s.boxId === poke.id)
              const isSelected = !!sel
              const isDisabled = !isSelected && myTeam.length >= 4
              const hasMega = megaCapableSet.has(poke.slug)
              const isMegaActive = sel?.isMega ?? false
              const megaBlocked = !!megaUsedBy && megaUsedBy !== poke.id

              return (
                <div key={poke.id} className="space-y-1">
                  <button
                    onClick={() => toggleMyMon(poke.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : isDisabled
                          ? 'border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed'
                          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <IconCheck size={12} className="text-white" />
                      </div>
                    )}
                    <PokemonImage national={poke.national} slug={poke.slug} isForm={poke.isForm} name={poke.name} size="sm" />
                    <span className="text-sm font-medium text-gray-800 truncate flex-1">{poke.name}</span>
                  </button>

                  {/* Per-pokemon controls when selected */}
                  {isSelected && sel && (
                    <div className="ml-1 space-y-1.5">
                      {/* Mega button */}
                      {hasMega && (
                        <button
                          onClick={() => toggleMega(poke.id)}
                          disabled={megaBlocked}
                          className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                            isMegaActive
                              ? 'bg-yellow-400 text-yellow-900 shadow'
                              : megaBlocked
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                        >
                          ⚡ Mega{isMegaActive ? ' ✓' : ''}
                        </button>
                      )}

                      {/* Survived / Died toggle */}
                      <button
                        onClick={() => toggleSurvived(poke.id)}
                        className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium transition-all ${
                          sel.survived
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}
                      >
                        {sel.survived
                          ? <><IconShield size={12} /> Survived</>
                          : <><IconSkull size={12} /> Died</>
                        }
                      </button>

                      {/* Move checklist */}
                      {sel.availableMoves.length > 0 && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-gray-400">Moves used:</p>
                          {sel.availableMoves.map(move => (
                            <label key={move} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sel.movesUsed.includes(move)}
                                onChange={() => toggleMoveUsed(poke.id, move)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-700">{move}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: Enemy team ─────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Enemy Team</h2>
        <p className="text-xs text-gray-400 mb-3">Up to 4 enemy Pokémon</p>

        <div className="space-y-4">
          {enemySlots.map((slot, idx) => (
            <div key={slot.id} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Enemy {idx + 1}</span>
                {enemySlots.length > 1 && (
                  <button onClick={() => removeEnemySlot(slot.id)} className="text-gray-400 hover:text-red-500">
                    <IconX size={16} />
                  </button>
                )}
              </div>

              <div className="mb-2">
                <Autocomplete
                  mode="pokemon"
                  value={slot.nameQuery}
                  onChange={q => updateEnemyName(slot.id, q)}
                  onSelect={entry => selectEnemyPokemon(slot.id, entry)}
                  suggestions={slot.nameSuggestions}
                  placeholder="Search Pokémon…"
                />
              </div>

              {slot.slug && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
                  <PokemonImage national={slot.national} slug={slot.slug} isForm={slot.isForm} name={slot.name} size="sm" />
                  <span className="text-sm text-gray-700 flex-1">{slot.name}</span>
                  {/* Enemy survived/died toggle */}
                  <button
                    onClick={() => toggleEnemySurvived(slot.id)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-all ${
                      slot.survived
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-red-100 text-red-700 border border-red-300'
                    }`}
                  >
                    {slot.survived ? <><IconShield size={11} /> Survived</> : <><IconSkull size={11} /> Died</>}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1">
                {[0, 1, 2, 3].map(i => (
                  <Autocomplete
                    key={i}
                    mode="move"
                    value={slot.moveQueries[i]}
                    onChange={q => updateEnemyMove(slot.id, i, q)}
                    onSelect={entry => selectEnemyMove(slot.id, i, entry)}
                    suggestions={slot.moveSuggestions[i]}
                    placeholder={`Move ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ))}

          {enemySlots.length < 4 && (
            <button
              onClick={addEnemySlot}
              className="w-full flex items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600"
            >
              <IconPlus size={16} />
              Add enemy Pokémon
            </button>
          )}
        </div>

        {/* Strategy */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Enemy strategy</label>
          <div className="relative">
            <input
              type="text"
              value={stratQuery}
              onChange={e => { setStratQuery(e.target.value); setStratOpen(true) }}
              onFocus={() => setStratOpen(true)}
              onBlur={() => setTimeout(() => setStratOpen(false), 150)}
              placeholder="e.g. Rain (Pelipper), Trick Room…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {stratOpen && stratSuggestions.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {stratSuggestions.map(s => (
                  <li
                    key={s}
                    onMouseDown={() => { setStratQuery(s); setStratOpen(false) }}
                    className="px-3 py-2 cursor-pointer text-sm hover:bg-blue-50"
                  >
                    <ArchetypeBadge arch={s} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {stratQuery && <div className="mt-2"><ArchetypeBadge arch={stratQuery} /></div>}
        </div>
      </section>

      {/* ── Section 3: Result & save ───────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Result</h2>

        <div className="flex gap-3 mb-4">
          {(['win', 'loss'] as const).map(r => (
            <button
              key={r}
              onClick={() => setResult(r)}
              className={`flex-1 py-4 rounded-xl text-lg font-semibold border-2 transition-all ${
                result === r
                  ? r === 'win'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              {r === 'win' ? 'Win' : 'Loss'}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="What went well? What could improve?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm text-red-700">{saveError}</div>
        )}

        {/* Star toggle */}
        <button
          type="button"
          onClick={() => setStarred(s => !s)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all mb-3 ${
            starred
              ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
              : 'border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600'
          }`}
        >
          {starred ? <IconStarFilled size={16} /> : <IconStar size={16} />}
          {starred ? 'Starred' : 'Star this match'}
        </button>

        {!canSave && (
          <p className="text-xs text-gray-400 mb-2">
            Select ≥1 Pokémon, set result, and enter enemy strategy to save.
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <IconLoader size={18} className="animate-spin" /> : <IconCheck size={18} />}
          {saving ? 'Saving…' : 'Save match'}
        </button>
      </section>
    </div>
  )
}
