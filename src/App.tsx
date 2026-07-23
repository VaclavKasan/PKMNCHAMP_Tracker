import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AuthGate }    from './auth/AuthGate'
import { ViewingProvider } from './context/ViewingContext'
import { Layout }      from './components/Layout'

const BoxPage     = lazy(() => import('./pages/BoxPage').then(m => ({ default: m.BoxPage })))
const LogPage     = lazy(() => import('./pages/LogPage').then(m => ({ default: m.LogPage })))
const StatsPage   = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const FriendsPage = lazy(() => import('./pages/FriendsPage').then(m => ({ default: m.FriendsPage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <ViewingProvider>
          <HashRouter>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/"        element={<Navigate to="/box" replace />} />
                  <Route path="/box"     element={<BoxPage />} />
                  <Route path="/log"              element={<LogPage />} />
                  <Route path="/log/edit/:matchId" element={<LogPage />} />
                  <Route path="/stats"   element={<StatsPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/friends" element={<FriendsPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </HashRouter>
        </ViewingProvider>
      </AuthGate>
    </AuthProvider>
  )
}
