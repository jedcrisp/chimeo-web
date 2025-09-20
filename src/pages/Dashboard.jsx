import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { useAlerts } from '../contexts/AlertContext'
import { 
  Crown, 
  Plus, 
  AlertTriangle, 
  Building, 
  Bell,
  TrendingUp,
  Shield,
  Activity,
  Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import adminService from '../services/adminService'
import { useState, useEffect } from 'react'

// Custom Bell Icon component
function BellIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C13.1 2 14 2.9 14 4V5.5C17.5 6.5 20 9.5 20 13V16L22 18V19H2V18L4 16V13C4 9.5 6.5 6.5 10 5.5V4C10 2.9 10.9 2 12 2Z"
        fill="currentColor"
      />
      <path
        d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth()
  const { organizations } = useOrganizations()
  const { alerts } = useAlerts()
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [adminOrgs, setAdminOrgs] = useState([])

  useEffect(() => {
    if (currentUser && organizations.length > 0) {
      // Check if user has admin access to any organizations
      adminService.getAdminOrganizations().then(adminOrgs => {
        setAdminOrgs(adminOrgs)
        setHasAdminAccess(adminOrgs.length > 0)
      })
    }
  }, [currentUser, organizations])

  const recentAlerts = alerts.slice(0, 5)
  const totalOrganizations = organizations.length
  const totalAlerts = alerts.length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-600 mt-1">
                Welcome back, {userProfile?.displayName || currentUser?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Last updated</p>
                <p className="text-sm font-medium text-slate-900">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {(userProfile?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 min-h-[100px]">
            <div className="flex items-center h-full">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Bell className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 truncate">Total Alerts</p>
                <p className="text-2xl font-bold text-slate-900">{totalAlerts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 min-h-[100px]">
            <div className="flex items-center h-full">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 truncate">Organizations</p>
                <p className="text-2xl font-bold text-slate-900">{totalOrganizations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 min-h-[100px]">
            <div className="flex items-center h-full">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 truncate">Status</p>
                <p className="text-2xl font-bold text-green-600">Online</p>
              </div>
            </div>
          </div>
        </div>


        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent Alerts</h2>
              <Link
                to="/alerts"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                View all →
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {recentAlerts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">No alerts yet</h3>
                <p className="text-sm text-slate-500">
                  Alerts will appear here when they're posted
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BellIcon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {alert.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
