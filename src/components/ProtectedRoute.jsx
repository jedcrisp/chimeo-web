import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth()
  
  console.log('🔧 ProtectedRoute: Component rendered with:', {
    currentUser: currentUser?.uid || 'null',
    loading,
    hasChildren: !!children
  })

  if (loading) {
    console.log('🔧 ProtectedRoute: Showing loading spinner')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!currentUser) {
    console.log('🔧 ProtectedRoute: No current user, redirecting to login')
    return <Navigate to="/login" />
  }

  console.log('🔧 ProtectedRoute: User authenticated, rendering children')
  return children
}
