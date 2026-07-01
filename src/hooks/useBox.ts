import { useCallback } from 'react'
import { useDriveFile } from '../drive/useDriveFile'
import type { BoxPokemon } from '../types'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

export function useBox() {
  const { data, loading, saving, error, save } = useDriveFile<BoxPokemon[]>('box.json', [])
  const box = data ?? []

  const addPokemon = useCallback(async (pokemon: Omit<BoxPokemon, 'id' | 'addedAt'>) => {
    const entry: BoxPokemon = { ...pokemon, id: uid(), addedAt: new Date().toISOString() }
    await save([...box, entry])
  }, [box, save])

  const updatePokemon = useCallback(async (id: string, updates: Partial<BoxPokemon>) => {
    await save(box.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [box, save])

  const deletePokemon = useCallback(async (id: string) => {
    await save(box.filter(p => p.id !== id))
  }, [box, save])

  const batchAddPokemon = useCallback(async (items: Omit<BoxPokemon, 'id' | 'addedAt'>[]) => {
    const entries: BoxPokemon[] = items.map(p => ({ ...p, id: uid(), addedAt: new Date().toISOString() }))
    await save([...box, ...entries])
  }, [box, save])

  return { box, loading, saving, error, addPokemon, updatePokemon, deletePokemon, batchAddPokemon }
}
