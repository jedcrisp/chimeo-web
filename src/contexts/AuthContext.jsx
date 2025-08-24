import { createContext, useContext, useState, useEffect } from 'react'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

const AuthContext = createContext()

export { AuthContext }

export function useAuth() {
  const context = useContext(AuthContext)
  console.log('🔧 useAuth: Hook called, context value:', context ? {
    currentUser: context.currentUser?.uid || 'null',
    loading: context.loading,
    hasLogin: typeof context.login === 'function'
  } : 'null')
  
  if (!context) {
    console.error('❌ useAuth: No context found - hook must be used within AuthProvider')
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [forceUpdate, setForceUpdate] = useState(0) // Force re-render

  console.log('🔧 AuthProvider: Component rendered, loading:', loading, 'currentUser:', currentUser, 'forceUpdate:', forceUpdate)

  async function signup(email, password, displayName) {
    try {
      console.log('🔧 AuthContext: Attempting signup with email:', email, 'displayName:', displayName)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log('✅ AuthContext: Signup successful, user created:', result.user.uid)
      
      // Update the user's display name
      if (displayName) {
        console.log('🔧 AuthContext: Updating display name...')
        await updateProfile(result.user, { displayName })
        console.log('✅ AuthContext: Display name updated')
      }
      
      // Create user profile in Firestore
      console.log('🔧 AuthContext: Creating user profile in Firestore...')
      const userProfile = {
        uid: result.user.uid,
        email: email,
        displayName: displayName || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: 'user',
        isActive: true,
        hasRequestedOrganization: false
      }
      
      await setDoc(doc(db, 'users', result.user.uid), userProfile)
      console.log('✅ AuthContext: User profile created in Firestore')
      
      return result
    } catch (error) {
      console.error('❌ AuthContext: Signup failed:', error)
      throw error
    }
  }

  async function login(email, password) {
    try {
      console.log('🔧 AuthContext: Attempting login with email:', email)
      console.log('🔧 AuthContext: Current auth state before login:', auth.currentUser?.uid || 'null')
      console.log('🔧 AuthContext: Current context state before login:', {
        currentUser: currentUser?.uid || 'null',
        loading,
        userProfile: userProfile ? 'exists' : 'null'
      })
      
      const result = await signInWithEmailAndPassword(auth, email, password)
      console.log('✅ AuthContext: Login successful:', result.user.uid)
      console.log('🔧 AuthContext: Auth state after login:', auth.currentUser?.uid || 'null')
      
      // Force a check of the current auth state
      console.log('🔧 AuthContext: Checking if auth state was updated...')
      const currentAuthUser = auth.currentUser
      if (currentAuthUser) {
        console.log('✅ AuthContext: Auth state updated successfully, current user:', currentAuthUser.uid)
        // Manually update the context state since onAuthStateChanged might not fire immediately
        console.log('🔧 AuthContext: Manually updating context state...')
        console.log('🔧 AuthContext: Setting currentUser to:', currentAuthUser.uid)
        setCurrentUser(currentAuthUser)
        console.log('🔧 AuthContext: Fetching user profile...')
        await fetchUserProfile(currentAuthUser.uid)
        console.log('🔧 AuthContext: Setting loading to false...')
        setLoading(false)
        console.log('🔧 AuthContext: Force updating context...')
        setForceUpdate(prev => prev + 1)
        console.log('🔧 AuthContext: Manual update complete. New state should be:', {
          currentUser: currentAuthUser.uid,
          loading: false,
          userProfile: 'fetched'
        })
        
        // Force a manual auth state check to ensure everything is updated
        console.log('🔧 AuthContext: Calling manual auth state check...')
        await checkAuthState()
      } else {
        console.log('❌ AuthContext: Auth state not updated after login')
      }
      
      return result
    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error)
      throw error
    }
  }

  async function signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Check if user profile exists, if not create one
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (!userDoc.exists()) {
        const userProfile = {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: 'user',
          isActive: true,
          hasRequestedOrganization: false
        }
        
        await setDoc(doc(db, 'users', result.user.uid), userProfile)
        console.log('✅ Created new user profile for Google sign-in')
      }
      
      return result
    } catch (error) {
      console.error('Error in Google sign-in:', error)
      throw error
    }
  }

  async function logout() {
    return signOut(auth)
  }

  // Manual function to check and update auth state
  async function checkAuthState() {
    console.log('🔧 AuthContext: Manual auth state check...')
    const user = auth.currentUser
    console.log('🔧 AuthContext: Current auth user:', user?.uid || 'null')
    
    if (user) {
      console.log('🔧 AuthContext: User found, updating state...')
      setCurrentUser(user)
      await fetchUserProfile(user.uid)
      setLoading(false)
      setForceUpdate(prev => prev + 1)
    } else {
      console.log('🔧 AuthContext: No user found, clearing state...')
      setCurrentUser(null)
      setUserProfile(null)
      setLoading(false)
      setForceUpdate(prev => prev + 1)
    }
  }

  async function fetchUserProfile(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        const profileData = userDoc.data()
        setUserProfile(profileData)
        console.log('✅ Fetched user profile:', profileData)
      } else {
        console.log('❌ User profile not found, creating one...')
        // Create user profile if it doesn't exist
        const newProfile = {
          uid,
          email: currentUser?.email || '',
          displayName: currentUser?.displayName || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: 'user',
          isActive: true,
          hasRequestedOrganization: false
        }
        await setDoc(doc(db, 'users', uid), newProfile)
        setUserProfile(newProfile)
        console.log('✅ Created missing user profile')
      }
    } catch (error) {
      console.error('❌ Error fetching/creating user profile:', error)
    }
  }

  useEffect(() => {
    console.log('🔧 AuthProvider: useEffect triggered, setting up auth listener...')
    console.log('🔧 AuthProvider: Current auth state when setting up listener:', auth.currentUser?.uid || 'null')
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔧 AuthProvider: Auth state changed, user:', user ? user.uid : 'null')
      console.log('🔧 AuthProvider: Previous currentUser:', currentUser?.uid || 'null')
      setCurrentUser(user)
      console.log('🔧 AuthProvider: Updated currentUser state to:', user?.uid || 'null')
      
      if (user) {
        console.log('🔧 AuthProvider: User authenticated, fetching profile...')
        await fetchUserProfile(user.uid)
      } else {
        console.log('🔧 AuthProvider: No user, clearing profile...')
        setUserProfile(null)
      }
      console.log('🔧 AuthProvider: Setting loading to false...')
      setLoading(false)
    })
    
    // Check initial auth state
    console.log('🔧 AuthProvider: Checking initial auth state...')
    const currentUser = auth.currentUser
    console.log('🔧 AuthProvider: Initial auth.currentUser:', currentUser?.uid || 'null')
    
    // If there's already a user, update the state immediately
    if (currentUser) {
      console.log('🔧 AuthProvider: User already authenticated, updating state immediately...')
      setCurrentUser(currentUser)
      fetchUserProfile(currentUser.uid)
      setLoading(false)
    }
    
    return unsubscribe
  }, []) // Empty dependency array

  const value = {
    currentUser,
    userProfile,
    loading,
    forceUpdate,
    signup,
    login,
    signInWithGoogle,
    logout,
    checkAuthState
  }

  // Log when any of the key values change
  useEffect(() => {
    console.log('🔧 AuthProvider: Key values changed - currentUser:', currentUser?.uid || 'null', 'loading:', loading)
  }, [currentUser, loading])

  // Log every time the context value is created
  console.log('🔧 AuthProvider: Context value created:', {
    currentUser: currentUser?.uid || 'null',
    userProfile: userProfile ? 'exists' : 'null',
    loading,
    hasLogin: typeof login === 'function',
    hasSignup: typeof signup === 'function',
    hasGoogleSignIn: typeof signInWithGoogle === 'function'
  })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
