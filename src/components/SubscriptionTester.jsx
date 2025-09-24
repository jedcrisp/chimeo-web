import { useState, useEffect } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { CreditCard, Users, Bell, BarChart3, TestTube } from 'lucide-react'

export default function SubscriptionTester() {
  const { 
    subscription, 
    usageStats, 
    refreshSubscription, 
    canPerformAction,
    incrementUsage 
  } = useSubscription()
  
  const [testMode, setTestMode] = useState(false)
  const [testResults, setTestResults] = useState([])

  // Test different subscription scenarios
  const testScenarios = [
    {
      name: 'Free Tier',
      planType: 'free',
      description: 'Test free tier limits (1 admin, 2 groups, 25 alerts)'
    },
    {
      name: 'Pro Tier',
      planType: 'pro',
      description: 'Test pro tier limits (2 admins, 5 groups, 100 alerts)'
    },
    {
      name: 'Premium Tier',
      planType: 'premium',
      description: 'Test premium tier limits (10 admins, 25 groups, 500 alerts)'
    },
    {
      name: 'Enterprise Tier',
      planType: 'enterprise',
      description: 'Test enterprise tier (unlimited)'
    }
  ]

  // Simulate subscription data
  const simulateSubscription = async (planType) => {
    try {
      console.log(`🧪 Testing ${planType} subscription...`)
      
      // Create mock subscription data
      const mockSubscription = {
        userId: 'test-user-123',
        planType,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Save to Firestore
      await setDoc(doc(db, 'subscriptions', 'test-user-123'), mockSubscription)
      
      // Create mock usage data
      const currentMonth = new Date().toISOString().slice(0, 7)
      const usageId = `test-user-123_${currentMonth}`
      
      const mockUsage = {
        userId: 'test-user-123',
        month: currentMonth,
        alerts: planType === 'free' ? 20 : planType === 'pro' ? 80 : planType === 'premium' ? 400 : 0,
        groups: planType === 'free' ? 1 : planType === 'pro' ? 3 : planType === 'premium' ? 15 : 0,
        admins: planType === 'free' ? 1 : planType === 'pro' ? 2 : planType === 'premium' ? 8 : 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(doc(db, 'usage', usageId), mockUsage)
      
      // Refresh subscription data
      await refreshSubscription()
      
      setTestResults(prev => [...prev, {
        scenario: planType,
        success: true,
        message: `Successfully simulated ${planType} subscription`,
        timestamp: new Date().toLocaleTimeString()
      }])
      
    } catch (error) {
      console.error('Error simulating subscription:', error)
      setTestResults(prev => [...prev, {
        scenario: planType,
        success: false,
        message: `Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }])
    }
  }

  // Test feature gates
  const testFeatureGates = async () => {
    const actions = ['createAlert', 'createGroup', 'addAdmin']
    const results = []

    for (const action of actions) {
      try {
        const permission = await canPerformAction(action, 'test-org-123')
        results.push({
          action,
          allowed: permission.allowed,
          reason: permission.reason,
          timestamp: new Date().toLocaleTimeString()
        })
      } catch (error) {
        results.push({
          action,
          allowed: false,
          reason: error.message,
          timestamp: new Date().toLocaleTimeString()
        })
      }
    }

    setTestResults(prev => [...prev, ...results])
  }

  // Test usage increment
  const testUsageIncrement = async () => {
    try {
      await incrementUsage('alerts', 'test-org-123')
      setTestResults(prev => [...prev, {
        action: 'incrementUsage',
        success: true,
        message: 'Successfully incremented alert usage',
        timestamp: new Date().toLocaleTimeString()
      }])
    } catch (error) {
      setTestResults(prev => [...prev, {
        action: 'incrementUsage',
        success: false,
        message: `Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }])
    }
  }

  // Clear test data
  const clearTestData = async () => {
    try {
      await deleteDoc(doc(db, 'subscriptions', 'test-user-123'))
      const currentMonth = new Date().toISOString().slice(0, 7)
      const usageId = `test-user-123_${currentMonth}`
      await deleteDoc(doc(db, 'usage', usageId))
      
      await refreshSubscription()
      setTestResults([])
      
      console.log('✅ Test data cleared')
    } catch (error) {
      console.error('Error clearing test data:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <TestTube className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Subscription System Tester</h1>
          </div>
          <p className="text-gray-600">
            Test different subscription tiers and feature gates
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h2>
          
          {subscription ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Plan</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription.planType?.charAt(0).toUpperCase() + subscription.planType?.slice(1) || 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Bell className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Alerts Used</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {usageStats?.usage?.alerts?.used || 0} / {usageStats?.usage?.alerts?.limit || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Groups</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {usageStats?.usage?.groups?.used || 0} / {usageStats?.usage?.groups?.limit || 0}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No subscription data loaded</p>
          )}
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subscription Simulation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Simulate Subscriptions</h3>
            
            <div className="space-y-3">
              {testScenarios.map((scenario) => (
                <div key={scenario.planType} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                    <p className="text-sm text-gray-500">{scenario.description}</p>
                  </div>
                  <button
                    onClick={() => simulateSubscription(scenario.planType)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    Test
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Testing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Features</h3>
            
            <div className="space-y-3">
              <button
                onClick={testFeatureGates}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Test Feature Gates
              </button>
              
              <button
                onClick={testUsageIncrement}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Test Usage Increment
              </button>
              
              <button
                onClick={clearTestData}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Clear Test Data
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      result.success ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">
                        {result.scenario || result.action || 'Test'}
                      </p>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{result.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Test Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/subscription"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-center hover:bg-blue-700 transition-colors"
            >
              View Subscription Page
            </a>
            <a
              href="/calendar"
              className="bg-green-600 text-white px-4 py-2 rounded-md text-center hover:bg-green-700 transition-colors"
            >
              Test Calendar Alerts
            </a>
            <a
              href="/my-groups"
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-center hover:bg-purple-700 transition-colors"
            >
              Test Groups
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
