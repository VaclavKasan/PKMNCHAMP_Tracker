import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { AuthState, GoogleUser } from '../types'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ')

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// ── localStorage cache ────────────────────────────────────────────────────────
const CACHE_KEY = 'pkmnchamp_auth_v1'

interface CachedAuth {
  user:         GoogleUser
  accessToken:  string
  tokenExpiry:  number
}

function readCache(): CachedAuth | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as CachedAuth
    // Require all fields to be present
    if (!c.user || !c.accessToken || !c.tokenExpiry) return null
    return c
  } catch {
    return null
  }
}

function writeCache(data: CachedAuth) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}

// Build the initial state from cache — eliminates the login-screen flash for
// returning users because loading starts false.
function buildInitialState(): AuthState {
  if (!CLIENT_ID) {
    return { user: null, accessToken: null, tokenExpiry: null, loading: false, error: 'App not configured: VITE_GOOGLE_CLIENT_ID is missing.' }
  }
  const cache = readCache()
  if (cache) {
    const tokenStillValid = cache.tokenExpiry > Date.now()
    return {
      user:        cache.user,
      accessToken: tokenStillValid ? cache.accessToken : null,
      tokenExpiry: cache.tokenExpiry,
      loading:     false,   // ← show app immediately; token refreshes in background
      error:       null,
    }
  }
  return { user: null, accessToken: null, tokenExpiry: null, loading: true, error: null }
}

// ── Context ───────────────────────────────────────────────────────────────────
interface AuthContextValue extends AuthState {
  signIn:        () => void
  signOut:       () => void
  getValidToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(buildInitialState)
  const tokenClientRef    = useRef<google.accounts.oauth2.TokenClient | null>(null)
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null)
  const stateRef          = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  function handleTokenResponse(resp: google.accounts.oauth2.TokenResponse) {
    if (resp.error) {
      setState(s => ({ ...s, loading: false, error: resp.error ?? 'Auth error' }))
      refreshPromiseRef.current = null
      return
    }
    const expiry = Date.now() + (resp.expires_in - 60) * 1000
    const token  = resp.access_token

    const existingUser = stateRef.current.user
    if (existingUser) {
      // Background refresh — token was stale, user already visible in UI
      writeCache({ user: existingUser, accessToken: token, tokenExpiry: expiry })
      setState(s => ({ ...s, accessToken: token, tokenExpiry: expiry, loading: false, error: null }))
      refreshPromiseRef.current = null
    } else {
      // First sign-in — fetch profile info then update state
      fetchUserInfo(token).then(user => {
        writeCache({ user, accessToken: token, tokenExpiry: expiry })
        setState({ user, accessToken: token, tokenExpiry: expiry, loading: false, error: null })
      })
      refreshPromiseRef.current = null
    }
  }

  useEffect(() => {
    let cancelled = false

    if (!CLIENT_ID) return  // already set error in buildInitialState

    function initClient() {
      if (cancelled) return
      try {
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID!,
          scope: SCOPES,
          callback: handleTokenResponse,
          error_callback: (err) => {
            refreshPromiseRef.current = null
            if (err.type === 'suppressed_by_user') {
              // Silent auth blocked (3rd-party cookie restriction etc.)
              // If we have a cached user, keep them signed in; otherwise show button.
              setState(s => ({ ...s, loading: false, error: null }))
            } else {
              setState(s => ({
                ...s, loading: false,
                // Don't surface errors when user is already loaded from cache
                error: s.user ? null : friendlyError(err.type),
              }))
            }
          },
        })
        // Skip proactive refresh when a valid cached token already exists.
        // Firefox (and other browsers with strict cookie policies) trigger a
        // visible popup if requestAccessToken is called unnecessarily.
        // getValidToken() handles lazy refresh when the token actually expires.
        const cached = readCache()
        const hasValidToken = cached && cached.accessToken && cached.tokenExpiry > Date.now()
        if (!hasValidToken) {
          tokenClientRef.current.requestAccessToken({ prompt: '' })
        }
      } catch (e) {
        console.error('GIS initTokenClient failed:', e)
        setState(s => ({
          ...s, loading: false,
          error: s.user ? null : 'Google sign-in failed to initialize. See browser console.',
        }))
      }
    }

    // Safety fallback: if nothing fires in 5 s, stop spinning
    const timeout = setTimeout(() => {
      setState(s => s.loading ? { ...s, loading: false } : s)
    }, 5000)

    if (typeof google !== 'undefined') {
      initClient()
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      if (script) {
        script.addEventListener('load', initClient)
        script.addEventListener('error', () => {
          setState(s => ({
            ...s, loading: false,
            error: s.user ? null : 'Could not load Google sign-in. Check your internet connection.',
          }))
        })
      } else {
        setState(s => ({
          ...s, loading: false,
          error: s.user ? null : 'Google sign-in script not found.',
        }))
      }
    }

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function signIn() {
    if (!tokenClientRef.current) {
      setState(s => ({
        ...s,
        error: !CLIENT_ID
          ? 'App not configured: VITE_GOOGLE_CLIENT_ID is missing.'
          : 'Sign-in is not ready yet. Please refresh the page.',
      }))
      return
    }
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
    } catch {
      setState(s => ({
        ...s, loading: false,
        error: 'Could not open sign-in popup. Allow popups for this site and try again.',
      }))
    }
  }

  function signOut() {
    clearCache()
    if (state.user) google.accounts.id.disableAutoSelect()
    setState({ user: null, accessToken: null, tokenExpiry: null, loading: false, error: null })
  }

  async function getValidToken(): Promise<string | null> {
    if (state.accessToken && state.tokenExpiry && Date.now() < state.tokenExpiry) {
      return state.accessToken
    }
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = new Promise<string | null>((resolve) => {
        const orig = tokenClientRef.current
        if (!orig) { resolve(null); return }
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID!,
          scope: SCOPES,
          callback: (resp) => {
            handleTokenResponse(resp)
            resolve(resp.error ? null : resp.access_token)
            tokenClientRef.current = orig
          },
        })
        tokenClientRef.current.requestAccessToken({ prompt: '' })
      })
    }
    return refreshPromiseRef.current
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, getValidToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

async function fetchUserInfo(token: string): Promise<GoogleUser> {
  const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return { id: data.sub, name: data.name, email: data.email, picture: data.picture }
}

function friendlyError(type: string): string {
  switch (type) {
    case 'popup_blocked':
      return 'Sign-in popup was blocked. Please allow popups for this site and try again.'
    case 'popup_closed_by_user':
      return 'Sign-in was cancelled.'
    case 'access_denied':
      return 'Access was denied. Please try signing in again.'
    case 'immediate_failed':
    case 'unknown':
      return 'Sign-in failed. If this site is not in your Google OAuth allowed origins, add it in Google Cloud Console.'
    default:
      return `Sign-in failed (${type}). If this keeps happening, check Google Cloud Console authorized origins.`
  }
}
