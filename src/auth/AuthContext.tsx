import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { AuthState, GoogleUser } from '../types'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ')

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

interface AuthContextValue extends AuthState {
  signIn:        () => void
  signOut:       () => void
  getValidToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, accessToken: null, tokenExpiry: null, loading: true, error: null,
  })
  const tokenClientRef = useRef<google.accounts.oauth2.TokenClient | null>(null)
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null)

  function handleTokenResponse(resp: google.accounts.oauth2.TokenResponse) {
    if (resp.error) {
      setState(s => ({ ...s, loading: false, error: resp.error ?? 'Auth error' }))
      return
    }
    const expiry = Date.now() + (resp.expires_in - 60) * 1000
    fetchUserInfo(resp.access_token).then(user => {
      setState({ user, accessToken: resp.access_token, tokenExpiry: expiry, loading: false, error: null })
    })
    refreshPromiseRef.current = null
  }

  useEffect(() => {
    let cancelled = false

    if (!CLIENT_ID) {
      setState(s => ({
        ...s, loading: false,
        error: 'App not configured: VITE_GOOGLE_CLIENT_ID is missing. Set it as a GitHub repository secret.',
      }))
      return
    }

    function initClient() {
      if (cancelled) return
      try {
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID!,
          scope: SCOPES,
          callback: handleTokenResponse,
          error_callback: (err) => {
            // suppressed_by_user = silent auto-login attempt blocked → show button, no error text
            if (err.type === 'suppressed_by_user') {
              setState(s => ({ ...s, loading: false, error: null }))
            } else {
              setState(s => ({
                ...s, loading: false,
                error: friendlyError(err.type),
              }))
            }
            refreshPromiseRef.current = null
          },
        })
        tokenClientRef.current.requestAccessToken({ prompt: '' })
      } catch (e) {
        console.error('GIS initTokenClient failed:', e)
        setState(s => ({ ...s, loading: false, error: 'Google sign-in failed to initialize. See browser console.' }))
      }
    }

    // Fallback: if no callback fires in 5s, stop spinning so the button stays reachable.
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
          setState(s => ({ ...s, loading: false, error: 'Could not load Google sign-in. Check your internet connection.' }))
        })
      } else {
        setState(s => ({ ...s, loading: false, error: 'Google sign-in script not found.' }))
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
