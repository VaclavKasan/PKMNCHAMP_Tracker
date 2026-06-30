import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AuthGate }    from './auth/AuthGate'
import { Layout }      from './components/Layout'
import { BoxPage }     from './pages/BoxPage'
import { LogPage }     from './pages/LogPage'
import { StatsPage }   from './pages/StatsPage'
import { HistoryPage } from './pages/HistoryPage'

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/"        element={<Navigate to="/box" replace />} />
              <Route path="/box"     element={<BoxPage />} />
              <Route path="/log"     element={<LogPage />} />
              <Route path="/stats"   element={<StatsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AuthGate>
    </AuthProvider>
  )
}
