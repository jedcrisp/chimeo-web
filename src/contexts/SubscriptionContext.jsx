import { createContext, useContext, useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import subscriptionService from '../services/subscriptionService'

const SubscriptionContext = createContext()

export function useSubscription() {
  return useContext(SubscriptionContext)
}

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null)
  const [usageStats, setUsageStats] = useState(null)
  const [loading, setLoading] = useState(true)
  // Safely get auth context
  const authContext = useContext(AuthContext)
  const currentUser = authContext?.currentUser
  const userProfile = authContext?.userProfile

  // Load subscription data
  const loadSubscription = async () => {
    if (!currentUser || !userProfile) {
      setSubscription(null)
      setUsageStats(null)
      setLoading(false)
      return
    }

    try {
      console.log('🔧 SubscriptionContext: Loading subscription data...')
      
      // Get user subscription
      const userSubscription = await subscriptionService.getUserSubscription(currentUser.uid)
      setSubscription(userSubscription)
      
      // Get usage stats
      const stats = await subscriptionService.getUsageStats(currentUser.uid)
      setUsageStats(stats)
      
      console.log('✅ SubscriptionContext: Subscription loaded:', userSubscription.planType)
      console.log('✅ SubscriptionContext: Usage stats loaded:', stats.usage)
      
    } catch (error) {
      console.error('❌ SubscriptionContext: Error loading subscription:', error)
      // Set default free tier on error
      setSubscription({
        planType: 'free',
        status: 'active',
        ...subscriptionService.getPricingTier('free')
      })
    } finally {
      setLoading(false)
    }
  }

  // Load organization subscription
  const loadOrganizationSubscription = async (organizationId) => {
    if (!organizationId) return null

    try {
      console.log('🔧 SubscriptionContext: Loading organization subscription for:', organizationId)
      
      const orgSubscription = await subscriptionService.getOrganizationSubscription(organizationId)
      const stats = await subscriptionService.getUsageStats(currentUser.uid, organizationId)
      
      console.log('✅ SubscriptionContext: Organization subscription loaded:', orgSubscription.planType)
      
      return { subscription: orgSubscription, stats }
    } catch (error) {
      console.error('❌ SubscriptionContext: Error loading organization subscription:', error)
      return null
    }
  }

  // Check if user can perform an action
  const canPerformAction = async (action, organizationId = null) => {
    if (!currentUser) return { allowed: false, reason: 'Not authenticated' }

    try {
      const result = await subscriptionService.canUserPerformAction(
        currentUser.uid, 
        action, 
        organizationId
      )
      
      console.log(`🔧 SubscriptionContext: Can perform ${action}:`, result.allowed)
      return result
    } catch (error) {
      console.error('❌ SubscriptionContext: Error checking action permission:', error)
      return { allowed: false, reason: 'Error checking permissions' }
    }
  }

  // Increment usage counter
  const incrementUsage = async (type, organizationId = null) => {
    if (!currentUser) return

    try {
      await subscriptionService.incrementUsage(currentUser.uid, type, organizationId)
      
      // Reload usage stats
      const stats = await subscriptionService.getUsageStats(currentUser.uid, organizationId)
      setUsageStats(stats)
      
      console.log(`✅ SubscriptionContext: Incremented ${type} usage`)
    } catch (error) {
      console.error('❌ SubscriptionContext: Error incrementing usage:', error)
    }
  }

  // Get current pricing tier
  const getCurrentTier = () => {
    if (!subscription) return subscriptionService.getPricingTier('free')
    return subscriptionService.getPricingTier(subscription.planType)
  }

  // Check if user is approaching limits
  const isApproachingLimit = (type, threshold = 0.8) => {
    if (!usageStats) return false
    
    const usage = usageStats.usage[type]
    if (!usage) return false
    
    return usage.percentage >= (threshold * 100)
  }

  // Check if user has reached limit
  const hasReachedLimit = (type) => {
    if (!usageStats) return false
    
    const usage = usageStats.usage[type]
    if (!usage) return false
    
    return usage.remaining <= 0
  }

  // Get upgrade suggestions
  const getUpgradeSuggestions = () => {
    if (!usageStats) return []

    const suggestions = []
    const { usage } = usageStats

    if (usage.alerts.percentage >= 80) {
      suggestions.push({
        type: 'alerts',
        message: `You've used ${usage.alerts.used}/${usage.alerts.limit} alerts this month`,
        currentTier: subscription?.planType || 'free'
      })
    }

    if (usage.groups.percentage >= 80) {
      suggestions.push({
        type: 'groups',
        message: `You've used ${usage.groups.used}/${usage.groups.limit} groups`,
        currentTier: subscription?.planType || 'free'
      })
    }

    if (usage.admins.percentage >= 80) {
      suggestions.push({
        type: 'admins',
        message: `You've used ${usage.admins.used}/${usage.admins.limit} admins`,
        currentTier: subscription?.planType || 'free'
      })
    }

    return suggestions
  }

  // Refresh subscription data
  const refreshSubscription = async () => {
    setLoading(true)
    await loadSubscription()
  }

  // Load subscription when user changes
  useEffect(() => {
    loadSubscription()
  }, [currentUser, userProfile])

  const value = {
    // State
    subscription,
    usageStats,
    loading,
    
    // Actions
    loadSubscription,
    loadOrganizationSubscription,
    canPerformAction,
    incrementUsage,
    refreshSubscription,
    
    // Helpers
    getCurrentTier,
    isApproachingLimit,
    hasReachedLimit,
    getUpgradeSuggestions,
    
    // Service access
    subscriptionService
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}
