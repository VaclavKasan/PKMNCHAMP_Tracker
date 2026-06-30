import fs from 'fs'
import path from 'path'
import * as esbuild from 'esbuild'

const VENDOR = path.resolve('vendor/pokemon-showdown/data')
const OUT    = path.resolve('src/data')
fs.mkdirSync(OUT, { recursive: true })

// Load a Showdown TypeScript data file and return its first export as a JS object.
// Strategy: strip import lines (only used for type annotations), transform TS→CJS, eval.
async function load(file: string): Promise<Record<string, any>> {
  let src = fs.readFileSync(path.join(VENDOR, file), 'utf8')
  // Strip block comments (abilities.ts has a large one at the top)
  src = src.replace(/\/\*[\s\S]*?\*\//g, '')
  // Strip import lines — all imports are type-only, not needed at runtime
  src = src.replace(/^import\s[^\n]*\n/gm, '')

  const { code } = await esbuild.transform(src, {
    loader: 'ts',
    format: 'cjs',
    target: 'node18',
  })

  // esbuild CJS output does `module.exports = __toCommonJS(...)`, so we must
  // read from mod.exports after execution (not from the initial exports ref).
  const mod = { exports: {} as Record<string, any> }
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', '__dirname', '__filename', code)(
    mod.exports,
    (_id: string) => ({ exports: {} }),
    mod,
    path.dirname(path.join(VENDOR, file)),
    path.join(VENDOR, file),
  )
  const result = mod.exports as Record<string, any>
  const keys = Object.keys(result).filter(k => k !== '__esModule')
  if (keys.length === 0) throw new Error(`No exports in ${file}`)
  return result[keys[0]] as Record<string, any>
}

async function main() {
  // ── Pokémon ───────────────────────────────────────────────────────────────
  const rawPoke = await load('pokedex.ts')

  const megaCapable = new Set<string>()
  const pokemon = Object.entries(rawPoke)
    .filter(([, d]) => d.num && d.name && d.baseStats)
    .map(([slug, d]) => {
      const isForm = !!d.baseSpecies
      // Detect mega-capable base species
      if (isForm && typeof d.forme === 'string' && d.forme.startsWith('Mega')) {
        megaCapable.add(d.baseSpecies as string)
      }
      const abilities: string[] = [...new Set(Object.values(d.abilities ?? {}) as string[])]
      return {
        slug,
        name:      d.name as string,
        national:  d.num  as number,
        types:     d.types as string[],
        baseStats: d.baseStats as { hp: number; atk: number; def: number; spa: number; spd: number; spe: number },
        abilities,
        isForm,
      }
    })

  fs.writeFileSync(path.join(OUT, 'pokemon.json'), JSON.stringify(pokemon))
  console.log(`✓ pokemon.json (${pokemon.length} entries)`)

  // ── Megas ────────────────────────────────────────────────────────────────
  // megaCapable contains the base species NAME (e.g. "Charizard"); map to slug
  const nameToSlug = new Map(pokemon.filter(p => !p.isForm).map(p => [p.name.toLowerCase(), p.slug]))
  const megas = [...megaCapable]
    .map(name => nameToSlug.get(name.toLowerCase()))
    .filter(Boolean) as string[]
  fs.writeFileSync(path.join(OUT, 'megas.json'), JSON.stringify(megas))
  console.log(`✓ megas.json (${megas.length} base Pokémon with Mega)`)

  // ── Moves ────────────────────────────────────────────────────────────────
  const rawMoves = await load('moves.ts')
  const moves = Object.entries(rawMoves)
    .filter(([, d]) => d.name && d.type && d.category)
    .map(([slug, d]) => ({
      slug,
      name:     d.name     as string,
      type:     d.type     as string,
      category: d.category as string,
      power:    (d.basePower ?? null) as number | null,
      accuracy: (d.accuracy === true ? null : d.accuracy ?? null) as number | null,
      pp:       (d.pp ?? null) as number | null,
    }))

  fs.writeFileSync(path.join(OUT, 'moves.json'), JSON.stringify(moves))
  console.log(`✓ moves.json (${moves.length} entries)`)

  // ── Abilities ────────────────────────────────────────────────────────────
  const rawAbilities = await load('abilities.ts')
  const abilities = Object.entries(rawAbilities)
    .filter(([, d]) => d.name)
    .map(([slug, d]) => ({
      slug,
      name:        d.name      as string,
      description: (d.shortDesc ?? d.desc ?? null) as string | null,
    }))

  fs.writeFileSync(path.join(OUT, 'abilities.json'), JSON.stringify(abilities))
  console.log(`✓ abilities.json (${abilities.length} entries)`)

  // ── Items ────────────────────────────────────────────────────────────────
  const rawItems = await load('items.ts')
  const items = Object.entries(rawItems)
    .filter(([, d]) => d.name)
    .map(([slug, d]) => ({ slug, name: d.name as string }))

  fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify(items))
  console.log(`✓ items.json (${items.length} entries)`)

  // ── Natures ──────────────────────────────────────────────────────────────
  const rawNatures = await load('natures.ts')
  const natures = Object.entries(rawNatures)
    .filter(([, d]) => d.name)
    .map(([slug, d]) => ({
      slug,
      name:  d.name as string,
      plus:  (d.plus  ?? null) as string | null,
      minus: (d.minus ?? null) as string | null,
    }))

  fs.writeFileSync(path.join(OUT, 'natures.json'), JSON.stringify(natures))
  console.log(`✓ natures.json (${natures.length} natures)`)
}

main().catch(e => { console.error(e); process.exit(1) })
