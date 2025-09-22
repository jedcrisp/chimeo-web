import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { Building, Search, MapPin, Phone, Mail, Heart, UserPlus, Users, Crown } from 'lucide-react'
import adminService from '../services/adminService'

export default function DiscoverOrganizations() {
  const { currentUser, userProfile } = useAuth()
  const { organizations } = useOrganizations()
  const [followedOrgs, setFollowedOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (currentUser && userProfile) {
      loadUserData()
    }
  }, [currentUser, userProfile])

  const loadUserData = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading user organization data...')
      
      // Load followed organizations
      const followed = await loadFollowedOrganizations()
      setFollowedOrgs(followed)
      
      console.log('✅ Loaded', followed.length, 'followed organizations')
    } catch (error) {
      console.error('❌ Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFollowedOrganizations = async () => {
    try {
      if (!userProfile?.followedOrganizations) return []
      
      return organizations.filter(org => 
        userProfile.followedOrganizations.includes(org.id)
      )
    } catch (error) {
      console.error('Error loading followed organizations:', error)
      return []
    }
  }

  const toggleFollowOrganization = async (orgId) => {
    try {
      const isFollowing = followedOrgs.some(org => org.id === orgId)
      
      if (isFollowing) {
        // Unfollow organization
        await adminService.unfollowOrganization(orgId)
        setFollowedOrgs(prev => prev.filter(org => org.id !== orgId))
        console.log('✅ Unfollowed organization:', orgId)
      } else {
        // Follow organization
        await adminService.followOrganization(orgId)
        const orgToAdd = organizations.find(org => org.id === orgId)
        if (orgToAdd) {
          setFollowedOrgs(prev => [...prev, orgToAdd])
        }
        console.log('✅ Followed organization:', orgId)
      }
    } catch (error) {
      console.error('❌ Error toggling organization follow:', error)
      alert('Error updating organization follow status. Please try again.')
    }
  }

  const formatLocation = (location) => {
    if (!location) return null
    if (typeof location === 'string') return location
    if (typeof location === 'object' && location !== null) {
      return [location.address, location.city, location.state, location.zipCode]
        .filter(Boolean)
        .join(', ')
    }
    return null
  }

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (org.contact && org.contact.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'following' && followedOrgs.some(f => f.id === org.id)) ||
                         (filterType === 'not-following' && !followedOrgs.some(f => f.id === org.id))
    
    return matchesSearch && matchesFilter
  })

  const isFollowingOrganization = (orgId) => {
    return followedOrgs.some(org => org.id === orgId)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Discover Organizations</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Discover Organizations</h1>
          <p className="text-gray-600 mt-1">
            Find and follow organizations to stay updated with their groups and alerts
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Organizations Following</p>
              <p className="text-2xl font-bold text-gray-900">{followedOrgs.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Organizations</p>
              <p className="text-2xl font-bold text-gray-900">{organizations.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Heart className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Available to Follow</p>
              <p className="text-2xl font-bold text-gray-900">
                {organizations.length - followedOrgs.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations by name, description, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('following')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterType === 'following'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setFilterType('not-following')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterType === 'not-following'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Not Following
            </button>
          </div>
        </div>
      </div>

      {/* Organizations List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrganizations.map((org) => (
          <div key={org.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                  {org.isAdmin && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </span>
                  )}
                </div>
                
                {org.description && (
                  <p className="text-gray-600 mb-3">{org.description}</p>
                )}
              </div>
              
              <button
                onClick={() => toggleFollowOrganization(org.id)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isFollowingOrganization(org.id)
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {isFollowingOrganization(org.id) ? (
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
            
            <div className="space-y-2">
              {formatLocation(org.location) && (
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{formatLocation(org.location)}</span>
                </div>
              )}
              
              {org.contact && (
                <div className="flex items-center text-sm text-gray-500">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>
                    {typeof org.contact === 'string' 
                      ? org.contact 
                      : org.contact.phone || org.contact.email || 'Contact available'
                    }
                  </span>
                </div>
              )}
              
              {org.email && (
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{org.email}</span>
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-2" />
                <span>{org.followerCount || 0} followers</span>
              </div>
            </div>
          </div>
        ))}
        
        {filteredOrganizations.length === 0 && (
          <div className="col-span-full text-center py-8">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
            <p className="text-gray-600">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
