import naturesJson from '../data/natures.json'

export interface Nature {
  slug:  string
  name:  string
  plus:  string | null  // boosted stat key (e.g. 'spa')
  minus: string | null  // lowered stat key
}

export const NATURES: Nature[] = naturesJson as Nature[]

export function getNature(slug: string): Nature | undefined {
  return NATURES.find(n => n.slug === slug)
}

export function natureModifier(nature: Nature | undefined, stat: string): number {
  if (!nature || stat === 'hp') return 1
  if (nature.plus === stat)  return 1.1
  if (nature.minus === stat) return 0.9
  return 1
}
