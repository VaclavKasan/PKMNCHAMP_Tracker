import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useFriends } from '../hooks/useFriends'
import { useViewing } from '../context/ViewingContext'
import { MOCK_FRIEND_PROFILE } from '../data/mockFriendData'
import type { FriendRequest } from '../types'
import { IconCopy, IconCheck, IconUserPlus, IconLoader, IconArrowsLeftRight, IconArrowRight, IconArrowLeft } from '@tabler/icons-react'

function displayName(p: { displayName: string | null }) {
  return p.displayName || 'Trainer'
}

export function FriendsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { viewFriend } = useViewing()
  const {
    friendCode, incoming, outgoing, friends, loading, error,
    sendRequest, acceptRequest, declineRequest, cancelRequest, unfriend,
  } = useFriends()

  const [codeInput, setCodeInput]     = useState('')
  const [mutual, setMutual]           = useState(true)
  const [sending, setSending]         = useState(false)
  const [sendError, setSendError]     = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  async function handleSend() {
    if (!codeInput.trim()) return
    setSending(true); setSendError(null); setSendSuccess(null)
    try {
      const profile = await sendRequest(codeInput.trim(), mutual)
      setSendSuccess(`Request sent to ${displayName(profile)}.`)
      setCodeInput('')
    } catch (err) {
      setSendError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  function handleCopy() {
    if (!friendCode) return
    navigator.clipboard.writeText(friendCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleView(friend: FriendRequest, path: '/stats' | '/history') {
    viewFriend(friend.profile)
    navigate(path)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-6">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {/* Your code */}
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Your code</h2>
        <p className="text-xs text-gray-400 mb-3">Share this with a friend so they can add you.</p>
        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-lg font-bold tracking-widest bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
            {friendCode ?? '—'}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            {copied ? <IconCheck size={14} className="text-green-600" /> : <IconCopy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      {/* Add a friend */}
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Add a friend</h2>
        <div className="flex gap-2 mb-2">
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Friend code"
            maxLength={8}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !codeInput.trim()}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <IconLoader size={14} className="animate-spin" /> : <IconUserPlus size={14} />}
            Send
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={mutual}
            onChange={e => setMutual(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Also let them see your stats
        </label>
        {sendError && <p className="text-xs text-red-600 mt-2">{sendError}</p>}
        {sendSuccess && <p className="text-xs text-green-600 mt-2">{sendSuccess}</p>}
      </section>

      {/* Requests */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Requests</h2>
          {incoming.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Incoming</p>
              {incoming.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <span className="text-sm text-gray-800 truncate block">{displayName(r.profile)}</span>
                    <span className="text-[10px] text-gray-400">{r.mutual ? 'Wants to view each other' : 'Wants to view your stats'}</span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => acceptRequest(r.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700">Accept</button>
                    <button onClick={() => declineRequest(r.id)} className="text-xs border border-gray-200 text-gray-500 px-2 py-1 rounded-md hover:bg-gray-100">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {outgoing.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Outgoing</p>
              {outgoing.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-800 truncate">{displayName(r.profile)}</span>
                  <button onClick={() => cancelRequest(r.id)} className="text-xs border border-gray-200 text-gray-500 px-2 py-1 rounded-md hover:bg-gray-100 flex-shrink-0">Cancel</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Friends */}
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Friends</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-gray-400">No friends yet — send a code above to get started.</p>
        ) : (
          <div className="space-y-2">
            {friends.map(f => {
              const iAmRequester = f.requesterId === user?.id
              const iCanView     = iAmRequester || f.mutual
              const theyCanView  = !iAmRequester || f.mutual
              return (
                <div key={f.id} className="bg-gray-50 rounded-lg px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{displayName(f.profile)}</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 flex-shrink-0">
                      {iCanView && theyCanView
                        ? <><IconArrowsLeftRight size={11} /> mutual</>
                        : iCanView
                          ? <><IconArrowRight size={11} /> you view them</>
                          : <><IconArrowLeft size={11} /> they view you</>}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {iCanView && (
                      <>
                        <button
                          onClick={() => handleView(f, '/stats')}
                          className="text-xs border border-blue-200 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-50"
                        >
                          View Stats
                        </button>
                        <button
                          onClick={() => handleView(f, '/history')}
                          className="text-xs border border-blue-200 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-50"
                        >
                          View History
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => unfriend(f.id)}
                      className="text-xs border border-gray-200 text-gray-500 px-2 py-1 rounded-md hover:bg-gray-100 ml-auto"
                    >
                      Unfriend
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Test friend — local-only preview, never touches Supabase */}
      <section className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h2 className="text-base font-semibold text-purple-900 mb-1">Test friend</h2>
        <p className="text-xs text-purple-700/70 mb-3">
          A fake friend with randomized data, generated locally in your browser so you can preview the friend-view UI. Not saved anywhere — no real account, no Supabase writes.
        </p>
        <div className="bg-white/60 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{displayName(MOCK_FRIEND_PROFILE)}</span>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => { viewFriend(MOCK_FRIEND_PROFILE); navigate('/stats') }}
              className="text-xs border border-purple-300 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-100"
            >
              View Stats
            </button>
            <button
              onClick={() => { viewFriend(MOCK_FRIEND_PROFILE); navigate('/history') }}
              className="text-xs border border-purple-300 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-100"
            >
              View History
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
