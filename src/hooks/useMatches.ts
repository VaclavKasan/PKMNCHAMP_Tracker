import { useCallback } from 'react'
import { useDriveFile } from '../drive/useDriveFile'
import type { Match } from '../types'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

export function useMatches() {
  const { data, loading, saving, error, save } = useDriveFile<Match[]>('matches.json', [])
  const matches = data ?? []

  const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const addMatch = useCallback(async (match: Omit<Match, 'id' | 'date'>) => {
    const entry: Match = { ...match, id: uid(), date: new Date().toISOString() }
    await save([...matches, entry])
  }, [matches, save])

  const deleteMatch = useCallback(async (id: string) => {
    await save(matches.filter(m => m.id !== id))
  }, [matches, save])

  const toggleStar = useCallback(async (id: string) => {
    await save(matches.map(m => m.id === id ? { ...m, starred: !m.starred } : m))
  }, [matches, save])

  return { matches: sorted, loading, saving, error, addMatch, deleteMatch, toggleStar }
}
