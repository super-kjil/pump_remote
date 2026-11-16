import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import AuthLoading from './auth-loading'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <AuthLoading />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
