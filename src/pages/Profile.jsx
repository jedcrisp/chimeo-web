import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { User, Mail, Calendar, Shield, Edit, Save, X, Crown, Building, Lock, LogOut, TestTube, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { doc, updateDoc, serverTimestamp, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../services/firebase'
import adminService from '../services/adminService'

export default function Profile() {
  const { userProfile, currentUser, loading } = useAuth()
  const { organizations, loading: orgsLoading } = useOrganizations()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    email: ''
  })
  const [userRole, setUserRole] = useState('user')
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)
  const [adminOrganizations, setAdminOrganizations] = useState([])
  const [organizationRequests, setOrganizationRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  // Function to get role display information
  const getRoleDisplay = (role) => {
    // If user is platform admin, show as Creator
    if (isPlatformAdmin) {
      return {
        name: 'Creator',
        icon: Crown,
        textColor: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        description: 'App creator and platform administrator'
      }
    }
    
    switch (role) {
      case 'platform_admin':
        return {
          name: 'Platform Administrator',
          icon: Crown,
          textColor: 'text-purple-700',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          description: 'Full system access and management capabilities'
        }
      case 'organization_admin':
        return {
          name: 'Organization Administrator',
          icon: Building,
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          description: `Administrator of ${adminOrganizations.length} organization${adminOrganizations.length !== 1 ? 's' : ''}`
        }
      default:
        return {
          name: 'Basic User',
          icon: Shield,
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          description: 'Standard user access to the platform'
        }
    }
  }

  // Function to update user's isOrganizationAdmin status in Firestore
  const updateUserOrgAdminStatus = async (isAdmin) => {
    try {
      if (!currentUser?.uid) return
      
      const userRef = doc(db, 'users', currentUser.uid)
      const updateData = {
        isOrganizationAdmin: isAdmin,
        updatedAt: serverTimestamp()
      }
      
      // If user is becoming an admin, also store organization info
      if (isAdmin && adminOrganizations.length > 0) {
        const primaryOrg = adminOrganizations[0] // Use first admin organization
        updateData.organizationId = primaryOrg.id
        updateData.organizationName = primaryOrg.name
        console.log('🔍 Profile: Storing organization info:', {
          organizationId: primaryOrg.id,
          organizationName: primaryOrg.name
        })
      }
      
      await updateDoc(userRef, updateData)
      console.log('✅ Profile: Updated user admin status and organization info')
      
    } catch (error) {
      console.error('❌ Error updating isOrganizationAdmin status:', error)
    }
  }

  // Test FCM token functionality
  const testFCMToken = async () => {
    try {
      console.log('🧪 FCM tokens are now managed by Cloud Functions')
      toast.info('FCM tokens are managed by Cloud Functions - no client-side testing needed')
    } catch (error) {
      console.error('❌ Error testing FCM token:', error)
      toast.error('FCM token test failed')
    }
  }

  // Check if user is platform admin (app owner)
  const checkPlatformAdminStatus = () => {
    // You can set this based on your email or user ID
    const platformAdminEmails = ['jed@onetrack-consulting.com'] // Add your email here
    const isAdmin = currentUser?.email && platformAdminEmails.includes(currentUser.email)
    setIsPlatformAdmin(isAdmin)
    return isAdmin
  }

  // Fetch all organization requests for platform admin
  const fetchOrganizationRequests = async () => {
    if (!isPlatformAdmin) return
    
    setRequestsLoading(true)
    try {
      const requestsQuery = query(
        collection(db, 'organizationRequests'),
        orderBy('createdAt', 'desc')
      )
      const requestsSnapshot = await getDocs(requestsQuery)
      
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setOrganizationRequests(requestsData)
    } catch (error) {
      console.error('Error fetching organization requests:', error)
      toast.error('Failed to load organization requests')
    } finally {
      setRequestsLoading(false)
    }
  }

  // Approve organization request
  const approveRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'organizationRequests', requestId)
      await updateDoc(requestRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        approvedAt: serverTimestamp()
      })
      
      toast.success('Request approved successfully!')
      fetchOrganizationRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Failed to approve request')
    }
  }

  // Reject organization request
  const rejectRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'organizationRequests', requestId)
      await updateDoc(requestRef, {
        status: 'rejected',
        updatedAt: serverTimestamp(),
        rejectedBy: currentUser.uid,
        rejectedAt: serverTimestamp()
      })
      
      toast.success('Request rejected')
      fetchOrganizationRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject request')
    }
  }

  // Function to determine user's role and admin status
  const determineUserRole = async () => {
    try {
      if (!currentUser) {
        return
      }
      
      console.log('🔍 Profile: Determining user role...')
      console.log('🔍 Profile: Admin service current user:', adminService.currentUser?.uid)
      console.log('🔍 Profile: Current user:', currentUser.uid)
      console.log('🔍 Profile: UserProfile:', userProfile)
      
      // First, check if userProfile has isOrganizationAdmin field (like mobile app)
      if (userProfile?.isOrganizationAdmin === true) {
        console.log('🔍 Profile: User is org admin according to userProfile.isOrganizationAdmin')
        setIsOrgAdmin(true)
        setUserRole('organization_admin')
        setAdminOrganizations([]) // We don't know which orgs yet
        return
      }
      
      console.log('🔍 Profile: Checking admin status via admin service...')
      
      // Check admin status directly via admin service
      const hasOrgAdminAccess = await adminService.hasOrganizationAdminAccess()
      console.log('🔍 Profile: Admin check result:', hasOrgAdminAccess)
      
      setIsOrgAdmin(hasOrgAdminAccess)
      
      // Update the user's isOrganizationAdmin status in Firestore if it changed
      if (userProfile?.isOrganizationAdmin !== hasOrgAdminAccess) {
        console.log('🔍 Profile: Admin status changed, updating Firestore...')
        updateUserOrgAdminStatus(hasOrgAdminAccess)
      }
      
      // Get admin organizations
      const adminOrgs = await adminService.getAdminOrganizations()
      console.log('🔍 Profile: Admin organizations:', adminOrgs)
      setAdminOrganizations(adminOrgs)
      
      // Set role based on admin status
      const role = hasOrgAdminAccess ? 'organization_admin' : 'user'
      setUserRole(role)
      
      // Update the user's organization info if they're an admin
      if (hasOrgAdminAccess && adminOrgs.length > 0) {
        console.log('🔍 Profile: User is admin, updating organization info...')
        updateUserOrgAdminStatus(true)
      }
      
      console.log('🔍 Profile: Role determined:', {
        role,
        hasOrgAdminAccess,
        adminOrgsCount: adminOrgs.length,
        adminOrgs: adminOrgs.map(org => org.name)
      })
      
      console.log('🔍 Profile: Final state:', {
        userRole,
        isOrgAdmin,
        adminOrganizations: adminOrganizations.length
      })
      
    } catch (error) {
      console.error('❌ Error determining user role:', error)
    }
  }

  // Automatically update form data when userProfile changes
  useEffect(() => {
    if (userProfile) {
      // Try to get display name from multiple sources, prioritizing creatorName
      let displayName = ''
      if (userProfile.creatorName && userProfile.creatorName.trim()) {
        displayName = userProfile.creatorName.trim()
      } else if (userProfile.displayName && userProfile.displayName.trim()) {
        displayName = userProfile.displayName.trim()
      } else if (userProfile.name && userProfile.name.trim()) {
        displayName = userProfile.name.trim()
      } else if (currentUser?.displayName && currentUser.displayName.trim()) {
        displayName = currentUser.displayName.trim()
      }
      
      setFormData({
        displayName: displayName,
        email: currentUser?.email || userProfile.email || ''
      })
    }
  }, [userProfile, currentUser])

  // Wait for everything to be loaded before determining role
  useEffect(() => {
    if (!loading && currentUser && userProfile) {
      // Force sync admin service with current user
      if (typeof currentUser === 'string') {
        console.log('⚠️ WARNING: currentUser is string in Profile, skipping admin service sync')
        return
      }
      
      console.log('🔧 Profile: Syncing admin service with current user:', currentUser.uid)
      adminService.setCurrentUser(currentUser)
      
      // Check platform admin status
      checkPlatformAdminStatus()
      
      // Give admin service a moment to process
      setTimeout(() => {
        determineUserRole()
      }, 500)
    }
  }, [loading, currentUser, userProfile])

  // Fetch organization requests when platform admin status changes
  useEffect(() => {
    if (isPlatformAdmin) {
      fetchOrganizationRequests()
    }
  }, [isPlatformAdmin])

  // Debug: Log when component mounts and when data changes
  useEffect(() => {
    // Component mounted
    console.log('🔍 Profile: Component mounted')
    if (currentUser) {
      console.log('🔍 Profile: Current user UID:', currentUser.uid)
      console.log('🔍 Profile: User email:', currentUser.email)
    }
  }, [])

  const handleSave = async () => {
    try {
      if (!currentUser?.uid) {
        toast.error('No user ID available')
        return
      }

      if (!formData.displayName.trim()) {
        toast.error('Full Name is required')
        return
      }

      // Show loading state
      toast.loading('Updating profile...')

      // Update the user profile in Firestore
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        creatorName: formData.displayName.trim(),
        updatedAt: serverTimestamp()
      })

      // Update the local userProfile state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          creatorName: formData.displayName.trim(),
          updatedAt: new Date()
        })
      }

      toast.dismiss()
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (error) {
      toast.dismiss()
      console.error('❌ Error updating profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const handleCancel = () => {
    // Reset form data to current values
    let displayName = ''
    if (userProfile?.creatorName && userProfile.creatorName.trim()) {
      displayName = userProfile.creatorName.trim()
    } else if (userProfile?.displayName && userProfile.displayName.trim()) {
      displayName = userProfile.displayName.trim()
    } else if (userProfile?.name && userProfile.name.trim()) {
      displayName = userProfile.name.trim()
    }
    
    setFormData({
      displayName: displayName,
      email: currentUser?.email || userProfile?.email || ''
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="btn-secondary flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    {formData.displayName || 'Not set'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {currentUser?.email || 'Not available'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Email address cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Created
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {userProfile?.createdAt ? new Date(userProfile.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {userProfile?.role || 'user'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Role and Admin Status */}
          <div className="card mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Role & Access</h2>
            
            <div className="space-y-4">
              {/* Current Role */}
              <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-full mr-4">
                  {(() => {
                    const IconComponent = getRoleDisplay(userRole).icon
                    return <IconComponent className="h-5 w-5 text-primary-600" />
                  })()}
                </div>
                <div className="flex-1">
                  <div className={`text-lg font-semibold ${getRoleDisplay(userRole).textColor}`}>
                    {getRoleDisplay(userRole).name}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {getRoleDisplay(userRole).description}
                  </p>
                </div>
              </div>
              
              {/* Show admin organizations if user is an org admin */}
              {isOrgAdmin && adminOrganizations.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                    <Building className="h-4 w-4 mr-2" />
                    Administrator of:
                  </h4>
                  <div className="space-y-2">
                    {adminOrganizations.map(org => (
                      <div key={org.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                          <Building className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-blue-800">{org.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={testFCMToken}
                className="w-full btn-secondary text-left flex items-center"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Push Notifications
              </button>
              <button className="w-full btn-secondary text-left">
                Change Password
              </button>
              <button className="w-full btn-secondary text-left">
                Notification Preferences
              </button>
              <button className="w-full btn-secondary text-left">
                Privacy Settings
              </button>
            </div>
          </div>

          {/* Organization Requests Management - Only for Platform Admin */}
          {isPlatformAdmin && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-purple-600" />
                Organization Requests Management
              </h3>
              
              {requestsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading requests...</p>
                </div>
              ) : organizationRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No organization requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {organizationRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {request.organizationName}
                            </h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : request.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {request.status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                              {request.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Requested by:</strong> {request.userDisplayName || request.userEmail}</p>
                            <p><strong>Email:</strong> {request.userEmail}</p>
                            <p><strong>Type:</strong> {request.requestType}</p>
                            {request.description && (
                              <p><strong>Description:</strong> {request.description}</p>
                            )}
                            {request.address && (
                              <p><strong>Address:</strong> {request.address}, {request.city}, {request.state} {request.zipCode}</p>
                            )}
                            {request.contact && (
                              <p><strong>Contact:</strong> {request.contact}</p>
                            )}
                            {request.email && (
                              <p><strong>Organization Email:</strong> {request.email}</p>
                            )}
                            {request.website && (
                              <p><strong>Website:</strong> {request.website}</p>
                            )}
                            <p><strong>Submitted:</strong> {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                          </div>
                        </div>
                        
                        {request.status === 'pending' && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => approveRequest(request.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => rejectRequest(request.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h3>
            <button className="w-full btn-danger">
              Delete Account
            </button>
            <p className="mt-2 text-xs text-gray-500">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
