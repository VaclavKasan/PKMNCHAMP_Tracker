import { useEffect, useRef } from 'react'
import { REGULATIONS } from '../utils/regulations'

interface Props {
  value: string
  onChange: (id: string) => void
}

export function RegulationPicker({ value, onChange }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into center on mount / value change
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [value])

  return (
    <div
      ref={listRef}
      className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth no-scrollbar"
      style={{ scrollbarWidth: 'none' }}
    >
      {REGULATIONS.map(reg => (
        <button
          key={reg.id}
          data-selected={reg.id === value}
          onClick={() => onChange(reg.id)}
          className={`snap-center flex-shrink-0 px-5 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
            reg.id === value
              ? 'border-blue-600 bg-blue-600 text-white shadow-md'
              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
          }`}
        >
          {reg.label}
        </button>
      ))}
    </div>
  )
}
