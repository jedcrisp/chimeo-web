import { useState, useContext, useEffect, useCallback } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from 'firebase/firestore'
import { db, auth } from '../services/firebase'
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from 'firebase/auth'
import notificationService from '../services/notificationService'
import emailService from '../services/emailService'
import { Building, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Organization request states
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState({
    organizationName: '',
    organizationType: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    officeEmail: '',
    contactEmail: '',
    website: '',
    description: '',
    // Admin setup fields
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: ''
  })
  const [userRequests, setUserRequests] = useState([])
  const [requestLoading, setRequestLoading] = useState(false)
  
  const navigate = useNavigate()
  
  console.log('🔧 Login: Component rendered')
  
  const authContext = useContext(AuthContext)
  console.log('🔧 Login: AuthContext value:', authContext)
  
  const { login, signup, signInWithGoogle, currentUser } = authContext || {}

  // Auto-redirect if user is already authenticated
  useEffect(() => {
    if (currentUser && !loading) {
      console.log('🔧 Login: User authenticated, redirecting to dashboard...')
      navigate('/')
    }
  }, [currentUser, loading, navigate])

  const fetchUserRequests = useCallback(async () => {
    if (!currentUser) return
    try {
      const requestsSnapshot = await getDocs(
        query(
          collection(db, 'organizationRequests'), 
          where('userId', '==', currentUser.uid)
        )
      )
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setUserRequests(requestsData)
    } catch (error) {
      console.error('Error fetching user requests:', error)
    }
  }, [currentUser])

  // Fetch user requests when component mounts
  useEffect(() => {
    if (currentUser) {
      fetchUserRequests()
    }
  }, [currentUser, fetchUserRequests])

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!requestForm.organizationName.trim()) {
      toast.error('Organization name is required')
      return
    }
    
    if (!requestForm.adminFirstName.trim()) {
      toast.error('Admin first name is required')
      return
    }
    
    if (!requestForm.adminLastName.trim()) {
      toast.error('Admin last name is required')
      return
    }
    
    if (!requestForm.adminEmail.trim()) {
      toast.error('Admin email is required')
      return
    }
    
    if (!requestForm.adminPassword.trim()) {
      toast.error('Admin password is required')
      return
    }
    
    if (requestForm.adminPassword !== requestForm.adminConfirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (requestForm.adminPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setRequestLoading(true)
    try {
      const requestData = {
        ...requestForm,
        userId: currentUser?.uid || null, // Allow null for non-logged in users
        userEmail: currentUser?.email || requestForm.contactEmail, // Use contact email if not logged in
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Additional fields for the app's workflow
        requestType: 'organization_creation',
        adminEmail: requestForm.adminEmail, // This will be the org admin when approved
        organizationEmail: requestForm.officeEmail // This will be the org's email
      }

      // Sanitize organization name for use as document ID
      const sanitizedOrgName = requestData.organizationName
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toLowerCase() // Convert to lowercase
      
      console.log('🔧 Login: Submitting organization request with data:', requestData)
      console.log('🔧 Login: Organization name:', requestData.organizationName)
      console.log('🔧 Login: Sanitized org name:', sanitizedOrgName)
      console.log('🔧 Login: Admin email:', requestData.adminEmail)

      // Create organization request with sanitized organization name as document ID
      const docRef = doc(db, 'organizationRequests', sanitizedOrgName)
      await setDoc(docRef, requestData)
      console.log('✅ Organization request submitted with ID:', sanitizedOrgName)
      
      // Create user account immediately for standard access
      console.log('🔧 Creating user account for immediate access...')
      let newUser = null
      try {
        // Check if user already exists
        try {
          await signInWithEmailAndPassword(auth, requestForm.adminEmail, 'dummy-password')
          throw new Error('An account with this email already exists. Please use a different email address.')
        } catch (signInError) {
          if (signInError.code === 'auth/wrong-password') {
            throw new Error('An account with this email already exists. Please use a different email address.')
          } else if (signInError.code === 'auth/user-not-found') {
            console.log('✅ Email is available for registration')
          } else {
            console.log('🔧 Email check completed, proceeding with registration')
          }
        }
        
        // Create the user account
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          requestForm.adminEmail, 
          requestForm.adminPassword
        )
        newUser = userCredential.user
        
        // Update the user's display name
        const fullName = `${requestForm.adminFirstName} ${requestForm.adminLastName}`.trim()
        await updateProfile(newUser, {
          displayName: fullName
        })
        
        console.log('✅ User account created successfully:', newUser.uid)
        
        // Create user profile in Firestore with standard access
        const userProfileData = {
          uid: newUser.uid,
          email: requestForm.adminEmail,
          displayName: fullName,
          firstName: requestForm.adminFirstName,
          lastName: requestForm.adminLastName,
          name: fullName,
          creatorName: fullName,
          isOrganizationAdmin: false, // Will be true after approval
          organizationName: requestForm.organizationName,
          organizationId: sanitizedOrgName,
          organizationType: requestForm.organizationType,
          phone: requestForm.phone,
          address: requestForm.address,
          city: requestForm.city,
          state: requestForm.state,
          zipCode: requestForm.zipCode,
          website: requestForm.website,
          description: requestForm.description,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Access level - standard until approved
          accessLevel: 'standard',
          subscriptionStatus: 'none',
          adminStatus: 'pending_approval',
          adminRole: 'pending_organization_admin',
          adminPermissions: ['view_basic'], // Limited permissions until approved
          // Request tracking
          createdFromRequest: sanitizedOrgName,
          requestStatus: 'pending_approval'
        }
        
        await setDoc(doc(db, 'users', newUser.uid), userProfileData)
        console.log('✅ User profile created with standard access')
        
        // Update the organization request with the user ID
        await setDoc(docRef, {
          ...requestData,
          userId: newUser.uid,
          userEmail: newUser.email,
          userCreated: true,
          userAccessLevel: 'standard'
        }, { merge: true })
        
        console.log('✅ Organization request updated with user information')
        
      } catch (userCreationError) {
        console.error('❌ Failed to create user account:', userCreationError)
        // Don't fail the request if user creation fails, but log it
        toast.error(`User account creation failed: ${userCreationError.message}`)
      }
      
      console.log('🔧 About to send notifications...')
      
      // Send notification to platform admin
      try {
        await notificationService.sendOrganizationRequestNotification({
          ...requestData,
          id: sanitizedOrgName
        })
        console.log('✅ Notification sent to platform admin')
      } catch (notificationError) {
        console.error('❌ Failed to send notification:', notificationError)
        // Don't fail the request if notification fails
      }

      console.log('🔧 About to send email notification...')
      console.log('🔧 Email service object:', emailService)
      console.log('🔧 Email service type:', typeof emailService)
      
      // Send email notification to platform admin
      try {
        console.log('📧 Attempting to send organization request email...')
        console.log('📧 Email service initialized:', emailService.isInitialized)
        console.log('📧 Request data:', requestData)
        
        // Ensure email service is initialized before sending
        if (!emailService.isInitialized) {
          console.log('📧 Email service not initialized, attempting to initialize...')
          await emailService.initialize()
        }
        
        const emailResult = await emailService.sendOrganizationRequestEmail({
          ...requestData,
          id: sanitizedOrgName,
          adminName: `${requestForm.adminFirstName} ${requestForm.adminLastName}`.trim()
        })
        console.log('📧 Email send result:', emailResult)
        
        if (emailResult) {
          console.log('✅ Email notification sent to platform admin')
        } else {
          console.warn('⚠️ Email service returned false - email may not have been sent')
        }
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError)
        console.error('❌ Email error details:', {
          message: emailError.message,
          stack: emailError.stack
        })
        // Don't fail the request if email fails
      }
      
      if (newUser) {
        toast.success('Organization request submitted and user account created! You now have standard access. We will review your request for premium features.')
      } else {
        toast.success('Organization request submitted successfully! We will review your request and contact you soon.')
      }
      setShowRequestForm(false)
      
      // Refresh user requests to show the new request
      fetchUserRequests()
      setRequestForm({
        organizationName: '',
        organizationType: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        officeEmail: '',
        contactEmail: '',
        website: '',
        description: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
        adminConfirmPassword: ''
      })
      // Only fetch user requests if logged in
      if (currentUser) {
        fetchUserRequests()
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error('Failed to submit request')
    } finally {
      setRequestLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <div className="h-4 w-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
      case 'rejected': return <X className="h-4 w-4" />
      default: return <div className="h-4 w-4 rounded-full border-2 border-gray-500" />
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('🔧 Login: Form submitted, isLogin:', isLogin, 'email:', email)
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        console.log('🔧 Login: Attempting login...')
        await login(email, password)
        console.log('✅ Login: Login successful')
      } else {
        console.log('🔧 Login: Attempting signup...')
        if (!displayName.trim()) {
          setError('Display name is required')
          setLoading(false)
          return
        }
        await signup(email, password, displayName.trim())
        console.log('✅ Login: Signup successful')
      }
    } catch (error) {
      console.error('❌ Login: Error during authentication:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    
    try {
      await signInWithGoogle()
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setDisplayName('')
    setError('')
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    resetForm()
  }

  const handleRequestFormChange = (e) => {
    setRequestForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center">
            <Bell className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            {isLogin ? (
              <>
                Or{' '}
                <button
                  type="button"
                  className="font-medium text-primary-600 hover:text-primary-500"
                  onClick={toggleMode}
                >
                  create a new account
                </button>
              </>
            ) : (
              <>
                Or{' '}
                <button
                  type="button"
                  className="font-medium text-primary-600 hover:text-primary-500"
                  onClick={toggleMode}
                >
                  sign in to existing account
                </button>
              </>
            )}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="displayName" className="sr-only">Full Name</label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required={!isLogin}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.91 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="ml-2">Sign in with Google</span>
              </button>
            </div>
          </div>
        </form>

        {/* Organization Request Section */}
        <div className="mt-8">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Building className="h-4 w-4 mr-2" />
              {showRequestForm ? 'Hide Request Form' : 'Create Organization Request'}
            </button>
          </div>

          {showRequestForm && (
            <div className="mt-6 bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Organization Request</h3>
              
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                    <input
                      type="text"
                      name="organizationName"
                      value={requestForm.organizationName}
                      onChange={handleRequestFormChange}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                      placeholder="Enter organization name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization Type</label>
                    <select
                      name="organizationType"
                      value={requestForm.organizationType}
                      onChange={handleRequestFormChange}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200 cursor-pointer"
                      required
                    >
                      <option value="" className="text-gray-500">Select organization type</option>
                      <option value="emergency" className="py-2">🚨 Emergency Services</option>
                      <option value="government" className="py-2">🏛️ Government</option>
                      <option value="healthcare" className="py-2">🏥 Healthcare</option>
                      <option value="education" className="py-2">🎓 Education</option>
                      <option value="business" className="py-2">💼 Business</option>
                      <option value="nonprofit" className="py-2">🤝 Non-Profit</option>
                      <option value="other" className="py-2">🔧 Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={requestForm.address}
                      onChange={handleRequestFormChange}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                      placeholder="Street address"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        value={requestForm.city}
                        onChange={handleRequestFormChange}
                        className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                        placeholder="City"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        name="state"
                        value={requestForm.state}
                        onChange={handleRequestFormChange}
                        className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                        placeholder="State"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={requestForm.zipCode}
                        onChange={handleRequestFormChange}
                        className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                        placeholder="ZIP"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={requestForm.phone}
                        onChange={handleRequestFormChange}
                        className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                        placeholder="Phone number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Office Email</label>
                      <input
                        type="email"
                        name="officeEmail"
                        value={requestForm.officeEmail}
                        onChange={handleRequestFormChange}
                        className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                        placeholder="Organization's email address"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={requestForm.contactEmail}
                      onChange={handleRequestFormChange}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                      placeholder="Your email address for communication"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      name="website"
                      value={requestForm.website}
                      onChange={handleRequestFormChange}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                      placeholder="Organization website (optional)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      name="description"
                      value={requestForm.description}
                      onChange={handleRequestFormChange}
                      rows={3}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200 resize-none"
                      placeholder="Brief description of the organization (optional)"
                    />
                  </div>
                </div>

                {/* Admin Setup Section */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Admin Account Setup</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Create the administrator account for this organization. This person will have full access to manage the organization.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Admin First Name *</label>
                        <input
                          type="text"
                          name="adminFirstName"
                          value={requestForm.adminFirstName}
                          onChange={handleRequestFormChange}
                          className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                          placeholder="Admin first name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Last Name *</label>
                        <input
                          type="text"
                          name="adminLastName"
                          value={requestForm.adminLastName}
                          onChange={handleRequestFormChange}
                          className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                          placeholder="Admin last name"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email *</label>
                      <input
                        type="email"
                        name="adminEmail"
                        value={requestForm.adminEmail}
                        onChange={handleRequestFormChange}
                        className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                        placeholder="admin@organization.com"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                        <input
                          type="password"
                          name="adminPassword"
                          value={requestForm.adminPassword}
                          onChange={handleRequestFormChange}
                          className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                          placeholder="Create password"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                        <input
                          type="password"
                          name="adminConfirmPassword"
                          value={requestForm.adminConfirmPassword}
                          onChange={handleRequestFormChange}
                          className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 sm:text-base py-3 px-4 bg-white hover:border-gray-400 transition-colors duration-200"
                          placeholder="Confirm password"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {requestLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User's Existing Requests */}
          {currentUser && userRequests.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Requests</h3>
              <div className="space-y-3">
                {userRequests.map((request) => (
                  <div key={request.id} className="p-4 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{request.organizationName}</p>
                          <p className="text-xs text-gray-500">{request.organizationType}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Admin:</strong> {request.adminFirstName} {request.adminLastName}</p>
                      <p><strong>Admin Email:</strong> {request.adminEmail}</p>
                      <p><strong>Submitted:</strong> {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
