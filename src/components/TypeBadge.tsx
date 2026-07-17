import { TYPE_COLORS } from '../utils/gameData'

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="inline-block text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
      style={{ backgroundColor: TYPE_COLORS[type] ?? '#888' }}
    >
      {type.toUpperCase()}
    </span>
  )
}
