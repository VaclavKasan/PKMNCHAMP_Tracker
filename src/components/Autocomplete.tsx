import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { PokemonEntry, MoveEntry } from '../types'
import { typeClass, categoryClass } from '../utils/moveColors'

// ── Pokemon mode ──────────────────────────────────────────────────────────────

interface PokemonAutocompleteProps {
  mode: 'pokemon'
  value: string
  onChange: (raw: string) => void
  onSelect: (entry: PokemonEntry) => void
  suggestions: PokemonEntry[]
  placeholder?: string
}

// ── Move mode ─────────────────────────────────────────────────────────────────

interface MoveAutocompleteProps {
  mode: 'move'
  value: string
  onChange: (raw: string) => void
  onSelect: (entry: MoveEntry) => void
  suggestions: MoveEntry[]
  placeholder?: string
}

// ── Ability mode ──────────────────────────────────────────────────────────────

interface AbilityEntry {
  slug: string
  name: string
  description: string | null
}

interface AbilityAutocompleteProps {
  mode: 'ability'
  value: string
  onChange: (raw: string) => void
  onSelect: (entry: AbilityEntry) => void
  suggestions: AbilityEntry[]
  placeholder?: string
}

// ── Item mode ─────────────────────────────────────────────────────────────────

interface ItemEntry {
  slug: string
  name: string
}

interface ItemAutocompleteProps {
  mode: 'item'
  value: string
  onChange: (raw: string) => void
  onSelect: (entry: ItemEntry) => void
  suggestions: ItemEntry[]
  placeholder?: string
}

type Props = PokemonAutocompleteProps | MoveAutocompleteProps | AbilityAutocompleteProps | ItemAutocompleteProps

export function Autocomplete(props: Props) {
  const { value, onChange, suggestions, placeholder } = props
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => setCursor(0), [suggestions])

  function handleKey(e: KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); selectItem(suggestions[cursor]) }
    if (e.key === 'Escape')    { setOpen(false) }
  }

  function selectItem(item: PokemonEntry | MoveEntry | AbilityEntry | ItemEntry) {
    if (props.mode === 'pokemon')      (props.onSelect as (e: PokemonEntry) => void)(item as PokemonEntry)
    else if (props.mode === 'move')    (props.onSelect as (e: MoveEntry) => void)(item as MoveEntry)
    else if (props.mode === 'ability') (props.onSelect as (e: AbilityEntry) => void)(item as AbilityEntry)
    else                               (props.onSelect as (e: ItemEntry) => void)(item as ItemEntry)
    setOpen(false)
  }

  const showDropdown = open && suggestions.length > 0

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => value && setOpen(true)}
        onKeyDown={handleKey}
      />

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((item, i) => (
            <li
              key={item.slug}
              onMouseDown={() => selectItem(item)}
              onMouseEnter={() => setCursor(i)}
              className={`px-3 py-2 cursor-pointer text-sm ${i === cursor ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              {props.mode === 'pokemon'
                ? <PokemonRow entry={item as PokemonEntry} />
                : props.mode === 'move'
                  ? <MoveRow entry={item as MoveEntry} />
                  : <span className="font-medium text-gray-900">{(item as AbilityEntry | ItemEntry).name}</span>
              }
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PokemonRow({ entry }: { entry: PokemonEntry }) {
  return (
    <span className="font-medium text-gray-900">{entry.name}</span>
  )
}

function MoveRow({ entry }: { entry: MoveEntry }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">{entry.name}</span>
      {entry.type && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${typeClass(entry.type)}`}>
          {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
        </span>
      )}
      {entry.category && (
        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${categoryClass(entry.category)}`}>
          {entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}
        </span>
      )}
      <span className="text-xs text-gray-400 flex-shrink-0 w-6 text-right">
        {entry.power ?? '—'}
      </span>
    </div>
  )
}

