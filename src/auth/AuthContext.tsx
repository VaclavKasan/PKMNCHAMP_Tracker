import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { AppUser, AuthState } from '../types'

const NOT_CONFIGURED_ERROR = 'App not configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.'

interface AuthContextValue extends AuthState {
  signIn:  () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapUser(user: User): AppUser {
  const meta = user.user_metadata ?? {}
  return {
    id:      user.id,
    name:    meta.full_name ?? meta.name ?? user.email?.split('@')[0] ?? 'Trainer',
    email:   user.email ?? '',
    picture: meta.avatar_url ?? '',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(
    isSupabaseConfigured
      ? { user: null, loading: true, error: null }
      : { user: null, loading: false, error: NOT_CONFIGURED_ERROR },
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false

    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return
      setState({
        user:    data.session ? mapUser(data.session.user) : null,
        loading: false,
        error:   error?.message ?? null,
      })
    })

    // Fires on sign-in, sign-out, token refresh, and the initial session on mount.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setState({ user: session ? mapUser(session.user) : null, loading: false, error: null })
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn() {
    if (!isSupabaseConfigured) {
      setState(s => ({ ...s, error: NOT_CONFIGURED_ERROR }))
      return
    }
    setState(s => ({ ...s, loading: true, error: null }))
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    // On success the browser navigates to Google — nothing more to do here.
    // Only reachable on failure (e.g. provider misconfigured) without a redirect.
    if (error) setState(s => ({ ...s, loading: false, error: error.message }))
  }

  async function signOut() {
    await supabase.auth.signOut()
    setState({ user: null, loading: false, error: null })
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
