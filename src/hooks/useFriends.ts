import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthContext'
import type { FriendRequest, FriendProfile, FriendStatus } from '../types'

interface FriendRow {
  id:            string
  requester_id:  string
  owner_id:      string
  status:        FriendStatus
  mutual:        boolean
  created_at:    string
  responded_at:  string | null
}

interface ProfileRow {
  id:           string
  display_name: string | null
  avatar_url:   string | null
}

function toProfile(row: ProfileRow): FriendProfile {
  return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url }
}

export function useFriends() {
  const { user } = useAuth()
  const myId = user?.id ?? null

  const [friendCode, setFriendCode] = useState<string | null>(null)
  const [incoming, setIncoming]     = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing]     = useState<FriendRequest[]>([])
  const [friends, setFriends]       = useState<FriendRequest[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!myId) { setLoading(false); return }
    setLoading(true)
    try {
      const [profileRes, rowsRes] = await Promise.all([
        supabase.from('profiles').select('friend_code').eq('id', myId).single(),
        supabase.from('friends').select('*').or(`requester_id.eq.${myId},owner_id.eq.${myId}`),
      ])
      if (profileRes.error) throw profileRes.error
      if (rowsRes.error)    throw rowsRes.error

      const friendRows = (rowsRes.data ?? []) as FriendRow[]
      const otherIds = [...new Set(friendRows.map(r => r.requester_id === myId ? r.owner_id : r.requester_id))]

      let profiles = new Map<string, FriendProfile>()
      if (otherIds.length > 0) {
        const { data: profileRows, error: pErr } = await supabase
          .from('profiles').select('id, display_name, avatar_url').in('id', otherIds)
        if (pErr) throw pErr
        profiles = new Map((profileRows as ProfileRow[]).map(p => [p.id, toProfile(p)]))
      }

      const toRequest = (r: FriendRow): FriendRequest => {
        const otherId = r.requester_id === myId ? r.owner_id : r.requester_id
        return {
          id:           r.id,
          requesterId:  r.requester_id,
          ownerId:      r.owner_id,
          status:       r.status,
          mutual:       r.mutual,
          createdAt:    r.created_at,
          respondedAt:  r.responded_at,
          profile:      profiles.get(otherId) ?? { id: otherId, displayName: null, avatarUrl: null },
        }
      }

      const all = friendRows.map(toRequest)
      setFriendCode(profileRes.data?.friend_code ?? null)
      setIncoming(all.filter(r => r.status === 'pending' && r.ownerId === myId))
      setOutgoing(all.filter(r => r.status === 'pending' && r.requesterId === myId))
      setFriends(all.filter(r => r.status === 'accepted'))
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [myId])

  useEffect(() => { reload() }, [reload])

  const sendRequest = useCallback(async (code: string, mutual: boolean): Promise<FriendProfile> => {
    if (!myId) throw new Error('Not authenticated')
    const { data, error } = await supabase.rpc('find_user_by_friend_code', { code })
    if (error) throw error
    const match = (data as { user_id: string; display_name: string | null; avatar_url: string | null }[])[0]
    if (!match) throw new Error('No trainer found with that code.')
    if (match.user_id === myId) throw new Error('That’s your own code.')

    const { error: insertError } = await supabase.from('friends').insert({
      requester_id: myId, owner_id: match.user_id, status: 'pending', mutual,
    })
    if (insertError) {
      if (insertError.code === '23505') throw new Error('You’ve already sent a request to this trainer.')
      throw insertError
    }
    await reload()
    return { id: match.user_id, displayName: match.display_name, avatarUrl: match.avatar_url }
  }, [myId, reload])

  const acceptRequest = useCallback(async (id: string) => {
    const { error } = await supabase.from('friends')
      .update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    await reload()
  }, [reload])

  // Declining/cancelling/unfriending all just remove the row — there's no
  // reason to keep a dead relationship around, and it lets either side
  // re-request later without the unique (requester, owner) constraint blocking it.
  const removeRequest = useCallback(async (id: string) => {
    const { error } = await supabase.from('friends').delete().eq('id', id)
    if (error) throw error
    await reload()
  }, [reload])

  return {
    friendCode, incoming, outgoing, friends, loading, error,
    sendRequest, acceptRequest,
    declineRequest: removeRequest, cancelRequest: removeRequest, unfriend: removeRequest,
  }
}
