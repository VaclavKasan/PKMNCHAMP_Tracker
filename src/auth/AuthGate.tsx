import React from 'react'
import { useAuth } from './AuthContext'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error, signIn } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Signing in&hellip;</p>
      </div>
    </div>
  )

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="text-6xl mb-4">⚔️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Champions Tracker</h1>
        <p className="text-gray-500 text-sm mb-8">
          Your match data is saved to your private account. Only you can see it, unless you add a friend.
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          onClick={() => signIn()}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
          Sign in with Google
        </button>
      </div>
    </div>
  )

  return <>{children}</>
}
