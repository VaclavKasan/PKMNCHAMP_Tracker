import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY

if (!isSupabaseConfigured) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — check .env.local')
}

// createClient() throws synchronously on an empty URL/key, which would
// white-screen the whole app before AuthContext gets a chance to show a
// friendly "not configured" message — fall back to harmless placeholders so
// construction always succeeds; isSupabaseConfigured gates actual use.
// (`||` not `??`: an env var defined-but-empty in .env.local is `""`, which
// `??` would happily pass straight through to createClient.)
const url = SUPABASE_URL || 'https://placeholder.supabase.co'
const key = SUPABASE_ANON_KEY || 'placeholder-anon-key'

// PKCE flow returns the OAuth redirect as a `?code=` query param instead of a
// `#access_token=` hash fragment — required so it doesn't collide with
// HashRouter's own use of location.hash for route paths (`#/box`).
export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})
