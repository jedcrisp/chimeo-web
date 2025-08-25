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

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const orgsQuery = query(collection(db, 'organizations'), orderBy('name'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      const orgsData = orgsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Get follower counts for each organization from their subcollection
      const orgsWithFollowers = await Promise.all(
        orgsData.map(async (org) => {
          try {
            const followersQuery = query(collection(db, 'organizations', org.id, 'followers'))
            const followersSnapshot = await getDocs(followersQuery)
            const followerCount = followersSnapshot.size
            
            return {
              ...org,
              followerCount
            }
          } catch (error) {
            console.error(`Error fetching followers for org ${org.id}:`, error)
            return {
              ...org,
              followerCount: 0
            }
          }
        })
      )
      
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
      const followersQuery = query(collection(db, 'organizations', orgId, 'followers'))
      const followersSnapshot = await getDocs(followersQuery)
      const followerCount = followersSnapshot.size
      
      setOrganizations(prev => 
        prev.map(org => 
          org.id === orgId 
            ? { ...org, followerCount } 
            : org
        )
      )
      
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

  return (
    <OrganizationsContext.Provider value={value}>
      {children}
    </OrganizationsContext.Provider>
  )
}
