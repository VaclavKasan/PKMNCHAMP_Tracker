import megaIdsJson from '../data/megaIds.json'

const MEGA_IDS = megaIdsJson as Record<string, number>

const POKEAPI  = (n: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${n}.png`

const SHOWDOWN = (slug: string) =>
  `https://play.pokemonshowdown.com/sprites/dex/${slug}.png`

export function spriteUrl(national: number | null | undefined, slug: string, isForm: boolean): string {
  if (!isForm && national) return POKEAPI(national)
  return SHOWDOWN(slug)
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
