import { useState, useMemo, useRef } from 'react'
import { useBox } from '../hooks/useBox'
import { Autocomplete } from '../components/Autocomplete'
import { PokemonImage } from '../components/PokemonImage'
import { TypeBadge } from '../components/TypeBadge'
import { searchPokemon, searchMoves, searchAbilities, searchItems, allPokemon, moveTypeMap, TYPE_COLORS } from '../utils/gameData'
import { NATURES, getNature } from '../utils/natures'
import { calcStat, STAT_KEYS, STAT_COLORS, MAX_EV_TOTAL, MAX_EV_SINGLE } from '../utils/statCalc'
import { itemSpriteUrl } from '../utils/sprites'
import type { PokemonEntry, MoveEntry, BoxPokemon, StatSpread } from '../types'
import type { StatKey } from '../utils/statCalc'
import { IconPlus, IconEdit, IconTrash, IconCheck, IconX, IconLoader, IconChevronUp, IconChevronDown, IconUpload } from '@tabler/icons-react'
import { parseShowdownTeam } from '../utils/showdownImport'
import type { ParsedPokemon } from '../utils/showdownImport'

// ── Constants ─────────────────────────────────────────────────────────────────
const BAR_REF = 250   // visual bar scale — most L50 stats fall well within this

const ROW_LABELS: Record<StatKey, string> = {
  hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SP. ATK', spd: 'SP. DEF', spe: 'SPD',
}

const LONG_LABELS: Record<string, string> = {
  hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed',
}

const STAT_DARK_COLORS: Record<StatKey, string> = {
  hp:  '#15803d',
  atk: '#be123c',
  def: '#b45309',
  spa: '#1d4ed8',
  spd: '#6d28d9',
  spe: '#be185d',
}

// ── Move type dot ─────────────────────────────────────────────────────────────
function MoveDot({ moveName }: { moveName: string }) {
  const type = moveTypeMap.get(moveName.toLowerCase())
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5"
      style={{ backgroundColor: type ? (TYPE_COLORS[type] ?? '#888') : '#d1d5db' }}
      title={type}
    />
  )
}

// ── Nature section ────────────────────────────────────────────────────────────
function NatureSection({ natSlug, onChange }: { natSlug: string; onChange: (s: string) => void }) {
  const nature   = getNature(natSlug)
  const plusKey  = nature?.plus
  const minusKey = nature?.minus

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Nature</p>

      <select
        value={natSlug}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {NATURES.map(n => {
          const eff = n.plus && n.minus
            ? `  +${LONG_LABELS[n.plus] ?? n.plus} / −${LONG_LABELS[n.minus] ?? n.minus}`
            : '  (neutral)'
          return <option key={n.slug} value={n.slug}>{n.name}{eff}</option>
        })}
      </select>

      {plusKey && minusKey && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-red-500 flex-shrink-0">+10%</span>
          <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 bg-white text-sm text-gray-700 font-medium">
            {LONG_LABELS[plusKey] ?? plusKey}
          </div>
          <span className="text-sm font-bold text-blue-600 flex-shrink-0">−10%</span>
          <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 bg-white text-sm text-gray-700 font-medium">
            {LONG_LABELS[minusKey] ?? minusKey}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stat + EV row (edit mode) ─────────────────────────────────────────────────
function StatEvRow({
  statKey, base, training, remaining, natSlug, onChange,
}: {
  statKey: StatKey; base: number; training: number
  remaining: number; natSlug?: string; onChange: (v: number) => void
}) {
  const withoutEV  = calcStat(base, statKey, 0, natSlug)
  const withEV     = calcStat(base, statKey, training, natSlug)
  const evBonus    = withEV - withoutEV
  const maxForStat = Math.min(MAX_EV_SINGLE, training + remaining)
  const canDec     = training > 0
  const canInc     = training < maxForStat

  const color     = STAT_COLORS[statKey]
  const darkColor = STAT_DARK_COLORS[statKey]

  const baseW = Math.min(100, (withoutEV / BAR_REF) * 100)
  const evW   = Math.min(100 - baseW, (evBonus / BAR_REF) * 100)
  const pct   = withoutEV > 0 && evBonus > 0
    ? ((evBonus / withoutEV) * 100).toFixed(1)
    : null

  return (
    <div>
      <p className="text-[11px] font-bold text-gray-600 mb-1 tracking-wide">{ROW_LABELS[statKey]}</p>

      <div className="flex items-center gap-1">
        {/* Two-tone progress bar */}
        <div className="relative flex-1 h-5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${baseW}%`, backgroundColor: color }}
          />
          {evW > 0 && (
            <div
              className="absolute inset-y-0"
              style={{ left: `${baseW}%`, width: `${evW}%`, backgroundColor: darkColor }}
            />
          )}
        </div>

        {/* × clear — hidden (but space-holding) when training = 0 */}
        <button
          type="button"
          onClick={() => onChange(0)}
          className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 text-sm font-bold transition-opacity ${
            canDec
              ? 'border-red-300 text-red-500 hover:bg-red-50'
              : 'opacity-0 pointer-events-none border-transparent'
          }`}
        >×</button>

        {/* − */}
        <button
          type="button"
          onClick={() => canDec && onChange(training - 1)}
          disabled={!canDec}
          className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-base leading-none"
        >−</button>

        {/* Spinner input */}
        <div className="flex items-stretch border border-gray-300 rounded overflow-hidden flex-shrink-0 h-7">
          <span className="flex items-center justify-center px-2 text-sm font-medium text-gray-800 min-w-[30px]">
            {training}
          </span>
          <div className="flex flex-col border-l border-gray-200">
            <button
              type="button"
              onClick={() => canInc && onChange(training + 1)}
              disabled={!canInc}
              className="flex-1 px-1 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"
            >
              <IconChevronUp size={9} />
            </button>
            <button
              type="button"
              onClick={() => canDec && onChange(training - 1)}
              disabled={!canDec}
              className="flex-1 px-1 hover:bg-gray-100 disabled:opacity-30 border-t border-gray-200 flex items-center justify-center"
            >
              <IconChevronDown size={9} />
            </button>
          </div>
        </div>

        {/* + */}
        <button
          type="button"
          onClick={() => canInc && onChange(training + 1)}
          disabled={!canInc}
          className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center flex-shrink-0 text-green-600 hover:bg-green-50 disabled:opacity-30 text-base leading-none"
        >+</button>

        {/* MAX */}
        <button
          type="button"
          onClick={() => onChange(maxForStat)}
          disabled={!canInc}
          className="w-9 text-[11px] font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-30 flex-shrink-0 text-right"
        >MAX</button>

        {/* Lvl 50 stat */}
        <div className="w-9 text-right flex-shrink-0">
          <span className="text-sm font-bold text-gray-900">{withEV}</span>
        </div>
      </div>

      {/* EV bonus hint */}
      {evBonus > 0 && pct && (
        <p className="text-[11px] mt-0.5 pl-1" style={{ color: darkColor }}>
          +{evBonus}&ensp;{pct}%
        </p>
      )}
    </div>
  )
}

// ── Stat display row (view mode) ──────────────────────────────────────────────
function StatDisplayRow({ statKey, base, training, natSlug }: {
  statKey: StatKey; base: number; training: number; natSlug?: string
}) {
  const withoutEV = calcStat(base, statKey, 0, natSlug)
  const withEV    = calcStat(base, statKey, training, natSlug)
  const evBonus   = withEV - withoutEV

  const color     = STAT_COLORS[statKey]
  const darkColor = STAT_DARK_COLORS[statKey]

  const baseW = Math.min(100, (withoutEV / BAR_REF) * 100)
  const evW   = Math.min(100 - baseW, (evBonus / BAR_REF) * 100)
  const pct   = withoutEV > 0 && evBonus > 0
    ? ((evBonus / withoutEV) * 100).toFixed(1)
    : null

  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 mb-0.5 tracking-wide">{ROW_LABELS[statKey]}</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0" style={{ width: `${baseW}%`, backgroundColor: color }} />
          {evW > 0 && (
            <div className="absolute inset-y-0" style={{ left: `${baseW}%`, width: `${evW}%`, backgroundColor: darkColor }} />
          )}
        </div>
        <span className="text-xs font-bold text-gray-900 w-8 text-right flex-shrink-0">{withEV}</span>
      </div>
      {evBonus > 0 && pct && (
        <p className="text-[10px] mt-0.5" style={{ color: darkColor }}>+{evBonus}&ensp;{pct}%</p>
      )}
    </div>
  )
}

// ── Pokemon detail card (view mode) ──────────────────────────────────────────
function PokeCard({ poke, onEdit, onDelete, isDeleteConfirm, onDeleteRequest, onDeleteCancel }: {
  poke: BoxPokemon
  onEdit: () => void
  onDelete: () => void
  isDeleteConfirm: boolean
  onDeleteRequest: () => void
  onDeleteCancel: () => void
}) {
  const [showStats, setShowStats] = useState(true)
  const pokeData  = allPokemon.find(p => p.slug === poke.slug)
  const baseStats = pokeData?.baseStats
  const types     = poke.types ?? pokeData?.types
  const itemSlug  = poke.item ? poke.item.toLowerCase().replace(/[^a-z0-9]+/g, '') : null
  const nature    = getNature(poke.nature ?? '')

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{poke.name}</h3>
          <div className="flex gap-1 flex-wrap justify-end max-w-[40%]">
            {types?.map(t => <TypeBadge key={t} type={t} />)}
          </div>
        </div>
      </div>

      {/* Sprite */}
      <div className="flex justify-center py-2">
        <PokemonImage national={poke.national} slug={poke.slug} isForm={poke.isForm} name={poke.name} size="lg" />
      </div>

      {/* Item + Ability + Nature */}
      <div className="px-4 pb-2 flex flex-col items-center gap-1">
        {poke.item ? (
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1">
            <img
              src={itemSpriteUrl(itemSlug ?? '')}
              alt={poke.item}
              className="w-5 h-5 object-contain"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
            <span className="text-xs font-medium text-gray-700 max-w-[140px] truncate">{poke.item}</span>
          </div>
        ) : null}
        {poke.ability && <span className="text-sm text-gray-500">{poke.ability}</span>}
        {nature && (
          <span className="text-xs font-medium text-indigo-600">
            {nature.name}
            {nature.plus && nature.minus
              ? ` (+${LONG_LABELS[nature.plus] ?? nature.plus} / −${LONG_LABELS[nature.minus] ?? nature.minus})`
              : ''}
          </span>
        )}
      </div>

      <div className="border-t border-gray-100 mx-4" />

      {/* Moves */}
      <div className="px-4 py-3 space-y-1.5">
        {poke.moves.filter(Boolean).map((move, i) => (
          <div key={i} className="flex items-start gap-2">
            <MoveDot moveName={move} />
            <span className="text-sm text-gray-800">{move}</span>
          </div>
        ))}
        {poke.moves.filter(Boolean).length === 0 && (
          <p className="text-xs text-gray-400">No moves added</p>
        )}
      </div>

      {/* Stats */}
      {baseStats && (
        <>
          <div className="border-t border-gray-100 mx-4" />
          <div className="px-4 py-3">
            <button
              onClick={() => setShowStats(s => !s)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 mb-2"
            >
              {showStats ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              Stats
            </button>
            {showStats && (
              <div className="space-y-2">
                {STAT_KEYS.map(key => (
                  <StatDisplayRow
                    key={key}
                    statKey={key}
                    base={baseStats[key]}
                    training={poke.evTraining?.[key] ?? 0}
                    natSlug={poke.nature}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="border-t border-gray-100 px-4 py-2 flex gap-2">
        {isDeleteConfirm ? (
          <>
            <button onClick={onDelete} className="flex-1 text-xs bg-red-500 text-white py-1.5 rounded-lg hover:bg-red-600 font-medium">
              Confirm delete
            </button>
            <button onClick={onDeleteCancel} className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <IconEdit size={13} /> Edit
            </button>
            <button
              onClick={onDeleteRequest}
              className="flex items-center justify-center gap-1 text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <IconTrash size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Add / Edit form ───────────────────────────────────────────────────────────
interface PokemonForm {
  slug:       string
  name:       string
  national:   number | null
  isForm:     boolean
  types:      string[]
  moves:      [string, string, string, string]
  ability:    string
  item:       string
  nature:     string
  evTraining: StatSpread
}

const emptyEv   = (): StatSpread => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })
const emptyForm = (): PokemonForm => ({
  slug: '', name: '', national: null, isForm: false, types: [],
  moves: ['', '', '', ''],
  ability: '', item: '',
  nature: 'hardy',
  evTraining: emptyEv(),
})

interface MoveQueryState { q: string; suggestions: MoveEntry[] }

function EditForm({
  initial, isEdit, saving, onSave, onCancel,
}: {
  initial:  PokemonForm
  isEdit:   boolean
  saving:   boolean
  onSave:   (f: PokemonForm) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<PokemonForm>(initial)
  const [pokemonQuery, setPokemonQuery] = useState(initial.name)
  const [pokemonSuggestions, setPokemonSuggestions] = useState<PokemonEntry[]>([])
  const [moveQueries, setMoveQueries] = useState<MoveQueryState[]>(
    initial.moves.map(q => ({ q, suggestions: [] }))
  )
  const [abilityQuery, setAbilityQuery] = useState(initial.ability)
  const [abilitySuggestions, setAbilitySuggestions] = useState<ReturnType<typeof searchAbilities>>([])
  const [itemQuery, setItemQuery] = useState(initial.item)
  const [itemSuggestions, setItemSuggestions] = useState<ReturnType<typeof searchItems>>([])

  const pokeData  = form.slug ? allPokemon.find(p => p.slug === form.slug) : null
  const baseStats = pokeData?.baseStats

  const evTotal     = STAT_KEYS.reduce((s, k) => s + (form.evTraining[k] ?? 0), 0)
  const evRemaining = MAX_EV_TOTAL - evTotal
  const lvl50Total  = baseStats
    ? STAT_KEYS.reduce((s, k) => s + calcStat(baseStats[k], k, form.evTraining[k] ?? 0, form.nature), 0)
    : 0

  function handlePokemonSelect(entry: PokemonEntry) {
    setPokemonQuery(entry.name)
    setPokemonSuggestions([])
    setForm(f => ({
      ...f,
      slug: entry.slug, name: entry.name,
      national: entry.national ?? null, isForm: entry.isForm,
      types: entry.types ?? [],
    }))
  }

  function handleMoveSelect(idx: number, entry: MoveEntry) {
    setMoveQueries(qs => qs.map((mq, i) => i === idx ? { q: entry.name, suggestions: [] } : mq))
    setForm(f => {
      const moves = [...f.moves] as typeof f.moves
      moves[idx] = entry.name
      return { ...f, moves }
    })
  }

  function setEv(key: StatKey, v: number) {
    setForm(f => ({ ...f, evTraining: { ...f.evTraining, [key]: v } }))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-900">{isEdit ? 'Edit Pokémon' : 'Add Pokémon'}</h3>

      {/* Pokémon search */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Pokémon</label>
        <Autocomplete
          mode="pokemon"
          value={pokemonQuery}
          onChange={q => { setPokemonQuery(q); setPokemonSuggestions(searchPokemon(q)) }}
          onSelect={handlePokemonSelect}
          suggestions={pokemonSuggestions}
          placeholder="Search Pokémon…"
        />
      </div>

      {/* Sprite preview */}
      {form.slug && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <PokemonImage national={form.national} slug={form.slug} isForm={form.isForm} name={form.name} size="md" />
          <div>
            <p className="font-semibold text-gray-900">{form.name}</p>
            <div className="flex gap-1 mt-0.5">{form.types.map(t => <TypeBadge key={t} type={t} />)}</div>
          </div>
        </div>
      )}

      {/* Moves */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Moves</label>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-1.5">
              <MoveDot moveName={moveQueries[i].q} />
              <div className="flex-1 min-w-0">
                <Autocomplete
                  mode="move"
                  value={moveQueries[i].q}
                  onChange={q => {
                    setMoveQueries(qs => qs.map((mq, j) => j === i ? { q, suggestions: searchMoves(q) } : mq))
                    setForm(f => { const moves = [...f.moves] as typeof f.moves; moves[i] = q; return { ...f, moves } })
                  }}
                  onSelect={e => handleMoveSelect(i, e)}
                  suggestions={moveQueries[i].suggestions}
                  placeholder={`Move ${i + 1}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ability */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Ability</label>
        <Autocomplete
          mode="ability"
          value={abilityQuery}
          onChange={q => { setAbilityQuery(q); setAbilitySuggestions(searchAbilities(q)); setForm(f => ({ ...f, ability: q })) }}
          onSelect={e => { setAbilityQuery(e.name); setAbilitySuggestions([]); setForm(f => ({ ...f, ability: e.name })) }}
          suggestions={abilitySuggestions}
          placeholder="Search ability…"
        />
      </div>

      {/* Item */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Held item</label>
        <Autocomplete
          mode="item"
          value={itemQuery}
          onChange={q => { setItemQuery(q); setItemSuggestions(searchItems(q)); setForm(f => ({ ...f, item: q })) }}
          onSelect={e => { setItemQuery(e.name); setItemSuggestions([]); setForm(f => ({ ...f, item: e.name })) }}
          suggestions={itemSuggestions}
          placeholder="Search item…"
        />
      </div>

      {/* Nature + Stats + EVs */}
      {baseStats && (
        <div>
          <NatureSection
            natSlug={form.nature}
            onChange={nat => setForm(f => ({ ...f, nature: nat }))}
          />

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            {STAT_KEYS.map(key => (
              <StatEvRow
                key={key}
                statKey={key}
                base={baseStats[key]}
                training={form.evTraining[key] ?? 0}
                remaining={evRemaining}
                natSlug={form.nature}
                onChange={v => setEv(key, v)}
              />
            ))}
          </div>

          {/* Footer totals */}
          <div className="flex items-start justify-between pt-4 mt-1 border-t border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-900">{evTotal}/{MAX_EV_TOTAL} used</p>
              <p className="text-xs text-gray-500">Stat Points</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{lvl50Total}</p>
              <p className="text-xs text-gray-500">Lvl 50 Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Save / Cancel */}
      <div className="flex gap-2">
        <button
          onClick={() => onSave(form)}
          disabled={!form.slug || saving}
          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <IconLoader size={16} className="animate-spin" /> : <IconCheck size={16} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50"
        >
          <IconX size={16} /> Cancel
        </button>
      </div>
    </div>
  )
}

// ── Showdown import panel ─────────────────────────────────────────────────────
function ImportPanel({ onImport, onCancel }: {
  onImport: (items: ParsedPokemon[]) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => (text.trim() ? parseShowdownTeam(text) : []), [text])
  const valid  = parsed.filter(p => p.matched)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setText(ev.target?.result as string ?? '')
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Import from Pokémon Showdown</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <IconX size={18} />
        </button>
      </div>

      {/* File loader */}
      <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50"
      >
        <IconUpload size={14} /> Load .txt file
      </button>

      {/* Paste area */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"Paste Pokémon Showdown export here…\n\nSinistcha @ Kasib Berry\nAbility: Hospitality\nBold Nature\n- Matcha Gotcha\n- Protect\n…"}
        rows={8}
        className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Preview */}
      {parsed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {parsed.length} Pokémon detected · {valid.length} ready to import
          </p>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {parsed.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                {p.matched
                  ? <PokemonImage national={p.national} slug={p.slug} isForm={p.isForm} name={p.name} size="sm" />
                  : <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${p.matched ? 'text-gray-900' : 'text-gray-400'}`}>
                    {p.name}
                  </span>
                  {p.item && (
                    <span className="text-xs text-gray-400 ml-1.5">@ {p.item}</span>
                  )}
                </div>
                {p.matched
                  ? <span className="text-xs font-semibold text-green-600 flex-shrink-0">✓</span>
                  : <span className="text-xs text-orange-400 flex-shrink-0">not found</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onImport(valid)}
          disabled={valid.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <IconCheck size={16} />
          Import {valid.length > 0 ? `${valid.length} Pokémon` : '…'}
        </button>
        <button
          onClick={onCancel}
          className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function BoxPage() {
  const { box, loading, saving, error, addPokemon, updatePokemon, deletePokemon, batchAddPokemon } = useBox()
  const [showForm, setShowForm]       = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [editId, setEditId]           = useState<string | null>(null)
  const [initialForm, setInitialForm] = useState<PokemonForm>(emptyForm)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function openAddForm() {
    setEditId(null); setInitialForm(emptyForm()); setShowForm(true)
  }

  function openEditForm(poke: BoxPokemon) {
    setEditId(poke.id)
    const pokeData = allPokemon.find(p => p.slug === poke.slug)
    setInitialForm({
      slug: poke.slug, name: poke.name,
      national: poke.national, isForm: poke.isForm,
      types: poke.types ?? pokeData?.types ?? [],
      moves: [poke.moves[0]??'', poke.moves[1]??'', poke.moves[2]??'', poke.moves[3]??''],
      ability: poke.ability, item: poke.item ?? '',
      nature: poke.nature ?? 'hardy',
      evTraining: poke.evTraining ?? emptyEv(),
    })
    setShowForm(true)
  }

  async function handleImport(items: ParsedPokemon[]) {
    await batchAddPokemon(items.map(p => ({
      slug: p.slug, name: p.name,
      national: p.national, isForm: p.isForm,
      types: p.types,
      moves: p.moves.filter(m => m.trim()),
      ability: p.ability, item: p.item,
      nature: p.natureSlug, evTraining: p.evTraining,
    })))
    setShowImport(false)
  }

  async function handleSave(form: PokemonForm) {
    const data = {
      slug: form.slug, name: form.name,
      national: form.national, isForm: form.isForm,
      types: form.types,
      moves: form.moves.filter(m => m.trim()),
      ability: form.ability, item: form.item,
      nature: form.nature, evTraining: form.evTraining,
    }
    if (editId) await updatePokemon(editId, data)
    else        await addPokemon(data)
    setShowForm(false); setEditId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">My Box</h2>
        <div className="flex items-center gap-2">
          {saving && <IconLoader size={16} className="animate-spin text-blue-600" />}
          {!showForm && !showImport && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                <IconUpload size={16} /> Import
              </button>
              <button
                onClick={openAddForm}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
              >
                <IconPlus size={16} /> Add Pokémon
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
      )}

      {showImport && (
        <div className="mb-4">
          <ImportPanel
            onImport={handleImport}
            onCancel={() => setShowImport(false)}
          />
        </div>
      )}

      {showForm && (
        <div className="mb-4">
          <EditForm
            initial={initialForm}
            isEdit={!!editId}
            saving={saving}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditId(null) }}
          />
        </div>
      )}

      {box.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎒</div>
          <p className="text-gray-500 mb-2">Your box is empty</p>
          <p className="text-sm text-gray-400 mb-6">Add the Pokémon you use in competition</p>
          <button
            onClick={openAddForm}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 mx-auto"
          >
            <IconPlus size={16} /> Add your first Pokémon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {box.map(poke => (
            <PokeCard
              key={poke.id}
              poke={poke}
              onEdit={() => openEditForm(poke)}
              onDelete={() => { deletePokemon(poke.id); setDeleteConfirmId(null) }}
              isDeleteConfirm={deleteConfirmId === poke.id}
              onDeleteRequest={() => setDeleteConfirmId(poke.id)}
              onDeleteCancel={() => setDeleteConfirmId(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
