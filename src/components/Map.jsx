import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Users, Phone, Mail, Crown, Navigation, Search } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [zoom, setZoom] = useState(4)
  
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)

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

  // Initialize Google Maps
  const initMap = useCallback(() => {
    if (!window.google || !window.google.maps) {
      console.log('🗺️ Google Maps not loaded yet, retrying...')
      setTimeout(initMap, 1000)
      return
    }

    console.log('🗺️ Initializing Google Maps...')
    
    try {
      // Create map instance
      const map = new window.google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })

      mapInstanceRef.current = map

      // Create info window
      infoWindowRef.current = new window.google.maps.InfoWindow()

      // Add map event listeners
      map.addListener('zoom_changed', () => {
        setZoom(map.getZoom())
      })

      map.addListener('center_changed', () => {
        const center = map.getCenter()
        setMapCenter({ lat: center.lat(), lng: center.lng() })
      })

      console.log('✅ Google Maps initialized successfully')
      
      // Add markers after map is ready
      map.addListener('idle', () => {
        addOrganizationMarkers()
      })

    } catch (error) {
      console.error('❌ Error initializing Google Maps:', error)
    }
  }, [mapCenter, zoom])

  // Add organization markers to the map
  const addOrganizationMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !organizations.length) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    const mappableOrgs = getMappableOrganizations()
    
    mappableOrgs.forEach((org) => {
      const coords = getCoordinates(org.location)
      if (!coords) return

      const isAdmin = adminOrgs.some(adminOrg => adminOrg.id === org.id)
      const isFollowing = followingStatus[org.id] || false

      // Create marker
      const marker = new window.google.maps.Marker({
        position: coords,
        map: mapInstanceRef.current,
        title: org.name,
        icon: {
          url: isAdmin 
            ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
                  <path d="M16 8l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="#d97706"/>
                </svg>
              `)
            : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
                  <circle cx="16" cy="16" r="4" fill="#1d4ed8"/>
                </svg>
              `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 32)
        }
      })

      // Create info window content
      const infoContent = `
        <div class="p-4 max-w-sm">
          <div class="flex items-center space-x-2 mb-2">
            <h3 class="text-lg font-semibold text-gray-900">${org.name}</h3>
            ${isAdmin ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">👑 Admin</span>' : ''}
          </div>
          <p class="text-sm text-gray-600 mb-3">${org.description || 'No description'}</p>
          <div class="space-y-1 text-sm text-gray-500">
            ${formatLocation(org.location) ? `<div>📍 ${formatLocation(org.location)}</div>` : ''}
            ${org.contact ? `<div>📞 ${org.contact}</div>` : ''}
            ${org.email ? `<div>✉️ ${org.email}</div>` : ''}
          </div>
          <div class="mt-3 flex items-center justify-between text-sm">
            <span>👥 ${org.memberCount || 0} members</span>
            <span>❤️ ${org.followerCount || 0} followers</span>
          </div>
          <div class="mt-3 flex space-x-2">
            <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}', '_blank')" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
              🚗 Directions
            </button>
            <button onclick="window.selectOrganization('${org.id}')" class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
              📋 View Details
            </button>
          </div>
        </div>
      `

      // Add click listener to marker
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(infoContent)
        infoWindowRef.current.open(mapInstanceRef.current, marker)
        handleOrgSelect(org)
      })

      markersRef.current.push(marker)
    })

    console.log(`✅ Added ${markersRef.current.length} markers to map`)
  }, [organizations, adminOrgs, followingStatus])

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const userLoc = { lat: latitude, lng: longitude }
          setUserLocation(userLoc)
          setMapCenter(userLoc)
          setZoom(12)
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(userLoc)
            mapInstanceRef.current.setZoom(12)
          }
          
          console.log('📍 User location:', userLoc)
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
    if (coords && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(coords)
      mapInstanceRef.current.setZoom(15)
      setMapCenter(coords)
      setZoom(15)
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

  // Center map on user location
  const centerOnUserLocation = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(userLocation)
      mapInstanceRef.current.setZoom(12)
      setMapCenter(userLocation)
      setZoom(12)
    }
  }

  // Filter organizations by search query
  const filteredOrganizations = organizations.filter(org => {
    if (!searchQuery) return true
    return org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  // Add global function for info window buttons
  useEffect(() => {
    window.selectOrganization = (orgId) => {
      const org = organizations.find(o => o.id === orgId)
      if (org) {
        handleOrgSelect(org)
        infoWindowRef.current?.close()
      }
    }

    return () => {
      delete window.selectOrganization
    }
  }, [organizations])

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

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={centerOnUserLocation}
          disabled={!userLocation}
          className="btn-secondary flex items-center space-x-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Navigation className="h-4 w-4" />
          <span>My Location</span>
        </button>
      </div>

      {/* Map Container */}
      <div className="card p-0 overflow-hidden">
        <div className="bg-gray-100 h-96 relative">
          {/* Google Maps will render here */}
          <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ minHeight: '384px' }}
          />
          
          {/* Map Loading Overlay */}
          {!mapInstanceRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organization List */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Organizations on Map ({mappableOrgs.length})
        </h2>
        
        {mappableOrgs.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No organizations with location data found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrganizations.filter(org => getCoordinates(org.location)).map((org) => {
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
