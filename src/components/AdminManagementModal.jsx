import { useState, useEffect } from 'react'
import { X, Search, UserPlus, Trash2, Crown, Mail, User, AlertCircle, CheckCircle, Bell } from 'lucide-react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import adminService from '../services/adminService'
import toast from 'react-hot-toast'

export default function AdminManagementModal({ isOpen, onClose, organization }) {
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [currentAdmins, setCurrentAdmins] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    if (isOpen && organization) {
      loadCurrentAdmins()
    }
  }, [isOpen, organization])

  const loadCurrentAdmins = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading current admins for organization:', organization.id)
      
      // If this is a test organization, find the real organization in Firestore
      let realOrgId = organization.id
      
      if (organization.id === 'test-velocity') {
        console.log('🔍 Test organization detected, finding real organization in Firestore...')
        
        // Search for the real organization by name
        const orgsQuery = query(collection(db, 'organizations'))
        const orgsSnapshot = await getDocs(orgsQuery)
        
        for (const doc of orgsSnapshot.docs) {
          const orgData = doc.data()
          if (orgData.name === 'Velocity Physical Therapy North Denton') {
            realOrgId = doc.id
            console.log('✅ Found real organization ID:', realOrgId)
            break
          }
        }
        
        if (realOrgId === 'test-velocity') {
          console.error('❌ Real organization not found in Firestore')
          toast.error('Real organization not found in Firestore')
          return
        }
      }
      
      // Get admin IDs from the real organization
      const orgDoc = await getDoc(doc(db, 'organizations', realOrgId))
      if (!orgDoc.exists()) {
        console.error('Organization not found:', realOrgId)
        toast.error('Organization not found')
        return
      }
      
      const orgData = orgDoc.data()
      const adminIds = orgData.adminIds || {}
      const adminRoles = orgData.adminRoles || {}
      const adminUserIds = Object.keys(adminIds).filter(id => adminIds[id] === true)
      
      console.log('🔍 Organization data:', {
        name: orgData.name,
        adminIds: adminIds,
        adminRoles: adminRoles,
        adminUserIds: adminUserIds
      })
      
      // Debug: Check each admin's role
      adminUserIds.forEach(userId => {
        const role = adminRoles[userId] || 'admin'
        console.log(`🔍 User ${userId} role: "${role}" (type: ${typeof role})`)
      })
      
      // Get user details for each admin
      const adminPromises = adminUserIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const role = adminRoles[userId] || 'admin'
            console.log(`🔍 User ${userId} (${userData.displayName || userData.email}): role = "${role}"`)
            
            return {
              id: userId,
              role: role,
              ...userData
            }
          }
          return null
        } catch (error) {
          console.error('Error loading admin user:', userId, error)
          return null
        }
      })
      
      const admins = (await Promise.all(adminPromises)).filter(Boolean)
      setCurrentAdmins(admins)
      console.log('✅ Loaded current admins from Firestore:', admins)
      
    } catch (error) {
      console.error('❌ Error loading current admins:', error)
      toast.error('Failed to load current admins')
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async () => {
    if (!searchEmail.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      console.log('🔍 Searching for user with exact email:', searchEmail)
      
      // Search for user by exact email match
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', searchEmail.toLowerCase().trim())
      )
      
      const usersSnapshot = await getDocs(usersQuery)
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Check if user is already an admin
      const adminIds = currentAdmins.map(admin => admin.id)
      const isAlreadyAdmin = adminIds.includes(users[0]?.id)
      
      if (users.length === 0) {
        setSearchResults([])
        toast.error('No user found with that email address')
      } else if (isAlreadyAdmin) {
        setSearchResults([])
        toast.error('This user is already an admin of this organization')
      } else {
        setSearchResults(users)
        console.log('✅ Found user:', users[0])
      }
      
    } catch (error) {
      console.error('❌ Error searching users:', error)
      toast.error('Failed to search users')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const addAdmin = async (user, adminType = 'admin') => {
    try {
      console.log('👤 Adding', adminType, ':', user.email, 'to organization:', organization.id)
      
      // Use the enhanced addOrganizationAdmin function that includes notifications
      await adminService.addOrganizationAdmin(user.id, organization.id, adminType)
      
      // Update local state
      const newAdmin = { ...user, role: adminType }
      setCurrentAdmins(prev => [...prev, newAdmin])
      setSearchResults(prev => prev.filter(u => u.id !== user.id))
      setSelectedUser(null)
      
      const roleDisplay = adminType === 'organization_admin' ? 'Organization Admin' : 'Admin'
      toast.success(`Added ${user.email} as ${roleDisplay}. Notifications sent!`)
      console.log('✅ Successfully added', adminType, 'with notifications')
      
    } catch (error) {
      console.error('❌ Error adding admin:', error)
      toast.error('Failed to add admin: ' + error.message)
    }
  }

  const removeAdmin = async (user) => {
    if (!window.confirm(`Are you sure you want to remove ${user.email} as an admin?`)) {
      return
    }

    try {
      console.log('👤 Removing admin:', user.email, 'from organization:', organization.id)
      
      await adminService.removeOrganizationAdmin(user.id, organization.id)
      
      // Update local state
      setCurrentAdmins(prev => prev.filter(admin => admin.id !== user.id))
      
      toast.success(`Removed ${user.email} as admin`)
      console.log('✅ Successfully removed admin')
      
    } catch (error) {
      console.error('❌ Error removing admin:', error)
      toast.error('Failed to remove admin')
    }
  }

  const sendAdminNotification = async (admin) => {
    try {
      console.log('🔔 Sending admin notification to:', admin.email)
      
      await adminService.sendAdminAccessNotification(admin.id, organization.id)
      
      toast.success(`Admin access notification sent to ${admin.email}`)
      console.log('✅ Admin notification sent successfully')
      
    } catch (error) {
      console.error('❌ Error sending admin notification:', error)
      toast.error('Failed to send notification: ' + error.message)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    searchUsers()
  }

  if (!isOpen || !organization) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Admins</h2>
            <p className="text-sm text-gray-600 mt-1">{organization.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Add Admin Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Add New Admin
            </h3>
            
            <form onSubmit={handleSearchSubmit} className="mb-4">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter exact email address..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading || !searchEmail.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {searchLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Find User
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">User Found:</h4>
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.displayName || user.firstName + ' ' + user.lastName || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => addAdmin(user, 'admin')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Admin
                      </button>
                      <button
                        onClick={() => addAdmin(user, 'org_admin')}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 flex items-center"
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        Add Org Admin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchEmail && searchResults.length === 0 && !searchLoading && (
              <div className="text-center py-4 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No users found with that email address</p>
              </div>
            )}
          </div>

          {/* Current Admins Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Crown className="h-5 w-5 mr-2" />
              Current Admins ({currentAdmins.length})
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading admins...</p>
              </div>
            ) : currentAdmins.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Crown className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No admins found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Crown className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {admin.displayName || admin.firstName + ' ' + admin.lastName || 'Unknown User'}
                        </p>
                        <p className="text-sm text-blue-600">{admin.email}</p>
                        {(admin.role === 'organization_admin' || admin.role === 'org_admin') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                            <Crown className="h-3 w-3 mr-1" />
                            Organization Admin
                          </span>
                        )}
                        {admin.role === 'admin' && !(admin.role === 'organization_admin' || admin.role === 'org_admin') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                            <User className="h-3 w-3 mr-1" />
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => sendAdminNotification(admin)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Send Notification
                      </button>
                      <button
                        onClick={() => removeAdmin(admin)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
