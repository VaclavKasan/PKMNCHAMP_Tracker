import { findPokemonByName } from './gameData'
import { NATURES } from './natures'
import type { StatSpread } from '../types'
import type { StatKey } from './statCalc'

const STAT_MAP: Record<string, StatKey> = {
  HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe',
}

export interface ParsedPokemon {
  name:        string
  item:        string
  ability:     string
  natureSlug:  string
  evTraining:  StatSpread
  moves:       [string, string, string, string]
  matched:     boolean
  slug:        string
  national:    number | null
  isForm:      boolean
  types:       string[]
}

export function parseShowdownTeam(text: string): ParsedPokemon[] {
  return text
    .trim()
    .split(/\n\s*\n+/)
    .map(block => parseBlock(block.trim()))
    .filter((p): p is ParsedPokemon => p !== null)
    .slice(0, 20)
}

function parseBlock(block: string): ParsedPokemon | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  // First line: [Nickname (]Name[)] @ Item  OR  Name @ Item  OR  Name
  let name = ''
  let item = ''
  const first = lines[0]
  const nicknameMatch = first.match(/^.+?\((.+?)\)\s*(?:@\s*(.+))?$/)
  if (nicknameMatch) {
    name = nicknameMatch[1].trim()
    item = nicknameMatch[2]?.trim() ?? ''
  } else {
    const atIdx = first.indexOf(' @ ')
    if (atIdx >= 0) {
      name = first.slice(0, atIdx).trim()
      item = first.slice(atIdx + 3).trim()
    } else {
      name = first.trim()
    }
  }
  if (!name) return null

  let ability = ''
  let natureSlug = 'hardy'
  const moves: string[] = []
  const evTraining: StatSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

  for (const line of lines.slice(1)) {
    if (line.startsWith('Ability:')) {
      ability = line.slice(8).trim()

    } else if (line.endsWith(' Nature')) {
      const natureName = line.slice(0, -7).trim()
      const found = NATURES.find(n => n.name.toLowerCase() === natureName.toLowerCase())
      natureSlug = found?.slug ?? 'hardy'

    } else if (line.startsWith('- ')) {
      if (moves.length < 4) moves.push(line.slice(2).trim())

    } else if (line.startsWith('# Champions stat points:')) {
      // Our custom export format — values are training points directly
      const statStr = line.slice('# Champions stat points:'.length).trim()
      for (const part of statStr.split('/')) {
        const [statName, val] = part.trim().split(/\s+/)
        const key = STAT_MAP[statName]
        if (key) evTraining[key] = Math.min(32, Math.max(0, parseInt(val, 10) || 0))
      }

    } else if (line.startsWith('EVs:')) {
      // Standard Showdown EVs (0–252) → training points (1 pt = 8 EVs)
      const statStr = line.slice(4).trim()
      for (const part of statStr.split('/')) {
        const [val, statName] = part.trim().split(/\s+/)
        const key = STAT_MAP[statName]
        if (key) evTraining[key] = Math.min(32, Math.round(parseInt(val, 10) / 8))
      }
    }
    // Intentionally skipped: Level, Shiny, IVs, Gender,
    //   # Champions mega preview, # Mega ability, # Champions ...
  }

  const entry = findPokemonByName(name)

  return {
    name,
    item,
    ability,
    natureSlug,
    evTraining,
    moves: [moves[0] ?? '', moves[1] ?? '', moves[2] ?? '', moves[3] ?? ''],
    matched:  !!entry,
    slug:     entry?.slug     ?? name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    national: entry?.national ?? null,
    isForm:   entry?.isForm   ?? false,
    types:    entry?.types    ?? [],
  }
}
