export const TYPE_COLORS: Record<string, string> = {
  normal:   'bg-gray-100 text-gray-700',
  fire:     'bg-orange-100 text-orange-800',
  water:    'bg-blue-100 text-blue-800',
  electric: 'bg-yellow-100 text-yellow-800',
  grass:    'bg-green-100 text-green-800',
  ice:      'bg-sky-100 text-sky-800',
  fighting: 'bg-red-100 text-red-800',
  poison:   'bg-purple-100 text-purple-800',
  ground:   'bg-amber-100 text-amber-800',
  flying:   'bg-indigo-100 text-indigo-700',
  psychic:  'bg-pink-100 text-pink-800',
  bug:      'bg-lime-100 text-lime-800',
  rock:     'bg-stone-100 text-stone-700',
  ghost:    'bg-violet-100 text-violet-800',
  dragon:   'bg-indigo-200 text-indigo-900',
  dark:     'bg-zinc-200 text-zinc-800',
  steel:    'bg-slate-100 text-slate-700',
  fairy:    'bg-rose-100 text-rose-800',
}

export const CATEGORY_COLORS: Record<string, string> = {
  physical: 'bg-orange-50 text-orange-700',
  special:  'bg-blue-50 text-blue-700',
  status:   'bg-gray-50 text-gray-600',
}

export function typeClass(type: string | null)    { return TYPE_COLORS[type?.toLowerCase() ?? '']     ?? 'bg-gray-100 text-gray-600' }
export function categoryClass(cat: string | null) { return CATEGORY_COLORS[cat?.toLowerCase() ?? ''] ?? 'bg-gray-50 text-gray-600' }
