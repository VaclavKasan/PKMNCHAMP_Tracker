export interface Regulation {
  id:    string
  label: string
}

// ── Add future regulations here. The last entry is the new default. ────────────
export const REGULATIONS: Regulation[] = [
  { id: 'M-B', label: 'Reg M-B' },
  // { id: 'M-C', label: 'Reg M-C' },
]

export const DEFAULT_REGULATION = REGULATIONS[REGULATIONS.length - 1].id

// ── Pokémon Champions ranks ────────────────────────────────────────────────────
export interface Rank {
  id:       string
  label:    string
  ballSlug: string
}

const POKEAPI_ITEMS = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items'

export const RANKS: Rank[] = [
  { id: 'beginner',   label: 'Beginner',    ballSlug: 'premier-ball' },
  { id: 'pokeball',   label: 'Poké Ball',   ballSlug: 'poke-ball'   },
  { id: 'greatball',  label: 'Great Ball',  ballSlug: 'great-ball'  },
  { id: 'ultraball',  label: 'Ultra Ball',  ballSlug: 'ultra-ball'  },
  { id: 'masterball', label: 'Master Ball', ballSlug: 'master-ball' },
]

export const DEFAULT_RANK = 'ultraball'

export function rankBallUrl(ballSlug: string): string {
  return `${POKEAPI_ITEMS}/${ballSlug}.png`
}
