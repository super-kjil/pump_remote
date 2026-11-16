import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/protected-route'
import { useAuth } from './contexts/auth-context'
import MainLayout from './layout/main-layout'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import { Spinner } from './components/ui/spinner'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground sm:px-6">
        <Spinner className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default App
