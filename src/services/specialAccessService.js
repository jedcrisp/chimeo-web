import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'

class SpecialAccessService {
  constructor() {
    this.specialAccessCollection = 'special_access'
  }

  // Grant special access to a user
  async grantSpecialAccess(userId, organizationId, accessType, limits = {}) {
    try {
      const accessId = `${userId}_${organizationId}`
      const accessRef = doc(db, this.specialAccessCollection, accessId)
      
      const specialAccess = {
        userId,
        organizationId,
        accessType, // 'unlimited', 'custom', 'premium'
        limits: {
          alerts: limits.alerts || -1,      // -1 = unlimited
          groups: limits.groups || -1,      // -1 = unlimited
          admins: limits.admins || -1,      // -1 = unlimited
          notifications: limits.notifications || -1,
          ...limits
        },
        grantedBy: 'system', // Could be admin user ID
        grantedAt: serverTimestamp(),
        expiresAt: limits.expiresAt || null, // Optional expiration
        reason: limits.reason || 'Special access granted',
        isActive: true
      }

      await setDoc(accessRef, specialAccess)
      // console.log(`✅ Special access granted to user ${userId} for org ${organizationId}`)
      
      return specialAccess
    } catch (error) {
      console.error('❌ Error granting special access:', error)
      throw error
    }
  }

  // Revoke special access
  async revokeSpecialAccess(userId, organizationId) {
    try {
      const accessId = `${userId}_${organizationId}`
      const accessRef = doc(db, this.specialAccessCollection, accessId)
      
      await updateDoc(accessRef, {
        isActive: false,
        revokedAt: serverTimestamp(),
        revokedBy: 'system'
      })
      
      console.log(`✅ Special access revoked for user ${userId} in org ${organizationId}`)
    } catch (error) {
      console.error('❌ Error revoking special access:', error)
      throw error
    }
  }

  // Get special access for a user
  async getSpecialAccess(userId, organizationId) {
    try {
      const accessId = `${userId}_${organizationId}`
      const accessRef = doc(db, this.specialAccessCollection, accessId)
      const accessDoc = await getDoc(accessRef)
      
      if (!accessDoc.exists()) {
        return null
      }
      
      const accessData = accessDoc.data()
      
      // Check if access has expired
      if (accessData.expiresAt && accessData.expiresAt.toDate() < new Date()) {
        await this.revokeSpecialAccess(userId, organizationId)
        return null
      }
      
      return accessData.isActive ? accessData : null
    } catch (error) {
      console.error('❌ Error getting special access:', error)
      return null
    }
  }

  // Get all special access for an organization
  async getOrganizationSpecialAccess(organizationId) {
    try {
      const q = query(
        collection(db, this.specialAccessCollection),
        where('organizationId', '==', organizationId),
        where('isActive', '==', true)
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('❌ Error getting organization special access:', error)
      return []
    }
  }

  // Check if user has special access for a specific action
  async hasSpecialAccess(userId, organizationId, action) {
    try {
      const specialAccess = await this.getSpecialAccess(userId, organizationId)
      
      if (!specialAccess) {
        return { hasAccess: false, reason: 'No special access' }
      }
      
      const limit = specialAccess.limits[action]
      
      if (limit === -1) {
        return { 
          hasAccess: true, 
          reason: 'Unlimited access',
          accessType: specialAccess.accessType
        }
      }
      
      if (limit > 0) {
        return { 
          hasAccess: true, 
          reason: `Custom limit: ${limit}`,
          limit: limit,
          accessType: specialAccess.accessType
        }
      }
      
      return { hasAccess: false, reason: 'Access denied' }
    } catch (error) {
      console.error('❌ Error checking special access:', error)
      return { hasAccess: false, reason: 'Error checking access' }
    }
  }

  // Update special access limits
  async updateSpecialAccessLimits(userId, organizationId, newLimits) {
    try {
      const accessId = `${userId}_${organizationId}`
      const accessRef = doc(db, this.specialAccessCollection, accessId)
      
      await updateDoc(accessRef, {
        limits: {
          ...newLimits
        },
        updatedAt: serverTimestamp()
      })
      
      console.log(`✅ Special access limits updated for user ${userId}`)
    } catch (error) {
      console.error('❌ Error updating special access limits:', error)
      throw error
    }
  }

  // Get all users with special access (admin function)
  async getAllSpecialAccess() {
    try {
      const q = query(
        collection(db, this.specialAccessCollection),
        where('isActive', '==', true)
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('❌ Error getting all special access:', error)
      return []
    }
  }

  // Predefined access types
  static getAccessTypes() {
    return {
      UNLIMITED: {
        name: 'Unlimited Access',
        description: 'Complete unlimited access to all features',
        limits: {
          alerts: -1,
          groups: -1,
          admins: -1,
          notifications: -1
        }
      },
      PREMIUM: {
        name: 'Premium Access',
        description: 'High limits for premium users',
        limits: {
          alerts: 1000,
          groups: 100,
          admins: 25,
          notifications: -1
        }
      },
      CUSTOM: {
        name: 'Custom Access',
        description: 'Custom limits as specified',
        limits: {}
      }
    }
  }
}

// Create singleton instance
const specialAccessService = new SpecialAccessService()

// Add static methods to instance
specialAccessService.getAccessTypes = SpecialAccessService.getAccessTypes

export default specialAccessService
