import { type ReactNode, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { IconBox, IconSword, IconChartBar, IconHistory } from '@tabler/icons-react'
import { useAuth } from '../auth/AuthContext'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    function handle(e: Event) {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handle)
    return () => window.removeEventListener('beforeinstallprompt', handle)
  }, [])

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const showIOSHint = isIOS && !isStandalone

  const tabs = [
    { path: '/box',     label: 'Box',     Icon: IconBox },
    { path: '/log',     label: 'Log',     Icon: IconSword },
    { path: '/stats',   label: 'Stats',   Icon: IconChartBar },
    { path: '/history', label: 'History', Icon: IconHistory },
  ]

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg font-semibold text-gray-900">PokéTracker</h1>
        <div className="flex items-center gap-2">
          {installPrompt && (
            <button
              onClick={handleInstall}
              className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50"
            >
              Install App
            </button>
          )}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-48 z-50">
                  <p className="px-4 py-1 text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="px-4 pb-2 text-xs text-gray-500 truncate">{user.email}</p>
                  <hr className="border-gray-100" />
                  <button
                    onClick={() => { signOut(); setShowUserMenu(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* iOS install hint */}
      {showIOSHint && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-700 text-center">
          Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install this app
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex">
          {tabs.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <Icon size={22} strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
