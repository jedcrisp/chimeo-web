import { db, auth } from './firebase'
import { doc, getDoc, collection, getDocs, query, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'

class AdminService {
  constructor() {
    this.currentUser = null
    this.organizations = []
  }

  // Set current user (called from AuthContext)
  setCurrentUser(user) {
    this.currentUser = user
  }

  // Set organizations (called when organizations are loaded)
  setOrganizations(organizations) {
    this.organizations = organizations
  }

  // Check if user is admin of a specific organization
  async isAdminOfOrganization(organizationId) {
    console.log('👑 Checking if user is admin of organization:', organizationId)
    
    if (!this.currentUser) {
      console.log('❌ No current user found')
      return false
    }

    console.log('🔍 Current user details:')
    console.log('   - ID:', this.currentUser.uid)
    console.log('   - Email:', this.currentUser.email)

    try {
      // Get the organization document
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      
      if (orgDoc.exists()) {
        const orgData = orgDoc.data()
        const adminIds = orgData.adminIds || {}
        
        // Check if the current user is in the adminIds
        const isAdmin = adminIds[this.currentUser.uid] === true
        
        console.log('✅ Admin status for user', this.currentUser.uid, 'in organization', organizationId, ':', isAdmin)
        console.log('📋 Available adminIds:', Object.keys(adminIds))
        console.log('🔍 User ID match:', adminIds[this.currentUser.uid] || false)
        
        return isAdmin
      } else {
        console.log('ℹ️ Organization', organizationId, 'not found')
        return false
      }
    } catch (error) {
      console.error('❌ Error checking admin status for organization', organizationId, ':', error)
      return false
    }
  }

  // Check if user can manage an organization (same as isAdminOfOrganization)
  async canManageOrganization(organizationId) {
    return await this.isAdminOfOrganization(organizationId)
  }

  // Check if user has admin access to any organization
  hasOrganizationAdminAccess() {
    if (!this.currentUser) {
      return false
    }

    // Check if user is admin of any organization
    const hasAccess = this.organizations.some(organization => {
      return organization.adminIds && organization.adminIds[this.currentUser.uid] === true
    })

    console.log('🔍 Has organization admin access:', hasAccess)
    console.log('   Current user ID:', this.currentUser.uid)
    console.log('   Organizations count:', this.organizations.length)
    
    return hasAccess
  }

  // Add a user as admin to an organization
  async addOrganizationAdmin(userId, organizationId) {
    console.log('👤 Adding admin', userId, 'to organization ID:', organizationId)
    
    try {
      // Get the current organization document
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      
      if (!orgDoc.exists) {
        throw new Error('Organization not found')
      }

      const orgData = orgDoc.data()
      const adminIds = orgData.adminIds || {}
      
      // Add the new admin
      adminIds[userId] = true
      
      // Update the organization document
      await updateDoc(doc(db, 'organizations', organizationId), {
        adminIds: adminIds,
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ Successfully added user', userId, 'as admin to organization', organizationId)
      
      // Refresh local organizations data
      // Note: You'll need to implement this based on how you load organizations
      
    } catch (error) {
      console.error('❌ Error adding organization admin:', error)
      throw error
    }
  }

  // Remove a user as admin from an organization
  async removeOrganizationAdmin(userId, organizationId) {
    console.log('👤 Removing admin', userId, 'from organization ID:', organizationId)
    
    try {
      // Get the current organization document
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      
      if (!orgDoc.exists) {
        throw new Error('Organization not found')
      }

      const orgData = orgDoc.data()
      const adminIds = orgData.adminIds || {}
      
      // Remove the admin
      delete adminIds[userId]
      
      // Update the organization document
      await updateDoc(doc(db, 'organizations', organizationId), {
        adminIds: adminIds,
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ Successfully removed user', userId, 'as admin from organization', organizationId)
      
    } catch (error) {
      console.error('❌ Error removing organization admin:', error)
      throw error
    }
  }

  // Get all organizations where the current user is an admin
  async getAdminOrganizations() {
    if (!this.currentUser) {
      return []
    }

    const adminOrgs = []
    
    for (const organization of this.organizations) {
      if (await this.isAdminOfOrganization(organization.id)) {
        adminOrgs.push(organization)
      }
    }
    
    return adminOrgs
  }

  // Check if user is following an organization
  async isFollowingOrganization(organizationId) {
    if (!this.currentUser) {
      return false
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const followedOrganizations = userData.followedOrganizations || {}
        return followedOrganizations[organizationId] === true
      }
      return false
    } catch (error) {
      console.error('Error checking follow status:', error)
      return false
    }
  }

  // Follow an organization
  async followOrganization(organizationId) {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    try {
      const userRef = doc(db, 'users', this.currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        throw new Error('User document not found')
      }

      const userData = userDoc.data()
      const followedOrganizations = userData.followedOrganizations || {}
      
      // Add organization to followed list
      followedOrganizations[organizationId] = true
      
      // Update user document
      await updateDoc(userRef, {
        followedOrganizations,
        updatedAt: serverTimestamp()
      })

      // Also update organizationFollowers collection
      await addDoc(collection(db, 'organizationFollowers'), {
        organizationId,
        userId: this.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log('✅ User now following organization:', organizationId)
      return true
    } catch (error) {
      console.error('Error following organization:', error)
      throw error
    }
  }

  // Unfollow an organization
  async unfollowOrganization(organizationId) {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    try {
      const userRef = doc(db, 'users', this.currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        throw new Error('User document not found')
      }

      const userData = userDoc.data()
      const followedOrganizations = userData.followedOrganizations || {}
      
      // Remove organization from followed list
      delete followedOrganizations[organizationId]
      
      // Update user document
      await updateDoc(userRef, {
        followedOrganizations,
        updatedAt: serverTimestamp()
      })

      // Also remove from organizationFollowers collection
      const followersQuery = query(
        collection(db, 'organizationFollowers'),
        where('organizationId', '==', organizationId),
        where('userId', '==', this.currentUser.uid)
      )
      const followersSnapshot = await getDocs(followersQuery)
      
      for (const doc of followersSnapshot.docs) {
        await updateDoc(doc.ref, {
          deletedAt: serverTimestamp()
        })
      }

      console.log('✅ User unfollowed organization:', organizationId)
      return true
    } catch (error) {
      console.error('Error unfollowing organization:', error)
      throw error
    }
  }
}

// Create a singleton instance
const adminService = new AdminService()
export default adminService
