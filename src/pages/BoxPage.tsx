import { useState } from 'react'
import { useBox } from '../hooks/useBox'
import { Autocomplete } from '../components/Autocomplete'
import { PokemonImage } from '../components/PokemonImage'
import { searchPokemon, searchMoves, searchAbilities, searchItems, allPokemon, moveTypeMap, TYPE_COLORS } from '../utils/gameData'
import { NATURES, getNature, natureModifier } from '../utils/natures'
import { calcStat, STAT_KEYS, STAT_LABELS, STAT_COLORS, MAX_EV_TOTAL, MAX_EV_SINGLE } from '../utils/statCalc'
import { itemSpriteUrl } from '../utils/sprites'
import type { PokemonEntry, MoveEntry, BoxPokemon, StatSpread } from '../types'
import { IconPlus, IconEdit, IconTrash, IconCheck, IconX, IconLoader, IconChevronUp, IconChevronDown } from '@tabler/icons-react'

// ── Type badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const bg = TYPE_COLORS[type] ?? '#888'
  return (
    <span
      className="inline-block text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
      style={{ backgroundColor: bg }}
    >
      {type.toUpperCase()}
    </span>
  )
}

// ── Move type dot ─────────────────────────────────────────────────────────────
function MoveDot({ moveName }: { moveName: string }) {
  const type = moveTypeMap.get(moveName.toLowerCase())
  const bg   = type ? (TYPE_COLORS[type] ?? '#888') : '#d1d5db'
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5"
      style={{ backgroundColor: bg }}
      title={type}
    />
  )
}

// ── Stat bar ─────────────────────────────────────────────────────────────────
const MAX_BAR_STAT = 255

interface StatBarProps {
  statKey:   typeof STAT_KEYS[number]
  base:      number
  training:  number
  natSlug?:  string
}

function StatBar({ statKey, base, training, natSlug }: StatBarProps) {
  const nature    = getNature(natSlug ?? '')
  const modifier  = natureModifier(nature, statKey)
  const final     = calcStat(base, statKey, training, natSlug)
  const barFill   = Math.min(100, (final / MAX_BAR_STAT) * 100)
  const color     = STAT_COLORS[statKey]

  const isUp   = modifier > 1
  const isDown = modifier < 1

  return (
    <div className="flex items-center gap-2 py-0.5">
      {/* Stat label with nature indicator */}
      <div className="w-14 flex items-center gap-0.5 flex-shrink-0">
        {isUp   && <span className="text-[10px] font-bold text-blue-600">↑</span>}
        {isDown && <span className="text-[10px] font-bold text-red-500">↓</span>}
        <span className={`text-xs font-semibold ${isUp ? 'text-blue-600' : isDown ? 'text-red-500' : 'text-gray-600'}`}>
          {STAT_LABELS[statKey]}
        </span>
      </div>

      {/* Bar */}
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${barFill}%`, backgroundColor: color }}
        />
      </div>

      {/* EV training indicator */}
      <div className="w-8 text-right flex-shrink-0">
        {training > 0 && (
          <span className="text-[11px] font-bold text-amber-500">+{training}</span>
        )}
      </div>

      {/* Final stat */}
      <div className="w-8 text-right flex-shrink-0">
        <span className="text-xs font-semibold text-gray-800">{final}</span>
      </div>
    </div>
  )
}

// ── EV Training editor ────────────────────────────────────────────────────────
interface EvEditorProps {
  evTraining: StatSpread
  onChange: (ev: StatSpread) => void
}

function EvEditor({ evTraining, onChange }: EvEditorProps) {
  const total     = STAT_KEYS.reduce((s, k) => s + (evTraining[k] ?? 0), 0)
  const remaining = MAX_EV_TOTAL - total

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Training Points</span>
        <span className={`text-xs font-semibold ${remaining === 0 ? 'text-red-500' : 'text-gray-500'}`}>
          {total}/{MAX_EV_TOTAL} used · {remaining} left
        </span>
      </div>

      {STAT_KEYS.map(key => {
        const val        = evTraining[key] ?? 0
        const maxForStat = Math.min(MAX_EV_SINGLE, val + remaining)
        const canDec     = val > 0
        const atMax      = val >= maxForStat

        return (
          <div key={key} className="flex items-center gap-2">
            {/* Stat label */}
            <span className="text-xs font-semibold text-gray-600 w-9 flex-shrink-0">{STAT_LABELS[key]}</span>

            {/* − button */}
            <button
              type="button"
              onClick={() => canDec && onChange({ ...evTraining, [key]: val - 1 })}
              disabled={!canDec}
              className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base flex items-center justify-center flex-shrink-0 leading-none"
            >−</button>

            {/* Value */}
            <span className="w-8 text-center text-sm font-bold text-amber-500 flex-shrink-0">
              {val > 0 ? `+${val}` : '0'}
            </span>

            {/* + button */}
            <button
              type="button"
              onClick={() => !atMax && onChange({ ...evTraining, [key]: val + 1 })}
              disabled={atMax}
              className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base flex items-center justify-center flex-shrink-0 leading-none"
            >+</button>

            {/* Slider — max dynamically capped so you can't exceed total budget */}
            <input
              type="range"
              min={0}
              max={Math.max(1, maxForStat)}
              value={val}
              onChange={e => onChange({ ...evTraining, [key]: Math.min(parseInt(e.target.value, 10), maxForStat) })}
              disabled={maxForStat === 0 && val === 0}
              className="flex-1 h-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ accentColor: '#f59e0b' }}
            />

            {/* Max button */}
            <button
              type="button"
              onClick={() => onChange({ ...evTraining, [key]: maxForStat })}
              disabled={atMax || maxForStat === 0}
              className="text-[11px] font-semibold text-amber-500 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 w-7 text-right"
            >Max</button>

            {/* X/32 label */}
            <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{val}/{MAX_EV_SINGLE}</span>
          </div>
        )
      })}
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
  const pokeData = allPokemon.find(p => p.slug === poke.slug)
  const baseStats = pokeData?.baseStats
  const types = poke.types ?? pokeData?.types

  // Find item slug from item name for sprite
  const itemSlug = poke.item
    ? poke.item.toLowerCase().replace(/[^a-z0-9]+/g, '')
    : null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header: name + type badges */}
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

      {/* Item + Ability */}
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
        {poke.ability && (
          <span className="text-sm text-gray-500">{poke.ability}</span>
        )}
        {poke.nature && (
          <span className="text-xs text-indigo-600 font-medium">{getNature(poke.nature)?.name ?? poke.nature} nature</span>
        )}
      </div>

      {/* Divider */}
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

      {/* Stats section */}
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
            {showStats && STAT_KEYS.map(key => (
              <StatBar
                key={key}
                statKey={key}
                base={baseStats[key]}
                training={poke.evTraining?.[key] ?? 0}
                natSlug={poke.nature}
              />
            ))}
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
  slug:      string
  name:      string
  national:  number | null
  isForm:    boolean
  types:     string[]
  moves:     [string, string, string, string]
  ability:   string
  item:      string
  nature:    string
  evTraining: StatSpread
}

const emptyEv = (): StatSpread => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })
const emptyForm = (): PokemonForm => ({
  slug: '', name: '', national: null, isForm: false, types: [],
  moves: ['', '', '', ''],
  ability: '', item: '',
  nature: 'hardy',
  evTraining: emptyEv(),
})

interface MoveQueryState { q: string; suggestions: MoveEntry[] }

function EditForm({
  initial,
  isEdit,
  saving,
  onSave,
  onCancel,
}: {
  initial: PokemonForm
  isEdit:  boolean
  saving:  boolean
  onSave:  (f: PokemonForm) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<PokemonForm>(initial)
  const [pokemonQuery, setPokemonQuery] = useState(initial.name)
  const [pokemonSuggestions, setPokemonSuggestions] = useState<PokemonEntry[]>([])
  const [moveQueries, setMoveQueries] = useState<MoveQueryState[]>(
    initial.moves.map(q => ({ q, suggestions: [] }))
  )
  const [abilityQuery, setAbilityQuery]   = useState(initial.ability)
  const [abilitySuggestions, setAbilitySuggestions] = useState<ReturnType<typeof searchAbilities>>([])
  const [itemQuery, setItemQuery]         = useState(initial.item)
  const [itemSuggestions, setItemSuggestions]     = useState<ReturnType<typeof searchItems>>([])

  const pokeData = form.slug ? allPokemon.find(p => p.slug === form.slug) : null
  const baseStats = pokeData?.baseStats

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

      {/* Preview */}
      {form.slug && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <PokemonImage national={form.national} slug={form.slug} isForm={form.isForm} name={form.name} size="md" />
          <div>
            <p className="font-semibold text-gray-900">{form.name}</p>
            <div className="flex gap-1 mt-0.5">
              {form.types.map(t => <TypeBadge key={t} type={t} />)}
            </div>
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

      {/* Nature */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nature</label>
        <select
          value={form.nature}
          onChange={e => setForm(f => ({ ...f, nature: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {NATURES.map(n => {
            const mod = n.plus && n.minus
              ? ` (+${n.plus.toUpperCase()} / −${n.minus.toUpperCase()})`
              : ''
            return <option key={n.slug} value={n.slug}>{n.name}{mod}</option>
          })}
        </select>
      </div>

      {/* EV Training — only when we have base stats */}
      {baseStats && (
        <div className="border border-amber-100 rounded-xl p-3 bg-amber-50/50">
          <p className="text-xs font-semibold text-amber-700 mb-3">EV Training</p>
          <EvEditor evTraining={form.evTraining} onChange={ev => setForm(f => ({ ...f, evTraining: ev }))} />

          {/* Live stat preview */}
          <div className="mt-4 border-t border-amber-100 pt-3 space-y-0.5">
            {STAT_KEYS.map(key => (
              <StatBar
                key={key}
                statKey={key}
                base={baseStats[key]}
                training={form.evTraining[key]}
                natSlug={form.nature}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
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

// ── Page ──────────────────────────────────────────────────────────────────────
export function BoxPage() {
  const { box, loading, saving, error, addPokemon, updatePokemon, deletePokemon } = useBox()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [initialForm, setInitialForm] = useState<PokemonForm>(emptyForm)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function openAddForm() {
    setEditId(null)
    setInitialForm(emptyForm())
    setShowForm(true)
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

  async function handleSave(form: PokemonForm) {
    const moves = form.moves.filter(m => m.trim())
    const data = {
      slug: form.slug, name: form.name,
      national: form.national, isForm: form.isForm,
      types: form.types,
      moves, ability: form.ability, item: form.item,
      nature: form.nature,
      evTraining: form.evTraining,
    }
    if (editId) {
      await updatePokemon(editId, data)
    } else {
      await addPokemon(data)
    }
    setShowForm(false)
    setEditId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">My Box</h2>
        <div className="flex items-center gap-2">
          {saving && <IconLoader size={16} className="animate-spin text-blue-600" />}
          {!showForm && (
            <button
              onClick={openAddForm}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <IconPlus size={16} /> Add Pokémon
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
      )}

      {/* Add/Edit form */}
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

      {/* Box grid */}
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
