import { stratStyle } from '../utils/archetypes'

export function ArchetypeBadge({ arch }: { arch: string; size?: 'sm' | 'md' }) {
  const s = stratStyle(arch)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${s.badge}`}>
      <i className={`ti ${s.icon}`} aria-hidden="true" />
      {arch}
    </span>
  )
}
