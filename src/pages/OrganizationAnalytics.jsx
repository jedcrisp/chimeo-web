import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import adminService from '../services/adminService'
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  Bell, 
  TrendingUp, 
  Clock, 
  Target,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  MessageSquare,
  Shield
} from 'lucide-react'
import { 
  collection, 
  query, 
  getDocs, 
  where, 
  orderBy, 
  limit, 
  startAt, 
  endAt,
  doc,
  getDoc
} from 'firebase/firestore'
import { db } from '../services/firebase'
import toast from 'react-hot-toast'

export default function OrganizationAnalytics() {
  const { currentUser, userProfile } = useAuth()
  const [adminOrganizations, setAdminOrganizations] = useState([])
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [orgsLoading, setOrgsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d') // 7d, 30d, 90d, 1y
  const [timeframe, setTimeframe] = useState('daily') // daily, weekly, monthly

  // Load admin organizations
  const loadAdminOrganizations = async () => {
    try {
      setOrgsLoading(true)
      console.log('📊 Loading admin organizations...')
      
      if (!currentUser?.uid) {
        setAdminOrganizations([])
        return
      }

      // Set current user in admin service
      adminService.setCurrentUser(currentUser)
      
      // Get admin organizations
      const orgs = await adminService.getAdminOrganizations()
      console.log('📊 Loaded admin organizations:', orgs)
      
      setAdminOrganizations(orgs)
    } catch (error) {
      console.error('❌ Error loading admin organizations:', error)
      setAdminOrganizations([])
    } finally {
      setOrgsLoading(false)
    }
  }

  // Date range calculations
  const getDateRange = () => {
    const now = new Date()
    const ranges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }
    return ranges[dateRange] || ranges['30d']
  }

  // Load analytics data
  const loadAnalytics = async (organizationId) => {
    if (!organizationId) return

    try {
      setLoading(true)
      console.log('📊 Loading analytics for organization:', organizationId)

      const startDate = getDateRange()
      const endDate = new Date()

      // Load all analytics data in parallel
      const [
        alertStats,
        userStats,
        groupStats,
        notificationStats,
        usageStats
      ] = await Promise.all([
        loadAlertAnalytics(organizationId, startDate, endDate),
        loadUserAnalytics(organizationId, startDate, endDate),
        loadGroupAnalytics(organizationId, startDate, endDate),
        loadNotificationAnalytics(organizationId, startDate, endDate),
        loadUsageAnalytics(organizationId)
      ])

      setAnalytics({
        alerts: alertStats,
        users: userStats,
        groups: groupStats,
        notifications: notificationStats,
        usage: usageStats,
        generatedAt: new Date()
      })

      console.log('✅ Analytics loaded successfully')
    } catch (error) {
      console.error('❌ Error loading analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Alert Analytics
  const loadAlertAnalytics = async (organizationId, startDate, endDate) => {
    try {
      // Get all alerts in date range
      const alertsQuery = query(
        collection(db, 'organizations', organizationId, 'alerts'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
      )

      const alertsSnapshot = await getDocs(alertsQuery)
      const alerts = alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Calculate metrics
      const totalAlerts = alerts.length
      const emergencyAlerts = alerts.filter(a => a.type === 'emergency').length
      const warningAlerts = alerts.filter(a => a.type === 'warning').length
      const infoAlerts = alerts.filter(a => a.type === 'info').length

      // Group by time period
      const alertsByPeriod = groupByTimePeriod(alerts, timeframe)
      
      // Most active groups for alerts
      const groupAlertCounts = {}
      alerts.forEach(alert => {
        const groupId = alert.groupId || alert.groupName || 'No Group'
        groupAlertCounts[groupId] = (groupAlertCounts[groupId] || 0) + 1
      })

      const topGroups = Object.entries(groupAlertCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([groupId, count]) => ({ groupId, count }))

      return {
        total: totalAlerts,
        byType: {
          emergency: emergencyAlerts,
          warning: warningAlerts,
          info: infoAlerts
        },
        byPeriod: alertsByPeriod,
        topGroups,
        averagePerDay: totalAlerts / Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
      }
    } catch (error) {
      console.error('❌ Error loading alert analytics:', error)
      return null
    }
  }

  // User Analytics
  const loadUserAnalytics = async (organizationId, startDate, endDate) => {
    try {
      // Get organization document to find users
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
      if (!orgDoc.exists()) return null

      const orgData = orgDoc.data()
      const memberIds = orgData.memberIds || []
      const adminIds = orgData.adminIds || []

      // Get user profiles
      const userPromises = memberIds.map(userId => 
        getDoc(doc(db, 'users', userId)).catch(() => null)
      )
      const userDocs = await Promise.all(userPromises)
      const users = userDocs.filter(doc => doc?.exists()).map(doc => doc.data())

      // Calculate metrics
      const totalUsers = users.length
      const activeUsers = users.filter(user => {
        const lastActive = user.lastActiveAt?.toDate()
        return lastActive && lastActive >= startDate
      }).length

      const newUsers = users.filter(user => {
        const createdAt = user.createdAt?.toDate()
        return createdAt && createdAt >= startDate
      }).length

      const adminUsers = users.filter(user => adminIds.includes(user.uid)).length

      return {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        admins: adminUsers,
        activityRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
      }
    } catch (error) {
      console.error('❌ Error loading user analytics:', error)
      return null
    }
  }

  // Group Analytics
  const loadGroupAnalytics = async (organizationId, startDate, endDate) => {
    try {
      const groupsQuery = query(
        collection(db, 'organizations', organizationId, 'groups'),
        orderBy('createdAt', 'desc')
      )

      const groupsSnapshot = await getDocs(groupsQuery)
      const groups = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      const totalGroups = groups.length
      const newGroups = groups.filter(group => {
        const createdAt = group.createdAt?.toDate()
        return createdAt && createdAt >= startDate
      }).length

      const activeGroups = groups.filter(group => {
        const lastActivity = group.lastActivityAt?.toDate()
        return lastActivity && lastActivity >= startDate
      }).length

      return {
        total: totalGroups,
        new: newGroups,
        active: activeGroups,
        activityRate: totalGroups > 0 ? (activeGroups / totalGroups) * 100 : 0
      }
    } catch (error) {
      console.error('❌ Error loading group analytics:', error)
      return null
    }
  }

  // Notification Analytics
  const loadNotificationAnalytics = async (organizationId, startDate, endDate) => {
    try {
      // This would require notification tracking in Firestore
      // For now, return mock data structure
      return {
        totalSent: 0,
        pushNotifications: 0,
        emailNotifications: 0,
        deliveryRate: 0,
        clickRate: 0
      }
    } catch (error) {
      console.error('❌ Error loading notification analytics:', error)
      return null
    }
  }

  // Usage Analytics
  const loadUsageAnalytics = async (organizationId) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const usageId = `${organizationId}_${currentMonth}`
      
      const usageDoc = await getDoc(doc(db, 'usage', usageId))
      if (!usageDoc.exists()) {
        return {
          alerts: 0,
          groups: 0,
          admins: 0,
          limits: {
            alerts: 100, // Default limits
            groups: 10,
            admins: 5
          }
        }
      }

      const usageData = usageDoc.data()
      return {
        alerts: usageData.alerts || 0,
        groups: usageData.groups || 0,
        admins: usageData.admins || 0,
        limits: {
          alerts: 100,
          groups: 10,
          admins: 5
        }
      }
    } catch (error) {
      console.error('❌ Error loading usage analytics:', error)
      return null
    }
  }

  // Helper function to group data by time period
  const groupByTimePeriod = (data, period) => {
    const groups = {}
    
    data.forEach(item => {
      const date = item.createdAt?.toDate() || new Date()
      let key

      if (period === 'daily') {
        key = date.toISOString().split('T')[0]
      } else if (period === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else if (period === 'monthly') {
        key = date.toISOString().slice(0, 7)
      }

      if (key) {
        groups[key] = (groups[key] || 0) + 1
      }
    })

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  }

  // Export analytics data
  const exportAnalytics = () => {
    if (!analytics) return

    const data = {
      organization: selectedOrg?.name,
      dateRange,
      timeframe,
      generatedAt: analytics.generatedAt,
      ...analytics
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${selectedOrg?.name}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Analytics data exported!')
  }

  // Load admin organizations on mount
  useEffect(() => {
    if (currentUser) {
      loadAdminOrganizations()
    }
  }, [currentUser])

  // Load analytics when organization changes
  useEffect(() => {
    if (selectedOrg) {
      loadAnalytics(selectedOrg.id)
    }
  }, [selectedOrg, dateRange, timeframe])

  // Set default organization
  useEffect(() => {
    if (adminOrganizations && adminOrganizations.length > 0 && !selectedOrg) {
      setSelectedOrg(adminOrganizations[0])
    }
  }, [adminOrganizations, selectedOrg])

  // Show loading state while adminOrganizations are being loaded
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (orgsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    )
  }

  if (adminOrganizations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
          <p className="text-gray-600">You need organization admin access to view analytics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor your organization's performance and engagement</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => loadAnalytics(selectedOrg?.id)}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportAnalytics}
                disabled={!analytics}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center space-x-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
              <select
                value={selectedOrg?.id || ''}
                onChange={(e) => {
                  const org = adminOrganizations.find(o => o.id === e.target.value)
                  setSelectedOrg(org)
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {adminOrganizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading analytics...</span>
          </div>
        )}

        {/* Analytics Content */}
        {analytics && !loading && (
          <div className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Alerts"
                value={analytics.alerts?.total || 0}
                icon={AlertTriangle}
                color="red"
                subtitle={`${analytics.alerts?.averagePerDay?.toFixed(1) || 0} per day`}
              />
              <MetricCard
                title="Active Users"
                value={analytics.users?.active || 0}
                icon={Users}
                color="blue"
                subtitle={`${analytics.users?.activityRate?.toFixed(1) || 0}% activity rate`}
              />
              <MetricCard
                title="Groups"
                value={analytics.groups?.total || 0}
                icon={Target}
                color="green"
                subtitle={`${analytics.groups?.active || 0} active`}
              />
              <MetricCard
                title="Usage"
                value={`${analytics.usage?.alerts || 0}/${analytics.usage?.limits?.alerts || 0}`}
                icon={Activity}
                color="purple"
                subtitle="Alerts used this month"
              />
            </div>

            {/* Alert Analytics */}
            {analytics.alerts && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                  Alert Analytics
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Alert Types</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Emergency</span>
                        <span className="font-semibold text-red-600">{analytics.alerts.byType?.emergency || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Warning</span>
                        <span className="font-semibold text-yellow-600">{analytics.alerts.byType?.warning || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Info</span>
                        <span className="font-semibold text-blue-600">{analytics.alerts.byType?.info || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Top Groups by Alerts</h4>
                    <div className="space-y-2">
                      {analytics.alerts.topGroups?.map((group, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 truncate">{group.groupId}</span>
                          <span className="font-semibold text-gray-900">{group.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Analytics */}
            {analytics.users && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-500" />
                  User Analytics
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{analytics.users.total}</div>
                    <div className="text-sm text-gray-600">Total Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{analytics.users.active}</div>
                    <div className="text-sm text-gray-600">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{analytics.users.new}</div>
                    <div className="text-sm text-gray-600">New Users</div>
                  </div>
                </div>
              </div>
            )}

            {/* Usage Analytics */}
            {analytics.usage && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-purple-500" />
                  Usage Analytics
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Alerts</span>
                      <span className="text-sm font-medium">{analytics.usage.alerts}/{analytics.usage.limits.alerts}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(analytics.usage.alerts / analytics.usage.limits.alerts) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Groups</span>
                      <span className="text-sm font-medium">{analytics.usage.groups}/{analytics.usage.limits.groups}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(analytics.usage.groups / analytics.usage.limits.groups) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Admins</span>
                      <span className="text-sm font-medium">{analytics.usage.admins}/{analytics.usage.limits.admins}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${(analytics.usage.admins / analytics.usage.limits.admins) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ title, value, icon: Icon, color, subtitle }) {
  const colorClasses = {
    red: 'text-red-600 bg-red-100',
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    yellow: 'text-yellow-600 bg-yellow-100'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
