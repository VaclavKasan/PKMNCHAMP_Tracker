import { useState } from 'react'
import { spriteUrl } from '../utils/sprites'

interface Props {
  national:   number | null | undefined
  slug:       string
  isForm:     boolean
  name:       string
  size?:      'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = { sm: 'w-8 h-8', md: 'w-16 h-16', lg: 'w-32 h-32' } as const

export function PokemonImage({ national, slug, isForm, name, size = 'md', className = '' }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const url = spriteUrl(national, slug, isForm)

  return (
    <div className={`relative ${SIZES[size]} flex-shrink-0 ${className}`}>
      {!loaded && !failed && (
        <div className="absolute inset-0 bg-gray-100 rounded-full animate-pulse" />
      )}
      {failed ? (
        <div className={`${SIZES[size]} rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs`}>
          {name[0]}
        </div>
      ) : (
        <img
          src={url}
          alt={name}
          loading="lazy"
          className={`object-contain ${SIZES[size]} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
