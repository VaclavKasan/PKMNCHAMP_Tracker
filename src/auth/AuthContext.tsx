import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { AuthState, GoogleUser } from '../types'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ')

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
    function initClient() {
      tokenClientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: handleTokenResponse,
        error_callback: (err) => {
          setState(s => ({ ...s, loading: false, error: `Sign-in failed: ${err.type}` }))
          refreshPromiseRef.current = null
        },
      })
      tokenClientRef.current.requestAccessToken({ prompt: '' })
    }

    if (typeof google !== 'undefined') {
      initClient()
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      script?.addEventListener('load', initClient)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function signIn() {
    setState(s => ({ ...s, loading: true, error: null }))
    tokenClientRef.current?.requestAccessToken({ prompt: 'select_account' })
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
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
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
