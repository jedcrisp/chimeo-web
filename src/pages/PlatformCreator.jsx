import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { 
  Crown, 
  Shield, 
  Activity, 
  Zap, 
  Settings, 
  Users, 
  FileText, 
  BarChart3, 
  Download,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../services/firebase'
import adminService from '../services/adminService'
import SpecialAccessManager from '../components/SpecialAccessManager'

export default function PlatformCreator() {
  const { currentUser, userProfile } = useAuth()
  const { organizations } = useOrganizations()
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [organizationRequests, setOrganizationRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [showSpecialAccessModal, setShowSpecialAccessModal] = useState(false)
  const [adminOrganizations, setAdminOrganizations] = useState([])
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)

  // Platform admin UIDs - Only Jed (Platform Creator)
  const platformAdminUIDs = ['z4a9tShrtmT5W88euqy92ihQiNB3']
  const platformAdminEmails = ['jed@onetrack-consulting.com']

  // Check if user is platform admin
  const checkPlatformAdminStatus = () => {
    const isAdmin = (currentUser?.email && platformAdminEmails.includes(currentUser.email)) ||
                   (currentUser?.uid && platformAdminUIDs.includes(currentUser.uid))
    setIsPlatformAdmin(isAdmin)
    return isAdmin
  }

  // Grant platform admin access to all organizations
  const grantPlatformAdminOrgAccess = async () => {
    if (!currentUser?.uid) {
      console.log('❌ No current user found')
      toast.error('No user found. Please log in again.')
      return
    }
    
    try {
      console.log('🔧 Granting platform admin access...')
      
      // Update user profile to be organization admin
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        isOrganizationAdmin: true,
        platformAdmin: true,
        updatedAt: serverTimestamp()
      })
      console.log('✅ User profile updated')
      
      // Get all organizations and add platform admin to each
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      console.log(`✅ Found ${orgsSnapshot.docs.length} organizations`)
      
      for (const orgDoc of orgsSnapshot.docs) {
        const orgData = orgDoc.data()
        const adminIds = orgData.adminIds || {}
        const adminRoles = orgData.adminRoles || {}
        
        if (!adminIds[currentUser.uid]) {
          adminIds[currentUser.uid] = true
          adminRoles[currentUser.uid] = 'organization_admin'
          
          await updateDoc(orgDoc.ref, {
            adminIds,
            adminRoles,
            updatedAt: serverTimestamp()
          })
          
          // console.log(`✅ Added to: ${orgData.name}`)
        }
      }
      
      console.log('✅ Platform admin access granted!')
      // toast.success('Platform admin access granted!')
      
      // Reload admin organizations
      await loadAdminOrganizationsFromFirestore()
      
    } catch (error) {
      console.error('❌ Error granting platform admin access:', error)
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      })
      toast.error(`Failed to grant platform admin access: ${error.message}`)
    }
  }

  // Load admin organizations directly from Firestore
  const loadAdminOrganizationsFromFirestore = async () => {
    try {
      console.log('🔍 Loading admin organizations directly from Firestore...')
      console.log('🔍 Current user UID:', currentUser?.uid)
      
      // Check if user is platform admin first
      const isPlatformAdminUser = platformAdminUIDs.includes(currentUser?.uid)
      
      if (isPlatformAdminUser) {
        console.log('🔧 Platform Creator detected - loading all organizations for management')
        
        const orgsQuery = query(collection(db, 'organizations'))
        const orgsSnapshot = await getDocs(orgsQuery)
        
        const adminOrgs = []
        
        for (const orgDoc of orgsSnapshot.docs) {
          const orgData = orgDoc.data()
          const orgId = orgDoc.id
          
          // Platform creator has management access to ALL organizations
          adminOrgs.push({
            id: orgId,
            name: orgData.name,
            userRole: 'platform_creator',
            canManageAdmins: true,
            platformAdmin: true,
            platformCreator: true
          })
          
          console.log(`✅ Platform creator management access to: ${orgData.name}`)
        }
        
        console.log('🔍 Total organizations (platform creator):', adminOrgs.length)
        setAdminOrganizations(adminOrgs)
        setIsOrgAdmin(false) // Platform creator is NOT an org admin, but has platform access
        return adminOrgs
      } else {
        // Regular user logic
        const orgsQuery = query(collection(db, 'organizations'))
        const orgsSnapshot = await getDocs(orgsQuery)
        
        const adminOrgs = []
        
        for (const orgDoc of orgsSnapshot.docs) {
          const orgData = orgDoc.data()
          const orgId = orgDoc.id
          
          // Check if current user is in adminIds
          const adminIds = orgData.adminIds || {}
          const adminRoles = orgData.adminRoles || {}
          
          if (adminIds[currentUser?.uid]) {
            const userRole = adminRoles[currentUser?.uid] || 'admin'
            const canManageAdmins = userRole === 'organization_admin' || userRole === 'org_admin'
            
            adminOrgs.push({
              id: orgId,
              name: orgData.name,
              userRole,
              canManageAdmins
            })
            
            console.log(`✅ Found admin organization: ${orgData.name} (role: ${userRole})`)
          }
        }
        
        console.log('🔍 Total admin organizations found:', adminOrgs.length)
        setAdminOrganizations(adminOrgs)
        setIsOrgAdmin(adminOrgs.length > 0)
        return adminOrgs
      }
    } catch (error) {
      console.error('❌ Error loading admin organizations:', error)
      return []
    }
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
        updatedAt: serverTimestamp()
      })
      
      toast.success('Organization request approved!')
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
        updatedAt: serverTimestamp()
      })
      
      toast.success('Organization request rejected!')
      fetchOrganizationRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject request')
    }
  }

  // Export platform data
  const exportPlatformData = () => {
    const data = {
      organizations: organizations || [],
      organizationRequests: organizationRequests || [],
      adminOrganizations: adminOrganizations || [],
      exportDate: new Date().toISOString(),
      platformVersion: '1.0.0'
    }
    
    const filename = `platform_data_${new Date().toISOString().split('T')[0]}.json`
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Platform data exported!')
  }

  // Check platform admin status on mount
  useEffect(() => {
    if (currentUser) {
      checkPlatformAdminStatus()
    }
  }, [currentUser])

  // Load admin organizations when user changes
  useEffect(() => {
    if (currentUser && isPlatformAdmin) {
      loadAdminOrganizationsFromFirestore()
    }
  }, [currentUser, isPlatformAdmin])

  // Fetch organization requests when platform admin status changes
  useEffect(() => {
    if (isPlatformAdmin) {
      fetchOrganizationRequests()
    }
  }, [isPlatformAdmin])

  // Auto-fix platform admin access
  useEffect(() => {
    const handlePlatformAdminAccess = async () => {
      if (!currentUser?.uid || !userProfile) return
      
      const isPlatformAdminUser = platformAdminUIDs.includes(currentUser.uid)
      
      console.log('🔧 Platform admin access check:', {
        isPlatformAdminUser,
        userProfileIsOrgAdmin: userProfile.isOrganizationAdmin,
        adminOrganizationsLength: adminOrganizations.length
      })
      
      if (isPlatformAdminUser && userProfile.isOrganizationAdmin && adminOrganizations.length === 0) {
        console.log('🔧 Platform admin detected with org admin status but no admin organizations - fixing...')
        await grantPlatformAdminOrgAccess()
      }
    }
    
    handlePlatformAdminAccess()
  }, [currentUser, userProfile, adminOrganizations.length])

  // Redirect if not platform admin
  if (currentUser && !isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need platform creator access to view this page.</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Creator Header */}
        <div className="mb-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <Crown className="h-8 w-8 mr-3" />
            <div>
              <h1 className="text-3xl font-bold">Platform Creator Dashboard</h1>
              <p className="text-purple-100">You created this platform - you have full control over everything</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Platform Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Organizations</p>
                  <p className="text-2xl font-semibold text-gray-900">{organizations?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">{organizationRequests?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Admin Organizations</p>
                  <p className="text-2xl font-semibold text-gray-900">{adminOrganizations?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Platform Status</p>
                  <p className="text-2xl font-semibold text-gray-900">Active</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                Platform Management
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={grantPlatformAdminOrgAccess}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Grant Platform Admin Access
                </button>
                
                <button
                  onClick={() => {
                    console.clear()
                    console.log('🔍 CURRENT STATUS CHECK:')
                    console.log('User ID:', currentUser?.uid)
                    console.log('User Profile:', userProfile)
                    console.log('Admin Organizations:', adminOrganizations)
                    console.log('Is Platform Admin:', isPlatformAdmin)
                    console.log('Is Org Admin:', isOrgAdmin)
                    
                    // Check organization data
                    const checkOrgData = async () => {
                      try {
                        const orgsQuery = query(collection(db, 'organizations'))
                        const orgsSnapshot = await getDocs(orgsQuery)
                        
                        for (const orgDoc of orgsSnapshot.docs) {
                          const orgData = orgDoc.data()
                          console.log(`🏢 Organization: ${orgData.name}`)
                          console.log(`   Admin IDs:`, orgData.adminIds)
                          console.log(`   Admin Roles:`, orgData.adminRoles)
                          console.log(`   Contains your ID:`, orgData.adminIds?.[currentUser?.uid] === true)
                        }
                      } catch (error) {
                        console.error('Error checking org data:', error)
                      }
                    }
                    
                    checkOrgData()
                    toast.success('Status logged to console - check console now!')
                  }}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Check Current Status
                </button>
                
                <button
                  onClick={() => setShowSpecialAccessModal(true)}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Special Access
                </button>
                
                <button
                  onClick={() => window.open('/org-requests', '_blank')}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Review Organization Requests
                </button>
                
                <button
                  onClick={() => window.open('/analytics', '_blank')}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Platform Analytics
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-600" />
                System Tools
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={exportPlatformData}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Platform Data
                </button>
                
                <button
                  onClick={() => {
                    console.log('System maintenance')
                    toast.success('Maintenance mode feature coming soon!')
                  }}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System Maintenance
                </button>
                
                <button
                  onClick={() => {
                    console.log('User management')
                    toast.success('User management feature coming soon!')
                  }}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </button>
                
                <button
                  onClick={() => {
                    console.log('System logs')
                    toast.success('System logs feature coming soon!')
                  }}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  System Logs
                </button>
              </div>
            </div>
          </div>

          {/* Organization Requests */}
          {organizationRequests.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Recent Organization Requests
              </h3>
              
              <div className="space-y-4">
                {organizationRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{request.organizationName}</h4>
                        <p className="text-sm text-gray-500">{request.adminEmail}</p>
                        <p className="text-xs text-gray-400">
                          {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveRequest(request.id)}
                              className="btn-primary text-xs px-3 py-1"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectRequest(request.id)}
                              className="btn-danger text-xs px-3 py-1"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              System Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Platform Version</p>
                <p className="text-sm font-medium">1.0.0</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Environment</p>
                <p className="text-sm font-medium">Production</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Database</p>
                <p className="text-sm font-medium">Firestore</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Special Access Manager Modal */}
      {showSpecialAccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Special Access Manager</h3>
              <button 
                onClick={() => setShowSpecialAccessModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <SpecialAccessManager />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
