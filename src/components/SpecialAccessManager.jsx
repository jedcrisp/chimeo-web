import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import specialAccessService from '../services/specialAccessService'
import { collection, query, getDocs, where } from 'firebase/firestore'
import { db } from '../services/firebase'
import { 
  UserPlus, 
  Shield, 
  X, 
  Edit, 
  Trash2, 
  Clock, 
  Infinity,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SpecialAccessManager() {
  const { currentUser, userProfile } = useAuth()
  const { adminOrganizations } = useOrganizations()
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [specialAccess, setSpecialAccess] = useState([])
  const [loading, setLoading] = useState(false)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAccess, setEditingAccess] = useState(null)
  const [allOrganizations, setAllOrganizations] = useState([])
  const [orgsLoading, setOrgsLoading] = useState(false)
  const [granting, setGranting] = useState(false)
  const [grantForm, setGrantForm] = useState({
    userEmail: '',
    accessType: 'unlimited',
    reason: '',
    expiresAt: '',
    customLimits: {
      alerts: '',
      groups: '',
      members: '',
      admins: '',
      notifications: ''
    }
  })

  // Load all organizations for platform admins
  const loadAllOrganizations = async () => {
    try {
      setOrgsLoading(true)
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      const orgs = orgsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        ...doc.data()
      }))
      
      setAllOrganizations(orgs)
      console.log('🔍 Loaded all organizations for platform admin:', orgs.length)
    } catch (error) {
      console.error('❌ Error loading all organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setOrgsLoading(false)
    }
  }

  // Load special access for selected organization
  const loadSpecialAccess = async () => {
    if (!selectedOrg) return

    try {
      setLoading(true)
      const access = await specialAccessService.getOrganizationSpecialAccess(selectedOrg.id)
      setSpecialAccess(access)
    } catch (error) {
      console.error('❌ Error loading special access:', error)
      toast.error('Failed to load special access')
    } finally {
      setLoading(false)
    }
  }

  // Grant special access
  const grantSpecialAccess = async () => {
    if (granting) {
      toast.error('Please wait, already processing...')
      return
    }

    try {
      setGranting(true)
      
      if (!grantForm.userEmail || !selectedOrg) {
        toast.error('Please fill in all required fields')
        return
      }

      console.log('🔧 Granting special access...', {
        email: grantForm.userEmail,
        org: selectedOrg.name,
        accessType: grantForm.accessType
      })

      // Find user by email
      const userId = await findUserByEmail(grantForm.userEmail)
      if (!userId) {
        toast.error('User not found with that email. Please check the email address.')
        return
      }

      console.log('🔧 Access type:', grantForm.accessType)
      console.log('🔧 Available access types:', specialAccessService.getAccessTypes())
      
      const limits = grantForm.accessType === 'custom' 
        ? Object.fromEntries(
            Object.entries(grantForm.customLimits)
              .filter(([_, value]) => value !== '')
              .map(([key, value]) => [key, value === 'unlimited' ? -1 : parseInt(value)])
          )
        : specialAccessService.getAccessTypes()[grantForm.accessType.toUpperCase()].limits
      
      console.log('🔧 Final limits:', limits)

      await specialAccessService.grantSpecialAccess(
        userId,
        selectedOrg.id,
        grantForm.accessType,
        {
          ...limits,
          reason: grantForm.reason,
          expiresAt: grantForm.expiresAt ? new Date(grantForm.expiresAt) : null
        }
      )

      toast.success('Special access granted successfully!')
      setShowGrantModal(false)
      setGrantForm({
        userEmail: '',
        accessType: 'unlimited',
        reason: '',
        expiresAt: '',
        customLimits: { alerts: '', groups: '', members: '', admins: '', notifications: '' }
      })
      loadSpecialAccess()
    } catch (error) {
      console.error('❌ Error granting special access:', error)
      toast.error('Failed to grant special access')
    } finally {
      setGranting(false)
    }
  }

  // Revoke special access
  const revokeSpecialAccess = async (userId) => {
    if (!confirm('Are you sure you want to revoke this special access?')) return

    try {
      await specialAccessService.revokeSpecialAccess(userId, selectedOrg.id)
      toast.success('Special access revoked successfully!')
      loadSpecialAccess()
    } catch (error) {
      console.error('❌ Error revoking special access:', error)
      toast.error('Failed to revoke special access')
    }
  }

  // Find user by email
  const findUserByEmail = async (email) => {
    try {
      console.log('🔍 Finding user by email:', email)
      
      // Query users collection by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      )
      const usersSnapshot = await getDocs(usersQuery)
      
      if (usersSnapshot.empty) {
        console.log('❌ No user found with email:', email)
        return null
      }
      
      const userDoc = usersSnapshot.docs[0]
      const userId = userDoc.id
      const userData = userDoc.data()
      
      console.log('✅ Found user:', { userId, email: userData.email, name: userData.name })
      return userId
    } catch (error) {
      console.error('❌ Error finding user by email:', error)
      return null
    }
  }

  // Check if user is platform admin or organization admin - Only Jed
  const isPlatformAdmin = currentUser?.uid === 'z4a9tShrtmT5W88euqy92ihQiNB3' || 
                         currentUser?.email === 'jed@chimeo.app'

  // Load special access when organization changes
  useEffect(() => {
    if (selectedOrg) {
      loadSpecialAccess()
    }
  }, [selectedOrg])

  // Load organizations based on user role
  useEffect(() => {
    if (isPlatformAdmin) {
      // Platform admin can see all organizations
      loadAllOrganizations()
    } else if (adminOrganizations && adminOrganizations.length > 0 && !selectedOrg) {
      // Regular org admin uses their admin organizations
      setSelectedOrg(adminOrganizations[0])
    }
  }, [isPlatformAdmin, adminOrganizations, selectedOrg])

  // Set default organization for platform admin
  useEffect(() => {
    if (isPlatformAdmin && allOrganizations.length > 0 && !selectedOrg) {
      setSelectedOrg(allOrganizations[0])
    }
  }, [isPlatformAdmin, allOrganizations, selectedOrg])

  // Debug modal state
  useEffect(() => {
    console.log('🔧 Modal state changed:', { showGrantModal, selectedOrg })
  }, [showGrantModal, selectedOrg])
  
  if (!currentUser || (!userProfile?.isOrganizationAdmin && !isPlatformAdmin)) {
    return (
      <div className="text-center py-8">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
        <p className="text-gray-600">You need organization admin or platform creator access to manage special access.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Special Access Manager</h2>
          <p className="text-gray-600">
            {isPlatformAdmin 
              ? 'Platform Creator: Grant special access to any organization based on your judgment'
              : 'Manage special access and unlimited features for users'
            }
          </p>
        </div>
        <button
          onClick={() => {
            console.log('🔧 Grant Special Access button clicked')
            console.log('🔧 Selected org:', selectedOrg)
            setShowGrantModal(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Grant Special Access
        </button>
      </div>

      {/* Organization Selector */}
      {orgsLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading organizations...</p>
        </div>
      ) : (() => {
        const orgsToShow = isPlatformAdmin ? allOrganizations : adminOrganizations
        return orgsToShow && orgsToShow.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization {isPlatformAdmin && '(Platform Creator - All Organizations)'}
            </label>
            <select
              value={selectedOrg?.id || ''}
              onChange={(e) => {
                const org = orgsToShow.find(o => o.id === e.target.value)
                setSelectedOrg(org)
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {orgsToShow.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )
      })()}

      {/* Special Access List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Current Special Access
            {selectedOrg && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                for {selectedOrg.name}
              </span>
            )}
          </h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading...</p>
          </div>
        ) : specialAccess.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No special access granted yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {specialAccess.map((access) => (
              <div key={access.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          User ID: {access.userId}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {access.accessType} access • {access.reason}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(access.limits).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500 capitalize">{key}:</span>
                          <span className="ml-1 font-medium">
                            {value === -1 ? (
                              <span className="text-green-600 flex items-center">
                                <Infinity className="h-4 w-4 mr-1" />
                                Unlimited
                              </span>
                            ) : (
                              value
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {access.expiresAt && (
                      <div className="mt-2 text-sm text-gray-500 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Expires: {access.expiresAt.toDate().toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingAccess(access)
                        setShowEditModal(true)
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => revokeSpecialAccess(access.userId)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Special Access Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Grant Special Access</h3>
              <button
                onClick={() => setShowGrantModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                <input
                  type="email"
                  value={grantForm.userEmail}
                  onChange={(e) => setGrantForm(prev => ({ ...prev, userEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Type</label>
                <select
                  value={grantForm.accessType}
                  onChange={(e) => setGrantForm(prev => ({ ...prev, accessType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unlimited">Unlimited Access</option>
                  <option value="premium">Premium Access</option>
                  <option value="custom">Custom Limits</option>
                </select>
              </div>
              
              {grantForm.accessType === 'custom' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Custom Limits</h4>
                  <p className="text-xs text-gray-500">Set specific limits for this organization. Leave blank for default limits, enter a number for specific limit, or 'unlimited' for no limit.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alerts per Month</label>
                      <input
                        type="text"
                        value={grantForm.customLimits.alerts}
                        onChange={(e) => setGrantForm(prev => ({
                          ...prev,
                          customLimits: { ...prev.customLimits, alerts: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 100 or unlimited"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Groups</label>
                      <input
                        type="text"
                        value={grantForm.customLimits.groups}
                        onChange={(e) => setGrantForm(prev => ({
                          ...prev,
                          customLimits: { ...prev.customLimits, groups: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 50 or unlimited"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Group Members</label>
                      <input
                        type="text"
                        value={grantForm.customLimits.members || ''}
                        onChange={(e) => setGrantForm(prev => ({
                          ...prev,
                          customLimits: { ...prev.customLimits, members: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 500 or unlimited"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organization Admins</label>
                      <input
                        type="text"
                        value={grantForm.customLimits.admins}
                        onChange={(e) => setGrantForm(prev => ({
                          ...prev,
                          customLimits: { ...prev.customLimits, admins: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 10 or unlimited"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={grantForm.reason}
                  onChange={(e) => setGrantForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Reason for special access"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={grantForm.expiresAt}
                  onChange={(e) => setGrantForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={grantSpecialAccess}
                disabled={granting}
                className={`px-4 py-2 rounded-md flex items-center ${
                  granting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {granting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Granting...
                  </>
                ) : (
                  'Grant Access'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
