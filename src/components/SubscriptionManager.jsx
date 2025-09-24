import { useState, useEffect } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { CreditCard, Users, Bell, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react'

export default function SubscriptionManager({ organizationId = null }) {
  const { 
    subscription, 
    usageStats, 
    loading, 
    getCurrentTier, 
    getUpgradeSuggestions,
    refreshSubscription 
  } = useSubscription()
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeSuggestions, setUpgradeSuggestions] = useState([])

  useEffect(() => {
    if (usageStats) {
      const suggestions = getUpgradeSuggestions()
      setUpgradeSuggestions(suggestions)
    }
  }, [usageStats, getUpgradeSuggestions])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!subscription || !usageStats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Unable to load subscription information</p>
      </div>
    )
  }

  const currentTier = getCurrentTier()
  const { usage } = usageStats

  const UsageBar = ({ type, label, icon: Icon }) => {
    const usageData = usage[type]
    const isApproaching = usageData.percentage >= 80
    const isAtLimit = usageData.remaining <= 0

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
          <span className="text-sm text-gray-500">
            {usageData.used} / {usageData.limit}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit 
                ? 'bg-red-500' 
                : isApproaching 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usageData.percentage, 100)}%` }}
          />
        </div>
        
        {isAtLimit && (
          <div className="flex items-center space-x-1 text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Limit reached</span>
          </div>
        )}
        
        {isApproaching && !isAtLimit && (
          <div className="flex items-center space-x-1 text-yellow-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Approaching limit</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            currentTier.name === 'Free' 
              ? 'bg-gray-100 text-gray-800'
              : currentTier.name === 'Pro'
                ? 'bg-blue-100 text-blue-800'
                : currentTier.name === 'Premium'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-green-100 text-green-800'
          }`}>
            {currentTier.name}
          </span>
        </div>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className="text-3xl font-bold text-gray-900">
            ${currentTier.price}
            <span className="text-lg font-normal text-gray-500">/month</span>
          </div>
        </div>
        
        <div className="space-y-2">
          {currentTier.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h3>
        
        <div className="space-y-6">
          <UsageBar 
            type="alerts" 
            label="Alerts Sent" 
            icon={Bell} 
          />
          <UsageBar 
            type="groups" 
            label="Groups Created" 
            icon={Users} 
          />
          <UsageBar 
            type="admins" 
            label="Organization Admins" 
            icon={CreditCard} 
          />
        </div>
      </div>

      {/* Upgrade Suggestions */}
      {upgradeSuggestions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800">Upgrade Recommended</h3>
          </div>
          
          <div className="space-y-3">
            {upgradeSuggestions.map((suggestion, index) => (
              <div key={index} className="text-sm text-yellow-700">
                {suggestion.message}
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
          >
            View Upgrade Options
          </button>
        </div>
      )}

      {/* Upgrade Button */}
      {currentTier.name !== 'Enterprise' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need More Features?
            </h3>
            <p className="text-gray-600 mb-4">
              Upgrade your plan to unlock more alerts, groups, and admin users.
            </p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal 
          onClose={() => setShowUpgradeModal(false)}
          currentTier={currentTier}
        />
      )}
    </div>
  )
}

// Upgrade Modal Component
function UpgradeModal({ onClose, currentTier }) {
  const { subscriptionService } = useSubscription()
  const pricingTiers = subscriptionService.getAllPricingTiers()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(pricingTiers).map(([key, tier]) => (
              <div
                key={key}
                className={`rounded-lg border-2 p-6 ${
                  tier.name === currentTier.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tier.name}
                  </h3>
                  <div className="text-3xl font-bold text-gray-900 mb-4">
                    ${tier.price}
                    <span className="text-lg font-normal text-gray-500">/month</span>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="text-sm text-gray-600">
                      {tier.maxAdmins} Admin{tier.maxAdmins !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      {tier.maxGroups} Group{tier.maxGroups !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      {tier.maxAlertsPerMonth} Alert{tier.maxAlertsPerMonth !== 1 ? 's' : ''}/month
                    </div>
                  </div>
                  
                  {tier.name === currentTier.name ? (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        // Handle upgrade logic here
                        console.log('Upgrading to:', tier.name)
                        onClose()
                      }}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {tier.price === 0 ? 'Downgrade' : 'Upgrade'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
