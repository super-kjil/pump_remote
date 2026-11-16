import { useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase'
import { AuthContext } from './auth-context'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser)
        setLoading(false)
      },
      (error) => {
        console.error('Authentication state listener failed:', error)
        setUser(null)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),
      signOut: async () => {
        try {
          await firebaseSignOut(auth)
        } catch (error) {
          console.error('Sign-out failed:', error)
          throw error
        }
      },
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
