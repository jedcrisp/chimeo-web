import { db, auth } from './firebase'
import { doc, getDoc, collection, getDocs, query, where, updateDoc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore'

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
    // Since adminIds in organizations use Firebase UIDs directly, just return the Firebase UID
    console.log('🔍 AdminService: Using Firebase UID directly:', this.currentUser?.uid)
    return this.currentUser?.uid
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
  async addOrganizationAdmin(userId, organizationId, adminType = 'admin') {
    console.log('👤 Adding', adminType, userId, 'to organization ID:', organizationId)
    
    try {
      // Get the current organization document
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      
      if (!orgDoc.exists) {
        throw new Error('Organization not found')
      }

      const orgData = orgDoc.data()
      const adminIds = orgData.adminIds || {}
      const adminRoles = orgData.adminRoles || {}
      
      // Add the new admin
      adminIds[userId] = true
      adminRoles[userId] = adminType // 'org_admin' or 'admin'
      
      // Update the organization document
      await updateDoc(doc(db, 'organizations', organizationId), {
        adminIds: adminIds,
        adminRoles: adminRoles,
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ Successfully added user', userId, 'as', adminType, 'to organization', organizationId)
      
      // Get user data for notifications
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        
        // Update user's profile to reflect admin status
        await updateDoc(doc(db, 'users', userId), {
          isOrganizationAdmin: true,
          organizationId: organizationId,
          organizationName: orgData.name,
          updatedAt: serverTimestamp()
        })
        
        console.log('✅ Updated user profile with admin status')
        
        // Send notifications
        await this.sendAdminAddedNotifications(userId, userData, organizationId, orgData, adminType)
      }
      
    } catch (error) {
      console.error('❌ Error adding organization admin:', error)
      throw error
    }
  }

  // Send admin access notification to existing admin
  async sendAdminAccessNotification(userId, organizationId) {
    try {
      console.log('🔔 Sending admin access notification to existing admin...')
      
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (!userDoc.exists()) {
        throw new Error('User not found')
      }
      
      const userData = userDoc.data()
      
      // Get organization data
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      if (!orgDoc.exists()) {
        throw new Error('Organization not found')
      }
      
      const orgData = orgDoc.data()
      const adminRoles = orgData.adminRoles || {}
      const adminType = adminRoles[userId] || 'admin'
      
      // Send notifications
      await this.sendAdminAddedNotifications(userId, userData, organizationId, orgData, adminType)
      
      console.log('✅ Admin access notification sent successfully')
      return true
      
    } catch (error) {
      console.error('❌ Error sending admin access notification:', error)
      throw error
    }
  }

  // Send notifications when someone is made an admin
  async sendAdminAddedNotifications(userId, userData, organizationId, orgData, adminType) {
    try {
      console.log('🔔 Sending admin added notifications...')
      
      // Create notification data
      const notificationData = {
        type: 'admin_access_granted',
        title: 'Admin Access Granted',
        message: `You have been granted ${adminType === 'organization_admin' ? 'Organization Admin' : 'Admin'} access to ${orgData.name}`,
        organizationId: organizationId,
        organizationName: orgData.name,
        adminType: adminType,
        grantedBy: this.currentUser?.email || 'System',
        targetUser: userData.email,
        createdAt: serverTimestamp(),
        sent: true
      }
      
      // Save notification to user's notification collection
      const sanitizedEmail = userData.email.replace(/[^a-zA-Z0-9]/g, '_')
      const notificationId = `admin_granted_${Date.now()}`
      await setDoc(doc(db, 'notifications', sanitizedEmail, 'user_notifications', notificationId), notificationData)
      console.log('✅ Admin notification saved to Firestore')
      
      // Send push notification to mobile app (if FCM token exists)
      if (userData.fcmToken && userData.fcmToken.trim() !== '') {
        try {
          const message = {
            notification: {
              title: 'Admin Access Granted',
              body: `You are now ${adminType === 'organization_admin' ? 'Organization Admin' : 'Admin'} of ${orgData.name}`
            },
            data: {
              type: 'admin_access_granted',
              organizationId: organizationId,
              organizationName: orgData.name,
              adminType: adminType
            },
            token: userData.fcmToken
          }
          
          // Note: This would need to be implemented in a Cloud Function for production
          console.log('📱 Push notification prepared for mobile app:', message)
        } catch (pushError) {
          console.error('❌ Error preparing push notification:', pushError)
        }
      } else {
        console.log('📱 No FCM token found for user, skipping push notification')
      }
      
      // Send email notification
      try {
        const emailService = (await import('./emailService.js')).default
        await emailService.sendAdminAccessEmail({
          adminName: userData.displayName || userData.firstName + ' ' + userData.lastName || 'User',
          adminEmail: userData.email,
          organizationName: orgData.name,
          adminType: adminType,
          organizationId: organizationId
        })
        console.log('✅ Admin access email sent')
      } catch (emailError) {
        console.error('❌ Error sending admin access email:', emailError)
      }
      
      console.log('✅ All admin notifications sent successfully')
      
    } catch (error) {
      console.error('❌ Error sending admin notifications:', error)
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
      const adminRoles = orgData.adminRoles || {}
      
      // Remove the admin
      delete adminIds[userId]
      delete adminRoles[userId]
      
      // Update the organization document
      await updateDoc(doc(db, 'organizations', organizationId), {
        adminIds: adminIds,
        adminRoles: adminRoles,
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ Successfully removed user', userId, 'as admin from organization', organizationId)
      
    } catch (error) {
      console.error('❌ Error removing organization admin:', error)
      throw error
    }
  }

  // Check if user is organization admin (can add/remove other admins)
  async isOrganizationAdmin(organizationId) {
    try {
      if (!this.currentUser?.uid) return false
      
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      if (!orgDoc.exists()) return false
      
      const orgData = orgDoc.data()
      const adminRoles = orgData.adminRoles || {}
      
      return adminRoles[this.currentUser.uid] === 'org_admin'
    } catch (error) {
      console.error('❌ Error checking organization admin status:', error)
      return false
    }
  }

  // Check if user can manage admins (organization admin only)
  async canManageAdmins(organizationId) {
    return await this.isOrganizationAdmin(organizationId)
  }

  // Get user's role in an organization
  async getUserRole(organizationId) {
    try {
      if (!this.currentUser?.uid) return null
      
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      if (!orgDoc.exists()) return null
      
      const orgData = orgDoc.data()
      const adminRoles = orgData.adminRoles || {}
      
      return adminRoles[this.currentUser.uid] || null
    } catch (error) {
      console.error('❌ Error getting user role:', error)
      return null
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
        const userRole = orgData.adminRoles?.[firestoreUserId] || 'admin'
        
        console.log(`🔍 AdminService: Organization ${orgData.name} (${doc.id}):`)
        console.log(`   - Checking admin status for user: ${firestoreUserId}`)
        console.log(`   - Available admin IDs: ${Object.keys(adminIds).join(', ')}`)
        console.log(`   - User ${firestoreUserId} in adminIds: ${adminIds[firestoreUserId]}`)
        console.log(`   - User role: ${userRole}`)
        console.log(`   - Final result: isAdmin = ${isAdmin}`)
        
        if (isAdmin) {
          adminOrgs.push({
            id: doc.id,
            userRole: userRole,
            canManageAdmins: userRole === 'org_admin',
            ...orgData
          })
          console.log(`✅ AdminService: Added ${orgData.name} to admin organizations (role: ${userRole})`)
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
        const followedOrganizations = userData.followedOrganizations || []
        return followedOrganizations.includes(organizationId)
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
      const followedOrganizations = userData.followedOrganizations || []
      
      // Add organization to followed list if not already following
      if (!followedOrganizations.includes(organizationId)) {
        followedOrganizations.push(organizationId)
        
        // Update user document
        try {
          await updateDoc(userRef, {
            followedOrganizations,
            updatedAt: serverTimestamp()
          })
          console.log('✅ Firestore update successful for follow')
        } catch (updateError) {
          console.error('❌ Firestore update failed for follow:', updateError)
          throw updateError
        }
      }

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
      const followedOrganizations = userData.followedOrganizations || []
      
      // Remove organization from followed list
      const updatedFollowedOrgs = followedOrganizations.filter(orgId => orgId !== organizationId)
      
      // Update user document
      try {
        await updateDoc(userRef, {
          followedOrganizations: updatedFollowedOrgs,
          updatedAt: serverTimestamp()
        })
        console.log('✅ Firestore update successful for unfollow')
      } catch (updateError) {
        console.error('❌ Firestore update failed for unfollow:', updateError)
        throw updateError
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

  // Migrate group preferences from old structure to new structure
  async migrateGroupPreferences(userData, userRef) {
    try {
      // If groupPreferences already exists, no migration needed
      if (userData.groupPreferences) {
        return
      }

      console.log('🔄 Migrating group preferences for mobile/web sync...')
      
      let groupPreferences = {}
      
      // Migrate from followedGroups array (old structure)
      if (userData.followedGroups && Array.isArray(userData.followedGroups)) {
        console.log('🔄 Migrating from followedGroups array:', userData.followedGroups)
        
        for (const groupId of userData.followedGroups) {
          try {
            const groupData = await this.getGroupById(groupId)
            if (groupData && groupData.name) {
              groupPreferences[groupData.name] = true
              console.log('🔄 Migrated group:', groupData.name)
            }
          } catch (error) {
            console.warn('⚠️ Could not migrate group ID:', groupId, error)
          }
        }
      }
      
      // Migrate from subcollections if no groupPreferences found
      if (Object.keys(groupPreferences).length === 0) {
        console.log('🔄 No followedGroups array found, checking subcollections...')
        
        // Check followedGroups subcollection
        const followedGroupsRef = collection(db, 'users', this.currentUser.uid, 'followedGroups')
        const followedGroupsSnapshot = await getDocs(followedGroupsRef)
        
        if (!followedGroupsSnapshot.empty) {
          followedGroupsSnapshot.forEach(doc => {
            const data = doc.data()
            if (data.name) {
              groupPreferences[data.name] = true
              console.log('🔄 Migrated from subcollection:', data.name)
            }
          })
        }
        
        // Check followedOrganizations subcollection
        const followedOrgsRef = collection(db, 'users', this.currentUser.uid, 'followedOrganizations')
        const followedOrgsSnapshot = await getDocs(followedOrgsRef)
        
        if (!followedOrgsSnapshot.empty) {
          for (const orgDoc of followedOrgsSnapshot.docs) {
            const orgData = orgDoc.data()
            if (orgData.groups) {
              Object.keys(orgData.groups).forEach(groupName => {
                if (orgData.groups[groupName] === true) {
                  groupPreferences[groupName] = true
                  console.log('🔄 Migrated from org subcollection:', groupName)
                }
              })
            }
          }
        }
      }
      
      // Update user document with migrated groupPreferences
      if (Object.keys(groupPreferences).length > 0) {
        await updateDoc(userRef, {
          groupPreferences,
          updatedAt: serverTimestamp()
        })
        console.log('✅ Migration completed. Group preferences:', groupPreferences)
      } else {
        console.log('ℹ️ No groups found to migrate')
      }
      
    } catch (error) {
      console.error('❌ Error during migration:', error)
    }
  }

  // Update organization group preferences for mobile app sync
  async updateOrganizationGroupPreferences(organizationId, groupName, isFollowing) {
    try {
      console.log(`🔄 Updating organization group preferences: ${groupName} = ${isFollowing}`)
      
      const orgRef = doc(db, 'users', this.currentUser.uid, 'followedOrganizations', organizationId)
      const orgDoc = await getDoc(orgRef)
      
      if (orgDoc.exists()) {
        // Update existing organization document
        const orgData = orgDoc.data()
        const groupPreferences = orgData.groupPreferences || {}
        
        if (isFollowing) {
          groupPreferences[groupName] = true
        } else {
          delete groupPreferences[groupName]
        }
        
        await updateDoc(orgRef, {
          groupPreferences,
          updatedAt: serverTimestamp()
        })
        
        console.log(`✅ Updated organization group preferences:`, groupPreferences)
      } else {
        // Create new organization document if it doesn't exist
        const newOrgData = {
          organizationId,
          isFollowing: true,
          groupPreferences: isFollowing ? { [groupName]: true } : {},
          followedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        await setDoc(orgRef, newOrgData)
        console.log(`✅ Created new organization document with group preferences`)
      }
      
    } catch (error) {
      console.error('❌ Error updating organization group preferences:', error)
    }
  }

  // Follow a group
  async followGroup(groupId) {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    try {
      // First, get the group data to find the group name
      const groupData = await this.getGroupById(groupId)
      if (!groupData) {
        throw new Error('Group not found')
      }

      const groupName = groupData.name
      console.log('🔍 Following group:', groupName, 'with ID:', groupId)

      // Add to user's followed groups using groupPreferences structure
      const userRef = doc(db, 'users', this.currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        throw new Error('User document not found')
      }

      const userData = userDoc.data()
      
      // Migrate from old structure if needed
      await this.migrateGroupPreferences(userData, userRef)
      
      // Get updated user data after migration
      const updatedUserDoc = await getDoc(userRef)
      const updatedUserData = updatedUserDoc.data()
      const groupPreferences = updatedUserData.groupPreferences || {}
      
      // Add group to followed list using group name as key
      groupPreferences[groupName] = true
      
      // Update user document with both structures for maximum compatibility
      const updateData = {
        groupPreferences,
        updatedAt: serverTimestamp()
      }
      
      // Also maintain the old followedGroups array for backward compatibility
      if (updatedUserData.followedGroups) {
        const followedGroups = updatedUserData.followedGroups
        if (!followedGroups.includes(groupId)) {
          followedGroups.push(groupId)
          updateData.followedGroups = followedGroups
        }
      }
      
      await updateDoc(userRef, updateData)
      
      // ALSO update the organization subcollection for mobile app sync
      await this.updateOrganizationGroupPreferences(groupData.organizationId, groupName, true)

      console.log('✅ Group followed successfully:', groupName)
      console.log('📱 Updated both groupPreferences and followedGroups for mobile/web sync')
      return true
    } catch (error) {
      console.error('❌ Error following group:', error)
      throw error
    }
  }

  // Unfollow a group
  async unfollowGroup(groupId) {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    try {
      // First, get the group data to find the group name
      const groupData = await this.getGroupById(groupId)
      if (!groupData) {
        throw new Error('Group not found')
      }

      const groupName = groupData.name
      console.log('🔍 Unfollowing group:', groupName, 'with ID:', groupId)

      // Remove from user's followed groups using groupPreferences structure
      const userRef = doc(db, 'users', this.currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        throw new Error('User document not found')
      }

      const userData = userDoc.data()
      
      // Migrate from old structure if needed
      await this.migrateGroupPreferences(userData, userRef)
      
      // Get updated user data after migration
      const updatedUserDoc = await getDoc(userRef)
      const updatedUserData = updatedUserDoc.data()
      const groupPreferences = updatedUserData.groupPreferences || {}
      
      // Remove group from followed list using group name as key
      delete groupPreferences[groupName]
      
      // Update user document with both structures for maximum compatibility
      const updateData = {
        groupPreferences,
        updatedAt: serverTimestamp()
      }
      
      // Also maintain the old followedGroups array for backward compatibility
      if (updatedUserData.followedGroups) {
        const followedGroups = updatedUserData.followedGroups.filter(id => id !== groupId)
        updateData.followedGroups = followedGroups
      }
      
      await updateDoc(userRef, updateData)
      
      // ALSO update the organization subcollection for mobile app sync
      await this.updateOrganizationGroupPreferences(groupData.organizationId, groupName, false)

      console.log('✅ Group unfollowed successfully:', groupName)
      console.log('📱 Updated both groupPreferences and followedGroups for mobile/web sync')
      return true
    } catch (error) {
      console.error('❌ Error unfollowing group:', error)
      throw error
    }
  }

  // Get a group by ID
  async getGroupById(groupId) {
    try {
      // First, we need to find which organization this group belongs to
      // This is a bit inefficient, but we'll search through all organizations
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      for (const orgDoc of orgsSnapshot.docs) {
        try {
          const groupDoc = await getDoc(doc(db, 'organizations', orgDoc.id, 'groups', groupId))
          if (groupDoc.exists()) {
            return {
              id: groupDoc.id,
              ...groupDoc.data(),
              organizationId: orgDoc.id,
              organizationName: orgDoc.data().name
            }
          }
        } catch (error) {
          // Continue searching other organizations
          continue
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Error getting group by ID:', error)
      return null
    }
  }
}

// Create a singleton instance
const adminService = new AdminService()
export default adminService
