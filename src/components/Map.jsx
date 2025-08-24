import { useState, useEffect, useRef } from 'react'
import { MapPin, Users, Phone, Mail, Crown, Navigation } from 'lucide-react'
import { useOrganizations } from '../contexts/OrganizationsContext'
import adminService from '../services/adminService'
import { useAuth } from '../contexts/AuthContext'

export default function Map() {
  const { organizations, loading } = useOrganizations()
  const { currentUser } = useAuth()
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }) // Center of US
  const [userLocation, setUserLocation] = useState(null)
  const [adminOrgs, setAdminOrgs] = useState([])
  const [followingStatus, setFollowingStatus] = useState({})
  const mapRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (currentUser && organizations.length > 0) {
      // Get organizations where user is admin
      adminService.getAdminOrganizations().then(adminOrgs => {
        setAdminOrgs(adminOrgs)
      })

      // Check following status for all organizations
      checkFollowingStatus()
    }
  }, [currentUser, organizations])

  useEffect(() => {
    // Initialize map when component mounts
    initMap()
    
    // Get user's current location
    getUserLocation()
  }, [])

  // Initialize the map
  const initMap = () => {
    // For now, we'll create a simple map visualization
    // In production, you'd integrate with Google Maps, Mapbox, or similar
    console.log('🗺️ Initializing map...')
  }

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          setMapCenter({ lat: latitude, lng: longitude })
          console.log('📍 User location:', { lat: latitude, lng: longitude })
        },
        (error) => {
          console.log('❌ Error getting location:', error)
        }
      )
    }
  }

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

  // Helper function to format location data
  const formatLocation = (location) => {
    if (!location) return null
    
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
    
    return null
  }

  // Get coordinates from location object
  const getCoordinates = (location) => {
    if (!location || typeof location !== 'object') return null
    
    if (location.latitude && location.longitude) {
      return { lat: location.latitude, lng: location.longitude }
    }
    
    return null
  }

  // Filter organizations that have valid coordinates
  const getMappableOrganizations = () => {
    return organizations.filter(org => {
      const coords = getCoordinates(org.location)
      return coords && coords.lat && coords.lng
    })
  }

  // Handle organization selection
  const handleOrgSelect = (org) => {
    setSelectedOrg(org)
    
    // Center map on selected organization
    const coords = getCoordinates(org.location)
    if (coords) {
      setMapCenter(coords)
    }
  }

  // Get directions to organization
  const getDirections = (org) => {
    const coords = getCoordinates(org.location)
    if (coords) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
      window.open(url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const mappableOrgs = getMappableOrganizations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Map</h1>
        <p className="mt-1 text-sm text-gray-500">
          View pinned and approved organizations on the map
        </p>
      </div>

      {/* Map Container */}
      <div className="card p-0 overflow-hidden">
        <div className="bg-gray-100 h-96 relative">
          {/* Placeholder Map - In production, integrate with Google Maps/Mapbox */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Map</h3>
              <p className="text-sm text-gray-500 mb-4">
                {mappableOrgs.length} organizations with location data
              </p>
              <p className="text-xs text-gray-400">
                Map integration coming soon - Google Maps/Mapbox
              </p>
            </div>
          </div>

          {/* Organization Markers (simplified for now) */}
          {mappableOrgs.map((org, index) => {
            const coords = getCoordinates(org.location)
            const isAdmin = adminOrgs.some(adminOrg => adminOrg.id === org.id)
            const isFollowing = followingStatus[org.id] || false
            
            if (!coords) return null

            return (
              <div
                key={org.id}
                className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${50 + (index * 20)}%`,
                  top: `${30 + (index * 15)}%`
                }}
                onClick={() => handleOrgSelect(org)}
              >
                <div className={`w-4 h-4 rounded-full border-2 ${
                  isAdmin ? 'bg-yellow-500 border-yellow-600' : 'bg-blue-500 border-blue-600'
                }`} />
                {isAdmin && (
                  <Crown className="w-3 h-3 text-yellow-600 absolute -top-1 -right-1" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Organization List */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Organizations on Map</h2>
        
        {mappableOrgs.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No organizations with location data found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mappableOrgs.map((org) => {
              const isAdmin = adminOrgs.some(adminOrg => adminOrg.id === org.id)
              const isFollowing = followingStatus[org.id] || false
              const formattedLocation = formatLocation(org.location)
              
              return (
                <div
                  key={org.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOrg?.id === org.id 
                      ? 'border-primary-300 bg-primary-50' 
                      : isAdmin 
                        ? 'border-yellow-300 bg-yellow-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleOrgSelect(org)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
                        {isAdmin && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">{org.description || 'No description'}</p>
                      
                      <div className="mt-3 space-y-2">
                        {formattedLocation && (
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

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {org.memberCount > 0 && (
                            <span>{org.memberCount} members</span>
                          )}
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {org.followerCount || 0} followers
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              getDirections(org)
                            }}
                            className="btn-secondary text-sm px-3 py-1 flex items-center"
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Directions
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

      {/* Selected Organization Details */}
      {selectedOrg && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-blue-900">Selected Organization</h3>
            <button
              onClick={() => setSelectedOrg(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-blue-900">{selectedOrg.name}</h4>
            <p className="text-sm text-blue-700">{selectedOrg.description || 'No description'}</p>
            
            {formatLocation(selectedOrg.location) && (
              <div className="flex items-center text-sm text-blue-600">
                <MapPin className="h-4 w-4 mr-2" />
                {formatLocation(selectedOrg.location)}
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => getDirections(selectedOrg)}
                className="btn-primary text-sm px-3 py-1 flex items-center"
              >
                <Navigation className="h-3 w-3 mr-1" />
                Get Directions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
