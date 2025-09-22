import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Users, Plus, Search, Building, MapPin, Phone, Mail, Heart, UserPlus } from 'lucide-react'
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import adminService from '../services/adminService'

export default function MyGroups() {
  const { currentUser, userProfile } = useAuth()
  const [followedGroups, setFollowedGroups] = useState([])
  const [allGroups, setAllGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllGroups, setShowAllGroups] = useState(true)

  useEffect(() => {
    if (currentUser && userProfile) {
      loadUserGroups()
    }
  }, [currentUser, userProfile])

  const loadUserGroups = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading user groups...')
      
      // Load followed groups
      const followed = await loadFollowedGroups()
      setFollowedGroups(followed)
      
      // Load all available groups
      const all = await loadAllGroups()
      setAllGroups(all)
      
      console.log('✅ Loaded', followed.length, 'followed groups and', all.length, 'total groups')
    } catch (error) {
      console.error('❌ Error loading user groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFollowedGroups = async () => {
    try {
      if (!currentUser) return []
      
      // Get user's followed groups directly from database
      const userRef = doc(db, 'users', currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        console.log('User document not found')
        return []
      }
      
      const userData = userDoc.data()
      const followedGroupIds = userData.followedGroups || []
      
      if (followedGroupIds.length === 0) {
        console.log('No followed groups found')
        return []
      }
      
      const groups = []
      for (const groupId of followedGroupIds) {
        try {
          const groupData = await adminService.getGroupById(groupId)
          if (groupData) {
            groups.push(groupData)
          }
        } catch (error) {
          console.error('Error loading group:', groupId, error)
        }
      }
      
      return groups
    } catch (error) {
      console.error('Error loading followed groups:', error)
      return []
    }
  }

  const loadAllGroups = async () => {
    try {
      // Get all organizations first
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      const allGroups = []
      for (const orgDoc of orgsSnapshot.docs) {
        try {
          const groupsQuery = query(
            collection(db, 'organizations', orgDoc.id, 'groups'),
            where('isActive', '==', true)
          )
          const groupsSnapshot = await getDocs(groupsQuery)
          
          groupsSnapshot.docs.forEach(groupDoc => {
            allGroups.push({
              id: groupDoc.id,
              ...groupDoc.data(),
              organizationId: orgDoc.id,
              organizationName: orgDoc.data().name
            })
          })
        } catch (error) {
          console.error('Error loading groups for org:', orgDoc.id, error)
        }
      }
      
      return allGroups
    } catch (error) {
      console.error('Error loading all groups:', error)
      return []
    }
  }

  const toggleFollowGroup = async (groupId) => {
    try {
      const isFollowing = followedGroups.some(g => g.id === groupId)
      
      if (isFollowing) {
        // Unfollow group
        await adminService.unfollowGroup(groupId)
        setFollowedGroups(prev => prev.filter(g => g.id !== groupId))
        console.log('✅ Unfollowed group:', groupId)
      } else {
        // Follow group
        await adminService.followGroup(groupId)
        const groupToAdd = allGroups.find(g => g.id === groupId)
        if (groupToAdd) {
          setFollowedGroups(prev => [...prev, groupToAdd])
        }
        console.log('✅ Followed group:', groupId)
      }
    } catch (error) {
      console.error('❌ Error toggling group follow:', error)
      alert('Error updating group follow status. Please try again.')
    }
  }

  const filteredGroups = allGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const isFollowingGroup = (groupId) => {
    return followedGroups.some(g => g.id === groupId)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
          <p className="text-gray-600 mt-1">
            Manage which groups you follow to receive alerts
          </p>
        </div>
        <button
          onClick={() => setShowAllGroups(!showAllGroups)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showAllGroups ? 'Show Only Followed' : 'Discover New Groups'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Groups Following</p>
              <p className="text-2xl font-bold text-gray-900">{followedGroups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Groups Available</p>
              <p className="text-2xl font-bold text-gray-900">{allGroups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Heart className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Organizations</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(followedGroups.map(g => g.organizationId)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups by name, organization, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {(showAllGroups ? filteredGroups : followedGroups).map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {group.organizationName}
                  </span>
                </div>
                
                {group.description && (
                  <p className="text-gray-600 mb-3">{group.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-1" />
                    <span>{group.organizationName}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{group.memberCount || 0} members</span>
                  </div>
                  
                  {group.contact && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      <span>
                        {typeof group.contact === 'string' 
                          ? group.contact 
                          : group.contact.phone || group.contact.email || 'Contact available'
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="ml-4">
                <button
                  onClick={() => toggleFollowGroup(group.id)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isFollowingGroup(group.id)
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {isFollowingGroup(group.id) ? (
                    <>
                      <Heart className="h-4 w-4 mr-1 inline" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1 inline" />
                      Follow
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {filteredGroups.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
            <p className="text-gray-600">Try adjusting your search terms</p>
          </div>
        )}
        
        {followedGroups.length === 0 && !showAllGroups && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No groups followed yet</h3>
            <p className="text-gray-600 mb-4">Start following groups to receive alerts</p>
            <button
              onClick={() => setShowAllGroups(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Discover Groups
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
