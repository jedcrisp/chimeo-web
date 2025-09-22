import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Users, User, LogOut, Menu, X, Building, Home, Bell, Calendar, FileText, UserPlus, Search } from 'lucide-react'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { useState } from 'react'

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

export default function Layout() {
  const { currentUser, userProfile, logout } = useAuth()
  const { organizations } = useOrganizations()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check if user is platform admin (app creator)
  const isPlatformAdmin = currentUser?.email === 'jed@onetrack-consulting.com'
  
  // Check if user is organization admin
  const isOrganizationAdmin = userProfile?.isOrganizationAdmin || false

  // Different navigation based on user role
  const navigation = isOrganizationAdmin ? [
    // Organization Admin Navigation
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Groups', href: '/groups', icon: UserPlus },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Discover', href: '/discover', icon: Search },
    ...(isPlatformAdmin ? [{ name: 'Org Requests', href: '/org-requests', icon: FileText }] : []),
    { name: 'Profile', href: '/profile', icon: User },
  ] : [
    // Basic User Navigation
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'My Alerts', href: '/my-alerts', icon: Bell },
    { name: 'My Groups', href: '/my-groups', icon: UserPlus },
    { name: 'Discover', href: '/discover', icon: Building },
    { name: 'My Profile', href: '/my-profile', icon: User },
  ]

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Failed to log out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-48 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-3">
            <div className="flex items-center">
              <BellIcon className="h-6 w-6 text-primary-600" />
              <span className="ml-2 text-lg font-bold text-gray-900">Chimeo</span>
            </div>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-48 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-3">
            <BellIcon className="h-6 w-6 text-primary-600" />
            <span className="ml-2 text-lg font-bold text-gray-900">Chimeo</span>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-gray-200 p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-48">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {userProfile && (
                <div className="flex items-center gap-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {userProfile.displayName || userProfile.email}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
