import megaIdsJson from '../data/megaIds.json'

const MEGA_IDS = megaIdsJson as Record<string, number>

const POKEAPI  = (n: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${n}.png`

const SHOWDOWN = (slug: string) =>
  `https://play.pokemonshowdown.com/sprites/dex/${slug}.png`

// Detect Showdown mega slugs and return PokéAPI official-artwork URL.
// Handles -x/-y (dual-form XY/ORAS), -z (ZA variants), and plain megas.
function megaSlugUrl(slug: string): string | null {
  let base: string, key: string
  if (slug.endsWith('megax'))      { base = slug.slice(0, -5); key = `${base}-x` }
  else if (slug.endsWith('megay')) { base = slug.slice(0, -5); key = `${base}-y` }
  else if (slug.endsWith('megaz')) { base = slug.slice(0, -5); key = `${base}-z` }
  else if (slug.endsWith('mega'))  { base = slug.slice(0, -4); key = base }
  else return null
  const id = MEGA_IDS[key]
  return id ? POKEAPI(id) : null
}

export function spriteUrl(national: number | null | undefined, slug: string, isForm: boolean): string {
  if (!isForm && national) return POKEAPI(national)
  return megaSlugUrl(slug) ?? SHOWDOWN(slug)
}

export function megaSpriteUrl(slug: string, item?: string): string {
  const lower = (item ?? '').toLowerCase().replace(/\s/g, '')
  // Determine lookup key: dual-form megas (Charizard, Mewtwo) use X/Y suffix from item name
  let key = slug
  if (lower.endsWith('itex')) key = `${slug}-x`
  else if (lower.endsWith('itey')) key = `${slug}-y`

  const id = MEGA_IDS[key]
  if (id) return POKEAPI(id)

  // Fallback to Showdown for non-canonical custom megas
  if (lower.endsWith('itex')) return SHOWDOWN(`${slug}megax`)
  if (lower.endsWith('itey')) return SHOWDOWN(`${slug}megay`)
  return SHOWDOWN(`${slug}mega`)
}

export function itemSpriteUrl(slug: string): string {
  return `https://play.pokemonshowdown.com/sprites/itemicons/${slug}.png`
}
