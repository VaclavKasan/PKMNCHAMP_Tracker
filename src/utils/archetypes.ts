export const PRESET_ARCHETYPES = [
  'Rain (Pelipper)', 'Rain (Sableye)', 'Rain (Politoed)',
  'Sun (Charizard)', 'Sun (Incineroar)', 'Sun (Groudon)',
  'Sand (Tyranitar)', 'Sand (Hippowdon)',
  'Snow (Abomasnow)', 'Snow (Cetitan)', 'Snow (Ninetales-A)',
  'Trick Room', 'Trick Room (Hatterene)', 'Trick Room (Dusclops)',
  'Balance', 'Hyper Offense', 'Stall',
  'Miraidon Box', 'Koraidon Box', 'Calyrex-Ice Box', 'Calyrex-Shadow Box',
  'Yveltal Box', 'Xerneas Box', 'Kyogre Box',
]

interface StratStyle { badge: string; icon: string }

export function stratStyle(arch: string): StratStyle {
  const l = arch.toLowerCase()
  if (l.includes('rain'))                               return { badge: 'bg-blue-100 text-blue-800 border-blue-200',      icon: 'ti-cloud-rain' }
  if (l.includes('sun') || l.includes('groudon'))      return { badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'ti-sun' }
  if (l.includes('sand') || l.includes('tyranitar'))   return { badge: 'bg-amber-100 text-amber-800 border-amber-200',    icon: 'ti-wind' }
  if (l.includes('snow') || l.includes('hail'))        return { badge: 'bg-sky-100 text-sky-800 border-sky-200',          icon: 'ti-snowflake' }
  if (l.includes('trick') || l.includes('hatterene'))  return { badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'ti-rotate' }
  if (l.includes('hyper') || l.includes('offense'))    return { badge: 'bg-red-100 text-red-800 border-red-200',          icon: 'ti-bolt' }
  if (l.includes('stall'))                             return { badge: 'bg-gray-100 text-gray-600 border-gray-200',       icon: 'ti-shield' }
  if (l.includes('yveltal') || l.includes('shadow'))   return { badge: 'bg-red-100 text-red-800 border-red-200',          icon: 'ti-skull' }
  if (l.includes('miraidon') || l.includes('koraidon')) return { badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'ti-bolt' }
  if (l.includes('xerneas') || l.includes('calyrex-ice')) return { badge: 'bg-green-100 text-green-800 border-green-200', icon: 'ti-leaf' }
  return                                               { badge: 'bg-green-100 text-green-800 border-green-200',           icon: 'ti-sword' }
}
