import { useEffect, useState } from 'react'
import { spriteUrl, megaSpriteUrl } from '../utils/sprites'

interface Props {
  national:   number | null | undefined
  slug:       string
  isForm:     boolean
  name:       string
  size?:      'sm' | 'md' | 'lg'
  isMega?:    boolean
  item?:      string
  className?: string
}

const SIZES = { sm: 'w-8 h-8', md: 'w-16 h-16', lg: 'w-32 h-32' } as const

export function PokemonImage({ national, slug, isForm, name, size = 'md', isMega = false, item, className = '' }: Props) {
  const primaryUrl  = isMega ? megaSpriteUrl(slug, item) : spriteUrl(national, slug, isForm)
  const fallbackUrl = isMega ? spriteUrl(national, slug, isForm) : null

  const [currentUrl, setCurrentUrl] = useState(primaryUrl)
  const [loaded, setLoaded]         = useState(false)
  const [failed, setFailed]         = useState(false)

  // Reset when the target pokemon / mega state changes
  useEffect(() => {
    setCurrentUrl(primaryUrl)
    setLoaded(false)
    setFailed(false)
  }, [primaryUrl])

  function handleError() {
    if (fallbackUrl && currentUrl !== fallbackUrl) {
      setCurrentUrl(fallbackUrl)
      setLoaded(false)
    } else {
      setFailed(true)
    }
  }

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
          key={currentUrl}
          src={currentUrl}
          alt={name}
          loading="lazy"
          className={`object-contain ${SIZES[size]} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
    </div>
  )
}
