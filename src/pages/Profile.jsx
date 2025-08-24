import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Calendar, Shield, Edit, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { userProfile, currentUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    email: currentUser?.email || ''
  })

  const handleSave = async () => {
    try {
      // TODO: Implement profile update
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleCancel = () => {
    setFormData({
      displayName: userProfile?.displayName || '',
      email: currentUser?.email || ''
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="btn-secondary flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    {userProfile?.displayName || 'Not set'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {currentUser?.email || 'Not available'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Email address cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Created
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {userProfile?.createdAt ? new Date(userProfile.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {userProfile?.role || 'user'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
            <div className="space-y-3">
              <button className="w-full btn-secondary text-left">
                Change Password
              </button>
              <button className="w-full btn-secondary text-left">
                Notification Preferences
              </button>
              <button className="w-full btn-secondary text-left">
                Privacy Settings
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h3>
            <button className="w-full btn-danger">
              Delete Account
            </button>
            <p className="mt-2 text-xs text-gray-500">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
