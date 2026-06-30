import type { PokemonEntry, MoveEntry } from '../types'
import pokemonJson   from '../data/pokemon.json'
import movesJson     from '../data/moves.json'
import abilitiesJson from '../data/abilities.json'
import itemsJson     from '../data/items.json'
import megasJson     from '../data/megas.json'

export const allPokemon   = pokemonJson   as PokemonEntry[]
export const allMoves     = movesJson     as MoveEntry[]
export const allAbilities = abilitiesJson as { slug: string; name: string; description: string | null }[]
export const allItems     = itemsJson     as { slug: string; name: string }[]
export const megaCapableSet = new Set<string>(megasJson as string[])

// Fast move-name → type lookup
export const moveTypeMap = new Map<string, string>(
  allMoves.filter(m => m.type).map(m => [m.name.toLowerCase(), m.type as string])
)

export function searchPokemon(q: string, limit = 8): PokemonEntry[] {
  if (!q) return []
  const lower = q.toLowerCase()
  return allPokemon
    .filter(p => p.name.toLowerCase().includes(lower) || p.slug.includes(lower))
    .slice(0, limit)
}

export function searchMoves(q: string, limit = 8): MoveEntry[] {
  if (!q) return []
  const lower = q.toLowerCase()
  return allMoves
    .filter(m => m.name.toLowerCase().includes(lower) || m.slug.includes(lower))
    .slice(0, limit)
}

export function searchAbilities(q: string, limit = 8): { slug: string; name: string; description: string | null }[] {
  if (!q) return []
  const lower = q.toLowerCase()
  return allAbilities
    .filter(a => a.name.toLowerCase().includes(lower) || a.slug.includes(lower))
    .slice(0, limit)
}

export function searchItems(q: string, limit = 8): { slug: string; name: string }[] {
  if (!q) return []
  const lower = q.toLowerCase()
  return allItems
    .filter(i => i.name.toLowerCase().includes(lower) || i.slug.includes(lower))
    .slice(0, limit)
}

export function findPokemonByName(name: string): PokemonEntry | undefined {
  const lower = name.toLowerCase()
  return allPokemon.find(p => p.name.toLowerCase() === lower || p.slug === lower)
}

// ── Type colours ──────────────────────────────────────────────────────────────
export const TYPE_COLORS: Record<string, string> = {
  Normal:   '#A8A878', Fire:     '#F08030', Water:    '#6890F0',
  Electric: '#F8D030', Grass:    '#78C850', Ice:      '#98D8D8',
  Fighting: '#C03028', Poison:   '#A040A0', Ground:   '#E0C068',
  Flying:   '#A890F0', Psychic:  '#F85888', Bug:      '#A8B820',
  Rock:     '#B8A038', Ghost:    '#705898', Dragon:   '#7038F8',
  Dark:     '#705848', Steel:    '#B8B8D0', Fairy:    '#EE99AC',
  Stellar:  '#40B5A5',
}
