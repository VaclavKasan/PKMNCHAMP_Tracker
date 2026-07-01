import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBox } from '../hooks/useBox'
import { useMatches } from '../hooks/useMatches'
import { Autocomplete } from '../components/Autocomplete'
import { PokemonImage } from '../components/PokemonImage'
import { ArchetypeBadge } from '../components/ArchetypeBadge'
import { DatePicker } from '../components/DatePicker'
import { RegulationPicker } from '../components/RegulationPicker'
import { searchPokemon, searchMoves, megaCapableSet, formatPokemonName } from '../utils/gameData'
import { PRESET_ARCHETYPES } from '../utils/archetypes'
import { DEFAULT_REGULATION, RANKS, DEFAULT_RANK, rankBallUrl } from '../utils/regulations'
import type { PokemonEntry, MoveEntry, EnemySlot, MatchTeamSlot } from '../types'
import { IconX, IconCheck, IconLoader, IconSkull, IconShield, IconStar, IconStarFilled } from '@tabler/icons-react'

interface MyTeamSelection {
  boxId:          string
  slug:           string
  name:           string
  national:       number | null
  isForm:         boolean
  availableMoves: string[]
  movesUsed:      string[]
  survived:       boolean
  isMega:         boolean
  kills:          number
}

interface EnemySlotForm {
  id:              string
  name:            string
  slug:            string
  national:        number | null
  isForm:          boolean
  nameQuery:       string
  nameSuggestions: PokemonEntry[]
  ability:         string
  item:            string
  moveQueries:     [string, string, string, string]
  moveSuggestions: [MoveEntry[], MoveEntry[], MoveEntry[], MoveEntry[]]
  survived:        boolean
  kills:           number
}

function newEnemySlot(): EnemySlotForm {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: '', slug: '', national: null, isForm: false,
    nameQuery: '', nameSuggestions: [],
    ability: '', item: '',
    moveQueries: ['', '', '', ''],
    moveSuggestions: [[], [], [], []],
    survived: false,
    kills: 0,
  }
}

// ── Rank picker ───────────────────────────────────────────────────────────────
function RankPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = RANKS.find(r => r.id === value) ?? RANKS.find(r => r.id === DEFAULT_RANK)!

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-left hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <img src={rankBallUrl(selected.ballSlug)} className="w-5 h-5 object-contain flex-shrink-0" alt="" />
        <span className="flex-1 text-xs font-medium text-gray-700 truncate">{selected.label}</span>
        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {RANKS.map(r => (
            <li
              key={r.id}
              onMouseDown={() => { onChange(r.id); setOpen(false) }}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs hover:bg-blue-50 ${r.id === value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'}`}
            >
              <img src={rankBallUrl(r.ballSlug)} className="w-5 h-5 object-contain flex-shrink-0" alt="" />
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function nowTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// ── 24-hour time input ────────────────────────────────────────────────────────
function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(value)
  useEffect(() => setRaw(value), [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    const formatted = digits.length > 2 ? digits.slice(0, 2) + ':' + digits.slice(2) : digits
    setRaw(formatted)
    if (formatted.length === 5) {
      const [hh, mm] = formatted.split(':').map(Number)
      if (hh <= 23 && mm <= 59) onChange(formatted)
    }
  }

  function handleBlur() {
    // Snap to valid HH:MM
    const digits = raw.replace(/\D/g, '')
    if (digits.length >= 3) {
      const hh = Math.min(23, parseInt(digits.slice(0, 2), 10))
      const mm = Math.min(59, parseInt(digits.slice(2, 4), 10))
      const v = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      setRaw(v); onChange(v)
    } else if (digits.length >= 1) {
      const hh = Math.min(23, parseInt(digits, 10))
      const v = `${String(hh).padStart(2, '0')}:00`
      setRaw(v); onChange(v)
    }
  }

  return (
    <input
      type="text"
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="HH:MM"
      inputMode="numeric"
      maxLength={5}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

export function LogPage() {
  const navigate = useNavigate()
  const { matchId } = useParams<{ matchId?: string }>()
  const isEdit = !!matchId

  const { box, loading: boxLoading } = useBox()
  const { matches, loading: matchesLoading, addMatch, updateMatch, saving } = useMatches()

  // ── Match meta ────────────────────────────────────────────────────────────
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0])
  const [matchTime, setMatchTime] = useState(nowTime)
  const [regulation, setRegulation] = useState(DEFAULT_REGULATION)
  const [rank, setRank] = useState(() => localStorage.getItem('pkmnchamp_last_rank') ?? DEFAULT_RANK)

  function setRankAndPersist(r: string) {
    localStorage.setItem('pkmnchamp_last_rank', r)
    setRank(r)
  }
  const [starred, setStarred] = useState(false)

  // ── My team ───────────────────────────────────────────────────────────────
  const [myTeam, setMyTeam] = useState<MyTeamSelection[]>([])

  // ── Enemy team (fixed 4 slots) ────────────────────────────────────────────
  const [enemySlots, setEnemySlots] = useState<EnemySlotForm[]>([
    newEnemySlot(), newEnemySlot(), newEnemySlot(), newEnemySlot(),
  ])

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

  // ── Edit mode: pre-fill from existing match ───────────────────────────────
  const initDone = useRef(false)
  useEffect(() => {
    if (!isEdit || initDone.current || matchesLoading || boxLoading) return
    const m = matches.find(m => m.id === matchId)
    if (!m) return
    initDone.current = true
    setMatchDate(m.matchDate ?? m.date.split('T')[0])
    setMatchTime(m.matchTime ?? nowTime())
    setRegulation(m.regulation ?? DEFAULT_REGULATION)
    setRank(m.rank ?? DEFAULT_RANK)
    setStarred(m.starred ?? false)
    setResult(m.result)
    setNotes(m.notes)
    setStratQuery(m.enemyStrategy)
    setMyTeam(m.myTeam.map(slot => {
      const boxPoke = box.find(p => p.id === slot.boxId)
      return {
        boxId: slot.boxId, slug: slot.slug, name: slot.name,
        national: slot.national, isForm: slot.isForm,
        availableMoves: boxPoke?.moves ?? [],
        movesUsed: slot.movesUsed,
        survived: slot.survived ?? true,
        isMega: slot.isMega ?? false,
        kills: slot.kills ?? 0,
      }
    }))
    const filledSlots: EnemySlotForm[] = m.enemyTeam.map(e => ({
      ...newEnemySlot(),
      nameQuery: formatPokemonName(e.name), name: formatPokemonName(e.name), slug: e.slug,
      national: e.national, isForm: e.isForm,
      ability: e.ability ?? '',
      item: e.item ?? '',
      moveQueries: [
        e.movesUsed[0] ?? '', e.movesUsed[1] ?? '',
        e.movesUsed[2] ?? '', e.movesUsed[3] ?? '',
      ] as [string, string, string, string],
      survived: e.survived ?? false,
      kills: e.kills ?? 0,
    }))
    while (filledSlots.length < 4) filledSlots.push(newEnemySlot())
    setEnemySlots(filledSlots.slice(0, 4))
  }, [isEdit, matchId, matches, matchesLoading, box, boxLoading])

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
        movesUsed: [], survived: true, isMega: false, kills: 0,
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
      if (s.isMega) return { ...s, isMega: false }
      if (megaUsedBy && megaUsedBy !== boxId) return s
      return { ...s, isMega: true }
    }))
  }

  function setKills(boxId: string, kills: number) {
    setMyTeam(t => t.map(s => s.boxId !== boxId ? s : { ...s, kills: Math.max(0, kills) }))
  }

  // ── Enemy team logic ──────────────────────────────────────────────────────
  function clearEnemySlot(id: string) {
    setEnemySlots(s => s.map(slot => slot.id !== id ? slot : { ...newEnemySlot(), id: slot.id }))
  }

  function updateEnemyName(id: string, query: string) {
    setEnemySlots(s => s.map(slot => slot.id !== id ? slot : {
      ...slot, nameQuery: query, nameSuggestions: searchPokemon(query),
      name: query, slug: '', national: null,
    }))
  }

  function selectEnemyPokemon(id: string, entry: PokemonEntry) {
    const displayName = formatPokemonName(entry.name)
    setEnemySlots(s => s.map(slot => slot.id !== id ? slot : {
      ...slot,
      nameQuery: displayName, nameSuggestions: [],
      name: displayName, slug: entry.slug,
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

  function setEnemyKills(id: string, kills: number) {
    setEnemySlots(s => s.map(slot => slot.id !== id ? slot : { ...slot, kills: Math.max(0, kills) }))
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
        kills: s.kills,
      }))
      const enemyTeam: EnemySlot[] = enemySlots
        .filter(s => s.name.trim())
        .map(s => ({
          slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-'),
          name: s.name, national: s.national, isForm: s.isForm,
          movesUsed: s.moveQueries.filter(m => m.trim()),
          survived: s.survived,
          ability: s.ability.trim() || 'Not known',
          item: s.item.trim() || 'Not known',
          kills: s.kills,
        }))
      const payload = {
        matchDate, matchTime, regulation, rank, starred,
        myTeam: myTeamSlots, enemyTeam,
        enemyStrategy: stratQuery.trim(),
        result: result!, notes,
      }
      if (isEdit) {
        await updateMatch(matchId!, payload)
      } else {
        await addMatch(payload)
      }
      navigate('/history')
    } catch (err) {
      setSaveError((err as Error).message)
    }
  }

  if (boxLoading || (isEdit && matchesLoading)) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const teamFull = myTeam.length === 4

  return (
    <div className="p-4 space-y-6">

      {/* ── Match meta ────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        {isEdit && (
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-blue-700">Editing match</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <DatePicker value={matchDate} onChange={setMatchDate} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Time (24h)</label>
            <TimeInput value={matchTime} onChange={setMatchTime} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Regulation</label>
            <RegulationPicker value={regulation} onChange={setRegulation} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rank</label>
            <RankPicker value={rank} onChange={setRankAndPersist} />
          </div>
        </div>
      </section>

      {/* ── Section 1: My team ────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">My Team</h2>
        <p className="text-xs text-gray-400 mb-3">
          {teamFull ? 'Tap × to deselect' : `Select 4 Pokémon · ${myTeam.length}/4 chosen`}
        </p>

        {box.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            Your box is empty.{' '}
            <a href="#/box" className="underline font-medium">Add Pokémon to your box</a> first.
          </div>
        ) : teamFull ? (
          /* ── 4 selected: 2×2 tile grid ── */
          <div className="grid grid-cols-2 gap-2">
            {myTeam.map(sel => {
              const boxPoke  = box.find(p => p.id === sel.boxId)
              const hasMega  = megaCapableSet.has(sel.slug) &&
                               !!boxPoke?.item &&
                               boxPoke.item.toLowerCase().replace(/\s/g, '').includes('ite')
              const megaBlocked = !!megaUsedBy && megaUsedBy !== sel.boxId

              return (
                <div key={sel.boxId} className="bg-white border-2 border-blue-200 rounded-xl p-2.5 space-y-2">
                  {/* Header */}
                  <div className="flex items-center gap-1.5">
                    <PokemonImage national={sel.national} slug={sel.slug} isForm={sel.isForm} name={sel.name} size="sm" isMega={sel.isMega} item={boxPoke?.item} />
                    <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{sel.name}</span>
                    <button
                      onClick={() => toggleMyMon(sel.boxId)}
                      className="text-gray-300 hover:text-red-400 flex-shrink-0"
                    >
                      <IconX size={13} />
                    </button>
                  </div>

                  {/* Status row */}
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => toggleSurvived(sel.boxId)}
                      className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        sel.survived
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {sel.survived ? <><IconShield size={9} /> Alive</> : <><IconSkull size={9} /> Fainted</>}
                    </button>
                    {hasMega && (
                      <button
                        onClick={() => toggleMega(sel.boxId)}
                        disabled={megaBlocked}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          sel.isMega
                            ? 'bg-yellow-300 text-yellow-900 border-yellow-400'
                            : megaBlocked
                              ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                        }`}
                      >
                        ⚡ Mega{sel.isMega ? ' ✓' : ''}
                      </button>
                    )}
                  </div>

                  {/* Kill counter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 flex-shrink-0">Kills</span>
                    <button
                      onClick={() => setKills(sel.boxId, sel.kills - 1)}
                      disabled={sel.kills === 0}
                      className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 disabled:opacity-30 text-xs leading-none"
                    >−</button>
                    <span className={`text-xs font-bold w-4 text-center ${sel.kills > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                      {sel.kills}
                    </span>
                    <button
                      onClick={() => setKills(sel.boxId, sel.kills + 1)}
                      className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600 text-xs leading-none"
                    >+</button>
                  </div>

                  {/* Move checklist */}
                  {sel.availableMoves.length > 0 && (
                    <div className="space-y-0.5 border-t border-gray-100 pt-1.5">
                      {sel.availableMoves.map(move => (
                        <label key={move} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sel.movesUsed.includes(move)}
                            onChange={() => toggleMoveUsed(sel.boxId, move)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                          />
                          <span className="text-[10px] text-gray-700 leading-tight">{move}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Selection list ── */
          <div className="grid grid-cols-2 gap-2">
            {box.map(poke => {
              const isSelected = !!myTeam.find(s => s.boxId === poke.id)
              const isDisabled = !isSelected && myTeam.length >= 4

              return (
                <button
                  key={poke.id}
                  onClick={() => toggleMyMon(poke.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <IconCheck size={10} className="text-white" />
                    </div>
                  )}
                  <PokemonImage national={poke.national} slug={poke.slug} isForm={poke.isForm} name={poke.name} size="sm" />
                  <span className="text-xs font-medium text-gray-800 truncate flex-1">{poke.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: Enemy team ─────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Enemy Team</h2>
        <p className="text-xs text-gray-400 mb-3">Track what you saw — leave fields blank if unknown</p>

        <div className="grid grid-cols-2 gap-2">
          {enemySlots.map((slot, idx) => (
            <div key={slot.id} className="bg-white border border-gray-200 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Enemy {idx + 1}
                </span>
                {slot.name && (
                  <button onClick={() => clearEnemySlot(slot.id)} className="text-gray-300 hover:text-red-400">
                    <IconX size={12} />
                  </button>
                )}
              </div>

              <Autocomplete
                mode="pokemon"
                value={slot.nameQuery}
                onChange={q => updateEnemyName(slot.id, q)}
                onSelect={entry => selectEnemyPokemon(slot.id, entry)}
                suggestions={slot.nameSuggestions}
                placeholder="Pokémon…"
              />

              {slot.slug && (
                <>
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-1.5 py-1">
                    <PokemonImage national={slot.national} slug={slot.slug} isForm={slot.isForm} name={slot.name} size="sm" />
                    <span className="text-[10px] font-semibold text-gray-700 flex-1 truncate">{slot.name}</span>
                    <button
                      onClick={() => toggleEnemySurvived(slot.id)}
                      className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 border ${
                        slot.survived
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {slot.survived ? <><IconShield size={8} /> Alive</> : <><IconSkull size={8} /> Fainted</>}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 flex-shrink-0">Kills</span>
                    <button
                      onClick={() => setEnemyKills(slot.id, slot.kills - 1)}
                      disabled={slot.kills === 0}
                      className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 disabled:opacity-30 text-xs leading-none"
                    >−</button>
                    <span className={`text-xs font-bold w-4 text-center ${slot.kills > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                      {slot.kills}
                    </span>
                    <button
                      onClick={() => setEnemyKills(slot.id, slot.kills + 1)}
                      className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600 text-xs leading-none"
                    >+</button>
                  </div>
                </>
              )}

              <input
                type="text"
                value={slot.ability}
                onChange={e => setEnemySlots(s => s.map(sl => sl.id !== slot.id ? sl : { ...sl, ability: e.target.value }))}
                placeholder="Ability (not known)"
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-300"
              />

              <input
                type="text"
                value={slot.item}
                onChange={e => setEnemySlots(s => s.map(sl => sl.id !== slot.id ? sl : { ...sl, item: e.target.value }))}
                placeholder="Item (not known)"
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-300"
              />

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
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save match'}
        </button>

        {isEdit && (
          <button
            onClick={() => navigate('/history')}
            className="w-full mt-2 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </section>
    </div>
  )
}
