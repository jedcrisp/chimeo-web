import { db } from './firebase'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp, increment } from 'firebase/firestore'

class SubscriptionService {
  constructor() {
    this.pricingTiers = {
      free: {
        name: 'Free',
        price: 0,
        maxAdmins: 1,
        maxGroups: 2,
        maxAlertsPerMonth: 25,
        features: ['Basic web access', 'Basic push notifications', 'Email support']
      },
      pro: {
        name: 'Pro',
        price: 10,
        maxAdmins: 2,
        maxGroups: 5,
        maxAlertsPerMonth: 100,
        features: ['Full web browser access', 'Advanced push notifications', 'Priority email support', 'Mobile app access']
      },
      premium: {
        name: 'Premium',
        price: 25,
        maxAdmins: 10,
        maxGroups: 25,
        maxAlertsPerMonth: 500,
        features: ['10+ organization admins', '25 groups', '500 alerts per month', 'Full web browser access', 'Premium push notifications', 'Priority phone & email support']
      },
      enterprise: {
        name: 'Enterprise',
        price: 50,
        maxAdmins: 999999,
        maxGroups: 999999,
        maxAlertsPerMonth: 999999,
        features: ['Unlimited admins', 'Unlimited groups', 'Unlimited alerts', 'Full web browser access', 'Premium push notifications', 'Priority phone & email support', 'Custom integrations']
      }
    }
  }

  // Get pricing tier information
  getPricingTier(tierName) {
    return this.pricingTiers[tierName] || this.pricingTiers.free
  }

  // Get all pricing tiers
  getAllPricingTiers() {
    return this.pricingTiers
  }

  // Create or update user subscription
  async createOrUpdateSubscription(userId, subscriptionData) {
    try {
      console.log('🔧 SubscriptionService: Creating/updating subscription for user:', userId)
      
      const subscription = {
        userId,
        stripeCustomerId: subscriptionData.customerId,
        stripeSubscriptionId: subscriptionData.subscriptionId,
        planType: subscriptionData.planType || 'free',
        status: subscriptionData.status || 'active',
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
        createdAt: subscriptionData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Store in user subcollection
      const subscriptionRef = doc(db, 'users', userId, 'subscriptions', subscriptionData.subscriptionId || 'current')
      await setDoc(subscriptionRef, subscription)
      
      // Also update user profile for quick access
      await updateDoc(doc(db, 'users', userId), {
        planType: subscription.planType,
        subscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ SubscriptionService: Subscription created/updated successfully')
      
      return subscription
    } catch (error) {
      console.error('❌ SubscriptionService: Error creating/updating subscription:', error)
      throw error
    }
  }

  // Get user subscription
  async getUserSubscription(userId) {
    try {
      console.log('🔧 SubscriptionService: Getting subscription for user:', userId)
      
      // First try to get from user subcollection
      const subscriptionQuery = query(
        collection(db, 'users', userId, 'subscriptions'),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
      
      const subscriptionSnapshot = await getDocs(subscriptionQuery)
      
      if (!subscriptionSnapshot.empty) {
        const subscriptionDoc = subscriptionSnapshot.docs[0]
        const subscription = subscriptionDoc.data()
        console.log('✅ SubscriptionService: Found subscription in subcollection:', subscription.planType)
        return subscription
      }
      
      // Fallback: check user profile for planType
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.planType && userData.planType !== 'free') {
          console.log('✅ SubscriptionService: Found planType in user profile:', userData.planType)
          return {
            userId,
            planType: userData.planType,
            status: 'active',
            ...this.pricingTiers[userData.planType] || this.pricingTiers.free
          }
        }
      }
      
      console.log('ℹ️ SubscriptionService: No subscription found, returning free tier')
      return {
        userId,
        planType: 'free',
        status: 'active',
        ...this.pricingTiers.free
      }
    } catch (error) {
      console.error('❌ SubscriptionService: Error getting subscription:', error)
      throw error
    }
  }

  // Get organization subscription (for organization-level features)
  async getOrganizationSubscription(organizationId) {
    try {
      console.log('🔧 SubscriptionService: Getting subscription for organization:', organizationId)
      
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      
      if (orgDoc.exists()) {
        const orgData = orgDoc.data()
        const subscriptionId = orgData.subscriptionId
        
        if (subscriptionId) {
          const subscriptionDoc = await getDoc(doc(db, 'subscriptions', subscriptionId))
          if (subscriptionDoc.exists()) {
            const subscription = subscriptionDoc.data()
            console.log('✅ SubscriptionService: Found organization subscription:', subscription.planType)
            return subscription
          }
        }
      }
      
      console.log('ℹ️ SubscriptionService: No organization subscription found, returning free tier')
      return {
        organizationId,
        planType: 'free',
        status: 'active',
        ...this.pricingTiers.free
      }
    } catch (error) {
      console.error('❌ SubscriptionService: Error getting organization subscription:', error)
      throw error
    }
  }

  // Check if user can perform an action based on their subscription
  async canUserPerformAction(userId, action, organizationId = null) {
    try {
      console.log('🔧 SubscriptionService: Checking if user can perform action:', action)
      
      const subscription = organizationId 
        ? await this.getOrganizationSubscription(organizationId)
        : await this.getUserSubscription(userId)
      
      // Check if subscription is active
      if (subscription.status !== 'active') {
        console.log('❌ SubscriptionService: Subscription not active')
        return { allowed: false, reason: 'Subscription not active' }
      }
      
      // Check if subscription has expired
      if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd.toDate()) {
        console.log('❌ SubscriptionService: Subscription expired')
        return { allowed: false, reason: 'Subscription expired' }
      }
      
      const tier = this.getPricingTier(subscription.planType)
      
      // Check specific limits
      switch (action) {
        case 'createAlert':
          const alertUsage = await this.getUsageForMonth(userId, 'alerts', organizationId)
          if (alertUsage >= tier.maxAlertsPerMonth) {
            return { 
              allowed: false, 
              reason: 'Alert limit reached', 
              limit: tier.maxAlertsPerMonth,
              used: alertUsage,
              tier: tier.name
            }
          }
          break
          
        case 'createGroup':
          const groupCount = await this.getGroupCount(organizationId)
          if (groupCount >= tier.maxGroups) {
            return { 
              allowed: false, 
              reason: 'Group limit reached', 
              limit: tier.maxGroups,
              used: groupCount,
              tier: tier.name
            }
          }
          break
          
        case 'addAdmin':
          const adminCount = await this.getAdminCount(organizationId)
          if (adminCount >= tier.maxAdmins) {
            return { 
              allowed: false, 
              reason: 'Admin limit reached', 
              limit: tier.maxAdmins,
              used: adminCount,
              tier: tier.name
            }
          }
          break
      }
      
      console.log('✅ SubscriptionService: Action allowed')
      return { allowed: true, tier: tier.name }
      
    } catch (error) {
      console.error('❌ SubscriptionService: Error checking action permission:', error)
      return { allowed: false, reason: 'Error checking permissions' }
    }
  }

  // Get usage for current month
  async getUsageForMonth(userId, type, organizationId = null) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) // '2025-01'
      const usageId = organizationId ? `${organizationId}_${currentMonth}` : `${userId}_${currentMonth}`
      
      const usageDoc = await getDoc(doc(db, 'usage', usageId))
      
      if (usageDoc.exists()) {
        const usage = usageDoc.data()
        return usage[type] || 0
      }
      
      return 0
    } catch (error) {
      console.error('❌ SubscriptionService: Error getting usage:', error)
      return 0
    }
  }

  // Increment usage counter
  async incrementUsage(userId, type, organizationId = null) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const usageId = organizationId ? `${organizationId}_${currentMonth}` : `${userId}_${currentMonth}`
      
      const usageRef = doc(db, 'usage', usageId)
      const usageDoc = await getDoc(usageRef)
      
      if (usageDoc.exists()) {
        await updateDoc(usageRef, {
          [type]: increment(1),
          updatedAt: serverTimestamp()
        })
      } else {
        await setDoc(usageRef, {
          userId: organizationId || userId,
          month: currentMonth,
          [type]: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }
      
      console.log(`✅ SubscriptionService: Incremented ${type} usage`)
    } catch (error) {
      console.error('❌ SubscriptionService: Error incrementing usage:', error)
    }
  }

  // Get group count for organization
  async getGroupCount(organizationId) {
    try {
      const groupsQuery = query(collection(db, 'organizations', organizationId, 'groups'))
      const groupsSnapshot = await getDocs(groupsQuery)
      return groupsSnapshot.size
    } catch (error) {
      console.error('❌ SubscriptionService: Error getting group count:', error)
      return 0
    }
  }

  // Get admin count for organization
  async getAdminCount(organizationId) {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      if (orgDoc.exists()) {
        const orgData = orgDoc.data()
        const adminIds = orgData.adminIds || {}
        return Object.keys(adminIds).filter(adminId => adminIds[adminId] === true).length
      }
      return 0
    } catch (error) {
      console.error('❌ SubscriptionService: Error getting admin count:', error)
      return 0
    }
  }

  // Get comprehensive usage stats
  async getUsageStats(userId, organizationId = null) {
    try {
      const subscription = organizationId 
        ? await this.getOrganizationSubscription(organizationId)
        : await this.getUserSubscription(userId)
      
      const tier = this.getPricingTier(subscription.planType)
      
      const alertUsage = await this.getUsageForMonth(userId, 'alerts', organizationId)
      const groupCount = organizationId ? await this.getGroupCount(organizationId) : 0
      const adminCount = organizationId ? await this.getAdminCount(organizationId) : 0
      
      return {
        subscription: {
          planType: subscription.planType,
          status: subscription.status,
          tier: tier.name,
          price: tier.price
        },
        usage: {
          alerts: {
            used: alertUsage,
            limit: tier.maxAlertsPerMonth,
            remaining: Math.max(0, tier.maxAlertsPerMonth - alertUsage),
            percentage: Math.round((alertUsage / tier.maxAlertsPerMonth) * 100)
          },
          groups: {
            used: groupCount,
            limit: tier.maxGroups,
            remaining: Math.max(0, tier.maxGroups - groupCount),
            percentage: Math.round((groupCount / tier.maxGroups) * 100)
          },
          admins: {
            used: adminCount,
            limit: tier.maxAdmins,
            remaining: Math.max(0, tier.maxAdmins - adminCount),
            percentage: Math.round((adminCount / tier.maxAdmins) * 100)
          }
        },
        features: tier.features
      }
    } catch (error) {
      console.error('❌ SubscriptionService: Error getting usage stats:', error)
      throw error
    }
  }

  // Cancel subscription
  async cancelSubscription(userId) {
    try {
      console.log('🔧 SubscriptionService: Cancelling subscription for user:', userId)
      
      await updateDoc(doc(db, 'subscriptions', userId), {
        status: 'cancelled',
        cancelAtPeriodEnd: true,
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ SubscriptionService: Subscription cancelled successfully')
    } catch (error) {
      console.error('❌ SubscriptionService: Error cancelling subscription:', error)
      throw error
    }
  }
}

export default new SubscriptionService()
