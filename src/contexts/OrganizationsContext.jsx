import { createContext, useContext, useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '../services/firebase'

const OrganizationsContext = createContext()

export function useOrganizations() {
  return useContext(OrganizationsContext)
}

export function OrganizationsProvider({ children }) {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)

  // Function to get follower counts for multiple organizations
  const getFollowerCounts = async (organizationIds) => {
    try {
      console.log('🔍 Getting follower counts for organizations:', organizationIds)
      
      // Get all users and count how many follow each organization
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)
      
      const followerCounts = {}
      
      // Initialize counts
      organizationIds.forEach(orgId => {
        followerCounts[orgId] = 0
      })
      
      // Count followers for each organization
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data()
        const followedOrganizations = userData.followedOrganizations || []
        
        followedOrganizations.forEach(orgId => {
          if (followerCounts.hasOwnProperty(orgId)) {
            followerCounts[orgId]++
          }
        })
      })
      
      console.log('✅ Follower counts calculated:', followerCounts)
      console.log('🔍 Detailed follower counts:', Object.entries(followerCounts).map(([orgId, count]) => ({ orgId, count })))
      return followerCounts
    } catch (error) {
      console.error('❌ Error getting follower counts:', error)
      return {}
    }
  }

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const orgsQuery = query(collection(db, 'organizations'), orderBy('name'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      const orgsData = orgsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Get follower counts by counting users who have this org in their followedOrganizations array
      const followerCounts = await getFollowerCounts(orgsData.map(org => org.id))
      
      const orgsWithFollowers = orgsData.map(org => ({
        ...org,
        followerCount: followerCounts[org.id] || 0
      }))
      
      setOrganizations(orgsWithFollowers)
      
      // Update admin service with organizations (dynamic import to avoid circular dependency)
      try {
        const adminService = await import('../services/adminService')
        adminService.default.setOrganizations(orgsWithFollowers)
        console.log('✅ Admin service updated with organizations:', orgsWithFollowers.length)
        console.log('🔍 Admin service organizations:', adminService.default.organizations?.length || 0)
      } catch (error) {
        console.log('⚠️ Could not update admin service with organizations:', error)
      }
      
      console.log('✅ Loaded', orgsWithFollowers.length, 'organizations with follower counts')
    } catch (error) {
      console.error('❌ Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Function to refresh follower counts for a specific organization
  const refreshFollowerCount = async (orgId) => {
    try {
      console.log('🔄 Refreshing follower count for org:', orgId)
      const followerCounts = await getFollowerCounts([orgId])
      const followerCount = followerCounts[orgId] || 0
      console.log('🔍 Refreshed follower count for', orgId, ':', followerCount)
      
      setOrganizations(prev => {
        const updated = prev.map(org => 
          org.id === orgId 
            ? { ...org, followerCount } 
            : org
        )
        console.log('🔍 OrganizationsContext: Updated organizations state:', updated.find(org => org.id === orgId))
        return updated
      })
      
      console.log('✅ Updated organizations state with new follower count')
      return followerCount
    } catch (error) {
      console.error(`Error refreshing follower count for org ${orgId}:`, error)
      return 0
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const value = {
    organizations,
    loading,
    fetchOrganizations,
    refreshFollowerCount
  }

  // Debug: Log when organizations state changes
  useEffect(() => {
    console.log('🔍 OrganizationsContext: Organizations state changed:', organizations.length, 'organizations')
    organizations.forEach(org => {
      console.log('🔍 OrganizationsContext: Org:', org.name, 'followerCount:', org.followerCount)
    })
  }, [organizations])

  return (
    <OrganizationsContext.Provider value={value}>
      {children}
    </OrganizationsContext.Provider>
  )
}
