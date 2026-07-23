import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { rowToBox, boxToInsertRow, boxToUpdateRow } from '../utils/boxMapper'
import { MOCK_FRIEND_ID, MOCK_FRIEND_BOX } from '../data/mockFriendData'
import type { BoxPokemon } from '../types'

export function useBox(options?: { userId?: string }) {
  const { user } = useAuth()
  const targetUserId = options?.userId ?? user?.id ?? null
  const readOnly = !!options?.userId && options.userId !== user?.id

  const [box, setBox]         = useState<BoxPokemon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!targetUserId) { setBox([]); setLoading(false); return }
    if (targetUserId === MOCK_FRIEND_ID) { setBox(MOCK_FRIEND_BOX); setLoading(false); return }
    setLoading(true)
    supabase
      .from('box_pokemon')
      .select('*')
      .eq('user_id', targetUserId)
      .order('added_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setError(error.message); setLoading(false); return }
        setBox((data ?? []).map(rowToBox))
        setLoading(false); setError(null)
      })
    return () => { cancelled = true }
  }, [targetUserId])

  const addPokemon = useCallback(async (pokemon: Omit<BoxPokemon, 'id' | 'addedAt'>) => {
    if (readOnly) throw new Error('Viewing a friend’s box is read-only')
    if (!targetUserId) throw new Error('Not authenticated')
    setSaving(true)
    const { data, error } = await supabase
      .from('box_pokemon').insert(boxToInsertRow(pokemon, targetUserId)).select().single()
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setBox(b => [...b, rowToBox(data)])
  }, [targetUserId, readOnly])

  const updatePokemon = useCallback(async (id: string, updates: Partial<BoxPokemon>) => {
    if (readOnly) throw new Error('Viewing a friend’s box is read-only')
    setSaving(true)
    const { data, error } = await supabase
      .from('box_pokemon').update(boxToUpdateRow(updates)).eq('id', id).select().single()
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setBox(b => b.map(p => p.id === id ? rowToBox(data) : p))
  }, [readOnly])

  const deletePokemon = useCallback(async (id: string) => {
    if (readOnly) throw new Error('Viewing a friend’s box is read-only')
    setSaving(true)
    const { error } = await supabase.from('box_pokemon').delete().eq('id', id)
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setBox(b => b.filter(p => p.id !== id))
  }, [readOnly])

  const batchAddPokemon = useCallback(async (items: Omit<BoxPokemon, 'id' | 'addedAt'>[]) => {
    if (readOnly) throw new Error('Viewing a friend’s box is read-only')
    if (!targetUserId) throw new Error('Not authenticated')
    setSaving(true)
    const { data, error } = await supabase
      .from('box_pokemon').insert(items.map(p => boxToInsertRow(p, targetUserId))).select()
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setBox(b => [...b, ...(data ?? []).map(rowToBox)])
  }, [targetUserId, readOnly])

  return { box, loading, saving, error, readOnly, addPokemon, updatePokemon, deletePokemon, batchAddPokemon }
}
