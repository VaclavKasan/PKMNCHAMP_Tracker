const POKEAPI  = (n: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${n}.png`

// Showdown sprite CDN — covers all slugs incl. forms (charizardmegax, rotomheat, etc.)
const SHOWDOWN = (slug: string) =>
  `https://play.pokemonshowdown.com/sprites/dex/${slug}.png`

export function spriteUrl(national: number | null | undefined, slug: string, isForm: boolean): string {
  if (!isForm && national) return POKEAPI(national)
  return SHOWDOWN(slug)
}

export function itemSpriteUrl(slug: string): string {
  return `https://play.pokemonshowdown.com/sprites/itemicons/${slug}.png`
}
