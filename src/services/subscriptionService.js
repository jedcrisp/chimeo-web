import { db } from './firebase'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp, increment } from 'firebase/firestore'
import specialAccessService from './specialAccessService'

class SubscriptionService {
  constructor() {
    this.pricingTiers = {
        free: {
          name: 'Free',
          price: 0,
          maxAdmins: 1,
          maxRegularAdmins: 0,
          maxGroups: 2,
          maxSubGroups: 0,
          maxAlertsPerMonth: 25,
          features: ['1 organization admin', '2 groups', '25 alerts per month', 'Basic push notifications', 'Email support']
        },
        pro: {
          name: 'Pro',
          price: 10,
          maxAdmins: 2,
          maxRegularAdmins: 0,
          maxGroups: 5,
          maxSubGroups: 0,
          maxAlertsPerMonth: 100,
          features: ['2 organization admins', '5 groups', '100 alerts per month', 'Full web browser access', 'Advanced push notifications', 'Priority email support', 'Mobile app access']
        },
        premium: {
          name: 'Premium',
          price: 25,
          maxAdmins: 3,
          maxRegularAdmins: 10,
          maxGroups: 25,
          maxSubGroups: 1,
          maxAlertsPerMonth: 500,
          features: ['3 organization admins', '10 regular admins', '25 groups', '1 sub-group per group', '500 alerts per month', 'Full web browser access', 'Premium push notifications', 'Priority phone & email support']
        },
        enterprise: {
          name: 'Enterprise',
          price: 50,
          maxAdmins: 'custom',
          maxRegularAdmins: 'custom',
          maxGroups: 'custom',
          maxSubGroups: 'custom',
          maxAlertsPerMonth: 999999,
          features: ['Custom organization admins', 'Custom regular admins', 'Custom groups', 'Custom sub-groups', 'Unlimited alerts', 'Full web browser access', 'Premium push notifications', 'Priority phone & email support', 'Custom integrations']
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
        
        const planType = subscriptionData.planType || 'free'
        const tier = this.pricingTiers[planType] || this.pricingTiers.free
        
        const subscription = {
          userId,
          stripeCustomerId: subscriptionData.customerId,
          stripeSubscriptionId: subscriptionData.subscriptionId,
          planType,
          status: subscriptionData.status || 'active',
          currentPeriodStart: subscriptionData.currentPeriodStart,
          currentPeriodEnd: subscriptionData.currentPeriodEnd,
          cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
          // Include subscription limits
          maxAdmins: tier.maxAdmins,
          maxRegularAdmins: tier.maxRegularAdmins || 0,
          maxGroups: tier.maxGroups,
          maxSubGroups: tier.maxSubGroups || 0,
          maxAlertsPerMonth: tier.maxAlertsPerMonth,
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
        console.log('🔧 SubscriptionService: Organization data:', {
          name: orgData.name,
          subscriptionId: orgData.subscriptionId,
          planType: orgData.planType,
          adminIds: orgData.adminIds
        })
        
        // Check if organization has a direct planType field (newer approach)
        if (orgData.planType && orgData.planType !== 'free') {
          console.log('✅ SubscriptionService: Found organization planType:', orgData.planType)
          
          // First check if there's a subscription subcollection with custom limits
          const subscriptionId = orgData.subscriptionId
          if (subscriptionId) {
            const orgSubscriptionDoc = await getDoc(doc(db, 'organizations', organizationId, 'subscriptions', subscriptionId))
            if (orgSubscriptionDoc.exists()) {
              const subscription = orgSubscriptionDoc.data()
              console.log('✅ SubscriptionService: Found organization subscription subcollection with custom limits:', subscription.planType)
              
              const tier = this.pricingTiers[subscription.planType] || this.pricingTiers.free
              const limits = {
                admins: subscription.maxAdmins !== undefined ? subscription.maxAdmins : (tier.maxAdmins === 'custom' ? 'custom' : tier.maxAdmins),
                regularAdmins: subscription.maxRegularAdmins !== undefined ? subscription.maxRegularAdmins : (tier.maxRegularAdmins === 'custom' ? 'custom' : (tier.maxRegularAdmins || 0)),
                groups: subscription.maxGroups !== undefined ? subscription.maxGroups : (tier.maxGroups === 'custom' ? 'custom' : tier.maxGroups),
                subGroups: subscription.maxSubGroups !== undefined ? subscription.maxSubGroups : (tier.maxSubGroups === 'custom' ? 'custom' : (tier.maxSubGroups || 0)),
                alerts: subscription.maxAlertsPerMonth !== undefined ? subscription.maxAlertsPerMonth : tier.maxAlertsPerMonth
              }
              
              return {
                organizationId,
                planType: subscription.planType,
                status: subscription.status || 'active',
                ...tier,
                limits
              }
            }
          }
          
          // Fallback to organization document limits or tier defaults
          const tier = this.pricingTiers[orgData.planType] || this.pricingTiers.free
          const limits = {
            admins: orgData.maxAdmins !== undefined ? orgData.maxAdmins : (tier.maxAdmins === 'custom' ? 'custom' : tier.maxAdmins),
            regularAdmins: orgData.maxRegularAdmins !== undefined ? orgData.maxRegularAdmins : (tier.maxRegularAdmins === 'custom' ? 'custom' : (tier.maxRegularAdmins || 0)),
            groups: orgData.maxGroups !== undefined ? orgData.maxGroups : (tier.maxGroups === 'custom' ? 'custom' : tier.maxGroups),
            subGroups: orgData.maxSubGroups !== undefined ? orgData.maxSubGroups : (tier.maxSubGroups === 'custom' ? 'custom' : (tier.maxSubGroups || 0)),
            alerts: orgData.maxAlertsPerMonth !== undefined ? orgData.maxAlertsPerMonth : tier.maxAlertsPerMonth
          }
          
          return {
            organizationId,
            planType: orgData.planType,
            status: 'active',
            ...tier,
            limits
          }
        }
        
        // Check if organization has a subscriptionId that points to a subscription document
        const subscriptionId = orgData.subscriptionId
        if (subscriptionId) {
          // First try to get from organization's subscription subcollection
          const orgSubscriptionDoc = await getDoc(doc(db, 'organizations', organizationId, 'subscriptions', subscriptionId))
          if (orgSubscriptionDoc.exists()) {
            const subscription = orgSubscriptionDoc.data()
            console.log('✅ SubscriptionService: Found organization subscription subcollection:', subscription.planType)
            
            // Use stored limits if they exist, otherwise use tier defaults
            const tier = this.pricingTiers[subscription.planType] || this.pricingTiers.free
            const limits = {
              admins: subscription.maxAdmins !== undefined ? subscription.maxAdmins : (tier.maxAdmins === 'custom' ? 'custom' : tier.maxAdmins),
              regularAdmins: subscription.maxRegularAdmins !== undefined ? subscription.maxRegularAdmins : (tier.maxRegularAdmins === 'custom' ? 'custom' : (tier.maxRegularAdmins || 0)),
              groups: subscription.maxGroups !== undefined ? subscription.maxGroups : (tier.maxGroups === 'custom' ? 'custom' : tier.maxGroups),
              subGroups: subscription.maxSubGroups !== undefined ? subscription.maxSubGroups : (tier.maxSubGroups === 'custom' ? 'custom' : (tier.maxSubGroups || 0)),
              alerts: subscription.maxAlertsPerMonth !== undefined ? subscription.maxAlertsPerMonth : tier.maxAlertsPerMonth
            }
            
            return {
              organizationId,
              planType: subscription.planType,
              status: subscription.status || 'active',
              ...tier,
              limits
            }
          }
          
          // Then try to get from subscriptions collection
          const subscriptionDoc = await getDoc(doc(db, 'subscriptions', subscriptionId))
          if (subscriptionDoc.exists()) {
            const subscription = subscriptionDoc.data()
            console.log('✅ SubscriptionService: Found organization subscription document:', subscription.planType)
            return subscription
          }
          
          // If not found in subscriptions collection, check if it's a user ID
          // and get the user's subscription from their subcollection
          const adminIds = orgData.adminIds || {}
          const adminUserIds = Object.keys(adminIds).filter(id => adminIds[id] === true)
          
          // Check each admin user's subscriptions
          for (const userId of adminUserIds) {
            const userSubscriptionDoc = await getDoc(doc(db, 'users', userId, 'subscriptions', subscriptionId))
            if (userSubscriptionDoc.exists()) {
              const subscription = userSubscriptionDoc.data()
              console.log('✅ SubscriptionService: Found user subscription for organization:', subscription.planType)
              const tier = this.pricingTiers[subscription.planType] || this.pricingTiers.free
              return {
                organizationId,
                planType: subscription.planType,
                status: subscription.status || 'active',
                ...tier,
                limits: {
                  admins: tier.maxAdmins === 'custom' ? 'custom' : tier.maxAdmins,
                  regularAdmins: tier.maxRegularAdmins === 'custom' ? 'custom' : (tier.maxRegularAdmins || 0),
                  groups: tier.maxGroups === 'custom' ? 'custom' : tier.maxGroups,
                  subGroups: tier.maxSubGroups === 'custom' ? 'custom' : (tier.maxSubGroups || 0),
                  alerts: tier.maxAlertsPerMonth
                }
              }
            }
          }
          
          // Fallback: check if subscriptionId is actually a user ID and get their current subscription
          const userDoc = await getDoc(doc(db, 'users', subscriptionId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.planType && userData.planType !== 'free') {
              console.log('✅ SubscriptionService: Found user subscription for organization:', userData.planType)
              const tier = this.pricingTiers[userData.planType] || this.pricingTiers.free
              return {
                organizationId,
                planType: userData.planType,
                status: 'active',
                ...tier,
                limits: {
                  admins: tier.maxAdmins === 'custom' ? 'custom' : tier.maxAdmins,
                  regularAdmins: tier.maxRegularAdmins === 'custom' ? 'custom' : (tier.maxRegularAdmins || 0),
                  groups: tier.maxGroups === 'custom' ? 'custom' : tier.maxGroups,
                  subGroups: tier.maxSubGroups === 'custom' ? 'custom' : (tier.maxSubGroups || 0),
                  alerts: tier.maxAlertsPerMonth
                }
              }
            }
          }
        }
      }
      
      console.log('ℹ️ SubscriptionService: No organization subscription found, returning free tier')
      const tier = this.pricingTiers.free
      return {
        organizationId,
        planType: 'free',
        status: 'active',
        ...tier,
        limits: {
          admins: tier.maxAdmins === 'custom' ? 'custom' : tier.maxAdmins,
          regularAdmins: tier.maxRegularAdmins === 'custom' ? 'custom' : (tier.maxRegularAdmins || 0),
          groups: tier.maxGroups === 'custom' ? 'custom' : tier.maxGroups,
          subGroups: tier.maxSubGroups === 'custom' ? 'custom' : (tier.maxSubGroups || 0),
          alerts: tier.maxAlertsPerMonth
        }
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
      console.log('🔧 SubscriptionService: User ID:', userId)
      console.log('🔧 SubscriptionService: Organization ID:', organizationId)
      
      // Platform admin bypass - check if user is platform admin
      const platformAdminUIDs = ['z4a9tShrtmT5W88euqy92ihQiNB3']
      if (platformAdminUIDs.includes(userId)) {
        console.log('✅ SubscriptionService: Platform admin detected - unlimited access granted')
        return { 
          allowed: true, 
          reason: 'Platform admin - unlimited access',
          platformAdmin: true
        }
      }
      
      // First check for special access (overrides subscription limits)
      if (organizationId) {
        console.log('🔧 SubscriptionService: Checking special access...')
        const specialAccess = await specialAccessService.hasSpecialAccess(userId, organizationId, action)
        if (specialAccess.hasAccess) {
          console.log('✅ SubscriptionService: User has special access:', specialAccess.reason)
          return { 
            allowed: true, 
            reason: specialAccess.reason,
            specialAccess: true,
            accessType: specialAccess.accessType
          }
        }
      }
      
      console.log('🔧 SubscriptionService: Getting subscription...')
      const subscription = organizationId 
        ? await this.getOrganizationSubscription(organizationId)
        : await this.getUserSubscription(userId)
      
      console.log('🔧 SubscriptionService: Subscription result:', {
        planType: subscription.planType,
        status: subscription.status,
        tier: subscription.name
      })
      
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
      console.log('🔧 SubscriptionService: Pricing tier:', tier.name)
      
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
          
        case 'manageAdmins':
          console.log('🔧 SubscriptionService: Checking manageAdmins permission...')
          console.log('🔧 SubscriptionService: Plan type:', subscription.planType)
          console.log('🔧 SubscriptionService: Is plan free?', subscription.planType === 'free')
          
          // Allow admin management for any non-free subscription
          if (subscription.planType === 'free') {
            console.log('❌ SubscriptionService: Admin management not allowed for free plan')
            return { 
              allowed: false, 
              reason: 'Admin management requires a paid subscription', 
              tier: tier.name
            }
          }
          console.log('✅ SubscriptionService: Admin management allowed for plan:', subscription.planType)
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

  // Get sub-group count for organization
  async getSubGroupCount(organizationId) {
    try {
      const subGroupsQuery = query(collection(db, 'organizations', organizationId, 'subGroups'))
      const subGroupsSnapshot = await getDocs(subGroupsQuery)
      return subGroupsSnapshot.size
    } catch (error) {
      console.error('❌ SubscriptionService: Error getting sub-group count:', error)
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
      const subGroupCount = organizationId ? await this.getSubGroupCount(organizationId) : 0
      
      return {
        subscription: {
          planType: subscription.planType,
          status: subscription.status,
          tier: tier.name,
          price: tier.price
        },
        usage: {
          alertsSent: alertUsage,
          groupsCreated: groupCount,
          adminsAdded: adminCount,
          subGroupsCreated: subGroupCount
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
