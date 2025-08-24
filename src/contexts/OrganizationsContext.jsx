import { createContext, useContext, useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
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
      
      setOrganizations(orgsData)
      
      // Update admin service with organizations (dynamic import to avoid circular dependency)
      try {
        const adminService = await import('../services/adminService')
        adminService.default.setOrganizations(orgsData)
      } catch (error) {
        console.log('⚠️ Could not update admin service with organizations:', error)
      }
      
      console.log('✅ Loaded', orgsData.length, 'organizations')
    } catch (error) {
      console.error('❌ Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const value = {
    organizations,
    loading,
    fetchOrganizations
  }

  return (
    <OrganizationsContext.Provider value={value}>
      {children}
    </OrganizationsContext.Provider>
  )
}
