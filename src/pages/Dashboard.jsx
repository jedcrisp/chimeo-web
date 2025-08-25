import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { useAlerts } from '../contexts/AlertContext'
import { Users, MapPin, Crown, Plus, AlertTriangle, Building } from 'lucide-react'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {userProfile?.displayName || currentUser?.email}
        </p>
      </div>

      {/* Admin Status Banner */}
      {hasAdminAccess && (
        <div className="card bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-100">
                <Crown className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-800">Organization Administrator</p>
              <p className="text-sm text-yellow-700">
                You have admin access to {adminOrgs.length} organization{adminOrgs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          to="/alerts"
          className="card hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-100 group-hover:bg-primary-200">
                <BellIcon className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">View Alerts</p>
              <p className="text-sm text-gray-500">{totalAlerts} total alerts</p>
            </div>
          </div>
        </Link>

        <Link
          to="/organizations"
          className="card hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 group-hover:bg-blue-200">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Organizations</p>
              <p className="text-sm text-gray-500">{totalOrganizations} total</p>
            </div>
          </div>
        </Link>

        <Link
          to="/map"
          className="card hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 group-hover:bg-green-200">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Map View</p>
              <p className="text-sm text-gray-500">See locations</p>
            </div>
          </div>
        </Link>

        {hasAdminAccess && (
          <Link
            to="/alerts"
            className="card hover:shadow-md transition-shadow cursor-pointer group bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-100 group-hover:bg-yellow-200">
                  <Plus className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-800">New Alert</p>
                <p className="text-sm text-yellow-700">Post to your orgs</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Recent Alerts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Alerts</h2>
          <Link
            to="/alerts"
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            View all
          </Link>
        </div>
        
        {recentAlerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No alerts yet</p>
            <p className="text-sm text-gray-400 mt-1">Alerts will appear here when they're posted</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100">
                    <BellIcon className="h-3 w-3 text-primary-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-sm text-gray-500">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {alert.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
