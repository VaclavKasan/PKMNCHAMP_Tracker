import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { rowToMatch, matchToInsertRow, matchToUpdateRow } from '../utils/matchMapper'
import { MOCK_FRIEND_ID, MOCK_FRIEND_MATCHES } from '../data/mockFriendData'
import type { Match } from '../types'

const byDateDesc = (a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime()

export function useMatches(options?: { userId?: string }) {
  const { user } = useAuth()
  const targetUserId = options?.userId ?? user?.id ?? null
  const readOnly = !!options?.userId && options.userId !== user?.id

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!targetUserId) { setMatches([]); setLoading(false); return }
    if (targetUserId === MOCK_FRIEND_ID) { setMatches(MOCK_FRIEND_MATCHES); setLoading(false); return }
    setLoading(true)
    supabase
      .from('matches')
      .select('*')
      .eq('user_id', targetUserId)
      .order('played_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setError(error.message); setLoading(false); return }
        setMatches((data ?? []).map(rowToMatch))
        setLoading(false); setError(null)
      })
    return () => { cancelled = true }
  }, [targetUserId])

  const addMatch = useCallback(async (match: Omit<Match, 'id' | 'date'>) => {
    if (readOnly) throw new Error('Viewing a friend’s matches is read-only')
    if (!targetUserId) throw new Error('Not authenticated')
    setSaving(true)
    const { data, error } = await supabase
      .from('matches').insert(matchToInsertRow(match, targetUserId)).select().single()
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setMatches(m => [rowToMatch(data), ...m].sort(byDateDesc))
  }, [targetUserId, readOnly])

  const updateMatch = useCallback(async (id: string, updates: Partial<Omit<Match, 'id' | 'date'>>) => {
    if (readOnly) throw new Error('Viewing a friend’s matches is read-only')
    setSaving(true)
    const { data, error } = await supabase
      .from('matches').update(matchToUpdateRow(updates)).eq('id', id).select().single()
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setMatches(m => m.map(x => x.id === id ? rowToMatch(data) : x))
  }, [readOnly])

  const deleteMatch = useCallback(async (id: string) => {
    if (readOnly) throw new Error('Viewing a friend’s matches is read-only')
    setSaving(true)
    const { error } = await supabase.from('matches').delete().eq('id', id)
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setMatches(m => m.filter(x => x.id !== id))
  }, [readOnly])

  const toggleStar = useCallback(async (id: string) => {
    if (readOnly) throw new Error('Viewing a friend’s matches is read-only')
    setSaving(true)
    const current = await supabase.from('matches').select('starred').eq('id', id).single()
    if (current.error) { setSaving(false); setError(current.error.message); throw current.error }
    const { data, error } = await supabase
      .from('matches').update({ starred: !current.data.starred }).eq('id', id).select().single()
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setMatches(m => m.map(x => x.id === id ? rowToMatch(data) : x))
  }, [readOnly])

  const bulkSetSeason = useCallback(async (season: string) => {
    if (readOnly) throw new Error('Viewing a friend’s matches is read-only')
    if (!targetUserId) throw new Error('Not authenticated')
    setSaving(true)
    const { data, error } = await supabase
      .from('matches').update({ season }).eq('user_id', targetUserId).select()
    setSaving(false)
    if (error) { setError(error.message); throw error }
    setMatches((data ?? []).map(rowToMatch).sort(byDateDesc))
  }, [targetUserId, readOnly])

  return { matches, loading, saving, error, readOnly, addMatch, updateMatch, deleteMatch, toggleStar, bulkSetSeason }
}
