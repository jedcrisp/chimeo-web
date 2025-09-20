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
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [mapError, setMapError] = useState(null)
  
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)

  // Load Google Maps script dynamically
  useEffect(() => {
    const loadGoogleMaps = () => {
      console.log('🗺️ Loading Google Maps script...')
      console.log('🔑 Environment API Key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
      
      // Get API key from environment or use a fallback
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg'
      console.log('🔑 Using API Key:', apiKey ? 'Set' : 'Not set')
      
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps already loaded')
        setMapsLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`
      script.async = true
      script.defer = true
      script.onload = () => {
        console.log('✅ Google Maps script loaded successfully')
        console.log('🗺️ Google Maps API available:', !!window.google?.maps)
        console.log('📍 Advanced Markers available:', !!window.google?.maps?.marker?.AdvancedMarkerElement)
        setMapsLoaded(true)
      }
      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps script:', error)
        setMapError('Failed to load Google Maps. Please check your internet connection and try again.')
      }
      document.head.appendChild(script)
    }

    loadGoogleMaps()
  }, [])

  useEffect(() => {
    if (currentUser && organizations.length > 0) {
      console.log('👥 User authenticated, organizations loaded:', organizations.length)
      console.log('📊 Sample organization data:', organizations[0])
      
      // Get organizations where user is admin
      adminService.getAdminOrganizations().then(adminOrgs => {
        console.log('👑 Admin organizations:', adminOrgs)
        setAdminOrgs(adminOrgs)
      })

      // Check following status for all organizations
      checkFollowingStatus()
    }
  }, [currentUser, organizations])

  useEffect(() => {
    // Initialize map when Google Maps is loaded
    if (mapsLoaded) {
      initMap()
      getUserLocation()
    }
  }, [mapsLoaded])

  // Add timeout to detect if map is taking too long to load
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mapsLoaded && !mapError) {
        setMapError('Map is taking too long to load. Please check your internet connection.')
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [mapsLoaded, mapError])

  // Initialize Google Maps
  const initMap = useCallback(() => {
    console.log('🗺️ initMap called')
    console.log('🔍 Checking Google Maps availability...')
    console.log('window.google:', !!window.google)
    console.log('window.google.maps:', !!window.google?.maps)
    console.log('window.google.maps.marker:', !!window.google?.maps?.marker)
    console.log('AdvancedMarkerElement:', !!window.google?.maps?.marker?.AdvancedMarkerElement)
    console.log('mapRef.current:', !!mapRef.current)
    console.log('mapRef.current dimensions:', mapRef.current ? {
      width: mapRef.current.offsetWidth,
      height: mapRef.current.offsetHeight
    } : 'No ref')
    
    if (!window.google || !window.google.maps) {
      console.log('❌ Google Maps not loaded yet, retrying in 2 seconds...')
      setTimeout(initMap, 2000)
      return
    }

    if (!mapRef.current) {
      console.log('❌ Map container not ready, retrying in 1 second...')
      setTimeout(initMap, 1000)
      return
    }

    // Check if container has dimensions
    if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
      console.log('❌ Map container has no dimensions, retrying in 1 second...')
      setTimeout(initMap, 1000)
      return
    }

    if (!window.google.maps.marker || !window.google.maps.marker.AdvancedMarkerElement) {
      console.log('❌ Advanced Markers not available, falling back to regular markers')
      // Fallback to regular markers if Advanced Markers not available
      initMapWithRegularMarkers()
      return
    }

    console.log('🗺️ Initializing Google Maps with Advanced Markers...')
    
    try {
      console.log('📍 Creating map instance...')
      console.log('📍 Map container:', mapRef.current)
      console.log('📍 Map center:', mapCenter)
      console.log('📍 Map zoom:', zoom)
      
      // Create map instance
      const map = new window.google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        mapId: 'DEMO_MAP_ID', // Add Map ID for Advanced Markers
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })

      console.log('✅ Map instance created successfully')
      mapInstanceRef.current = map

      // Create info window
      infoWindowRef.current = new window.google.maps.InfoWindow()
      console.log('✅ Info window created')

      // Add map event listeners
      map.addListener('zoom_changed', () => {
        setZoom(map.getZoom())
      })

      map.addListener('center_changed', () => {
        const center = map.getCenter()
        setMapCenter({ lat: center.lat(), lng: center.lng() })
      })

      console.log('✅ Google Maps initialized successfully with Advanced Markers')
      
      // Add markers after map is ready
      map.addListener('idle', () => {
        console.log('🗺️ Map is idle, adding markers...')
        addOrganizationMarkers()
      })

    } catch (error) {
      console.error('❌ Error initializing Google Maps:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
  }, [mapCenter, zoom])

  // Fallback to regular markers if Advanced Markers not available
  const initMapWithRegularMarkers = useCallback(() => {
    console.log('🗺️ Initializing Google Maps with regular markers...')
    
    if (!mapRef.current) {
      console.log('❌ Map container not ready for regular markers, retrying...')
      setTimeout(initMapWithRegularMarkers, 1000)
      return
    }

    // Check if container has dimensions
    if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
      console.log('❌ Map container has no dimensions for regular markers, retrying...')
      setTimeout(initMapWithRegularMarkers, 1000)
      return
    }
    
    try {
      console.log('📍 Creating map instance with regular markers...')
      console.log('📍 Map container:', mapRef.current)
      console.log('📍 Map center:', mapCenter)
      console.log('📍 Map zoom:', zoom)
      
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

      console.log('✅ Map instance created successfully with regular markers')
      mapInstanceRef.current = map

      // Create info window
      infoWindowRef.current = new window.google.maps.InfoWindow()
      console.log('✅ Info window created')

      // Add map event listeners
      map.addListener('zoom_changed', () => {
        setZoom(map.getZoom())
      })

      map.addListener('center_changed', () => {
        const center = map.getCenter()
        setMapCenter({ lat: center.lat(), lng: center.lng() })
      })

      console.log('✅ Google Maps initialized successfully with regular markers')
      
      // Add markers after map is ready
      map.addListener('idle', () => {
        console.log('🗺️ Map is idle, adding regular markers...')
        addOrganizationMarkersWithRegularMarkers()
      })

    } catch (error) {
      console.error('❌ Error initializing Google Maps with regular markers:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
  }, [mapCenter, zoom])

  // Add organization markers to the map
  const addOrganizationMarkers = useCallback(() => {
    console.log('🗺️ Adding organization markers...')
    
    if (!mapInstanceRef.current) {
      console.log('❌ Map instance not ready')
      return
    }
    
    if (!allOrganizations.length) {
      console.log('❌ No organizations to display')
      return
    }

    console.log('🗺️ Map instance ready, organizations count:', allOrganizations.length)

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null)
    markersRef.current = []

    const mappableOrgs = getMappableOrganizations()
    console.log('🗺️ Mappable organizations:', mappableOrgs.length)
    
    mappableOrgs.forEach((org) => {
      console.log(`📍 Processing organization: ${org.name}`)
      
      const coords = getCoordinates(org.location)
      if (!coords) {
        console.log(`❌ No valid coordinates for ${org.name}`)
        return
      }

      console.log(`✅ Creating marker for ${org.name} at:`, coords)

      const isAdmin = adminOrgs.some(adminOrg => adminOrg.id === org.id)
      const isFollowing = followingStatus[org.id] || false

      // Create custom marker element
      const markerElement = document.createElement('div')
      markerElement.innerHTML = `
        <div class="relative">
          <div class="w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${
            isAdmin 
              ? 'bg-yellow-500 border-yellow-600 shadow-lg' 
              : 'bg-blue-500 border-blue-600 shadow-md'
          }"></div>
          ${isAdmin ? '<div class="absolute -top-1 -right-1 text-yellow-600">👑</div>' : ''}
        </div>
      `

      try {
        // Create advanced marker
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: coords,
          map: mapInstanceRef.current,
          title: org.name,
          content: markerElement
        })

        console.log(`✅ Marker created successfully for ${org.name}`)

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
        console.log(`✅ Marker added to map for ${org.name}`)
        
      } catch (error) {
        console.error(`❌ Error creating marker for ${org.name}:`, error)
      }
    })

    console.log(`✅ Added ${markersRef.current.length} markers to map`)
  }, [allOrganizations, adminOrgs, followingStatus])

  // Add organization markers to the map with regular markers
  const addOrganizationMarkersWithRegularMarkers = useCallback(() => {
    console.log('🗺️ Adding organization markers with regular markers...')
    
    if (!mapInstanceRef.current) {
      console.log('❌ Map instance not ready')
      return
    }
    
    if (!allOrganizations.length) {
      console.log('❌ No organizations to display')
      return
    }

    console.log('🗺️ Map instance ready, organizations count:', allOrganizations.length)

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    const mappableOrgs = getMappableOrganizations()
    console.log('🗺️ Mappable organizations:', mappableOrgs.length)
    
    mappableOrgs.forEach((org) => {
      console.log(`📍 Processing organization: ${org.name}`)
      
      const coords = getCoordinates(org.location)
      if (!coords) {
        console.log(`❌ No valid coordinates for ${org.name}`)
        return
      }

      console.log(`✅ Creating regular marker for ${org.name} at:`, coords)

      const isAdmin = adminOrgs.some(adminOrg => adminOrg.id === org.id)
      const isFollowing = followingStatus[org.id] || false

      try {
        // Create regular marker
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

        console.log(`✅ Regular marker created successfully for ${org.name}`)

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
        console.log(`✅ Regular marker added to map for ${org.name}`)
        
      } catch (error) {
        console.error(`❌ Error creating regular marker for ${org.name}:`, error)
      }
    })

    console.log(`✅ Added ${markersRef.current.length} regular markers to map`)
  }, [allOrganizations, adminOrgs, followingStatus])

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
    for (const org of allOrganizations) {
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
    console.log('🔍 Processing location:', location)
    
    if (!location) {
      console.log('❌ No location data')
      return null
    }
    
    // Handle string coordinates (lat,lng format)
    if (typeof location === 'string') {
      const parts = location.split(',')
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim())
        const lng = parseFloat(parts[1].trim())
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log('✅ Parsed string coordinates:', { lat, lng })
          return { lat, lng }
        }
      }
    }
    
    // Handle object with latitude/longitude
    if (typeof location === 'object') {
      if (location.latitude && location.longitude) {
        const lat = parseFloat(location.latitude)
        const lng = parseFloat(location.longitude)
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log('✅ Parsed object coordinates:', { lat, lng })
          return { lat, lng }
        }
      }
      
      // Handle object with lat/lng format
      if (location.lat && location.lng) {
        const lat = parseFloat(location.lat)
        const lng = parseFloat(location.lng)
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log('✅ Parsed lat/lng coordinates:', { lat, lng })
          return { lat, lng }
        }
      }
    }
    
    console.log('❌ Could not parse location data')
    return null
  }

  // Filter organizations that have valid coordinates
  const getMappableOrganizations = () => {
    console.log('🗺️ Filtering organizations for map display...')
    console.log('📊 Total organizations:', allOrganizations.length)
    
    const mappable = allOrganizations.filter(org => {
      console.log(`🔍 Checking organization: ${org.name}`)
      console.log(`📍 Location data:`, org.location)
      
      const coords = getCoordinates(org.location)
      const isValid = coords && coords.lat && coords.lng
      
      console.log(`✅ Valid coordinates:`, isValid, coords)
      return isValid
    })
    
    console.log(`🗺️ Found ${mappable.length} mappable organizations:`, mappable.map(org => ({
      name: org.name,
      location: org.location,
      coords: getCoordinates(org.location)
    })))
    
    return mappable
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
  const filteredOrganizations = allOrganizations.filter(org => {
    if (!searchQuery) return true
    return org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  // Add global function for info window buttons
  useEffect(() => {
    window.selectOrganization = (orgId) => {
      const org = allOrganizations.find(o => o.id === orgId)
      if (org) {
        handleOrgSelect(org)
        infoWindowRef.current?.close()
      }
    }

    return () => {
      delete window.selectOrganization
    }
  }, [allOrganizations])

  // Debug: Log organizations data when it changes
  useEffect(() => {
    if (organizations.length > 0) {
      console.log('📊 All organizations data:', organizations)
      console.log('📍 Organizations with location data:', organizations.filter(org => org.location))
      console.log('🔍 Sample organization structure:', organizations[0])
    }
  }, [organizations])

  // Add test organizations with location data for demonstration
  const [testOrganizations] = useState([
    {
      id: 'test-1',
      name: 'Test Organization 1',
      description: 'This is a test organization for map display',
      location: { latitude: 40.7128, longitude: -74.0060 }, // New York
      contact: '+1-555-0123',
      email: 'test1@example.com',
      memberCount: 5,
      followerCount: 3
    },
    {
      id: 'test-2',
      name: 'Test Organization 2',
      description: 'Another test organization for map display',
      location: { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
      contact: '+1-555-0456',
      email: 'test2@example.com',
      memberCount: 8,
      followerCount: 12
    },
    {
      id: 'test-3',
      name: 'Test Organization 3',
      description: 'Third test organization for map display',
      location: { latitude: 41.8781, longitude: -87.6298 }, // Chicago
      contact: '+1-555-0789',
      email: 'test3@example.com',
      memberCount: 15,
      followerCount: 7
    }
  ])

  // Combine real organizations with test organizations
  const allOrganizations = [...organizations, ...testOrganizations]

  // Debug: Log component mount and map container
  useEffect(() => {
    console.log('🗺️ Map component mounted')
    console.log('📍 Map container ref:', mapRef.current)
    console.log('📍 Map container element:', mapRef.current?.outerHTML)
    
    if (mapRef.current) {
      console.log('✅ Map container found')
      console.log('📍 Container dimensions:', {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
        clientWidth: mapRef.current.clientWidth,
        clientHeight: mapRef.current.clientHeight
      })
    } else {
      console.log('❌ Map container not found')
    }
  }, [])

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
            className="w-full h-full bg-blue-200 border-2 border-dashed border-blue-400"
            style={{ 
              minHeight: '384px',
              minWidth: '100%',
              position: 'relative'
            }}
          >
            {/* Test content to see if container is rendered */}
            <div className="absolute top-2 left-2 bg-white p-2 rounded shadow text-xs">
              Map Container Ready
            </div>
          </div>
          
          {/* Map Loading Overlay */}
          {!mapInstanceRef.current && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            </div>
          )}

          {/* Map Error Overlay */}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center p-6">
                <div className="text-red-500 text-4xl mb-4">🗺️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Map Unavailable</h3>
                <p className="text-sm text-gray-500 mb-4">{mapError}</p>
                <button
                  onClick={() => {
                    setMapError(null)
                    setMapsLoaded(false)
                    // Reload the page to retry
                    window.location.reload()
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
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
