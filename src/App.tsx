import { Suspense, lazy, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useIsRestoring } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SizesPage = lazy(() => import('./pages/SizesPage'))
const PlantCodePage = lazy(() => import('./pages/PlantCodePage'))
const JobOrderPage = lazy(() => import('./pages/JobOrderPage'))
const TagBuilderPage = lazy(() => import('./pages/TagBuilderPage'))
const RegisterUserPage = lazy(() => import('./pages/RegisterUserPage'))

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 10,
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }}
      />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      Loading…
    </div>
  )
}

function DefaultRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? '/joborder' : '/login'} replace />
}

function RequireAdmin() {
  const { user } = useAuth()
  if (!user || user.role !== 'admin') return <Navigate to="/joborder" replace />
  return <Outlet />
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/joborder" replace /> : <LoginPage />}
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/joborder" element={<JobOrderPage />} />
            <Route path="/plantcode" element={<PlantCodePage />} />
            <Route path="/sizes" element={<SizesPage />} />
            <Route path="/tagbuilder" element={<TagBuilderPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="/registeruser" element={<RegisterUserPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryHydrator>
          <AppRoutes />
        </QueryHydrator>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Waits for the persisted (IndexedDB) query cache to be restored before mounting
// any data-dependent page. Without this gate, the first refetchOnMount:'always'
// query fires BEFORE hydration and its fresh BAQ result can be overwritten by
// the stale persisted rows — leaving the table showing old data with nothing to
// re-fetch it. Gating ensures restore() completes first, so the 'always'
// refetch runs afterwards and the fresh Epicor result always replaces it.
function QueryHydrator({ children }: { children: ReactNode }) {
  const isRestoring = useIsRestoring()
  if (isRestoring) return <PageLoader />
  return children
}
