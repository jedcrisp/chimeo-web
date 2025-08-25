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
    console.log('🔍 AdminService: Organizations set:', organizations.length)
    console.log('🔍 AdminService: Organization IDs:', organizations.map(org => ({ id: org.id, name: org.name, adminIds: org.adminIds })))
  }

  // Force sync admin service with current user and organizations
  forceSync(currentUser, organizations) {
    this.currentUser = currentUser
    this.organizations = organizations
    console.log('🔍 AdminService: Force sync completed')
    console.log('🔍 AdminService: Current user:', currentUser?.uid)
    console.log('🔍 AdminService: Organizations count:', organizations?.length || 0)
  }

  // Get the correct Firestore user ID for the current user
  async getFirestoreUserId() {
    if (!this.currentUser?.email) {
      console.log('⚠️ AdminService: No email available, using Firebase UID:', this.currentUser?.uid)
      return this.currentUser?.uid
    }

    try {
      console.log('🔍 AdminService: Looking up Firestore user ID by email:', this.currentUser.email)
      const usersQuery = query(collection(db, 'users'), where('email', '==', this.currentUser.email))
      const usersSnapshot = await getDocs(usersQuery)
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0]
        const firestoreUserId = userDoc.id
        console.log('✅ AdminService: Found Firestore user ID by email:', firestoreUserId)
        console.log('✅ AdminService: This resolves Firebase UID', this.currentUser.uid, 'to Firestore ID', firestoreUserId)
        return firestoreUserId
      } else {
        console.log('⚠️ AdminService: No Firestore user found with email:', this.currentUser.email)
      }
    } catch (error) {
      console.log('⚠️ Error getting Firestore user ID by email:', error)
    }
    
    // Fallback to Firebase UID
    console.log('⚠️ AdminService: Falling back to Firebase UID:', this.currentUser.uid)
    return this.currentUser.uid
  }

  // Check if user is admin of a specific organization
  async isAdminOfOrganization(organizationId) {
    console.log('👑 Checking if user is admin of organization:', organizationId)
    
    if (!this.currentUser) {
      console.log('❌ No current user found')
      return false
    }

    console.log('🔍 Current user details:')
    console.log('   - Firebase UID:', this.currentUser.uid)
    console.log('   - Email:', this.currentUser.email)

    try {
      // Get the organization document
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      
      if (orgDoc.exists()) {
        const orgData = orgDoc.data()
        const adminIds = orgData.adminIds || {}
        
        console.log('📋 Organization adminIds:', Object.keys(adminIds))
        
        // Get the correct user ID to check
        const firestoreUserId = await this.getFirestoreUserId()
        console.log('🔍 Checking with user ID:', firestoreUserId)
        
        // Check if the user ID is in adminIds
        const isAdmin = adminIds[firestoreUserId] === true
        
        console.log('✅ Admin status for user', firestoreUserId, 'in organization', organizationId, ':', isAdmin)
        console.log('📋 Available adminIds:', Object.keys(adminIds))
        console.log('🔍 User ID match:', isAdmin)
        
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
  async hasOrganizationAdminAccess() {
    console.log('🔍 AdminService: Checking organization admin access...')
    
    if (!this.currentUser) {
      console.log('❌ AdminService: No current user set')
      return false
    }

    console.log('🔍 AdminService: Current user:', this.currentUser.uid)
    
    // Get the correct user ID to check
    const firestoreUserId = await this.getFirestoreUserId()
    console.log('🔍 AdminService: Using user ID for admin check:', firestoreUserId)
    
    // Check directly from Firestore instead of cached organizations
    try {
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      console.log('🔍 AdminService: Checking', orgsSnapshot.size, 'organizations from Firestore')
      
      // Check if user is admin of any organization
      const hasAccess = orgsSnapshot.docs.some(doc => {
        const orgData = doc.data()
        const adminIds = orgData.adminIds || {}
        
        // Check with the correct user ID
        const isAdmin = adminIds[firestoreUserId] === true
        
        console.log(`🔍 AdminService: Organization ${orgData.name} (${doc.id}): isAdmin = ${isAdmin}`)
        if (adminIds && Object.keys(adminIds).length > 0) {
          console.log(`   Admin IDs:`, Object.keys(adminIds))
          console.log(`   User ${firestoreUserId} in adminIds:`, adminIds[firestoreUserId])
        } else {
          console.log(`   No adminIds field or empty`)
        }
        return isAdmin
      })

      console.log('🔍 AdminService: Has organization admin access:', hasAccess)
      return hasAccess
    } catch (error) {
      console.error('❌ Error checking admin access from Firestore:', error)
      return false
    }
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
    console.log('🔍 AdminService: Getting admin organizations...')
    
    if (!this.currentUser) {
      console.log('❌ AdminService: No current user set')
      return []
    }

    console.log('🔍 AdminService: Current user:', this.currentUser.uid)
    
    // Get the correct user ID to check
    const firestoreUserId = await this.getFirestoreUserId()
    console.log('🔍 AdminService: Using user ID for admin check:', firestoreUserId)

    try {
      // Query organizations directly from Firestore
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      console.log('🔍 AdminService: Checking', orgsSnapshot.size, 'organizations from Firestore')
      
      const adminOrgs = []
      
      for (const doc of orgsSnapshot.docs) {
        const orgData = doc.data()
        const adminIds = orgData.adminIds || {}
        
        // Check if the user is an admin
        const isAdmin = adminIds[firestoreUserId] === true
        
        console.log(`🔍 AdminService: Organization ${orgData.name} (${doc.id}):`)
        console.log(`   - Checking admin status for user: ${firestoreUserId}`)
        console.log(`   - Available admin IDs: ${Object.keys(adminIds).join(', ')}`)
        console.log(`   - User ${firestoreUserId} in adminIds: ${adminIds[firestoreUserId]}`)
        console.log(`   - Final result: isAdmin = ${isAdmin}`)
        
        if (isAdmin) {
          adminOrgs.push({
            id: doc.id,
            ...orgData
          })
          console.log(`✅ AdminService: Added ${orgData.name} to admin organizations`)
        }
      }
      
      console.log(`🔍 AdminService: Total admin organizations: ${adminOrgs.length}`)
      console.log(`🔍 AdminService: Admin org names:`, adminOrgs.map(org => org.name))
      
      // Summary of what happened
      console.log('📋 AdminService: SUMMARY:')
      console.log(`   - Firebase UID: ${this.currentUser.uid}`)
      console.log(`   - Resolved to Firestore ID: ${firestoreUserId}`)
      console.log(`   - Total organizations checked: ${orgsSnapshot.size}`)
      console.log(`   - Organizations where user is admin: ${adminOrgs.length}`)
      if (adminOrgs.length > 0) {
        console.log(`   - Admin organizations: ${adminOrgs.map(org => org.name).join(', ')}`)
      }
      
      return adminOrgs
    } catch (error) {
      console.error('❌ Error getting admin organizations from Firestore:', error)
      return []
    }
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

      // Add follower to organization's followers subcollection
      await addDoc(collection(db, 'organizations', organizationId, 'followers'), {
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
      // Remove from user's followed organizations
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

      // Mark follower as deleted in organization's followers subcollection
      const followersQuery = query(
        collection(db, 'organizations', organizationId, 'followers'),
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

  // Get detailed admin status across all organizations
  async getDetailedAdminStatus() {
    console.log('🔍 AdminService: Getting detailed admin status...')
    
    if (!this.currentUser) {
      console.log('❌ AdminService: No current user set')
      return null
    }

    try {
      // Get the correct user ID to check
      const firestoreUserId = await this.getFirestoreUserId()
      
      // Query all organizations
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      const detailedStatus = {
        firebaseUid: this.currentUser.uid,
        firestoreUserId: firestoreUserId,
        email: this.currentUser.email,
        totalOrganizations: orgsSnapshot.size,
        adminOrganizations: [],
        nonAdminOrganizations: [],
        allOrganizations: []
      }
      
      for (const doc of orgsSnapshot.docs) {
        const orgData = doc.data()
        const adminIds = orgData.adminIds || {}
        const isAdmin = adminIds[firestoreUserId] === true
        
        const orgInfo = {
          id: doc.id,
          name: orgData.name,
          isAdmin: isAdmin,
          adminIds: Object.keys(adminIds)
        }
        
        detailedStatus.allOrganizations.push(orgInfo)
        
        if (isAdmin) {
          detailedStatus.adminOrganizations.push(orgInfo)
        } else {
          detailedStatus.nonAdminOrganizations.push(orgInfo)
        }
      }
      
      console.log('📋 AdminService: DETAILED ADMIN STATUS:')
      console.log('   - Firebase UID:', detailedStatus.firebaseUid)
      console.log('   - Firestore User ID:', detailedStatus.firestoreUserId)
      console.log('   - Email:', detailedStatus.email)
      console.log('   - Total Organizations:', detailedStatus.totalOrganizations)
      console.log('   - Admin Organizations:', detailedStatus.adminOrganizations.length)
      console.log('   - Non-Admin Organizations:', detailedStatus.nonAdminOrganizations.length)
      
      if (detailedStatus.adminOrganizations.length > 0) {
        console.log('   - You are an admin of:')
        detailedStatus.adminOrganizations.forEach(org => {
          console.log(`     ✅ ${org.name} (${org.id})`)
        })
      }
      
      if (detailedStatus.nonAdminOrganizations.length > 0) {
        console.log('   - You are NOT an admin of:')
        detailedStatus.nonAdminOrganizations.forEach(org => {
          console.log(`     ❌ ${org.name} (${org.id})`)
        })
      }
      
      return detailedStatus
      
    } catch (error) {
      console.error('❌ Error getting detailed admin status:', error)
      return null
    }
  }
}

// Create a singleton instance
const adminService = new AdminService()
export default adminService
