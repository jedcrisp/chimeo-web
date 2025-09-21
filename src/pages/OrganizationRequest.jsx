import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore'
import { db, auth } from '../services/firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { Building, MapPin, Phone, Mail, Users, Plus, CheckCircle, X, User, Lock, MessageSquare, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import notificationService from '../services/notificationService'
import emailService from '../services/emailService'

export default function OrganizationRequest() {
  const { currentUser, userProfile } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState({
    organizationName: '',
    organizationType: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    officeEmail: '',
    contactEmail: '', // Admin contact email
    website: '',
    requestType: 'create', // 'create' for new organizations
    // Admin setup fields
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: ''
  })
  const [userRequests, setUserRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('') // 'approve', 'reject', 'request_info'
  const [actionMessage, setActionMessage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchOrganizations()
    fetchUserRequests()
  }, [currentUser])

  const fetchOrganizations = async () => {
    try {
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      const orgsData = orgsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setOrganizations(orgsData)
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRequests = async () => {
    if (!currentUser) return
    
    try {
      // Check if user is platform admin
      const isPlatformAdmin = currentUser.email === 'jed@onetrack-consulting.com'
      
      let requestsQuery
      if (isPlatformAdmin) {
        // Platform admin sees all requests
        requestsQuery = query(
          collection(db, 'organizationRequests'),
          orderBy('createdAt', 'desc')
        )
      } else {
        // Regular users see their own requests and requests with null userId (from non-logged-in submissions)
        // We need to fetch all requests and filter client-side since Firestore doesn't support null in 'in' queries
        requestsQuery = query(
          collection(db, 'organizationRequests'),
          orderBy('createdAt', 'desc')
        )
      }
      
      const requestsSnapshot = await getDocs(requestsQuery)
      
      let requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Filter for regular users (show their own requests + null userId requests)
      if (!isPlatformAdmin) {
        requestsData = requestsData.filter(request => 
          request.userId === currentUser.uid || request.userId === null
        )
      }
      
      console.log('🔧 OrganizationRequest: Fetched requests:', requestsData)
      requestsData.forEach((request, index) => {
        console.log(`🔧 OrganizationRequest: Request ${index + 1}:`, {
          id: request.id,
          organizationName: request.organizationName,
          adminEmail: request.adminEmail,
          status: request.status,
          userId: request.userId
        })
      })
      
      setUserRequests(requestsData)
    } catch (error) {
      console.error('Error fetching user requests:', error)
    }
  }

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

    try {
      const requestData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userDisplayName: userProfile?.displayName || currentUser.displayName || '',
        // Organization details
        organizationName: requestForm.organizationName.trim(),
        organizationType: requestForm.organizationType.trim(),
        description: requestForm.description.trim(),
        address: requestForm.address.trim(),
        city: requestForm.city.trim(),
        state: requestForm.state.trim(),
        zipCode: requestForm.zipCode.trim(),
        phone: requestForm.phone.trim(),
        officeEmail: requestForm.officeEmail.trim(),
        website: requestForm.website.trim(),
        // Admin details
        adminFirstName: requestForm.adminFirstName.trim(),
        adminLastName: requestForm.adminLastName.trim(),
        adminEmail: requestForm.adminEmail.trim(),
        adminPassword: requestForm.adminPassword, // Note: In production, this should be hashed
        contactEmail: requestForm.contactEmail.trim(),
        requestType: requestForm.requestType,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Sanitize organization name for use as document ID
      const sanitizedOrgName = requestData.organizationName
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toLowerCase() // Convert to lowercase
      
      console.log('🔧 OrganizationRequest: Submitting organization request with data:', requestData)
      console.log('🔧 OrganizationRequest: Organization name:', requestData.organizationName)
      console.log('🔧 OrganizationRequest: Sanitized org name:', sanitizedOrgName)
      console.log('🔧 OrganizationRequest: Admin email:', requestData.adminEmail)

      // Create organization request with sanitized organization name as document ID
      const docRef = doc(db, 'organizationRequests', sanitizedOrgName)
      await setDoc(docRef, requestData)
      console.log('✅ Organization request submitted with ID:', sanitizedOrgName)
      
      // Send notification to platform admin
      try {
        await notificationService.sendOrganizationRequestNotification({
          ...requestData,
          id: sanitizedOrgName
        })
        console.log('✅ Push notification sent to platform admin')
      } catch (notificationError) {
        console.error('❌ Failed to send push notification:', notificationError)
        // Don't fail the request if notification fails
      }

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
          id: sanitizedOrgName
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
      
      toast.success('Organization request submitted successfully!')
      setRequestForm({
        organizationName: '',
        organizationType: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        officeEmail: '',
        contactEmail: '',
        website: '',
        requestType: 'create',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
        adminConfirmPassword: ''
      })
      setShowRequestForm(false)
      
      // Refresh user requests
      fetchUserRequests()
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error('Failed to submit request')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'info_requested':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <X className="h-4 w-4" />
      case 'pending':
        return <div className="h-4 w-4 rounded-full bg-yellow-600" />
      case 'info_requested':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-600" />
    }
  }

  // Action functions
  const handleAction = (request, type) => {
    setSelectedRequest(request)
    setActionType(type)
    setActionMessage('')
    setShowActionModal(true)
  }

  const executeAction = async () => {
    if (!selectedRequest || !actionType) return

    setActionLoading(true)
    try {
      // If approving, create the admin user account first
      if (actionType === 'approve') {
        console.log('🔧 Starting approval process...')
        console.log('🔧 Request data:', selectedRequest)
        console.log('🔧 Admin email from request:', selectedRequest.adminEmail)
        console.log('🔧 Admin password from request:', selectedRequest.adminPassword ? '***' : 'MISSING')
        console.log('🔧 Admin first name:', selectedRequest.adminFirstName)
        console.log('🔧 Admin last name:', selectedRequest.adminLastName)
        
        try {
          await createAdminUserAccount(selectedRequest)
          console.log('✅ Admin account creation completed')
        } catch (userCreationError) {
          console.error('❌ Failed to create admin user account:', userCreationError)
          console.error('❌ Error details:', {
            message: userCreationError.message,
            code: userCreationError.code,
            stack: userCreationError.stack
          })
          
          // Show more specific error message
          const errorMessage = userCreationError.message || 'Failed to create admin account'
          toast.error(`Failed to create admin account: ${errorMessage}`)
          setActionLoading(false)
          return // Stop here if user creation fails
        }
      }

      const requestRef = doc(db, 'organizationRequests', selectedRequest.id)
      const updateData = {
        status: actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'info_requested',
        updatedAt: serverTimestamp(),
        [actionType === 'approve' ? 'approvedBy' : actionType === 'reject' ? 'rejectedBy' : 'infoRequestedBy']: currentUser.uid,
        [actionType === 'approve' ? 'approvedAt' : actionType === 'reject' ? 'rejectedAt' : 'infoRequestedAt']: serverTimestamp()
      }

      if (actionMessage.trim()) {
        updateData.adminMessage = actionMessage.trim()
      }

      await updateDoc(requestRef, updateData)
      
      const successMessage = actionType === 'approve' 
        ? 'Request approved and admin account created successfully!' 
        : actionType === 'reject' 
        ? 'Request rejected successfully!' 
        : 'Information request sent successfully!'
      
      toast.success(successMessage)
      setShowActionModal(false)
      setSelectedRequest(null)
      setActionType('')
      setActionMessage('')
      
      // Refresh requests
      fetchUserRequests()
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error('Failed to update request')
    } finally {
      setActionLoading(false)
    }
  }

  // Geocoding function to get coordinates from address
  const geocodeAddress = async (address, city, state, zipCode) => {
    try {
      // Clean and format the address
      const fullAddress = `${address}, ${city}, ${state} ${zipCode}`.trim()
      console.log('🌍 Geocoding address:', fullAddress)
      
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const encodedAddress = encodeURIComponent(fullAddress)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`
      
      console.log('🌍 Geocoding URL:', url)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Chimeo-Web-App/1.0' // Required by Nominatim
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('🌍 Geocoding response:', data)
      
      if (data && data.length > 0) {
        const result = data[0]
        const coordinates = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        }
        
        // Validate coordinates
        if (isNaN(coordinates.latitude) || isNaN(coordinates.longitude)) {
          console.warn('⚠️ Invalid coordinates received:', coordinates)
          return { latitude: null, longitude: null }
        }
        
        console.log('✅ Geocoding successful:', coordinates)
        console.log('✅ Full address found:', result.display_name)
        return coordinates
      } else {
        console.warn('⚠️ No coordinates found for address:', fullAddress)
        
        // Try with just city and state as fallback
        const fallbackAddress = `${city}, ${state}`
        console.log('🌍 Trying fallback geocoding with:', fallbackAddress)
        
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}&limit=1`
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Chimeo-Web-App/1.0'
          }
        })
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          if (fallbackData && fallbackData.length > 0) {
            const fallbackResult = fallbackData[0]
            const fallbackCoordinates = {
              latitude: parseFloat(fallbackResult.lat),
              longitude: parseFloat(fallbackResult.lon)
            }
            
            if (!isNaN(fallbackCoordinates.latitude) && !isNaN(fallbackCoordinates.longitude)) {
              console.log('✅ Fallback geocoding successful:', fallbackCoordinates)
              return fallbackCoordinates
            }
          }
        }
        
        return { latitude: null, longitude: null }
      }
    } catch (error) {
      console.error('❌ Geocoding failed:', error)
      console.error('❌ Error details:', error.message)
      return { latitude: null, longitude: null }
    }
  }

  const createAdminUserAccount = async (request) => {
    try {
      // Sanitize organization name for use as document ID
      const sanitizedOrgName = request.organizationName
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toLowerCase() // Convert to lowercase
      
      console.log('🔧 Original org name:', request.organizationName)
      console.log('🔧 Sanitized org name:', sanitizedOrgName)
      
      console.log('🔧 Creating admin user account for:', request.adminEmail)
      console.log('🔧 Password length:', request.adminPassword?.length)
      console.log('🔧 Current auth user:', auth.currentUser?.email)
      console.log('🔧 Auth object:', auth)
      console.log('🔧 Auth config:', auth.config)
      console.log('🔧 Auth app:', auth.app)
      
      // Validate required fields
      if (!request.adminEmail || !request.adminPassword) {
        throw new Error('Admin email and password are required')
      }
      
      if (request.adminPassword.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }
      
      // Check if email already exists by trying to create the user
      console.log('🔧 Attempting to create Firebase Auth user...')
      console.log('🔧 Auth domain:', auth.config.authDomain)
      console.log('🔧 Auth API key:', auth.config.apiKey)
      console.log('🔧 Auth app name:', auth.app.name)
      
      // Test if auth is properly configured
      if (!auth.config.apiKey) {
        throw new Error('Firebase Auth is not properly configured - missing API key')
      }
      
      // Check if email already exists by attempting to sign in first
      console.log('🔧 Checking if email already exists:', request.adminEmail)
      try {
        const { signInWithEmailAndPassword } = await import('firebase/auth')
        await signInWithEmailAndPassword(auth, request.adminEmail, 'dummy-password')
        // If we get here, the email exists but password is wrong
        throw new Error('An account with this email already exists. Please use a different email address.')
      } catch (signInError) {
        if (signInError.code === 'auth/user-not-found') {
          console.log('✅ Email is available for registration')
        } else if (signInError.code === 'auth/wrong-password') {
          throw new Error('An account with this email already exists. Please use a different email address.')
        } else if (signInError.code === 'auth/invalid-email') {
          throw new Error('Invalid email address format.')
        } else {
          console.log('🔧 Email check completed, proceeding with registration')
        }
      }
      
      // Check if user already exists by trying to create
      console.log('🔧 Attempting to create user with email:', request.adminEmail)
      console.log('🔧 Firebase Auth config check:', {
        apiKey: auth.config?.apiKey ? 'Present' : 'Missing',
        authDomain: auth.config?.authDomain,
        projectId: auth.config?.projectId
      })
      
      let userCredential
      try {
        userCredential = await createUserWithEmailAndPassword(
          auth, 
          request.adminEmail, 
          request.adminPassword
        )
      } catch (authError) {
        console.error('❌ Firebase Auth Error Details:', {
          code: authError.code,
          message: authError.message,
          email: request.adminEmail,
          authConfig: auth.config
        })
        
        // Provide more specific error messages
        if (authError.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Please use a different email address.')
        } else if (authError.code === 'auth/invalid-email') {
          throw new Error('Invalid email address format.')
        } else if (authError.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please choose a stronger password.')
        } else if (authError.code === 'auth/operation-not-allowed') {
          throw new Error('Email/password accounts are not enabled. Please contact support.')
        } else if (authError.code === 'auth/network-request-failed') {
          throw new Error('Network error. Please check your internet connection and try again.')
        } else {
          throw new Error(`Authentication failed: ${authError.message} (Code: ${authError.code})`)
        }
      }
      
      const newUser = userCredential.user
      console.log('✅ Firebase Auth user created successfully:', newUser.uid)
      console.log('✅ User email:', newUser.email)
      
      // Update the user's display name
      const fullName = `${request.adminFirstName} ${request.adminLastName}`.trim()
      console.log('🔧 Setting display name to:', fullName)
      
      await updateProfile(newUser, {
        displayName: fullName
      })
      
      console.log('✅ Display name updated successfully')
      
      // Create user profile in Firestore
      const userProfileData = {
        uid: newUser.uid,
        email: request.adminEmail,
        displayName: `${request.adminFirstName} ${request.adminLastName}`,
        firstName: request.adminFirstName,
        lastName: request.adminLastName,
        name: `${request.adminFirstName} ${request.adminLastName}`,
        creatorName: `${request.adminFirstName} ${request.adminLastName}`,
        isOrganizationAdmin: true,
        organizationName: request.organizationName,
        organizationId: sanitizedOrgName, // Using sanitized organization name as ID
        organizationType: request.organizationType,
        phone: request.phone,
        address: request.address,
        city: request.city,
        state: request.state,
        zipCode: request.zipCode,
        website: request.website,
        description: request.description,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Admin-specific fields
        adminStatus: 'active',
        adminRole: 'organization_admin',
        adminPermissions: ['manage_organization', 'manage_users', 'manage_alerts', 'manage_calendar'],
        // Request tracking
        createdFromRequest: request.id,
        approvedBy: currentUser.uid,
        approvedAt: serverTimestamp()
      }
      
      await setDoc(doc(db, 'users', newUser.uid), userProfileData)
      console.log('✅ User profile created in Firestore')
      
      // Get coordinates from address using geocoding
      console.log('🌍 Getting coordinates for organization address...')
      console.log('🌍 Address details:', {
        address: request.address,
        city: request.city,
        state: request.state,
        zipCode: request.zipCode
      })
      const coordinates = await geocodeAddress(request.address, request.city, request.state, request.zipCode)
      console.log('🌍 Coordinates obtained:', coordinates)
      console.log('🌍 Coordinates type check:', {
        latitude: typeof coordinates.latitude,
        longitude: typeof coordinates.longitude,
        latitudeValue: coordinates.latitude,
        longitudeValue: coordinates.longitude
      })

      // Create the organization document
      console.log('🔧 Creating organization with name:', request.organizationName)
      const organizationData = {
        name: request.organizationName,
        organizationName: request.organizationName, // Duplicate for mobile app compatibility
        displayName: request.organizationName, // Display name for UI
        title: request.organizationName, // Alternative title field
        type: request.organizationType,
        description: request.description,
        address: request.address,
        city: request.city,
        state: request.state,
        zipCode: request.zipCode,
        phone: request.phone,
        email: request.officeEmail,
        website: request.website,
        // Web app compatibility - contact field
        contact: request.phone,
        // Web app compatibility - location object (mirroring first org structure)
        location: {
          address: request.address,
          city: request.city,
          state: request.state,
          zipCode: request.zipCode,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        },
        adminId: newUser.uid,
        adminEmail: request.adminEmail,
        adminName: `${request.adminFirstName} ${request.adminLastName}`,
        // Web app compatibility - adminIds object
        adminIds: {
          [newUser.uid]: true
        },
        memberCount: 1,
        followerCount: 0,
        isActive: true,
        status: 'active',
        verified: true, // iOS app requires this field to display organization (boolean, not string)
        // Additional fields to match first organization structure
        alertCount: 0,
        groups: [],
        logoURL: null, // Will be set when logo is uploaded
        // Additional web app compatibility fields
        isAdmin: true, // For the current user
        recentAlerts: [], // Empty array for now
        // Additional fields for mobile app compatibility
        organizationId: null, // Will be set after creation
        createdBy: newUser.uid,
        approvedBy: currentUser.uid,
        approvedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdFromRequest: request.id,
        // Mobile app specific fields
        isPublic: true,
        allowJoinRequests: true,
        // Additional mobile app compatibility fields
        isVisible: true,
        isDiscoverable: true,
        isFollowable: true,
        isJoinable: true,
        visibility: 'public',
        category: request.organizationType,
        tags: [request.organizationType.toLowerCase()],
        contact: {
          phone: request.phone,
          email: request.officeEmail,
          website: request.website
        },
        social: {
          website: request.website,
          email: request.officeEmail
        },
        // Debug fields
        debugInfo: {
          createdFromWeb: true,
          originalRequestId: request.id,
          createdTimestamp: new Date().toISOString(),
          webAppVersion: '1.0.0'
        },
        settings: {
          allowPublicAlerts: true,
          allowMemberInvites: true,
          requireApprovalForJoining: false,
          allowFollowers: true,
          allowComments: true,
          allowShares: true
        }
      }
      
      // Create organization with sanitized organization name as document ID
      const orgDocRef = doc(db, 'organizations', sanitizedOrgName)
      await setDoc(orgDocRef, organizationData)
      console.log('✅ Organization created with name as ID:', sanitizedOrgName)
      console.log('✅ Organization data:', organizationData)
      console.log('✅ Organization document path:', `organizations/${sanitizedOrgName}`)
      console.log('✅ Organization verified status:', organizationData.verified)
      
      // Verify the organization was created correctly
      const verifyDoc = await getDoc(orgDocRef)
      if (verifyDoc.exists()) {
        const orgData = verifyDoc.data()
        console.log('✅ Organization verification successful:', orgData)
        console.log('🌍 Stored coordinates verification:', {
          latitude: orgData.location?.latitude,
          longitude: orgData.location?.longitude,
          latitudeType: typeof orgData.location?.latitude,
          longitudeType: typeof orgData.location?.longitude
        })
      } else {
        console.error('❌ Organization verification failed - document not found')
      }
      
      // Update the organization with its own ID (using the sanitized organization name)
      await updateDoc(orgDocRef, {
        organizationId: sanitizedOrgName
      })
      console.log('✅ Organization ID updated to:', sanitizedOrgName)
      
      // Update the user profile with the organization ID
      await updateDoc(doc(db, 'users', newUser.uid), {
        organizationId: sanitizedOrgName,
        organizations: [{
          id: sanitizedOrgName,
          name: request.organizationName, // Keep original name for display
          role: 'admin',
          joinedAt: new Date().toISOString()
        }]
      })
      
      // Update the request with the created user and organization IDs
      await updateDoc(doc(db, 'organizationRequests', request.id), {
        createdUserId: newUser.uid,
        createdOrganizationId: sanitizedOrgName,
        adminAccountCreated: true,
        organizationCreated: true
      })
      
      // Send multiple notifications to trigger mobile app refresh
      try {
        // Save notifications under the platform admin's subcollection
        const sanitizedEmail = 'jed@onetrack-consulting.com'.replace(/[^a-zA-Z0-9]/g, '_')
        
        // General organization created notification
        const orgCreatedId = `org_created_${Date.now()}`
        await setDoc(doc(db, 'notifications', sanitizedEmail, 'user_notifications', orgCreatedId), {
          type: 'organization_created',
          title: 'New Organization Created',
          message: `${request.organizationName} has been created and is now available`,
          organizationId: sanitizedOrgName,
          organizationName: request.organizationName,
          adminId: newUser.uid,
          adminEmail: request.adminEmail,
          targetUser: 'jed@onetrack-consulting.com',
          createdAt: serverTimestamp(),
          sent: true
        })
        
        // Mobile app specific refresh notification
        const refreshId = `refresh_${Date.now()}`
        await setDoc(doc(db, 'notifications', sanitizedEmail, 'user_notifications', refreshId), {
          type: 'data_refresh_required',
          title: 'Data Refresh Required',
          message: 'New organization data available - please refresh',
          dataType: 'organizations',
          organizationId: sanitizedOrgName,
          organizationName: request.organizationName,
          targetUser: 'all', // Send to all users
          createdAt: serverTimestamp(),
          sent: true
        })
        
        // Organization list update notification
        const listUpdateId = `list_update_${Date.now()}`
        await setDoc(doc(db, 'notifications', sanitizedEmail, 'user_notifications', listUpdateId), {
          type: 'organization_list_updated',
          title: 'Organization List Updated',
          message: 'New organization added to the list',
          organizationId: sanitizedOrgName,
          organizationName: request.organizationName,
          action: 'added',
          targetUser: 'all',
          createdAt: serverTimestamp(),
          sent: true
        })
        
        console.log('✅ Organization creation notifications sent')
      } catch (notificationError) {
        console.error('❌ Failed to send organization creation notifications:', notificationError)
      }

      // Send email notification to the new admin
      try {
        console.log('📧 Attempting to send organization approval email...')
        console.log('📧 Email service initialized:', emailService.isInitialized)
        console.log('📧 Admin email:', request.adminEmail)
        console.log('📧 Organization data:', organizationData)
        
        // Ensure email service is initialized before sending
        if (!emailService.isInitialized) {
          console.log('📧 Email service not initialized, attempting to initialize...')
          await emailService.initialize()
        }
        
        const emailResult = await emailService.sendOrganizationApprovedEmail(organizationData, request.adminEmail)
        console.log('📧 Email send result:', emailResult)
        
        if (emailResult) {
          console.log('✅ Organization approval email sent to admin')
        } else {
          console.warn('⚠️ Email service returned false - email may not have been sent')
        }
      } catch (emailError) {
        console.error('❌ Failed to send organization approval email:', emailError)
        console.error('❌ Email error details:', {
          message: emailError.message,
          stack: emailError.stack
        })
        // Don't fail the process if email fails
      }
      
      // Refresh the organizations list to show the new organization
      try {
        // Trigger a page refresh or context update
        window.location.reload()
      } catch (refreshError) {
        console.error('❌ Failed to refresh page:', refreshError)
      }
      
      console.log('✅ Admin account and organization setup complete')
      
    } catch (error) {
      console.error('❌ Error creating admin account:', error)
      console.error('❌ Error code:', error.code)
      console.error('❌ Error message:', error.message)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create admin account'
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email address is already in use'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak'
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled'
      } else {
        errorMessage = `Failed to create admin account: ${error.message}`
      }
      
      throw new Error(errorMessage)
    }
  }

  const getActionButtonText = (type) => {
    switch (type) {
      case 'approve': return 'Approve'
      case 'reject': return 'Reject'
      case 'request_info': return 'Request Info'
      default: return 'Action'
    }
  }

  const getActionButtonColor = (type) => {
    switch (type) {
      case 'approve': return 'bg-green-600 hover:bg-green-700 text-white'
      case 'reject': return 'bg-red-600 hover:bg-red-700 text-white'
      case 'request_info': return 'bg-blue-600 hover:bg-blue-700 text-white'
      default: return 'bg-gray-600 hover:bg-gray-700 text-white'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            {currentUser?.email === 'jed@onetrack-consulting.com' 
              ? 'Manage all organization requests and create new ones'
              : 'Request to create a new organization with admin account setup'
            }
          </p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Request</span>
        </button>
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900">Create Organization Request</h3>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitRequest} className="space-y-6">
                {/* Organization Information */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Building className="h-5 w-5 mr-2 text-blue-600" />
                    Organization Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={requestForm.organizationName}
                        onChange={(e) => setRequestForm({ ...requestForm, organizationName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter organization name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Type
                      </label>
                      <select
                        value={requestForm.organizationType}
                        onChange={(e) => setRequestForm({ ...requestForm, organizationType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select type</option>
                        <option value="business">Business</option>
                        <option value="nonprofit">Non-profit</option>
                        <option value="government">Government</option>
                        <option value="education">Education</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={requestForm.description}
                      onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Describe the organization's purpose and activities"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={requestForm.address}
                        onChange={(e) => setRequestForm({ ...requestForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Street address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={requestForm.city}
                        onChange={(e) => setRequestForm({ ...requestForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="City"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={requestForm.state}
                        onChange={(e) => setRequestForm({ ...requestForm, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="State"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={requestForm.zipCode}
                        onChange={(e) => setRequestForm({ ...requestForm, zipCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="ZIP Code"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={requestForm.phone}
                        onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Phone number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Office Email
                      </label>
                      <input
                        type="email"
                        value={requestForm.officeEmail}
                        onChange={(e) => setRequestForm({ ...requestForm, officeEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="office@organization.com"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={requestForm.website}
                      onChange={(e) => setRequestForm({ ...requestForm, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Admin Setup */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-green-600" />
                    Admin Account Setup
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Create the administrator account for this organization. This person will have full access to manage the organization.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={requestForm.adminFirstName}
                        onChange={(e) => setRequestForm({ ...requestForm, adminFirstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Admin first name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={requestForm.adminLastName}
                        onChange={(e) => setRequestForm({ ...requestForm, adminLastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Admin last name"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={requestForm.adminEmail}
                      onChange={(e) => setRequestForm({ ...requestForm, adminEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="admin@organization.com"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={requestForm.adminPassword}
                        onChange={(e) => setRequestForm({ ...requestForm, adminPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Create password"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={requestForm.adminConfirmPassword}
                        onChange={(e) => setRequestForm({ ...requestForm, adminConfirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={requestForm.contactEmail}
                      onChange={(e) => setRequestForm({ ...requestForm, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Additional contact email (optional)"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User's Requests */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {currentUser?.email === 'jed@onetrack-consulting.com' ? 'All Organization Requests' : 'Your Requests'}
        </h2>
        
        {userRequests.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No requests submitted yet</p>
            <p className="text-sm text-gray-400 mt-1">Submit your first organization request above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userRequests.map((request) => (
              <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.organizationName}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Admin:</strong> {request.adminFirstName} {request.adminLastName}</p>
                      <p><strong>Admin Email:</strong> {request.adminEmail}</p>
                      <p><strong>Organization Type:</strong> {request.organizationType || 'Not specified'}</p>
                      {request.description && (
                        <p><strong>Description:</strong> {request.description}</p>
                      )}
                      {request.address && (
                        <p><strong>Address:</strong> {request.address}, {request.city}, {request.state} {request.zipCode}</p>
                      )}
                      {request.phone && (
                        <p><strong>Phone:</strong> {request.phone}</p>
                      )}
                      {request.officeEmail && (
                        <p><strong>Office Email:</strong> {request.officeEmail}</p>
                      )}
                      {request.website && (
                        <p><strong>Website:</strong> {request.website}</p>
                      )}
                      <p><strong>Submitted:</strong> {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                      {request.adminAccountCreated && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-xs text-green-800 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <strong>Admin Account Created:</strong> {request.createdUserId ? `User ID: ${request.createdUserId}` : 'Account created successfully'}
                          </p>
                        </div>
                      )}
                      {request.organizationCreated && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-xs text-green-800 flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            <strong>Organization Created:</strong> {request.createdOrganizationId ? `Org ID: ${request.createdOrganizationId}` : 'Organization created successfully'}
                          </p>
                        </div>
                      )}
                      {request.adminMessage && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-800"><strong>Admin Message:</strong> {request.adminMessage}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons for platform admins */}
                  {currentUser?.email === 'jed@onetrack-consulting.com' && request.status === 'pending' && !request.adminAccountCreated && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleAction(request, 'approve')}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleAction(request, 'reject')}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center space-x-1"
                      >
                        <X className="h-3 w-3" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleAction(request, 'request_info')}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>Request Info</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {actionType === 'approve' ? 'Approve Request' : 
                   actionType === 'reject' ? 'Reject Request' : 
                   'Request More Information'}
                </h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Organization:</strong> {selectedRequest.organizationName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Admin:</strong> {selectedRequest.adminFirstName} {selectedRequest.adminLastName} ({selectedRequest.adminEmail})
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {actionType === 'approve' ? 'Approval Message (Optional)' :
                   actionType === 'reject' ? 'Rejection Reason (Optional)' :
                   'Information Request Message'}
                </label>
                <textarea
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={
                    actionType === 'approve' ? 'Add a welcome message or instructions...' :
                    actionType === 'reject' ? 'Explain why the request was rejected...' :
                    'What additional information do you need?'
                  }
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${getActionButtonColor(actionType)} disabled:opacity-50`}
                >
                  {actionLoading ? 'Processing...' : getActionButtonText(actionType)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
