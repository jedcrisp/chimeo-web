import { useState, useEffect } from 'react'
import { X, MapPin, Phone, Mail, Crown, Users, Heart, UserPlus, Building, Calendar, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import adminService from '../services/adminService'

export default function OrganizationProfileCard({ organization, isOpen, onClose }) {
  const { currentUser } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(organization.followerCount || 0)

  // Initialize follow status when component mounts
  useEffect(() => {
    if (organization && currentUser) {
      const checkFollowStatus = async () => {
        try {
          const following = await adminService.isFollowingOrganization(organization.id)
          setIsFollowing(following)
        } catch (error) {
          console.error('Error checking follow status:', error)
        }
      }
      checkFollowStatus()
    }
  }, [organization, currentUser])

  // Helper function to format location data
  const formatLocation = (location) => {
    if (!location) return 'Location not specified'
    
    if (typeof location === 'string') {
      return location
    }
    
    if (typeof location === 'object') {
      const parts = []
      
      if (location.address) parts.push(location.address)
      if (location.city) parts.push(location.city)
      if (location.state) parts.push(location.state)
      if (location.zipCode) parts.push(location.zipCode)
      
      return parts.length > 0 ? parts.join(', ') : 'Location available'
    }
    
    return 'Location not specified'
  }

  // Helper function to format follower count
  const formatFollowerCount = (count) => {
    if (!count || count === 0) return '0 followers'
    if (count === 1) return '1 follower'
    return `${count} followers`
  }

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        // Unfollow logic
        await adminService.unfollowOrganization(organization.id)
        setIsFollowing(false)
        setFollowerCount(prev => Math.max(0, prev - 1))
      } else {
        // Follow logic
        await adminService.followOrganization(organization.id)
        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling follow status:', error)
    }
  }

  if (!isOpen || !organization) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-xl rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{organization.name}</h2>
              <p className="text-sm text-gray-500">
                {organization.type || 'Organization'} • {organization.memberCount || 0} members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Organization Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-4">
            {/* Description */}
            {organization.description && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">About</h3>
                <p className="text-gray-600 leading-relaxed">{organization.description}</p>
              </div>
            )}

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-3">
                {formatLocation(organization.location) !== 'Location not specified' && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{formatLocation(organization.location)}</span>
                  </div>
                )}
                {organization.contact && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{organization.contact}</span>
                  </div>
                )}
                {organization.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{organization.email}</span>
                  </div>
                )}
                {organization.website && (
                  <div className="flex items-center text-gray-600">
                    <Building className="w-5 h-5 mr-3 text-gray-400" />
                    <a 
                      href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      {organization.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Organization Type */}
            {organization.type && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Type</h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {organization.type}
                </span>
              </div>
            )}
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-4">
            {/* Statistics */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{organization.memberCount || 0}</div>
                  <div className="text-sm text-gray-500">Members</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <Heart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{followerCount}</div>
                  <div className="text-sm text-gray-500">Followers</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleFollowToggle}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    isFollowing
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                      : 'bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                
                {organization.isAdmin && (
                  <button className="w-full flex items-center justify-center px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200 rounded-lg font-medium transition-colors">
                    <Crown className="w-4 h-4 mr-2" />
                    Manage Organization
                  </button>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            {organization.recentAlerts && organization.recentAlerts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {organization.recentAlerts.slice(0, 3).map((alert, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                        <p className="text-xs text-gray-500">{alert.createdAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Organization ID: {organization.id}</span>
            <span>Last updated: {organization.updatedAt ? new Date(organization.updatedAt).toLocaleDateString() : 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
