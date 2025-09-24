import { useState, useEffect } from 'react'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import { AlertTriangle, Lock, CreditCard } from 'lucide-react'

export default function FeatureGate({ 
  action, 
  organizationId = null, 
  children, 
  fallback = null,
  showUpgradePrompt = true 
}) {
  const { 
    allowed, 
    reason, 
    loading, 
    limitInfo, 
    isApproachingLimit, 
    hasReachedLimit 
  } = useSubscriptionLimits(action, organizationId)
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    )
  }

  if (allowed) {
    return children
  }

  if (fallback) {
    return fallback
  }

  if (!showUpgradePrompt) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Feature Blocked Message */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Lock className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Feature Not Available
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {reason || 'This feature is not available with your current plan.'}
            </p>
            
            {limitInfo && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm text-red-700 mb-2">
                  <span>Usage: {limitInfo.used} / {limitInfo.limit}</span>
                  <span>{limitInfo.percentage}% used</span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${Math.min(limitInfo.percentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Prompt */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              Upgrade Your Plan
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Upgrade to a higher plan to unlock this feature and increase your limits.
            </p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  )
}

// Simple Upgrade Modal
function UpgradeModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Pro Plan - $10/month</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 2 organization admins</li>
                <li>• 5 groups</li>
                <li>• 100 alerts per month</li>
                <li>• Full web browser access</li>
                <li>• Advanced push notifications</li>
                <li>• Priority email support</li>
                <li>• Mobile app access</li>
              </ul>
              <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors">
                Upgrade to Pro
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Premium Plan - $25/month</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 10+ organization admins</li>
                <li>• 25 groups</li>
                <li>• 500 alerts per month</li>
                <li>• Full web browser access</li>
                <li>• Premium push notifications</li>
                <li>• Priority phone & email support</li>
              </ul>
              <button className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 transition-colors">
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
