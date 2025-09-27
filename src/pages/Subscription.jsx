import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { CreditCard, Check, X, Crown, Zap, Star, Shield, Users, Bell, BarChart3, Settings, ArrowRight, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import subscriptionService from '../services/subscriptionService'

export default function Subscription() {
  const { currentUser, userProfile } = useAuth()
  const { subscription, usageStats, loading: subscriptionLoading } = useSubscription()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [orgSubscription, setOrgSubscription] = useState(null)
  const [orgUsageStats, setOrgUsageStats] = useState(null)
  const [orgLoading, setOrgLoading] = useState(false)

  // Load organization subscription data
  useEffect(() => {
    const loadOrgSubscription = async () => {
      if (!currentUser || !userProfile) return
      
      // Get organization ID
      let orgId = userProfile?.organizationId
      if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
        orgId = userProfile.organizations[0]
      }
      
      if (!orgId) return
      
      setOrgLoading(true)
      try {
        console.log('🔧 Loading organization subscription for:', orgId)
        const orgSub = await subscriptionService.getOrganizationSubscription(orgId)
        const orgStats = await subscriptionService.getUsageStats(currentUser.uid, orgId)
        
        setOrgSubscription(orgSub)
        setOrgUsageStats(orgStats)
        
        console.log('✅ Organization subscription loaded:', orgSub.planType)
        console.log('✅ Organization subscription limits:', orgSub.limits)
        console.log('✅ Organization usage stats loaded:', orgStats.usage)
      } catch (error) {
        console.error('❌ Error loading organization subscription:', error)
      } finally {
        setOrgLoading(false)
      }
    }
    
    loadOrgSubscription()
  }, [currentUser, userProfile])

  // Use organization data if available, otherwise fall back to user data
  const displaySubscription = orgSubscription || subscription
  const displayUsageStats = orgUsageStats || usageStats
  const displayLoading = orgLoading || subscriptionLoading


  const pricingTiers = [
    {
      name: 'Standard',
      price: 0,
      period: 'month',
      description: 'Basic access for individual users',
      features: [
        'View alerts from followed organizations',
        'Join groups as a member',
        'Discover organizations',
        'Basic push notifications',
        'Email support'
      ],
      limits: {
        admins: 0,
        groups: 0,
        alerts: 0
      },
      popular: false,
      current: displaySubscription?.planType === 'standard' || displaySubscription?.accessLevel === 'standard'
    },
    {
      name: 'Free',
      price: 0,
      period: 'month',
      description: 'Perfect for getting started',
      features: [
        '1 admin',
        '2 groups',
        '25 alerts per month',
        'Basic push notifications',
        'Email support'
      ],
      limits: {
        admins: 1,
        groups: 2,
        alerts: 25
      },
      popular: false,
      current: displaySubscription?.planType === 'free'
    },
    {
      name: 'Pro',
      price: 10,
      period: 'month',
      description: 'Great for small teams',
      features: [
        '2 admins',
        '5 groups',
        '100 alerts per month',
        'Full web browser access',
        'Advanced push notifications',
        'Priority email support',
        'Mobile app access'
      ],
      limits: {
        admins: 2,
        groups: 5,
        alerts: 100
      },
      popular: true,
      current: displaySubscription?.planType === 'pro'
    },
    {
      name: 'Premium',
      price: 25,
      period: 'month',
      description: 'Perfect for growing organizations',
      features: [
        '10 organization admins',
        '25 groups',
        '500 alerts per month',
        'Full web browser access',
        'Premium push notifications',
        'Priority phone & email support'
      ],
      limits: {
        admins: 10,
        groups: 25,
        alerts: 500
      },
      popular: false,
      current: displaySubscription?.planType === 'premium'
    },
    {
      name: 'Enterprise',
      price: null,
      period: null,
      customPrice: 'Custom Quote',
      description: 'For large organizations',
      features: [
        '25 organization admins',
        '75 groups',
        'Unlimited alerts',
        'Full web browser access',
        'Premium push notifications',
        'Priority phone & email support',
        'Custom integrations'
      ],
      limits: {
        admins: 25,
        groups: 75,
        alerts: 999999
      },
      popular: false,
      current: displaySubscription?.planType === 'enterprise'
    }
  ]

  const handleUpgrade = async (planType) => {
    if (planType === 'free') return
    
    setIsUpgrading(true)
    try {
      // TODO: Implement Stripe checkout integration
      toast.success(`Upgrade to ${planType} plan - Coming soon!`)
      console.log(`Upgrading to ${planType} plan...`)
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      toast.error('Failed to upgrade subscription')
    } finally {
      setIsUpgrading(false)
    }
  }

  const getUsagePercentage = (used, limit) => {
    if (limit === 999999) return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (displayLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select the perfect plan for your organization. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Current Subscription Status */}
        {displaySubscription && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Current Plan: {displaySubscription.accessLevel === 'standard' ? 'STANDARD' : displaySubscription.planType?.toUpperCase() || 'FREE'}
                    </h3>
                    <p className="text-gray-600">
                      {displaySubscription.accessLevel === 'standard' ? 'Standard Plan' : displaySubscription.name || 'Free Plan'} - {displaySubscription.planType === 'enterprise' ? 'Custom Quote' : `$${displaySubscription.price || 0}/month`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    displaySubscription.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {displaySubscription.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Statistics - Only show for non-standard users */}
        {displayUsageStats && displaySubscription && displaySubscription.accessLevel !== 'standard' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Usage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Used this month</span>
                    <span className="font-medium">{displayUsageStats.usage?.alertsSent || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(displayUsageStats.usage?.alertsSent || 0, displaySubscription.limits?.alerts || 25))}`}
                      style={{ 
                        width: `${getUsagePercentage(displayUsageStats.usage?.alertsSent || 0, displaySubscription.limits?.alerts || 25)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {displaySubscription.limits?.alerts === 999999 ? '∞' : 
                     displaySubscription.limits?.alerts === 'custom' ? 'Custom' : 
                     `of ${displaySubscription.limits?.alerts || 25}`}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Groups</h3>
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">{displayUsageStats.usage?.groupsCreated || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(displayUsageStats.usage?.groupsCreated || 0, displaySubscription.limits?.groups || 2))}`}
                      style={{ 
                        width: `${getUsagePercentage(displayUsageStats.usage?.groupsCreated || 0, displaySubscription.limits?.groups || 2)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {displaySubscription.limits?.groups === 999999 ? '∞' : 
                     displaySubscription.limits?.groups === 'custom' ? 'Custom' : 
                     `of ${displaySubscription.limits?.groups || 2}`}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Admins</h3>
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Added</span>
                    <span className="font-medium">{displayUsageStats.usage?.adminsAdded || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(displayUsageStats.usage?.adminsAdded || 0, displaySubscription.limits?.admins || 1))}`}
                      style={{ 
                        width: `${getUsagePercentage(displayUsageStats.usage?.adminsAdded || 0, displaySubscription.limits?.admins || 1)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {displaySubscription.limits?.admins === 999999 ? '∞' : 
                     displaySubscription.limits?.admins === 'custom' ? 'Custom' : 
                     `of ${displaySubscription.limits?.admins || 1}`}
                  </div>
                </div>
              </div>

              {/* Sub-Groups box - only show for Pro and Enterprise */}
              {(displaySubscription?.planType === 'pro' || displaySubscription?.planType === 'premium' || displaySubscription?.planType === 'enterprise') && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Sub-Groups</h3>
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium">{displayUsageStats.usage?.subGroupsCreated || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(displayUsageStats.usage?.subGroupsCreated || 0, displaySubscription.limits?.subGroups || 0))}`}
                        style={{ 
                          width: `${getUsagePercentage(displayUsageStats.usage?.subGroupsCreated || 0, displaySubscription.limits?.subGroups || 0)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {displaySubscription.limits?.subGroups === 999999 ? '∞' : 
                       displaySubscription.limits?.subGroups === 'custom' ? 'Custom' : 
                       `of ${displaySubscription.limits?.subGroups || 0}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Standard User Message */}
        {displaySubscription && displaySubscription.accessLevel === 'standard' && (
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Standard Access
                  </h3>
                  <p className="text-blue-800 mb-3">
                    You currently have standard access, which allows you to view alerts from organizations you follow and join groups as a member. 
                    You don't have admin privileges to create alerts, groups, or manage organizations.
                  </p>
                  <p className="text-blue-700 text-sm">
                    To get admin access, you'll need to be approved as an organization administrator or upgrade to a paid plan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-white rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-lg ${
                tier.current
                  ? 'border-green-500 ring-2 ring-green-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              
              {tier.current && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  <p className="text-gray-600 mb-4">{tier.description}</p>
                  <div className="flex items-baseline justify-center">
                    {tier.customPrice ? (
                      <span className="text-2xl font-bold text-gray-900">{tier.customPrice}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                        <span className="text-gray-600 ml-1">/{tier.period}</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className={`h-12 ${tier.name === 'Free' ? 'mt-8' : tier.name === 'Premium' ? 'mt-16' : ''}`}>
                  <button
                    onClick={() => handleUpgrade(tier.name.toLowerCase())}
                    disabled={tier.current || isUpgrading}
                    className={`w-full h-12 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                      tier.current
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {tier.current ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Current Plan
                      </>
                    ) : isUpgrading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        {tier.name === 'Free' ? 'Get Started' : tier.name === 'Enterprise' ? 'Contact Sales' : 'Upgrade'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Need Help Choosing?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Our team is here to help you find the perfect plan for your organization. 
              Contact us for personalized recommendations and custom enterprise solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Contact Sales
              </button>
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}