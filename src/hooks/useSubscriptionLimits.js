import { useState, useEffect } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'

export function useSubscriptionLimits(action, organizationId = null) {
  const { canPerformAction, hasReachedLimit, isApproachingLimit, usageStats } = useSubscription()
  const [permission, setPermission] = useState({ allowed: true, reason: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkPermission = async () => {
      setLoading(true)
      try {
        const result = await canPerformAction(action, organizationId)
        setPermission(result)
      } catch (error) {
        console.error('Error checking subscription limits:', error)
        setPermission({ allowed: false, reason: 'Error checking permissions' })
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [action, organizationId, canPerformAction])

  const getLimitInfo = () => {
    if (!usageStats) return null

    switch (action) {
      case 'createAlert':
        return {
          type: 'alerts',
          used: usageStats.usage.alerts.used,
          limit: usageStats.usage.alerts.limit,
          remaining: usageStats.usage.alerts.remaining,
          percentage: usageStats.usage.alerts.percentage
        }
      case 'createGroup':
        return {
          type: 'groups',
          used: usageStats.usage.groups.used,
          limit: usageStats.usage.groups.limit,
          remaining: usageStats.usage.groups.remaining,
          percentage: usageStats.usage.groups.percentage
        }
      case 'addAdmin':
        return {
          type: 'admins',
          used: usageStats.usage.admins.used,
          limit: usageStats.usage.admins.limit,
          remaining: usageStats.usage.admins.remaining,
          percentage: usageStats.usage.admins.percentage
        }
      default:
        return null
    }
  }

  return {
    allowed: permission.allowed,
    reason: permission.reason,
    loading,
    limitInfo: getLimitInfo(),
    isApproachingLimit: isApproachingLimit(action.replace('create', '').replace('add', '').toLowerCase()),
    hasReachedLimit: hasReachedLimit(action.replace('create', '').replace('add', '').toLowerCase())
  }
}
