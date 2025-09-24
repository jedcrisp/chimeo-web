import { useState, useEffect } from 'react'
import { Users, Plus, MapPin, Phone, Mail, Crown, Settings, Heart, UserPlus, X, Eye } from 'lucide-react'
import { useOrganizations } from '../contexts/OrganizationsContext'
import adminService from '../services/adminService'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, where, getDocs, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import OrganizationProfileCard from '../components/OrganizationProfileCard'
import toast from 'react-hot-toast'

export default function Organizations() {
  const { organizations, loading, refreshFollowerCount, fetchOrganizations } = useOrganizations()
  const { currentUser } = useAuth()
  
  const [adminOrgs, setAdminOrgs] = useState([])
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [followingStatus, setFollowingStatus] = useState({})
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [followers, setFollowers] = useState([])
  const [followersLoading, setFollowersLoading] = useState(false)
  const [showProfileCard, setShowProfileCard] = useState(false)
  const [selectedProfileOrg, setSelectedProfileOrg] = useState(null)

  useEffect(() => {
    if (currentUser && organizations.length > 0) {
      // Check admin access
      const adminAccess = adminService.hasOrganizationAdminAccess()
      setHasAdminAccess(adminAccess)
      
      // Get organizations where user is admin
      adminService.getAdminOrganizations().then(adminOrgs => {
        setAdminOrgs(adminOrgs)
      })

      // Check following status for all organizations
      checkFollowingStatus()
    }
  }, [currentUser, organizations])


  // Check following status for all organizations
  const checkFollowingStatus = async () => {
    const status = {}
    for (const org of organizations) {
      try {
        const isFollowing = await adminService.isFollowingOrganization(org.id)
        status[org.id] = isFollowing
      } catch (error) {
        console.error(`Error checking follow status for ${org.name}:`, error)
        status[org.id] = false
      }
    }
    setFollowingStatus(status)
  }

  // Check if user is admin of a specific organization
  const isAdminOfOrganization = (orgId) => {
    return adminOrgs.some(org => org.id === orgId)
  }

  // Helper function to format location data
  const formatLocation = (location) => {
    if (!location) return null
    
    // If location is a string, return it as is
    if (typeof location === 'string') {
      return location
    }
    
    // If location is an object, format it
    if (typeof location === 'object' && location !== null) {
      const parts = []
      
      if (location.address) parts.push(location.address)
      if (location.city) parts.push(location.city)
      if (location.state) parts.push(location.state)
      if (location.zipCode) parts.push(location.zipCode)
      
      return parts.length > 0 ? parts.join(', ') : 'Location available'
    }
    
    // Fallback: convert to string if it's not null/undefined
    if (location !== null && location !== undefined) {
      console.warn('Unexpected location type:', typeof location, location)
      return String(location)
    }
    
    return null
  }

  // Helper function to format follower count
  const formatFollowerCount = (count) => {
    if (!count || count === 0) return '0 followers'
    if (count === 1) return '1 follower'
    return `${count} followers`
  }

  // Function to fetch followers for an organization
  const fetchFollowers = async (orgId) => {
    setFollowersLoading(true)
    try {
      console.log('🔍 Fetching followers for organization:', orgId)
      
      // Get all users who have this organization in their followedOrganizations array
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)
      
      const followersData = []
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        const followedOrganizations = userData.followedOrganizations || []
        
        // Check if this user follows the organization
        if (followedOrganizations.includes(orgId)) {
          followersData.push({
            id: userDoc.id,
            userId: userDoc.id,
            adminId: userDoc.id, // For compatibility with existing UI
            userProfile: userData,
            createdAt: userData.createdAt || new Date(), // Use user creation date as fallback
            organizationId: orgId
          })
        }
      }
      
      console.log('✅ Found', followersData.length, 'followers for organization:', orgId)
      setFollowers(followersData)
      
    } catch (error) {
      console.error('Error fetching followers:', error)
      setFollowers([])
    } finally {
      setFollowersLoading(false)
    }
  }

  // Function to open followers modal
  const openFollowersModal = async (org) => {
    setSelectedOrg(org)
    setShowFollowersModal(true)
    
    // Refresh the follower count for this organization
    const updatedCount = await refreshFollowerCount(org.id)
    console.log('🔄 Refreshed follower count for', org.name, ':', updatedCount)
    
    // Fetch the followers list
    fetchFollowers(org.id)
  }

  // Function to open organization profile card
  const openProfileCard = async (org) => {
    setSelectedProfileOrg(org)
    setShowProfileCard(true)
    
    // Check follow status for this organization
    try {
      const following = await adminService.isFollowingOrganization(org.id)
      setFollowingStatus(prev => ({ ...prev, [org.id]: following }))
    } catch (error) {
      console.error('Error checking follow status:', error)
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

      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage organizations in your area
            </p>
          </div>
          {hasAdminAccess && (
            <button className="btn-primary flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>New Organization</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Organizations Section */}
      {hasAdminAccess && adminOrgs.length > 0 && (
        <div className="card">
          <div className="flex items-center mb-4">
            <Crown className="h-5 w-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Organizations You Admin</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {adminOrgs.map((org) => {
              const formattedLocation = formatLocation(org.location)
              const isFollowing = followingStatus[org.id] || false
              
              return (
                <div key={org.id} className="p-4 border border-gray-200 rounded-lg bg-yellow-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{org.description || 'No description'}</p>
                      
                      <div className="mt-4 space-y-2">
                        {formattedLocation && typeof formattedLocation === 'string' && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-2" />
                            {formattedLocation}
                          </div>
                        )}
                        {org.contact && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 mr-2" />
                            {org.contact}
                          </div>
                        )}
                        {org.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-2" />
                            {org.email}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {org.memberCount > 0 && (
                            <span>{org.memberCount} members</span>
                          )}
                          <span className="flex items-center">
                            <Heart className={`h-4 w-4 mr-1 ${isFollowing ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                            {formatFollowerCount(org.followerCount)}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            className="btn-secondary text-sm px-3 py-1"
                            onClick={() => openProfileCard(org)}
                          >
                            View Details
                          </button>
                          <button 
                            className="btn-primary text-sm px-3 py-1 flex items-center"
                            onClick={() => openFollowersModal(org)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Followers
                          </button>
                          {isAdminOfOrganization(org.id) && (
                            <button className="btn-primary text-sm px-3 py-1 flex items-center">
                              <Settings className="h-3 w-3 mr-1" />
                              Manage
                            </button>
                          )}
                          <button 
                            className={`text-sm px-3 py-1 flex items-center rounded-lg ${
                              isFollowing 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All Organizations Section */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">All Organizations</h2>
        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
            <p className="mt-1 text-sm text-gray-500">
              {hasAdminAccess ? 'Get started by creating your first organization.' : 'No organizations are available yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {organizations.map((org) => {
              const isFollowing = followingStatus[org.id] || false
              const formattedLocation = formatLocation(org.location)
              
              return (
                <div key={org.id} className={`p-4 border rounded-lg ${isAdminOfOrganization(org.id) ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                        {isAdminOfOrganization(org.id) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{org.description || 'No description'}</p>
                      
                      <div className="mt-4 space-y-2">
                        {formattedLocation && typeof formattedLocation === 'string' && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-2" />
                            {formattedLocation}
                          </div>
                        )}
                        {org.contact && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 mr-2" />
                            {org.contact}
                          </div>
                        )}
                        {org.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-2" />
                            {org.email}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {org.memberCount > 0 && (
                            <span>{org.memberCount} members</span>
                          )}
                          <span className="flex items-center">
                            <Heart className={`h-4 w-4 mr-1 ${isFollowing ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                            {formatFollowerCount(org.followerCount)}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            className="btn-secondary text-sm px-3 py-1"
                            onClick={() => openProfileCard(org)}
                          >
                            View Details
                          </button>
                          <button 
                            className="btn-primary text-sm px-3 py-1 flex items-center"
                            onClick={() => openFollowersModal(org)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Followers
                          </button>
                          {isAdminOfOrganization(org.id) && (
                            <button className="btn-primary text-sm px-3 py-1 flex items-center">
                              <Settings className="h-3 w-3 mr-1" />
                              Manage
                            </button>
                          )}
                          <button 
                            className={`text-sm px-3 py-1 flex items-center rounded-lg ${
                              isFollowing 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Followers Modal */}
      {showFollowersModal && selectedOrg && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Followers of {selectedOrg.name}
              </h3>
              <button
                onClick={() => setShowFollowersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {followersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : followers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No followers yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This organization doesn't have any followers yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                
                {followers.map((follower) => (
                  <div key={follower.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {follower.userProfile?.displayName?.charAt(0) || 
                             follower.userProfile?.email?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {follower.userProfile?.displayName || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {follower.userProfile?.email || 'No email'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          User ID: {follower.userId || follower.id}
                        </p>
                        <p className="text-xs text-gray-400">
                          Following since {follower.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Heart className="h-3 w-3 mr-1" />
                        Follower
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowFollowersModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Profile Card */}
      {showProfileCard && selectedProfileOrg && (
        <OrganizationProfileCard
          organization={selectedProfileOrg}
          isOpen={showProfileCard}
          onClose={() => setShowProfileCard(false)}
        />
      )}

    </div>
  )
}
